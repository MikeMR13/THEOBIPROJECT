// Diagnóstico HTTP público: no necesita credenciales, no escribe en ningún servicio.
const base = 'https://elobidellector.com';
const paths = [
  '/',
  '/catalogo',
  '/serie/evite-el-final-de-aniquilacion-total-a-costa-de-to',
  '/serie/le-prometi-a-la-alumna-ejemplar-de-mi-clase-que-se'
];
let failed = 0;
for (const path of paths) {
  try {
    const response = await fetch(base + path, {
      headers: { 'Accept': 'text/html', 'Cache-Control': 'no-cache' },
      redirect: 'follow', signal: AbortSignal.timeout(15000)
    });
    const body = await response.text();
    const good = response.status === 200 && /<html[\s>]/i.test(body) && /<main\b/i.test(body);
    console.log(JSON.stringify({path, status:response.status, good, contentType:response.headers.get('content-type'),
      length:body.length, bodySample:good ? undefined : body.slice(0,260)}));
    if(!good) failed++;
  } catch (e) {
    failed++;
    console.error(JSON.stringify({path,error:String(e)}));
  }
}
if(failed) {
  console.error('Rutas públicas con errores:',failed);
  process.exitCode = 1;
} else console.log('Todas las rutas públicas devolvieron HTML 200');
