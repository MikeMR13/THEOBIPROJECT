// Presupuesto PWA reproducible: solo artefactos de build aislado, sin red ni Supabase real.
// Ejecutar después de "npm run build" en GitHub Actions.
import assert from 'node:assert/strict';
import { appendFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

assert(existsSync('dist/sw.js'), 'Primero ejecutar npm run build');
const events = new Map();
const sandbox = {
  self: { addEventListener: (event, cb) => events.set(event, cb) },
  URL, Response, console
};
vm.runInNewContext(readFileSync('dist/sw.js', 'utf8') + '\n;globalThis.__pwa={version:V,shell:SHELL};', sandbox);
const { version, shell } = sandbox.__pwa;
assert(/^obi-[0-9a-f]{8}$/.test(version), 'Versión de PWA inválida');
assert(Array.isArray(shell) && shell.length >= 8, 'Arranque offline incompleto');
assert.equal(new Set(shell).size, shell.length, 'Recursos precargados duplicados');
assert(shell.includes('/') && shell.includes('/manifest.webmanifest'), 'Faltan HTML o manifest');
assert(events.has('install') && events.has('activate') && events.has('fetch'), 'Falta un evento esencial del SW');

const source = readFileSync('public/sw.js', 'utf8');
assert(!/\bLAZY\s*\.\s*forEach\s*\(/.test(source), 'No descargar módulos opcionales durante activate');
assert(!/\bconst LAZY\b/.test(readFileSync('scripts/build.mjs', 'utf8')), 'El build no debe serializar una cola de precargas opcionales');
const forbidden = ['/studio.js', '/admin.js', '/profile.js', '/anim.js', '/teampage.js'];
for (const item of forbidden) {
  assert(!shell.some(x => x.startsWith(item + '?') || x === item), 'Módulo opcional en arranque: ' + item);
}

const sizeByFile = [];
for (const url of shell) {
  assert(url.startsWith('/') && !url.includes('..'), 'Ruta de caché insegura: ' + url);
  const file = url === '/' ? 'index.html' : url.slice(1).split('?')[0];
  if (/\.(js|css)$/.test(file)) {
    assert(/\?v=[0-9a-f]{10}$/.test(url), 'Archivo JS/CSS sin sello de contenido: ' + url);
  }
  const path = join('dist', file);
  assert(existsSync(path), 'Falta archivo que la PWA instalará: ' + file);
  sizeByFile.push({ file, bytes: statSync(path).size });
}
const totalBytes = sizeByFile.reduce((sum, item) => sum + item.bytes, 0);
const maxBytes = 2 * 1024 * 1024; // 2 MiB de archivos locales sin compresión.
assert(totalBytes <= maxBytes, 'Arranque PWA sobre presupuesto: ' + totalBytes + ' > ' + maxBytes);
const msg = 'PWA budget: ' + shell.length + ' recursos esenciales, ' + Math.round(totalBytes / 1024) + ' KiB / ' + Math.round(maxBytes / 1024) + ' KiB; sin módulos secundarios en activación';
console.log(msg);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '\n### Presupuesto PWA sin conexión\n\n' +
    '| Métrica | Resultado |\n|---|---:|\n' +
    '| Recursos esenciales | ' + shell.length + ' |\n' +
    '| Tamaño local, sin compresión | ' + Math.round(totalBytes / 1024) + ' KiB |\n' +
    '| Límite | ' + Math.round(maxBytes / 1024) + ' KiB |\n' +
    '| Precarga de módulos opcionales al activar | 0 |\n');
}
