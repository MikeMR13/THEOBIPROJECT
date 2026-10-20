// Contratos básicos de rendimiento sin framework ni dependencias externas.
// Estas comprobaciones no sustituyen Lighthouse, RLS ni pruebas de navegador.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = file => readFileSync(file, 'utf8');

const html = source('src/index.html');
const preload = [...html.matchAll(/rel="modulepreload"\s+href="([^"]+)"/g)].map(m => m[1]);
for (const critical of ['/supabase.js?v=1','/app.js?v=21','/ui.js?v=45','/reader.js?v=18','/blocks.js?v=2']) {
  assert(preload.includes(critical), 'Precarga crítica ausente: ' + critical);
}
for (const optional of ['patreon.js','season.js','anim.js','teampage.js']) {
  assert(!preload.some(p => p.includes(optional)), 'Precarga no crítica: ' + optional);
}
assert.equal((html.match(/rel="preconnect" href="https:\/\/qfllthjpjuaztppvpsrk\.supabase\.co"/g) || []).length, 1, 'Preconnect duplicado');

const ui = source('src/ui.js');
assert(!ui.includes("sb.from('series').select('id,theme').eq('published', true)"), 'Consulta de temas redundante en Home');
assert(ui.includes('S.SEASONS[k]'), 'El inicio debe usar los datos de temporada ya cargados');
assert(!ui.includes("import('/anim.js?v=8').catch(() => null)"), 'Importación redundante de animaciones');

const reader = source('src/reader.js');
assert(reader.includes('const canPrefetch = () =>'), 'El lector debe limitar la precarga');
assert(reader.includes('navigator.connection?.saveData'), 'El lector debe respetar ahorro de datos');

const animation = source('src/anim.js');
assert(animation.includes("document.addEventListener('visibilitychange', onVisibility)"), 'Falta control de pestaña oculta');
assert(animation.includes('vis ? resume() : pause()'), 'Falta pausa fuera de pantalla');

const sw = source('public/sw.js');
assert(sw.includes('const refreshedImages = new Set()'), 'Falta límite de revalidación de portadas');
assert(sw.includes("if (u.pathname.includes('/rest/v1/chapters')) return;"), 'No almacenar capítulos de usuario en caché global');
const build = source('scripts/build.mjs');
assert(!build.match(/const BOOT = [^\n]*(?:season\.js|anim\.js|teampage\.js)/), 'Módulos opcionales dentro del arranque offline');
assert(source('.github/workflows/ci.yml').includes('npm run optimize-check'), 'Falta validación en CI');

console.log('Contratos de rendimiento, precarga, caché y animaciones: OK');
