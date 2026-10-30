// Integración de estabilización + fases 1-4 + QA sin red ni datos privados.
// Valida que el build del cliente falle de forma segura ante valores ausentes,
// secretos o Preview mal configurada. Ejecuta JS nativo en Node.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const base = { ...process.env };
delete base.OBI_SUPABASE_URL;
delete base.OBI_SUPABASE_PUBLISHABLE_KEY;
delete base.VERCEL_ENV;
const verifyFailure = (env, expected) => {
  const p = spawnSync(process.execPath,['scripts/build.mjs','--check'],{env:{...base,...env},encoding:'utf8',timeout:10000});
  assert.notEqual(p.status,0,'Compilación insegura aceptada: '+expected);
  assert((p.stderr+p.stdout).includes(expected),'Error de rechazo inesperado: '+(p.stderr+p.stdout).slice(0,900));
};
verifyFailure({},'Configura OBI_SUPABASE_URL');
verifyFailure({OBI_SUPABASE_URL:'https://test.invalid',OBI_SUPABASE_PUBLISHABLE_KEY:'service_role_fake'},'No uses llaves secretas');
verifyFailure({OBI_SUPABASE_URL:'http://unsafe.invalid',OBI_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake'},'Supabase requiere HTTPS');
verifyFailure({VERCEL_ENV:'preview',OBI_SUPABASE_URL:'https://qfllthjpjuaztppvpsrk.supabase.co',OBI_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake'},'Preview bloqueado');
const data = readFileSync('supabase/config.toml','utf8');
assert.equal((data.match(/^\[auth\]$/gm)||[]).length,1);
assert(readFileSync('scripts/build.mjs','utf8').includes('const BOOT = new Set('),'Arranque esencial del SW no definido');
assert(!/\/studio(?:-editor|-importer|-media)?\.js\?v=/.test(readFileSync('dist/sw.js','utf8')),'Optimización del SW perdida: Studio incluido en el precaché');
assert(readFileSync('src/ui.js','utf8').includes('const PAGE_SIZE = 24'),'Paginación perdida');
assert(readFileSync('.github/workflows/ci.yml','utf8').includes('npm run studio-browser-check'),'Prueba real de navegador perdida');
assert(readFileSync('src/studio.js','utf8').includes("import('./studio-editor.js?v=2')"),'Modularización perdida');
const html=readFileSync('dist/index.html','utf8');
assert(html.includes('/styles.css?'),'Artefacto sin CSS');
console.log('Integración: configuración segura, cambios de fases 1-4, QA y build: OK');
