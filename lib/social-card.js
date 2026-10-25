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
// Se permite la imagen del lector ya utilizada por el propio sitio (bucket
// público legacy). Nunca se admiten hosts, paths ni query strings arbitrarios.
const READER_LOGO_PATH=/^\/storage\/v1\/object\/public\/nlobi-media\/teams\/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\/profile\/reader-logo-[0-9]+\.(?:png|webp|jpe?g)$/i;
export function safeTranslatorAsset(url,context){
  if(safeSocialAsset(url,context))return true;
  try{
    const u=new URL(url);
    return u.protocol==='https:' && u.origin==='https://hfbpsizgwzvvznrktiuq.supabase.co'
      && !u.username && !u.password && !u.port && !u.search && !u.hash
      && READER_LOGO_PATH.test(u.pathname);
  }catch{return false;}
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
export async function getRemoteImage(url,context,fetchImpl=fetch,allowTranslator=false){
  if(!(allowTranslator?safeTranslatorAsset(url,context):safeSocialAsset(url,context)))return null;
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
  const gap=9,width=(668-gap*(count-1))/count;
  const x=61+index*(width+gap),y=505;
  return {x,y,width,height:70,
    tile:hasLogo?{x:x+10,y:y+6,width:width-20,height:58}:null,
    textX:x+19,textY:y+47,textWidth:width-38};
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

export async function logoSurfaceColor(buffer){
  if(!buffer)return '#f3ecd9';
  try{
    const {data,info}=await sharp(buffer).ensureAlpha().resize(48,48,{fit:'contain',
      background:'#00000000'}).raw().toBuffer({resolveWithObject:true});
    let sum=0,count=0;
    for(let i=0;i<data.length;i+=info.channels){
      if(data[i+3]<45)continue;
      sum+=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];count++;
    }
    return count && sum/count>160 ? '#1c1710' : '#f3ecd9';
  }catch{return '#f3ecd9';}
}
export function overlaySVG(data,kind,credits=[],cover=false,logoFlags=[],surfaces=[]){
  const title=titleLayout(data,kind),lineStep=title.size+9;
  const first=title.lines.length===1?252:title.lines.length===2?239:222;
  const last=first+(title.lines.length-1)*lineStep;
  const category=cardKind(kind,!!data.prelaunch);
  const author=tidy(data.author||'',48),genres=Array.isArray(data.genres)?data.genres.slice(0,2)
    .map(x=>tidy(x,26)).filter(Boolean):[];
  const info=[author?'Autor: '+author:'',...genres].filter(Boolean).join(' · ');
  const note=wrap(tidy(data.socialDescription||data.description||'',125),628,19,2).lines;
  const infoY=Math.max(last+37,373),noteY=infoY+(info?30:5);
  // El logo y el nombre son salidas EXCLUYENTES; el nombre solo aparece como
  // alternativa cuando falta la imagen o su descarga/validación falla.
  const cCount=credits.length;
  const cards=credits.map((c,i)=>{
    const g=creditGeometry(cCount,i,logoFlags[i]===true),x=g.x,chipW=g.width,hasLogo=logoFlags[i]===true;
    const bg=hasLogo?(surfaces[i]||PAPER):'#211b13';
    const content=hasLogo?'':glyph(x+19,552,wrap(c.name,chipW-32,cCount===1?29:cCount===2?22:18,1).lines[0]||'',
      cCount===1?29:cCount===2?22:18,PAPER,700);
    return '<rect x="'+x+'" y="505" width="'+chipW+'" height="70" rx="7" fill="'+bg+
      '" stroke="'+GOLD+'" stroke-width="1.5"/>'+content;
  }).join('');
  const titles=title.lines.map((txt,i)=>glyph(65,first+i*lineStep,txt,title.size,INK,700)).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">'+
    '<defs><linearGradient id="shade"><stop stop-color="#15110e" stop-opacity=".8"/>'+
    '<stop offset=".75" stop-color="#15110e" stop-opacity=".21"/><stop offset="1" stop-color="#15110e" stop-opacity=".04"/></linearGradient></defs>'+
    // Panel marfil con barra superior, igual que las fichas editoriales del catálogo.
    '<rect x="20" y="21" width="727" height="589" rx="2" fill="'+PAPER+'"/>'+
    '<rect x="20" y="21" width="727" height="116" fill="'+INK+'"/>'+
    '<rect x="20" y="133" width="727" height="7" fill="'+GOLD+'"/>'+
    '<rect x="20" y="603" width="727" height="7" fill="'+GOLD+'"/>'+
    glyph(141,92,'El Obi del Lector',38,PAPER,700)+
    '<rect x="63" y="164" width="'+Math.min(330,Math.max(184,category.length*14+28))+
      '" height="39" fill="'+GOLD+'"/>'+
    glyph(76,192,category,20,INK,700)+
    titles+
    '<rect x="65" y="'+(last+11)+'" width="62" height="5" fill="'+GOLD+'"/>'+
    (info?glyph(65,infoY,wrap(info,632,18,1).lines[0],18,'#5a4c2d',700):'')+
    (noteY+note.length*26<477?note.map((line,i)=>glyph(65,noteY+i*26,line,19,'#4b463e')).join(''):'')+
    // Créditos: panel negro sobrio, logo único a gran formato O texto.
    '<rect x="47" y="473" width="692" height="115" fill="'+INK+'"/>'+
    glyph(62,495,cCount?'TRADUCCIÓN':'EL OBI DEL LECTOR',16,GOLD,700,'letter-spacing="2"')+
    cards+
    // Columna visual de portada y cinta dorada, sin duplicar datos en miniaturas.
    '<path d="M772 35 H1178 M772 593 H1178" stroke="'+GOLD+'" stroke-width="4"/>'+
    '<rect x="778" y="39" width="393" height="549" rx="2" fill="#160e0c" stroke="'+GOLD+'" stroke-width="2.5"/>'+
    (cover?'<rect x="782" y="520" width="385" height="49" fill="'+GOLD+'" opacity=".94"/>'+
      glyph(809,553,data.prelaunch?'PRÓXIMAMENTE':'NOVELA LIGERA',24,INK,700):'')+
    glyph(66,626,'ELOBIDELLECTOR.COM',17,GOLD,700,'letter-spacing="1.3"')+
    '</svg>';
}
export async function renderSocialCard({data,kind,backend,origin,fetchImpl=fetch}){
  if(!['home','serie','leer','equipo'].includes(kind))throw new Error('Tipo de tarjeta no permitido');
  const context={backend,origin};
  const source=kind==='home'?icon():await getRemoteImage(data.image,context,fetchImpl);
  const actual=source||icon(),hasCover=!!actual&&kind!=='home';
  const credits=['serie','leer'].includes(kind)?displayCredits(data.credits):[];
  const logos=await Promise.all(credits.map(c=>c.logo
    ?getRemoteImage(c.logo,context,fetchImpl,true):null));
  const layers=[];
  if(actual&&hasCover){
    const blurred=await sharp(actual,{limitInputPixels:24_000_000}).rotate()
      .resize(CARD_WIDTH,CARD_HEIGHT,{fit:'cover'}).blur(22)
      .modulate({brightness:.6,saturation:.83}).png().toBuffer();
    layers.push({input:blurred,left:0,top:0});
  }
  const cCount=credits.length,creditW=668,creditGap=9,creditX=61;
  const chipW=cCount?(creditW-creditGap*(cCount-1))/cCount:creditW;
  const prepared=await Promise.all(logos.map((buf)=>buf
    ?prepareTranslatorLogo(buf,Math.round(chipW-22),62):null));
  const surfaces=await Promise.all(prepared.map(buf=>logoSurfaceColor(buf)));
  const svg=overlaySVG(data,kind,credits,hasCover,prepared.map(Boolean),surfaces);
  layers.push({input:new Resvg(svg,{font:socialFontOptions}).render().asPng(),left:0,top:0});
  // Reutilizar el icono PNG REAL que usa la web, en vez de dibujar un símbolo nuevo.
  const brandIcon=icon();
  if(brandIcon){
    const mark=await sharp(brandIcon,{limitInputPixels:24_000_000})
      .resize(72,72,{fit:'contain',background:'#00000000'}).png().toBuffer();
    layers.push({input:mark,left:50,top:40});
  }
  if(actual){
    const coverImg=await sharp(actual,{limitInputPixels:24_000_000}).rotate()
      .resize(hasCover?376:245,hasCover?513:300,{fit:'contain',background:'#00000000'})
      .png().toBuffer();
    layers.push({input:coverImg,left:hasCover?787:845,top:hasCover?48:165});
  }
  for(let i=0;i<prepared.length;i++){
    const buf=prepared[i];if(!buf)continue;
    const meta=await sharp(buf).metadata(),left=creditX+i*(chipW+creditGap);
    layers.push({input:buf,left:Math.round(left+(chipW-meta.width)/2),
      top:Math.round(505+(70-meta.height)/2)});
  }
  return sharp({create:{width:CARD_WIDTH,height:CARD_HEIGHT,channels:4,background:INK}})
    .composite(layers).png({compressionLevel:9,palette:true,effort:6}).toBuffer();
}
