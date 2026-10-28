// Prueba de Chromium con archivos EPUB, DOCX y PDF construidos íntegramente en memoria.
// CDN esm.sh: es una prueba explícita de las dependencias que usa el importador real.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';

const u16=n=>{const b=Buffer.alloc(2);b.writeUInt16LE(n);return b};
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n>>>0);return b};
function crc32(buf){let c=0xffffffff;for(const x of buf){c^=x;for(let i=0;i<8;i++)c=c&1?(c>>>1)^0xedb88320:c>>>1}return (c^0xffffffff)>>>0}
function makeZip(entries){
  const local=[],central=[];let off=0;
  for(const [filename,value] of Object.entries(entries)){
    const name=Buffer.from(filename),bytes=Buffer.isBuffer(value)?value:Buffer.from(value);
    const sig=u32(crc32(bytes)),size=u32(bytes.length);
    const localFile=Buffer.concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),sig,size,size,u16(name.length),u16(0),name,bytes]);
    const dir=Buffer.concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),sig,size,size,u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off),name]);
    local.push(localFile);central.push(dir);off+=localFile.length;
  }
  const directory=Buffer.concat(central);
  const end=Buffer.concat([u32(0x06054b50),u16(0),u16(0),u16(central.length),u16(central.length),u32(directory.length),u32(off),u16(0)]);
  return Buffer.concat([...local,directory,end]);
}
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9SsuJVsAAAAASUVORK5CYII=','base64');
const epub=makeZip({
'mimetype':'application/epub+zip',
'META-INF/container.xml':'<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
'OPS/book.opf':'<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">urn:uuid:123</dc:identifier><dc:title>Novela de validación</dc:title><dc:language>es</dc:language></metadata><manifest><item id="ch1" href="uno.xhtml" media-type="application/xhtml+xml"/><item id="ch2" href="dos.xhtml" media-type="application/xhtml+xml"/><item id="cover" href="cover.png" media-type="image/png" properties="cover-image"/></manifest><spine><itemref idref="ch1"/><itemref idref="ch2"/></spine></package>',
'OPS/uno.xhtml':'<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Capítulo primero</title></head><body><h1>Capítulo primero</h1><p>Texto del primer capítulo de ejemplo.</p><figure><img src="cover.png" alt="Portada"/></figure></body></html>',
'OPS/dos.xhtml':'<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Capítulo segundo</title></head><body><h1>Capítulo segundo</h1><p>Segundo capítulo completo.</p></body></html>',
'OPS/cover.png':png
});
const docx=makeZip({
'[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
'_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
'word/document.xml':'<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Capítulo DOCX</w:t></w:r></w:p><w:p><w:r><w:t>Prueba de conversión DOCX con texto completo.</w:t></w:r></w:p></w:body></w:document>'
});
function makePdf(){
  const content='BT /F1 20 Tf 50 750 Td (Capitulo de prueba) Tj /F1 12 Tf 0 -32 Td (Texto de muestra PDF en pagina uno.) Tj ET\n';
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length '+Buffer.byteLength(content)+' >>\nstream\n'+content+'endstream'
  ];
  let body='%PDF-1.4\n';const offsets=[0];
  objects.forEach((obj,i)=>{offsets.push(Buffer.byteLength(body));body+=(i+1)+' 0 obj\n'+obj+'\nendobj\n'});
  const start=Buffer.byteLength(body);
  body+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
  for(const o of offsets.slice(1))body+=String(o).padStart(10,'0')+' 00000 n \n';
  body+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
  return Buffer.from(body);
}
const fixtures={'/fixtures/qa.epub':epub,'/fixtures/qa.docx':docx,'/fixtures/qa.pdf':makePdf()};
const html='<!doctype html><html lang="es"><meta charset="utf-8"><p id="qa-result" data-status="running">Leyendo EPUB/DOCX/PDF…</p><script>setTimeout(()=>{const p=document.getElementById("qa-result");if(p.dataset.status==="running"){p.dataset.status="fail";p.textContent="No completó la decodificación en 40 segundos";}},40000)</script><script type="module" src="/__qa__/test.mjs"></script></html>';
const server=createServer((req,res)=>{
  const path=(req.url||'/').split('?')[0];res.setHeader('Cache-Control','no-store');
  if(fixtures[path]){res.setHeader('Content-Type','application/octet-stream');res.end(fixtures[path]);return;}
  if(path==='/__qa__/test.mjs'){res.setHeader('Content-Type','text/javascript');res.end(readFileSync('scripts/fixtures/importer-formats-browser-qa.mjs'));return;}
  if(path==='/studio-importer.js'){
    let src=readFileSync('src/studio-importer.js','utf8');
    assert(src.includes('  return importer;'));
    src=src.replace('  return importer;', '  return Object.assign(importer,{qaParseEpub:parseEpub,qaParseDocx:parseDocx,qaParsePdf:parsePdf});');
    res.setHeader('Content-Type','text/javascript');res.end(src);return;
  }
  if(/^\/[\w-]+\.js$/.test(path)&&existsSync('src/'+path.slice(1))){
    res.setHeader('Content-Type','text/javascript');res.end(readFileSync('src/'+path.slice(1)));return;
  }
  res.setHeader('Content-Type','text/html');res.end(html);
});
const chrome=process.env.QA_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(chrome,'Chromium no está instalado');
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const target='http://127.0.0.1:'+server.address().port+'/';
  const cmd=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-background-networking','--window-size=900,900','--virtual-time-budget=48000','--dump-dom',target];
  const p=spawn(chrome,cmd,{stdio:['ignore','pipe','pipe']});let out='',err='';
  p.stdout.on('data',c=>{out+=String(c).slice(0,450000)});p.stderr.on('data',c=>{err+=String(c).slice(0,25000)});
  const exit=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{p.kill('SIGKILL');reject(new Error('Chromium tardó más de 90 segundos'))},90000);
    p.once('error',e=>{clearTimeout(timer);reject(e)});
    p.once('close',c=>{clearTimeout(timer);resolve(c)});
  });
  assert.equal(exit,0,err.slice(-1200));
  const m=out.match(/<p id="qa-result" data-status="(pass|fail)">([\s\S]*?)<\/p>/);
  assert(m,'No se obtuvo resultado del importador en Chromium: '+out.slice(-1200)+' '+err.slice(-800));
  assert.equal(m[1],'pass',m[2]);
  console.log('Decodificadores EPUB, DOCX y PDF con archivos sintéticos: '+m[2]);
}finally{await new Promise(resolve=>server.close(resolve))}
