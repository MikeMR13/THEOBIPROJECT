// Composición 1200×630 de El Obi del Lector. Solo se usa en el servidor.
// Portadas e imágenes de equipos se reutilizan sin modificarlas ni recortarlas.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
const INK = '#0d0c0a', GOLD = '#f2c230', PAPER = '#f3ecd9', MUTE = '#a89f8a';
const xml = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[m]))
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,' ');
const tidy = (v,n=180) => String(v ?? '').replace(/<[^>]*>/g,' ').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
export function safeSocialAsset(url,{backend,origin}) {
  if (!url || typeof url !== 'string') return false;
  let u;
  try {u=new URL(url);} catch {return false;}
  if(u.protocol!=='https:' || u.username || u.password || u.port || u.search || u.hash) return false;
  const own=new URL(origin);
  const remote=new URL(backend); // Backend Supabase explícito, nunca derivado del visitante
  if(remote.protocol!=='https:' || remote.username || remote.password || remote.port || (remote.pathname!=='/' && remote.pathname!==''))return false;
  return (u.origin===remote.origin && u.pathname.startsWith('/storage/v1/object/public/obi-media/')) ||
    (u.origin===own.origin && u.pathname==='/icon-512.png');
}
export function cardKind(kind) {
  return ({home:'BIBLIOTECA DIGITAL',serie:'NOVELA LIGERA',leer:'CAPÍTULO PUBLICADO',equipo:'EQUIPO TRADUCTOR'})[kind]||'';
}
export function cardTitle(data,kind) {
  if(kind==='home') {
    const label=tidy(data.socialTitle||data.title||'Novelas ligeras en español latino',120)
      .replace(/^El Obi del Lector\s*[—–:-]\s*/i,'');
    return label||'Novelas ligeras en español latino';
  }
  // La composición debe reflejar las preferencias editoriales, no solo el
  // og:title: en capítulos el heading incluye el número de capítulo.
  return tidy(data.socialTitle||data.heading||data.title,120);
}
function lines(text,maxWidth=470,maxLines=4) {
  const words=tidy(text,160).split(' ').filter(Boolean);
  const chunks=[];let part='';
  const estimate=s=>[...s].reduce((n,ch)=>n+(/[MWÁÉÓÚÑ]/.test(ch)?1.16:/[fil\.]/i.test(ch)?.4:ch===' '? .37:.78),0);
  for(const word of words) {
    const test=part?part+' '+word:word;
    if(estimate(test)*37<=maxWidth || !part)part=test;
    else {chunks.push(part);part=word;}
  }
  if(part)chunks.push(part);
  let cut=chunks.length>maxLines?chunks.slice(0,maxLines):chunks;
  if(chunks.length>maxLines)cut[cut.length-1]=cut[cut.length-1].replace(/[.,;:\s]+$/,'')+'…';
  return cut;
}
const icon = () => {try{return readFileSync(new URL('../public/icon-512.png',import.meta.url));}catch{return null;}};
const getRemoteImage=async (url,context,fetchImpl) => {
  if(!safeSocialAsset(url,context))return null;
  const ac=new AbortController(),timeout=setTimeout(()=>ac.abort(),2800);
  try {
    const res=await fetchImpl(url,{signal:ac.signal,redirect:'manual',headers:{Accept:'image/jpeg,image/png,image/webp'}});
    if(!res.ok || res.status>=300 || res.headers.get('location'))return null;
    const type=(res.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(!['image/jpeg','image/png','image/webp'].includes(type))return null;
    const length=Number(res.headers.get('content-length')||0);
    if(length>4_000_000)return null;
    const chunks=[];let total=0;
    for await(const chunk of res.body||[]) {
      total+=chunk.length;if(total>4_000_000)return null;chunks.push(chunk);
    }
    const buf=Buffer.concat(chunks,total);
    const meta=await sharp(buf,{limitInputPixels:24_000_000,failOn:'error'}).metadata();
    if(!['jpeg','png','webp'].includes(meta.format) || !meta.width || !meta.height)return null;
    return buf;
  }catch{return null;}finally{clearTimeout(timeout);}
};
const glyph=(x,y,text,scale=1,attrs='')=>'<text x="'+x+'" y="'+y+'" font-size="'+scale+'" '+attrs+'>'+xml(text)+'</text>';
function overlay(data,kind,hasImage) {
  const heading=cardTitle(data,kind);
  const list=lines(heading,hasImage?535:960,4);
  const lineHeight=hasImage?63:71;
  const sz=hasImage?(list.length>3?42:list.length>2?46:52):60;
  const y0=hasImage?(list.length>3?228:250):(list.length>2?270:301);
  const desc=tidy(data.socialDescription||data.description||'Novelas ligeras en español latino.',110);
  const descLines=lines(desc,hasImage?560:900,2);
  const subtitle=kind==='leer'?tidy(data.heading||'',85):'';
  const intro=cardKind(kind);
  const col1=hasImage?58:84;
  const lineEls=list.map((l,i)=>glyph(col1,y0+i*lineHeight,l,sz,'font-family="sans-serif" font-weight="700" fill="'+PAPER+'"')).join('');
  const descY=Math.min(514,y0+list.length*lineHeight+17);
  const smalls=descLines.map((l,i)=>glyph(col1,descY+i*30,l,21,'font-family="sans-serif" fill="'+PAPER+'" opacity=".79"')).join('');
  const accent='<rect x="'+col1+'" y="'+(y0-45)+'" width="42" height="5" fill="'+GOLD+'"/>';
  const bands=hasImage?'<rect x="738" y="480" width="389" height="61" rx="3" fill="'+GOLD+'"/>'+glyph(756,516,kind==='equipo'?'TRADUCCIONES EN ESPAÑOL':'LECTURA EN ESPAÑOL',22,'font-family="sans-serif" font-weight="800" fill="'+INK+'"'):null;
  return Buffer.from('<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">'+
    '<defs><linearGradient id="grad"><stop offset="0" stop-color="#0d0c0a" stop-opacity=".95"/><stop offset=".72" stop-color="#0d0c0a" stop-opacity=".87"/><stop offset="1" stop-color="#0d0c0a" stop-opacity=".5"/></linearGradient></defs>'+
    '<rect width="1200" height="630" fill="url(#grad)"/>'+
    '<path d="M36 36 H1164 V594 H36 Z" stroke="#f2c230" stroke-opacity=".31" fill="none" stroke-width="2"/>'+
    '<rect x="'+col1+'" y="60" width="48" height="48" fill="'+INK+'" stroke="'+GOLD+'" stroke-width="2"/>'+
    glyph(col1+13,94,'帯',32,'font-family="sans-serif" fill="'+GOLD+'" font-weight="700"')+
    glyph(col1+64,94,'EL OBI DEL LECTOR',26,'font-family="sans-serif" fill="'+PAPER+'" font-weight="700" letter-spacing="1"')+
    glyph(col1,158,intro,19,'font-family="monospace" fill="'+GOLD+'" letter-spacing="2"')+
    accent+lineEls+smalls+(bands||'')+
    glyph(col1,580,'ELOBIDELLECTOR.COM',21,'font-family="monospace" fill="'+MUTE+'" letter-spacing="2"')+
    '<path d="M820 90 C950 100 1060 125 1160 200" stroke="'+GOLD+'" opacity=".18" fill="none" stroke-width="2"/>'+
    '</svg>');
}
export async function renderSocialCard({data,kind,backend,origin,fetchImpl=fetch}) {
  if(!['home','serie','leer','equipo'].includes(kind))throw new Error('Tipo de tarjeta no permitido');
  const logo=icon(),source=kind==='home'?logo:await getRemoteImage(data.image,{backend,origin},fetchImpl);
  const actual=source||logo;
  const cover=actual && kind!=='home';
  let canvas=sharp({create:{width:CARD_WIDTH,height:CARD_HEIGHT,channels:4,background:INK}});
  const composites=[];
  if(actual && cover) {
    try {
      const blur=await sharp(actual,{limitInputPixels:24_000_000}).resize(CARD_WIDTH,CARD_HEIGHT,{fit:'cover'}).blur(28).modulate({brightness:.4,saturation:.7}).png().toBuffer();
      composites.push({input:blur,left:0,top:0});
    } catch {} // fallo de portada nunca impide generar la imagen segura
  }
  // Superposición de identidad en SVG; el texto se escapa antes de incorporarse.
  composites.push({input:overlay(data,kind,!!cover),left:0,top:0});
  if(actual) {
    try {
      const x=kind==='home'?826:766,y=kind==='home'?166:52,w=kind==='home'?248:354,h=kind==='home'?300:415;
      const resized=await sharp(actual,{limitInputPixels:24_000_000}).rotate().resize(w,h,{fit:'contain',background:'#00000000'}).png().toBuffer();
      composites.push({input:resized,left:x,top:y});
    } catch {}
  }
  return canvas.composite(composites).png({compressionLevel:9,palette:true,effort:6}).toBuffer();
}
