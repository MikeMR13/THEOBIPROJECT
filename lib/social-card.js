// Tarjetas sociales 1200×630: portada legible, identidad editorial y créditos reales.
// Rasterizamos con fuentes empacadas; nunca dependemos de fuentes del sistema.
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const CARD_WIDTH=1200, CARD_HEIGHT=630;
const INK='#0d0c0a', GOLD='#f2c230', PAPER='#f3ecd9', SOFT='#d3c7b3';
export const socialFontOptions={loadSystemFonts:false,defaultFontFamily:'IBM Plex Sans',
  fontFiles:[fileURLToPath(new URL('../node_modules/@ibm/plex-sans-variable/fonts/complete/ttf/IBM Plex Sans Var-Roman.ttf',import.meta.url))]};
const xml=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[m]))
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,' ');
const tidy=(v,n=240)=>String(v??'').replace(/<[^>]*>/g,' ')
  .replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
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
const normalizeDisplay=s=>s.replace(/◎/g,'excelente').replace(/○/g,'buena')
  .replace(/△/g,'regular').replace(/×/g,'baja');
export function cardTitle(data,kind){
  if(kind==='home')return tidy(data.socialTitle||data.title||'Novelas ligeras en español latino',185)
    .replace(/^El Obi del Lector\s*[—–:-]\s*/i,'');
  // El metadato conserva el título íntegro; la tarjeta usa la primera frase
  // editorial cuando el subtítulo secundario hace que el título sea ilegible.
  let title=tidy(data.socialTitle||data.heading||data.title,240).replace(/\s+[—–-]\s+El Obi del Lector$/i,'');
  if(kind==='serie' && title.length>65){
    const end=title.search(/[!！?？](?=\s|$)/u);
    if(end>=25&&end<=100)title=title.slice(0,end+1);
    else {
      const sep=title.match(/^(.{25,102}?)(?:\s[—–:]\s)/u);
      if(sep)title=sep[1];
    }
  }
  return normalizeDisplay(title);
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
  /[MWÁÉÍÓÚÑ]/.test(ch)?.82:/[mwoQ]/.test(ch)?.69:/[ilI!.,:;¡|]/.test(ch)?.29:
  /\s/.test(ch)?.28:.55),0)*size;
