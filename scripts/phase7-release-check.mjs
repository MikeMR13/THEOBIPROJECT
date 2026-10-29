// Fase 7 — puerta de salida técnica para la versión candidata.
// Ejecutar después de npm run build con un backend ficticio, nunca con producción.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const read = path => readFileSync(path,'utf8');
const exist = path => assert(existsSync(path),'Falta el artefacto de candidato '+path);
const files=[
  'dist/index.html','dist/app.js','dist/ui.js','dist/reader.js','dist/studio.js',
  'dist/studio-preview-share.js','dist/studio-reader-defaults.js',
  'dist/reader-team-defaults.js','dist/reader-pref-cache.js',
  'dist/profile.js','dist/season.js','dist/teampage.js','dist/blocks.js',
  'dist/publication-dates.js','dist/styles.css','dist/studio.css','dist/reader-a11y.css',
  'dist/config.js','dist/sw.js'
];
files.forEach(exist);
const pkg=JSON.parse(read('package.json'));
const vercel=JSON.parse(read('vercel.json'));
assert.equal(pkg.name,'theobiproject','Nombre del repositorio esperado');
assert.equal(vercel.buildCommand,'npm run build','Comando de Vercel debe conservarse');
assert.equal(vercel.outputDirectory,'dist','Salida de Vercel debe conservarse');
assert(!vercel.installCommand,'No incluir modificaciones de instalación de otro proyecto');

const config=read('dist/config.js').trim();
assert(config.startsWith('window.OBI_CONFIG='));
// esbuild compacta las claves de objetos a identificadores; el resultado ya no es JSON.
assert(!config.includes('qfllthjpjuaztppvpsrk.supabase.co'),'Una Preview no puede utilizar la base productiva');
assert(config.includes('https://obi-qa-backend.invalid'),'El test debe usar únicamente el backend ficticio');
assert(config.includes('sb_publishable_qa_mock_not_connected'),'No se encontró la llave pública ficticia prevista');
assert(!/service_role|sb_secret_/i.test(config),'Credencial privada detectada');
const index=read('dist/index.html'),sw=read('dist/sw.js');
assert(index.includes('href="#app"'),'Falta salto al contenido principal');
assert(index.includes('reader-a11y.css'),'No se cargó CSS del lector');
assert(!index.includes('rel="preconnect" href="https://qfllthjpjuaztppvpsrk.supabase.co"'),'Preview preconecta a producción');
assert(index.includes('app.js?v='),'No se versionó la entrada de la aplicación');
assert(/obi-|\/app\.js/.test(sw),'No se generó el service worker y su shell');

for(const [path,needle] of [
  ['dist/app.js','reader-pref-cache.js'],
  ['dist/studio.js','studio-reader-defaults.js'],
  ['dist/studio.js','studio-preview-share.js'],
  ['dist/studio-reader-defaults.js','reader-team-defaults.js'],
  ['dist/reader.js','reader-pref-cache.js'],
  ['dist/profile.js','reader-pref-cache.js']
]) assert(read(path).includes(needle),'No se encuentra el módulo '+needle+' en '+path);

const ci=read('.github/workflows/ci.yml');
for(const required of [
 'npm run check && npm run quality-gates && npm run build && npm run verify',
 'visual-integration-preferences.mjs',
 'visual-phase5-browser.mjs',
 'phase6-public-check.mjs',
 'phase6-seasons-preferences-check.mjs',
 'phase6-studio-accounts-check.mjs',
 'phase6-reader-check.mjs',
 'phase6-regression-check.mjs'
]) assert(ci.includes(required),'CI sin suite '+required);
assert.equal(ci.match(/node scripts\/phase6-reader-check\.mjs/g)?.length,1,'No repetir la prueba de fase 6.4');

console.log('FASE 7: artefactos y módulos verificados, Preview simulada aislada, controles completos, sin publicación.');
