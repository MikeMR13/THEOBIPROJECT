// Fase 3 móvil: presupuestos sobre artefactos REALES del build; no simula LCP de producción.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

assert(existsSync('dist/index.html'), 'Ejecutar npm run build antes de esta comprobación');
const dir = 'dist/';
const files = readdirSync(dir).filter(name => /\.(?:js|css)$/.test(name) && statSync(dir + name).isFile());
const index = readFileSync(dir + 'index.html');
const html = index.toString('utf8');
const startup = new Set([...html.matchAll(/\b(?:src|href)="\/([\w-]+\.(?:js|css))\?v=[^"#]+"/g)].map(m => m[1]));
assert(startup.has('app.js') && startup.has('styles.css'), 'No se pudieron identificar los recursos iniciales');
const metrics = files.map(name => {
  const bytes = readFileSync(dir + name);
  return { name, raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length };
});
const byName = new Map(metrics.map(m => [m.name, m]));
for (const name of startup) assert(byName.has(name), `Recurso de arranque ausente: ${name}`);
const sum = rows => rows.reduce((a, b) => a + b.gzip, 0);
const initialGzip = sum([...startup].map(n => byName.get(n)));
const allGzip = sum(metrics);
const htmlGzip = gzipSync(index, { level: 9 }).length;
const KiB = 1024;
const limit = (name, fallback) => {
  const value = Number(process.env[name] || fallback);
  assert(Number.isFinite(value) && value > 0, `Límite inválido: ${name}`);
  return value * KiB;
};
const limits = {
  initial: limit('OBI_PHASE3_INITIAL_GZIP_KIB', 750),
  all: limit('OBI_PHASE3_ASSETS_GZIP_KIB', 1500),
  html: limit('OBI_PHASE3_HTML_GZIP_KIB', 12),
};
const fmt = n => (n / KiB).toFixed(1) + ' KiB';
const rows = [
  ['HTML inicial comprimido', htmlGzip, limits.html],
  ['JS/CSS referenciados en HTML, sin duplicados', initialGzip, limits.initial],
  ['Todos los JS/CSS distribuidos', allGzip, limits.all],
];
const report = [
  '### Fase 3 — presupuesto de recursos (build local)',
  '',
  '| Indicador | Medición gzip | Límite de regresión |',
  '|---|---:|---:|',
  ...rows.map(([n, actual, max]) => `| ${n} | ${fmt(actual)} | ${fmt(max)} |`),
  '',
  `Archivos JS/CSS: ${metrics.length} · Referencias iniciales únicas: ${startup.size}.`,
  '',
  '**Alcance:** tamaños de los archivos generados; no equivalen a transferencia de red, LCP, INP ni CLS reales.',
  '',
  'Mayores recursos gzip:',
  ...metrics.sort((a, b) => b.gzip - a.gzip).slice(0, 8).map(m => `- ${m.name}: ${fmt(m.gzip)}`),
].join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
const failures = rows.filter(([, measured, max]) => measured > max);
assert(!failures.length, 'Presupuesto de Fase 3 excedido: ' + failures.map(r => r[0]).join(', '));
