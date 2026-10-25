// PNG editorial 1200×630 con fuentes propias; sin depender del servidor.
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const CARD_WIDTH=1200, CARD_HEIGHT=630;
const INK='#0d0c0a', GOLD='#f2c230', PAPER='#f3ecd9';
export const socialFontOptions={loadSystemFonts:false,defaultFontFamily:'IBM Plex Sans',
  fontFiles:[fileURLToPath(new URL('../node_modules/@ibm/plex-sans-variable/fonts/complete/ttf/IBM Plex Sans Var-Roman.ttf',import.meta.url))]
;
const xml=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[m]))
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,' ');
const tidy=(v,n=220)=>String(v??'').replace(/<[^>]*>/g,' ').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
export function safeSocialAsset(url,{backend,origin}){
  let u,b,o;
  try{u=new URL(url);b=new URL(backend);o=new URL(origin);}catch{return false;}
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash
    &&b.protocol==='https:'&&!b.username&&!b.password&&!b.port&&b.pathname==='/'
    &&((u.origin===b.origin&&u.pathname.startsWith('/storage/v1/object/public/obi-media/'))
       ||(u.origin===o.origin&&u.pathname==='/icon-512.png'));
}
export const cardKind=(kind,prelaunch)=>prelaunch?'PRÓXIMO ESTRENO':
  ({home:'BIBLIOTECA DIGITAL',serie:'NOVELA LIGERA',leer:'CAPÍTULO PUBLICADO',equipo:'EQUIPO TRADUCTOR'})[kind]||'';
