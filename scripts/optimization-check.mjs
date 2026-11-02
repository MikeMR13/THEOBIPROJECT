// Contratos básicos de rendimiento sin framework ni dependencias externas.
// Estas comprobaciones no sustituyen Lighthouse, RLS ni pruebas de navegador.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = file => readFileSync(file, 'utf8');

const html = source('src/index.html');
const preload = [...html.matchAll(/rel="modulepreload"\s+href="([^"]+)"/g)].map(m => m[1]);
for (const critical of ['supabase.js','app.js']) {
  assert(preload.some(p => p.startsWith('/' + critical + '?v=')), 'Precarga crítica ausente: ' + critical);
}
// UI pública, Reader y blocks siguen guardados en la PWA, no precargados por la página.
for (const optional of ['ui.js','reader.js','blocks.js','patreon.js','season.js','anim.js','teampage.js']) {
  assert(!preload.some(p => p.includes(optional)), 'Precarga no crítica: ' + optional);
}
assert.equal((html.match(/rel="preconnect" href="https:\/\/qfllthjpjuaztppvpsrk\.supabase\.co"/g) || []).length, 1, 'Preconnect duplicado');

const app = source('src/app.js');
assert(!/\bimport\s*\{\s*createUI\s*\}\s*from\s*['"]\/ui\.js/.test(app), 'UI no debe cargarse estáticamente');
assert(/import\(['"]\/ui\.js\?v=\d+['"]\)/.test(app), 'UI debe importarse solo bajo demanda');
assert(app.includes('if (location.pathname !== path) return;'), 'Falta guardia de navegación del módulo UI');
const shell = source('src/site-chrome.js');
assert(app.includes("import { initSiteChrome } from './site-chrome.js?v=1'"),
  'La navegación compartida no puede depender de la UI pública');
assert(app.includes('initSiteChrome({sb, go, searchHTML:'),
  'La navegación debe crearse aun en Calendario, Biblioteca y Perfil');
assert(shell.includes('createMobileNavigation()') && shell.includes('bindMobileNavigation(tab)'),
  'La navegación táctil compartida debe existir fuera de ui.js');
assert(shell.includes('siteChromeCss()') && shell.includes('id = \'sr-css\''),
  'Faltan estilos del menú y del buscador sin la UI pública');
assert(ui.includes('search, searchHTML }'), 'El autocomplete no puede perder la búsqueda pública');
const boot = source('src/boot.js');
assert(boot.includes("ui.href = '/ui.js?v=62'"), 'Falta precarga selectiva de UI en rutas públicas');
assert(boot.includes("path === '/catalogo'") && boot.includes("path === '/'"), 'Inicio y Catálogo deben mantener precarga de UI');
assert(!boot.includes("path === '/estudio'"), 'Estudio no debe precargar UI');
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
assert(/const BOOT = new Set\(\[[^\n]*'ui\.js'/.test(build), 'La PWA debe conservar ui.js en el precaché offline');
assert(source('.github/workflows/ci.yml').includes('npm run optimize-check'), 'Falta validación en CI');

console.log('Contratos de rendimiento, precarga, caché y animaciones: OK');
