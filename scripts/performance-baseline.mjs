// Línea base reproducible del peso inicial: artefactos compilados, sin red ni credenciales.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import vm from 'node:vm';

const ROOT = 'dist';
assert(existsSync('dist/index.html') && existsSync('dist/sw.js'), 'Ejecuta npm run build antes');
const html = readFileSync('dist/index.html', 'utf8');
const rootAssets = new Map();
const externalHosts = new Set();
const filename = url => {
  if (!url.startsWith('/') || url.startsWith('//')) return null;
  const part = url.split(/[?#]/)[0].slice(1);
  if (!/^[\w./-]+\.(?:js|css)$/.test(part) || part.includes('..')) return null;
  return part;
};
for (const match of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
  const tag = match[0], url = /\b(?:href|src)=["']([^"']+)["']/i.exec(tag)?.[1];
  if (!url) continue;
  if (/^https?:\/\//.test(url)) { externalHosts.add(new URL(url).hostname); continue; }
  const file = filename(url);
  if (file) rootAssets.set(file, [...(rootAssets.get(file) || []),
    /\bmodulepreload\b/i.test(tag) ? 'modulepreload' :
      /\bstylesheet\b/i.test(tag) ? 'stylesheet' : 'script']);
}
assert(rootAssets.has('app.js') && rootAssets.has('ui.js') && rootAssets.has('reader.js'),
  'Faltan módulos esenciales del HTML');

// El grafo proviene de imports estáticos del fuente; import(...) queda fuera.
// Los bytes se leen de la compilación minificada real en dist/.
const visited = new Set();
function walk(file) {
  if (visited.has(file)) return;
  visited.add(file);
  if (!file.endsWith('.js')) return;
  const input = join('src', file);
  if (!existsSync(input)) return; // config.js se genera al compilar.
  const source = readFileSync(input, 'utf8');
  const re = /(?:^|\n)\s*(?:import|export)\s+(?:[^;'"()\n]*?\bfrom\s*)?["'](\.?\.?\/[^"']+\.js(?:\?v=[^"']+)?)["']/g;
  for (const item of source.matchAll(re)) {
    const spec = item[1].split('?')[0];
    const next = posix.normalize(spec.startsWith('/') ? spec.slice(1) :
      posix.join(posix.dirname(file), spec));
    assert(!next.startsWith('..') && /^[\w./-]+\.js$/.test(next),
      'Import inválido: ' + file + ' -> ' + spec);
    walk(next);
  }
}
for (const file of rootAssets.keys()) walk(file);
const size = file => {
  const path = join(ROOT, file);
  assert(existsSync(path), 'No existe recurso compilado: ' + file);
  const data = readFileSync(path);
  return { file, bytes: data.length, gzip: gzipSync(data, { level: 9 }).length,
    brotli: brotliCompressSync(data).length };
};
const sums = rows => rows.reduce((out, r) => ({
  bytes: out.bytes + r.bytes, gzip: out.gzip + r.gzip,
  brotli: out.brotli + r.brotli
}), { bytes: 0, gzip: 0, brotli: 0 });
const initial = [...visited].sort().map(size);

const sandbox = { self: { addEventListener() {} }, URL, Response, console };
vm.runInNewContext(readFileSync('dist/sw.js', 'utf8') +
  '\n;globalThis.__baselineSW={version:V,shell:SHELL};', sandbox);
const sw = sandbox.__baselineSW;
assert(Array.isArray(sw?.shell) && sw.shell.length, 'Shell PWA no disponible');
const shellFiles = [...new Set(sw.shell.map(url => url === '/' ?
  'index.html' : url.slice(1).split(/[?#]/)[0]))];
const offline = shellFiles.map(size);
assert(initial.every(x => shellFiles.includes(x.file)),
  'Un módulo estático inicial falta en el shell offline');

const baseline = {
  schema: 1, reference: process.env.GITHUB_SHA || 'local',
  methodology: 'compiled-local-resources-no-network',
  note: 'Estimaciones de recursos; no son tiempos de carga, bytes HTTP medidos ni Core Web Vitals.',
  initial: { fileCount: initial.length, totals: sums(initial), files: initial },
  declaredHtmlAssets: [...rootAssets].sort().map(([file, reasons]) => ({
    file, reasons: [...new Set(reasons)]
  })),
  offline: { version: sw.version, fileCount: offline.length, totals: sums(offline) },
  externalHosts: [...externalHosts].sort(),
  notMeasured: ['networkLatency', 'coldLoad', 'warmLoad', 'apiResponseTime',
    'imageTransfer', 'LCP', 'INP', 'CLS']
};
mkdirSync('qa-performance', { recursive: true });
writeFileSync('qa-performance/initial-load-baseline.json',
  JSON.stringify(baseline, null, 2) + '\n');

const kib = n => (n / 1024).toFixed(1);
const lines = [
  '### Línea base de recursos del arranque (CI aislado)', '',
  '| Medida | Resultado |', '|---|---:|',
  '| Recursos iniciales (HTML + imports estáticos) | ' + initial.length + ' |',
  '| JS/CSS iniciales sin compresión | ' + kib(baseline.initial.totals.bytes) + ' KiB |',
  '| JS/CSS iniciales, estimación gzip | ' + kib(baseline.initial.totals.gzip) + ' KiB |',
  '| JS/CSS iniciales, estimación Brotli | ' + kib(baseline.initial.totals.brotli) + ' KiB |',
  '| Shell PWA, recursos locales | ' + offline.length + ' |',
  '| Shell PWA, estimación gzip | ' + kib(baseline.offline.totals.gzip) + ' KiB |',
  '',
  'No incluye portadas remotas, consultas SQL, fuentes externas ni tiempos de navegador.',
  'Las cargas frías y calientes deberán medirse por separado.', ''
];
console.log(lines.join('\n'));
console.log('Informe JSON: qa-performance/initial-load-baseline.json');
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '\n' + lines.join('\n'));