export function cardTitle(data,kind){
  if(kind==='home')return tidy(data.socialTitle||data.title||'Novelas ligeras en español latino',190)
    .replace(/^El Obi del Lector\s*[—–:-]\s*/i,'');
  return tidy(data.socialTitle||data.heading||data.title,190);
}
const icon=()=>{try{return readFileSync(new URL('../public/icon-512.png',import.meta.url));}catch{return null;}};
export async function getRemoteImage(url,context,fetchImpl=fetch){
  if(!safeSocialAsset(url,context))return null;
  const ac=new AbortController(),timeout=setTimeout(()=>ac.abort(),2800);
  try{
    const res=await fetchImpl(url,{signal:ac.signal,redirect:'manual',
      headers:{Accept:'image/png,image/jpeg,image/webp'}});
    if(!res.ok||res.headers.get('location'))return null;
    if(!['image/png','image/jpeg','image/webp'].includes((res.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()))return null;
    if(Number(res.headers.get('content-length')||0)>4_000_000)return null;
    const chunks=[];let total=0;
    for await(const chunk of res.body||[]){
      total+=chunk.length;if(total>4_000_000)return null;chunks.push(chunk);
    }
    const buf=Buffer.concat(chunks,total);
    const m=await sharp(buf,{limitInputPixels:24_000_000,failOn:'error'}).metadata();
    if(!['jpeg','png','webp'].includes(m.format)||!m.width||!m.height)return null;
    return buf;
  }catch{return null;}finally{clearTimeout(timeout);}
}
const glyph=(x,y,value,size,color=PAPER,weight=400,attrs='')=>
  '<text x="'+x+'" y="'+y+'" font-family="IBM Plex Sans" font-size="'+size+
  '" font-weight="'+weight+'" fill="'+color+'" '+attrs+'>'+xml(value)+'</text>';
const widthOf=(s,size)=>[...s].reduce((n,ch)=>n+(
  /[MWÁÉÍÓÚÑ]/.test(ch)?.83:/[mwoQ]/.test(ch)?.70:/[ilI!.,:;¡|]/.test(ch)?.31:
  /\s/.test(ch)?.28:.58),0)*size;
function wrap(txt,w,size,maximum=4){
  const words=tidy(txt,250).split(' ').filter(Boolean),all=[];let line='';
  for(const word of words){
    const test=line?line+' '+word:word;
    if(widthOf(test,size)<=w||!line)line=test;
    else{all.push(line);line=word;}
  }
  if(line)all.push(line);
  const clipped=all.length>maximum,result=all.slice(0,maximum);
  if(clipped&&result.length)result[result.length-1]=result.at(-1).replace(/[.,;:\s]+$/,'')+'…';
  return {clipped,lines:result.map(s=>{let a=s;while(widthOf(a,size)>w && a.length>3)a=a.slice(0,-2)+'…';return a;})};
}
export function titleLayout(data,kind){
  const heading=cardTitle(data,kind);
  for(const size of [54,50,46,42]){
    const r=wrap(heading,676,size,4);if(!r.clipped)return {lines:r.lines,size};
  }
  return {lines:wrap(heading,676,42,4).lines,size:42};
}
export function displayCredits(items){
  return Array.isArray(items)?items.filter(x=>x&&tidy(x.name,46)).slice(0,3)
    .map(x=>({name:tidy(x.name,46),logo:typeof x.logo==='string'?x.logo:'',primary:!!x.primary})):[];
}
export function overlaySVG(data,kind,credits=[],hasCover=false,logoFlags=[]){
  const {lines:titles,size}=titleLayout(data,kind),dy=size+9;
  const first=titles.length<=2?247:titles.length===3?221:194;
  const bottom=first+(titles.length-1)*dy;
  const teaser=wrap(data.socialDescription||data.description||'',680,21,2).lines;
  const notesY=Math.max(402,bottom+42),includeTeaser=(notesY+teaser.length*26)<476;
  const category=cardKind(kind,!!data.prelaunch);
  const n=credits.length,w=n<=1?635:n===2?309:202;
  const creditRects=credits.map((c,i)=>{
    const x=69+i*(w+9),extra=logoFlags[i]?64:0;
    const name=wrap(c.name,w-extra-28,n===3?18:22,1).lines[0]||'';
    return '<rect x="'+x+'" y="514" width="'+w+'" height="64" rx="9" fill="#15120f" stroke="#947944"/>'+
      glyph(x+13+extra,555,name,n===3?18:22,PAPER,700);
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">'+
    '<defs><linearGradient id="veil"><stop stop-color="#0d0c0a" stop-opacity=".98"/>'+
    '<stop offset=".69" stop-color="#0d0c0a" stop-opacity=".94"/><stop offset="1" stop-color="#0d0c0a" stop-opacity=".35"/></linearGradient></defs>'+
    '<rect width="1200" height="630" fill="url(#veil)"/>'+
    '<rect x="29" y="29" width="1142" height="572" fill="none" stroke="'+GOLD+'" stroke-width="2" stroke-opacity=".65"/>'+
    '<rect x="68" y="53" width="43" height="43" rx="3" stroke="'+GOLD+'" stroke-width="2" fill="#1e1912"/>'+
    '<path d="M78 66 l11 4 l12 -4 v20 l-12 5 l-11 -5 z M89 70 v21" stroke="'+GOLD+'" fill="none" stroke-width="3"/>'+
    glyph(127,86,'EL OBI DEL LECTOR',28,GOLD,700,'letter-spacing="2"')+
    '<path d="M127 104 H700" stroke="'+GOLD+'" stroke-opacity=".4"/>'+
    '<rect x="68" y="124" width="280" height="43" rx="7" stroke="'+GOLD+'" stroke-width="2" fill="#19150f"/>'+
    glyph(83,152,category,20,GOLD,700)+
    titles.map((t,i)=>glyph(68,first+i*dy,t,size,PAPER,700)).join('')+
    '<rect x="69" y="'+(bottom+17)+'" width="58" height="4" fill="'+GOLD+'"/>'+
    (includeTeaser?teaser.map((t,i)=>glyph(69,notesY+i*27,t,21,'#d2c9bb')).join(''):'')+
    '<path d="M69 491 H708" stroke="'+GOLD+'" stroke-opacity=".55"/>'+
    glyph(69,508,n?'TRADUCTORES':'NOVELAS EN ESPAÑOL',14,GOLD,700,'letter-spacing="2"')+
    creditRects+
    glyph(69,591,'ELOBIDELLECTOR.COM',17,'#c2b8a3',700,'letter-spacing="2"')+
    (hasCover?'<rect x="801" y="55" width="334" height="503" rx="3" stroke="'+GOLD+'" stroke-width="2" fill="#16110d"/>':'')+
    '</svg>';
}
export async function renderSocialCard({data,kind,backend,origin,fetchImpl=fetch}){
  if(!['home','serie','leer','equipo'].includes(kind))throw new Error('Tipo de tarjeta no permitido');
  const context={backend,origin};
  const source=kind==='home'?icon():await getRemoteImage(data.image,context,fetchImpl);
  const actual=source||icon(),hasCover=!!actual&&kind!=='home';
  const credits=['serie','leer'].includes(kind)?displayCredits(data.credits):[];
  const logos=await Promise.all(credits.map(c=>c.logo?getRemoteImage(c.logo,context,fetchImpl):null));
  const layers=[];
  if(actual&&hasCover){
    const blurred=await sharp(actual,{limitInputPixels:24_000_000}).rotate()
      .resize(1200,630,{fit:'cover'}).blur(26)
      .modulate({brightness:.4,saturation:.7}).png().toBuffer();
    layers.push({input:blurred,left:0,top:0});
  }
  // Render de texto independiente de fonts del runtime de Vercel.
  const overlay=overlaySVG(data,kind,credits,hasCover,logos.map(Boolean));
  layers.push({input:new Resvg(overlay,{font:socialFontOptions}).render().asPng(),left:0,top:0});
  if(actual){
    const w=hasCover?302:252,h=hasCover?469:280,x=hasCover?816:837,y=hasCover?75:173;
    const art=await sharp(actual,{limitInputPixels:24_000_000}).rotate()
      .resize(w,h,{fit:'contain',background:'#00000000'}).png().toBuffer();
    layers.push({input:art,left:x,top:y});
  }
  const n=credits.length,w=n<=1?635:n===2?309:202;
  for(let i=0;i<logos.length;i++){
    if(!logos[i])continue;
    try{
      const small=await sharp(logos[i],{limitInputPixels:24_000_000}).rotate()
        .resize(51,51,{fit:'contain',background:'#15120f'}).png().toBuffer();
      layers.push({input:small,left:69+i*(w+9)+8,top:520});
    }catch{/* nombre de equipo siempre sigue visible */}
  }
  return sharp({create:{width:CARD_WIDTH,height:CARD_HEIGHT,channels:4,background:INK}})
    .composite(layers).png({compressionLevel:9,palette:true,effort:6}).toBuffer();
}