function wrap(txt,w,size,maximum=3){
  const words=tidy(txt,250).split(' ').filter(Boolean),all=[];let line='';
  for(const word of words){
    const test=line?line+' '+word:word;
    if(widthOf(test,size)<=w||!line)line=test;
    else{all.push(line);line=word;}
  }
  if(line)all.push(line);
  const clipped=all.length>maximum,result=all.slice(0,maximum);
  if(clipped&&result.length)result[result.length-1]=result.at(-1).replace(/[.,;:\s]+$/,'')+'…';
  return {clipped,lines:result.map(s=>{let a=s;while(widthOf(a,size)>w&&a.length>3)a=a.slice(0,-2)+'…';return a;})};
}
export function titleLayout(data,kind){
  const heading=cardTitle(data,kind);
  for(const size of [56,53,50,47,44]){
    const r=wrap(heading,654,size,3);
    if(!r.clipped)return {lines:r.lines,size};
  }
  return {lines:wrap(heading,654,44,3).lines,size:44};
}
export function displayCredits(items){
  return Array.isArray(items)?items.filter(x=>x&&tidy(x.name,46)).slice(0,3)
    .map(x=>({name:tidy(x.name,46),logo:typeof x.logo==='string'?x.logo:'',primary:!!x.primary})):[];
}
export function creditGeometry(count,index,hasLogo){
  const x=66, y=503, totalWidth=665, gutter=10;
  const width=(totalWidth-(count-1)*gutter)/count;
  const left=x+index*(width+gutter), logoWidth=count===1?146:count===2?92:61;
  const tile=hasLogo?{x:left+9,y:y+8,width:logoWidth,height:58}:null;
  return {x:left,y,width,height:74,tile,textX:left+(tile?logoWidth+21:22),textY:y+45,
    textWidth:width-(tile?logoWidth+35:39)};
}
// Los PNG de equipos suelen ser wordmarks muy horizontales rodeados de
// transparencia. Se quitan los márgenes transparentes antes de escalarlos.
export async function prepareTranslatorLogo(buffer,width,height){
  if(!buffer)return null;
  try{
    const instance=sharp(buffer,{limitInputPixels:24_000_000}).rotate();
    let cropped=buffer;
    try{
      const out=await instance.trim({threshold:18}).png().toBuffer({resolveWithObject:true});
      if(out.info.width>4&&out.info.height>4)cropped=out.data;
    }catch{/* imagen sin borde homogéneo: conservarla */}
    return await sharp(cropped,{limitInputPixels:24_000_000}).rotate()
      .resize(Math.max(10,width-12),Math.max(10,height-12),{fit:'contain',background:'#00000000'})
      .png().toBuffer();
  }catch{return null;}
}
export function overlaySVG(data,kind,credits=[],hasCover=false,logoFlags=[]){
  const title=titleLayout(data,kind);
  const first=title.lines.length===1?260:title.lines.length===2?238:218;
  const step=title.size+8,last=first+(title.lines.length-1)*step;
  const details=[data.author?('Autor: '+tidy(data.author,44)):'',
    ...(Array.isArray(data.genres)?data.genres.slice(0,2).map(s=>tidy(s,25)):[])].filter(Boolean);
  const meta=details.join(' · ');
  const authorLine=meta?wrap(meta,660,19,1).lines[0]:'';
  const description=tidy(data.socialDescription||data.description||'',165);
  const excerpts=wrap(description,653,21,2).lines;
  const metaY=Math.min(397,last+33),descriptionY=metaY+(authorLine?33:6);
  const descVisible=descriptionY+excerpts.length*27<480;
  const category=cardKind(kind,!!data.prelaunch);
  const chips=credits.map((c,i)=>{
    const tile=creditGeometry(credits.length,i,logoFlags[i]);
    const font=credits.length===1?27:credits.length===2?21:17;
    const team=wrap(c.name,tile.textWidth,font,1).lines[0]||'';
    return '<rect x="'+tile.x+'" y="'+tile.y+'" width="'+tile.width+'" height="'+tile.height+
      '" rx="12" fill="#1c1710" stroke="#ab8646" stroke-width="1.8"/>'+
      (tile.tile?'<rect x="'+tile.tile.x+'" y="'+tile.tile.y+'" width="'+tile.tile.width+
        '" height="'+tile.tile.height+'" rx="8" fill="#f3ecd9" stroke="#f2c230" stroke-width="1.3"/>':'')+
      glyph(tile.textX,tile.textY,team,font,PAPER,700);
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">'+
    '<defs>'+
      '<linearGradient id="veil"><stop stop-color="#0b0908" stop-opacity=".98"/>'+
      '<stop offset=".62" stop-color="#15100d" stop-opacity=".92"/>'+
      '<stop offset="1" stop-color="#0c0806" stop-opacity=".38"/></linearGradient>'+
      '<radialGradient id="glow"><stop stop-color="#dfab3d" stop-opacity=".19"/>'+
      '<stop offset="1" stop-color="#dfab3d" stop-opacity="0"/></radialGradient>'+
    '</defs>'+
    '<rect width="1200" height="630" fill="url(#veil)"/>'+
    '<circle cx="1000" cy="318" r="380" fill="url(#glow)"/>'+
    '<path d="M730 110 Q1120 -10 1180 410 M725 150 Q1100 35 1182 450" stroke="#d9a751" stroke-opacity=".16" stroke-width="2" fill="none"/>'+
    '<path d="M36 610 L270 610 M930 22 L1160 22" stroke="'+GOLD+'" stroke-width="4" opacity=".7"/>'+
    '<rect x="26" y="22" width="1148" height="586" rx="4" fill="none" stroke="'+GOLD+'" stroke-opacity=".72" stroke-width="2"/>'+
    '<rect x="64" y="52" width="48" height="48" rx="5" stroke="'+GOLD+'" stroke-width="2" fill="#251c10"/>'+
    '<path d="M77 66 l11 4 l12 -4 v20 l-12 5 l-11 -5 z M89 70 v21" stroke="'+GOLD+'" fill="none" stroke-width="3"/>'+
    glyph(130,88,'EL OBI DEL LECTOR',29,GOLD,700,'letter-spacing="2"')+
    '<path d="M130 110 H721" stroke="'+GOLD+'" stroke-opacity=".55"/>'+
    '<rect x="65" y="128" width="279" height="43" rx="8" fill="#1d160f" stroke="'+GOLD+'" stroke-width="2"/>'+
    glyph(85,157,category,21,GOLD,700)+
    title.lines.map((t,i)=>glyph(66,first+i*step,t,title.size,PAPER,700)).join('')+
    '<rect x="66" y="'+(last+13)+'" width="62" height="5" rx="2" fill="'+GOLD+'"/>'+
    (authorLine?glyph(66,metaY,authorLine,19,GOLD,500):'')+
    (descVisible?excerpts.map((t,i)=>glyph(66,descriptionY+i*27,t,21,SOFT)).join(''):'')+
    '<path d="M66 476 H725" stroke="'+GOLD+'" stroke-opacity=".65" stroke-width="1.5"/>'+
    glyph(66,495,credits.length?'TRADUCTORES':'LECTURA EN ESPAÑOL',15,GOLD,700,'letter-spacing="3"')+
    chips+
    glyph(66,598,'ELOBIDELLECTOR.COM',18,GOLD,700,'letter-spacing="2"')+
    (hasCover?'<rect x="809" y="42" width="352" height="534" rx="10" fill="#100c09" stroke="'+GOLD+'" stroke-width="3"/>':'')+
    '</svg>';
}
export async function renderSocialCard({data,kind,backend,origin,fetchImpl=fetch}){
  if(!['home','serie','leer','equipo'].includes(kind))throw new Error('Tipo de tarjeta no permitido');
  const context={backend,origin};
  const source=kind==='home'?icon():await getRemoteImage(data.image,context,fetchImpl);
  const actual=source||icon(),hasCover=!!actual&&kind!=='home';
  const credits=['serie','leer'].includes(kind)?displayCredits(data.credits):[];
  const rawLogos=await Promise.all(credits.map(c=>c.logo?getRemoteImage(c.logo,context,fetchImpl):null));
  const logoLayers=await Promise.all(rawLogos.map((buf,i)=>{
    if(!buf)return null;
    const tile=creditGeometry(credits.length,i,true).tile;
    return prepareTranslatorLogo(buf,tile.width,tile.height);
  }));
  const layers=[];
  if(actual&&hasCover){
    const blurred=await sharp(actual,{limitInputPixels:24_000_000}).rotate()
      .resize(CARD_WIDTH,CARD_HEIGHT,{fit:'cover'}).blur(25)
      .modulate({brightness:.50,saturation:.76}).png().toBuffer();
    layers.push({input:blurred,left:0,top:0});
  }
  layers.push({input:new Resvg(overlaySVG(data,kind,credits,hasCover,logoLayers.map(Boolean)),
    {font:socialFontOptions}).render().asPng(),left:0,top:0});
  if(actual){
    const w=hasCover?326:252,h=hasCover?502:290,x=hasCover?822:853,y=hasCover?57:175;
    const art=await sharp(actual,{limitInputPixels:24_000_000}).rotate()
      .resize(w,h,{fit:'contain',background:'#00000000'}).png().toBuffer();
    layers.push({input:art,left:x,top:y});
  }
  for(let i=0;i<logoLayers.length;i++){
    if(!logoLayers[i])continue;
    const g=creditGeometry(credits.length,i,true).tile;
    const m=await sharp(logoLayers[i]).metadata();
    layers.push({input:logoLayers[i],left:Math.round(g.x+(g.width-m.width)/2),
      top:Math.round(g.y+(g.height-m.height)/2)});
  }
  return sharp({create:{width:CARD_WIDTH,height:CARD_HEIGHT,channels:4,background:INK}})
    .composite(layers).png({compressionLevel:9,palette:true,effort:6}).toBuffer();
}
