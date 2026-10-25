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
  // cardTitle explícito (capítulos/volúmenes): el título grande es la obra.
  if(data.cardTitle)return normalizeDisplay(tidy(data.cardTitle,240));
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
// Las MAYÚSCULAS de Plex Sans Bold miden ~0.68em: con 0.55 un nombre como
// «OX-MR TRADUCCIONES» se salía del panel.
const widthOf=(s,size)=>[...s].reduce((n,ch)=>n+(
  /[MWÁÉÍÓÚÑ]/.test(ch)?.86:/[A-ZÀ-Ý]/.test(ch)?.68:/[mwoQ]/.test(ch)?.69:/[ilI!.,:;¡|]/.test(ch)?.29:
  /\s/.test(ch)?.28:.56),0)*size;
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
  for(const size of [66,62,58,54,49]){
    const r=wrap(heading,642,size,3);
    if(!r.clipped&&r.lines.every(l=>widthOf(l,size)<=642))return {lines:r.lines,size};
  }
  return {lines:wrap(heading,642,49,3).lines,size:49};
}
export function displayCredits(items){
  return Array.isArray(items)?items.filter(x=>x&&tidy(x.name,46)).slice(0,3)
    .map(x=>({name:tidy(x.name,46),logo:typeof x.logo==='string'?x.logo:'',primary:!!x.primary})):[];
}
// Zona exclusiva para la identidad pública del traductor: o PNG o nombre.
// Sin logotipo no aparece ni icono genérico ni etiqueta adicional.
export function creditGeometry(count,index,hasLogo){
  const x=58, y=466, total=681, gap=10;
  const width=(total-gap*(count-1))/Math.max(1,count);
  const left=x+index*(width+gap), height=112;
  return {x:left,y,width,height,
    tile:hasLogo?{x:left+9,y:y+9,width:width-18,height:height-18}:null,
    textX:left+22,textY:y+69,textWidth:width-44};
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
// Opción D «Obi + Subrayado»: faja negra con borde dorado junto al sello
// (categoría/volumen) y trazo dorado detrás de cada línea del título.
export const cardKicker=(data,kind)=>tidy(data.cardKicker||cardKind(kind,data.prelaunch),60).toUpperCase();
const kick=(x,y,v)=>'<text x="'+x+'" y="'+y+'" font-family="IBM Plex Sans" font-size="17" font-weight="700" letter-spacing="3" fill="'+GOLD+'">'+xml(v)+'</text>';
export function overlaySVG(data,kind,credits=[],cover=false,logoFlags=[],surfaces=[]){
  // Cuatro elementos y NADA MÁS: logo oficial, título, portada, traductor.
  // Los metadatos SEO (sinopsis, autor, géneros) siguen en HTML pero no en PNG.
  const title=titleLayout(data,kind),step=title.size+11;
  const first=title.lines.length===1?329:title.lines.length===2?278:235;
  const n=credits.length;
  const cards=credits.map((c,i)=>{
    const g=creditGeometry(n,i,logoFlags[i]===true);
    const hasLogo=logoFlags[i]===true;
    const color=hasLogo?(surfaces[i]||PAPER):INK;
    const textSize=n===1?31:n===2?23:19;
    // No escribimos el nombre cuando se pinta su PNG autorizado.
    const name=hasLogo?'':glyph(g.textX,g.textY,
      wrap(c.name,g.textWidth,textSize,1).lines[0]||'',textSize,PAPER,700);
    return '<rect x="'+g.x+'" y="'+g.y+'" width="'+g.width+
      '" height="'+g.height+'" rx="8" fill="'+color+
      '" stroke="'+GOLD+'" stroke-width="2"/>'+name;
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">'+
    '<defs><linearGradient id="ambient" x1="0" x2="1"><stop stop-color="#0d0c0a" stop-opacity=".9"/>'+
      '<stop offset=".7" stop-color="#17120c" stop-opacity=".55"/>'+
      '<stop offset="1" stop-color="#17120c" stop-opacity=".12"/></linearGradient></defs>'+
    '<rect width="1200" height="630" fill="url(#ambient)"/>'+
    '<rect x="21" y="22" width="735" height="587" rx="4" fill="'+PAPER+'"/>'+
    '<rect x="21" y="22" width="735" height="8" fill="'+GOLD+'"/>'+
    '<rect x="21" y="601" width="735" height="8" fill="'+GOLD+'"/>'+
    '<rect x="168" y="76" width="588" height="58" fill="'+INK+'"/>'+
    '<rect x="168" y="76" width="588" height="3" fill="'+GOLD+'"/>'+
    '<rect x="168" y="131" width="588" height="3" fill="'+GOLD+'"/>'+
    kick(196,111,wrap(cardKicker(data,kind),470,17,1).lines[0]||'')+
    '<rect x="694" y="100" width="10" height="10" fill="'+GOLD+'"/><rect x="712" y="100" width="10" height="10" fill="'+GOLD+'" fill-opacity=".55"/><rect x="730" y="100" width="10" height="10" fill="'+GOLD+'" fill-opacity=".25"/>'+
    // Sello del sitio pintado después con su PNG real.
    '<rect x="56" y="49" width="112" height="112" rx="10" fill="'+INK+'"/>'+
    (data.cardSub?glyph(62,Math.round(first-title.size*.74-22),wrap(data.cardSub,642,20,1).lines[0]||'',20,'#4a443a',600):'')+
    title.lines.map((line,i)=>{const y=first+i*step;
      return '<rect x="56" y="'+(y-title.size*.26).toFixed(1)+'" width="'+Math.min(widthOf(line,title.size)+14,690).toFixed(1)+
        '" height="'+(title.size*.36).toFixed(1)+'" fill="'+GOLD+'" fill-opacity=".62"/>'+glyph(62,y,line,title.size,INK,700);}).join('')+
    cards+
    // Marco de portada. Sin bandas, etiquetas, dominios ni texto auxiliar.
    '<rect x="775" y="31" width="406" height="568" rx="7" fill="#140f0d" stroke="'+GOLD+'" stroke-width="3"/>'+
    '</svg>';
}
export async function renderSocialCard({data,kind,backend,origin,fetchImpl=fetch}){
  if(!['home','serie','leer','equipo'].includes(kind))throw new Error('Tipo de tarjeta no permitido');
  const context={backend,origin};
  const source=kind==='home'?icon():await getRemoteImage(data.image,context,fetchImpl);
  const actual=source||icon();
  const credits=['serie','leer'].includes(kind)?displayCredits(data.credits):[];
  const logos=await Promise.all(credits.map(c=>c.logo?getRemoteImage(c.logo,context,fetchImpl,true):null));
  const prepared=await Promise.all(logos.map((buf,i)=>{
    if(!buf)return null;
    const tile=creditGeometry(credits.length,i,true).tile;
    return prepareTranslatorLogo(buf,Math.round(tile.width),Math.round(tile.height));
  }));
  const surfaces=await Promise.all(prepared.map(buf=>logoSurfaceColor(buf)));
  const layers=[];
  // Portada ambiental visible solo alrededor del panel, sin competir con el título.
  if(actual&&kind!=='home'){
    const backdrop=await sharp(actual,{limitInputPixels:24_000_000}).rotate()
      .resize(CARD_WIDTH,CARD_HEIGHT,{fit:'cover'}).blur(27)
      .modulate({brightness:.48,saturation:.72}).png().toBuffer();
    layers.push({input:backdrop,left:0,top:0});
  }
  layers.push({input:new Resvg(overlaySVG(data,kind,credits,!!actual,prepared.map(Boolean),surfaces),
    {font:socialFontOptions}).render().asPng(),left:0,top:0});
  // Logo corporativo AUTÉNTICO. No repetir nombre del sitio en texto.
  const brand=icon();
  if(brand){
    const mark=await sharp(brand,{limitInputPixels:24_000_000}).rotate()
      .resize(104,104,{fit:'contain',background:'#00000000'}).png().toBuffer();
    layers.push({input:mark,left:60,top:53});
  }
  if(actual){
    const cover=await sharp(actual,{limitInputPixels:24_000_000}).rotate()
      .resize(378,539,{fit:'contain',background:'#00000000'}).png().toBuffer();
    layers.push({input:cover,left:789,top:45});
  }
  for(let i=0;i<prepared.length;i++){
    if(!prepared[i])continue;
    const g=creditGeometry(credits.length,i,true).tile;
    const m=await sharp(prepared[i]).metadata();
    layers.push({input:prepared[i],left:Math.round(g.x+(g.width-m.width)/2),
      top:Math.round(g.y+(g.height-m.height)/2)});
  }
  return sharp({create:{width:CARD_WIDTH,height:CARD_HEIGHT,channels:4,background:INK}})
    .composite(layers).png({compressionLevel:9,palette:true,effort:6}).toBuffer();
}
