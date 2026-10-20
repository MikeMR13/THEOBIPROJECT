// Validaciones estáticas de estabilización: Node nativo, sin librerías nuevas.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

const read = path => readFileSync(path, 'utf8');
const config = read('supabase/config.toml');
assert.equal((config.match(/^\\[auth\\]$/gm) || []).length, 1, 'Configura [auth] una sola vez');
assert.match(config, /site_url\\s*=\\s*"https:\\/\\/theobiproject\\.vercel\\.app"/);
const sqls = readdirSync('supabase/migrations').filter(f => f.endsWith('.sql'));
assert(sqls.length >= 20, 'Faltan archivos SQL');
for (const f of sqls) {
  const sql = read(join('supabase/migrations', f));
  assert(!/\\bas\\s+\\$(?!\\$|[a-z_][a-z_0-9]*\\$)/i.test(sql), `Delimitador SQL inválido: ${f}`);
}
for (const f of readdirSync('src').filter(f => f.endsWith('.js'))) {
  const content = read(join('src', f));
  // Verifica los imports estáticos del sitio; no evalúa el código.
  const imports = [...content.matchAll(/\\bfrom\\s*['"]([/.][^'"]+?\\.js)(?:\\?v=[^'"]+)?['"]/g)];
  for (const match of imports) {
    const dest = match[1].startsWith('/') ? 'src/' + match[1].slice(1) : resolve(dirname('src/' + f), match[1]);
    assert(existsSync(dest), `Importación faltante: ${f} -> ${match[1]}`);
  }
}
assert(existsSync('supabase/functions/patreon/index.ts'), 'Falta la función Patreon en su ruta estándar');
assert(!existsSync('supabase/functions/index.ts'), 'Función Patreon duplicada en raíz');
assert.match(read('supabase/functions/notify-email/index.ts'), /!SECRET\\s*\\|\\|\\s*req\\.headers/, 'Notificaciones por correo sin secret obligatorio');
const cacheWorker = read('workers/notify/src/index.js');
assert.match(cacheWorker, /pathname\\.startsWith\\('\/cache\/'\\).*status:\s*404/, 'Caché de capítulos sin bloqueo explícito');
if (existsSync('dist/index.html')) {
  const html = read('dist/index.html');
  const refs = [...html.matchAll(/(?:src|href)=["'](\\/[\\w-]+\\.(?:js|css))(?:\\?v=[^"']+)?["']/g)];
  for (const [, path] of refs) assert(existsSync('dist' + path), `Recurso faltante del build: ${path}`);
  const generated = read('dist/config.js');
  assert(!/service_role|sb_secret_/.test(generated), 'Credenciales privilegiadas en el bundle');
}
console.log('Estabilización: configuración, SQL, imports, funciones y compilación OK');
