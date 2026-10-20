// Regresiones estáticas de seguridad del proyecto, sin servicios ni dependencias.
// No comprueba la versión desplegada en Supabase/Cloudflare: eso requiere
// herramientas de inspección remotas y está documentado por separado.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(p, 'utf8');
const email = read('supabase/functions/notify-email/index.ts');
assert.match(email,/if\s*\(!SECRET\s*\|\|\s*req\.headers\.get\('x-cron-secret'\)\s*!==\s*SECRET\)/,
  'notify-email debe DENEGAR si CRON_SECRET no está definido');
assert.match(email,/req\.method\s*!==\s*'POST'/,
  'notify-email solo debe aceptar POST');
assert(!/if\s*\(SECRET\s*&&\s*req\.headers\.get\('x-cron-secret'\)/.test(email),
  'Evitar volver a la guardia condicional insegura de la versión remota antigua');
const worker = read('workers/notify/src/index.js');
assert.match(worker,/pathname\.startsWith\('\/cache\/'\).*status:\s*404/,
  'Worker debe rechazar por defecto la antigua ruta /cache/');
const build = read('scripts/build.mjs');
assert.match(build,/if\s*\(!url\s*\|\|\s*!key\)\s*throw\s+new Error/,
  'Build no puede recurrir a URL/clave implícitas');
assert(build.includes("isPreview"),'El build debe distinguir entornos Preview');
assert(build.includes("qfllthjpjuaztppvpsrk.supabase.co"),'Comprobación de bloqueo de URL productiva perdida');
// La SQL de Fase 2 es una propuesta, no una migración autodesplegable.
const proposal = read('docs/SQL-FASE2-HOME-SNAPSHOT.sql');
const match = proposal.match(/create or replace trigger series_home_stale[\s\S]+?update of([\s\S]+?)on public\.series/i);
assert(match && !match[1].split(',').map(v=>v.trim()).includes('views'),
  'La propuesta debe excluir solamente views de invalidaciones editoriales');
assert(!read('.github/workflows/ci.yml').includes('SUPABASE_SERVICE_ROLE_KEY'),
  'CI no debe pedir una clave privilegiada');
console.log('Infraestructura: contratos locales de correo, Worker, SQL y build seguro OK');
