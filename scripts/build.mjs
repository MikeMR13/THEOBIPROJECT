// Compilación para Vercel: minifica, sella cada archivo por contenido (?v=sello) y genera sw.js. Sin pasos manuales.
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const url = process.env.OBI_SUPABASE_URL || 'https://qfllthjpjuaztppvpsrk.supabase.co', key = process.env.OBI_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IiHzG1Jn2je075uuYVHTAg_dBVAAUf5';
const turnstile = process.env.OBI_TURNSTILE_SITE_KEY || ''; // clave PÚBLICA de Cloudflare Turnstile (la secreta va solo en Supabase)
if (/service_role/.test(key)) throw new Error('No uses service_role en el frontend');
const jsIn = d => readdirSync(d).filter(f => f.endsWith('.js')).map(f => d + '/' + f);

// --check: sintaxis de todos los archivos (CI).
if (process.argv.includes('--check')) {
  const files = [...jsIn('src'), 'public/sw.js', 'scripts/build.mjs'];
  for (const f of files) execFileSync(process.execPath, ['--check', f], { stdio: 'inherit' });
  console.log('sintaxis ok · ' + files.length + ' archivos'); process.exit(0);
}

let esbuild = null; try { esbuild = await import('esbuild'); } catch { console.warn('⚠ esbuild no está instalado: se publica sin minificar'); }
rmSync('dist', { recursive: true, force: true }); mkdirSync('dist');
cpSync('src', 'dist', { recursive: true }); cpSync('public', 'dist', { recursive: true });
writeFileSync('dist/config.js', 'window.OBI_CONFIG=' + JSON.stringify({ url, key, turnstile, build: new Date().toISOString() }) + ';');

// 0. supabase-js empaquetado en un solo archivo propio (evita ~20 descargas encadenadas desde esm.sh). Si falla, se queda el puente a esm.sh.
if (esbuild) {
  try {
    const r = await esbuild.build({ stdin: { contents: "export { createClient } from '@supabase/supabase-js';", resolveDir: process.cwd(), loader: 'js' }, bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, legalComments: 'none', write: false });
    writeFileSync('dist/supabase.js', r.outputFiles[0].text);
  } catch (e) { console.warn('⚠ supabase-js local no disponible, se usa esm.sh:', e.message); }
}

// 1. Minificar JS (módulos y config.js) y CSS.
const assets = readdirSync('dist').filter(f => /\.(js|css)$/.test(f) && f !== 'sw.js' && statSync('dist/' + f).isFile());
let before = 0, after = 0;
for (const f of assets) {
  const p = 'dist/' + f, src = readFileSync(p, 'utf8'); before += src.length;
  let out = src;
  if (esbuild) {
    const css = f.endsWith('.css'), mod = !css && f !== 'config.js' && f !== 'boot.js';
    out = (await esbuild.transform(src, { loader: css ? 'css' : 'js', minify: true, legalComments: 'none', target: css ? 'chrome100' : 'es2022', ...(mod ? { format: 'esm' } : {}) })).code;
  }
  after += out.length; writeFileSync(p, out);
}

// 2. Sello por contenido: reescribe /x.js?v=… y ./x.js?v=… hasta que los sellos se estabilicen (cubre importaciones encadenadas).
const REF = /((?:\.\/|\/)([\w-]+\.(?:js|css)))\?v=[\w.-]+/g;
const files = [...assets, 'index.html'], text = Object.fromEntries(files.map(f => [f, readFileSync('dist/' + f, 'utf8')]));
const H = {}, hash = s => createHash('sha256').update(s).digest('hex').slice(0, 10);
for (let i = 0, changed = true; changed && i < 10; i++) {
  changed = false;
  for (const f of files) {
    const t = text[f].replace(REF, (m, path, name) => H[name] ? `${path}?v=${H[name]}` : m);
    if (t !== text[f]) { text[f] = t; changed = true; }
    if (f !== 'index.html') { const h = hash(t); if (H[f] !== h) { H[f] = h; changed = true; } }
  }
}
for (const f of files) writeFileSync('dist/' + f, text[f]);
const missing = [...text['index.html'].matchAll(REF)].filter(m => !H[m[2]]).map(m => m[2]);
if (missing.length) throw new Error('index.html apunta a archivos inexistentes: ' + missing.join(', '));

// 3. Service worker con la versión de la compilación y la lista exacta del arranque (sin studio.js ni admin.js).
const BOOT = ['styles.css', 'config.js', 'boot.js', 'supabase.js', 'app.js', 'ui.js', 'reader.js', 'blocks.js', 'season.js', 'anim.js', 'teampage.js'].filter(f => H[f]);
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', ...BOOT.map(f => `/${f}?v=${H[f]}`)];
const V = 'obi-' + hash(SHELL.join('|')).slice(0, 8);
const sw = readFileSync('dist/sw.js', 'utf8').replace(/\/\*@shell\*\/[\s\S]*?\/\*@end\*\//, `const V=${JSON.stringify(V)},SHELL=${JSON.stringify(SHELL)};`);
if (!sw.includes(V)) throw new Error('sw.js: no se encontró el marcador /*@shell*/');
writeFileSync('dist/sw.js', esbuild ? (await esbuild.transform(sw, { minify: true, target: 'es2022' })).code : sw);

const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`dist listo · ${V} · JS+CSS ${kb(before)} → ${kb(after)}`);
