// Se ejecuta en Chromium contra documentos ZIP/PDF generados en memoria, sin Supabase.
const result=document.getElementById('qa-result');
window.__qaStage='iniciando módulo';
window.addEventListener('error',e=>{if(result.dataset.status==='running'){result.dataset.status='fail';result.textContent='JS: '+e.message}});
const check=(condition,message)=>{if(!condition)throw new Error(message)};
try{
  window.__qaStage='importando módulo';
  const {createImporter}=await import('/studio-importer.js');
  window.__qaStage='creando importador';
  const imp=createImporter({LIMITS:{file:80*1024*1024,entries:15000,unzipped:300*1024*1024,image:8*1024*1024}});
  async function fixture(name,method,type){
    window.__qaStage='cargando '+name;
    const r=await fetch('/fixtures/'+name);
    check(r.ok,'Falta archivo real '+name);
    const file=new File([await r.arrayBuffer()],name,{type});
    window.__qaStage='decodificando '+name;
    const output=await imp[method](file);
    window.__qaStage='decodificado '+name;
    return output;
  }
  const epub=await fixture('qa.epub','qaParseEpub','application/epub+zip');
  check(epub.title==='Novela de validación','EPUB: título ausente');
  check(epub.chapters.length===2,'EPUB: el spine no produjo 2 capítulos');
  check(epub.chapters[0].blocks.some(b=>b.type==='image'),'EPUB: perdió ilustración');
  check(epub.chapters[0].blocks.some(b=>b.type==='paragraph'&&/Texto del primer/.test(b.text)),'EPUB: perdió contenido');
  check(epub.cover?.startsWith('img:'),'EPUB: no recuperó portada');
  const docx=await fixture('qa.docx','qaParseDocx','application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  check(docx.chapters.length>=1,'DOCX: no creó capítulos');
  check(docx.chapters.some(c=>c.blocks.some(b=>/Prueba de conversión DOCX/.test(b.text||''))),'DOCX: contenido perdido');
  const pdf=await fixture('qa.pdf','qaParsePdf','application/pdf');
  check(pdf.chapters.length>=1,'PDF: no creó secciones');
  check(pdf.chapters.some(c=>c.blocks.some(b=>/Texto de muestra PDF/.test(b.text||''))),'PDF: texto extraído incorrectamente');
  result.dataset.status='pass';
  result.textContent='EPUB (2 capítulos, imagen y portada), DOCX (contenido), PDF (texto) validados con decodificadores originales';
}catch(e){
  result.dataset.status='fail';
  result.textContent=(e?.stack||String(e)).slice(0,650);
}
