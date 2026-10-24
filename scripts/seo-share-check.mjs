// Pruebas aisladas: no llaman a Supabase ni necesitan credenciales reales.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import handler from '../api/public-meta.js';

const shell = '<!doctype html><html><head><title>El Obi del Lector</title><meta name="description" content="Antigua"></head><body><main id="app" tabindex="-1" aria-live="polite"></main></body></html>';
const data = {
  series: { id: 7, slug: 'ejemplo', title: 'Obra <especial>', synopsis: 'Una aventura original', cover_path: 'portadas/ejemplo.jpg' },
  chapters: { num: 12, title: 'Comienza el viaje', teaser: 'El capítulo doce' },
  teams: { name: 'Grupo Test', slug: 'grupo', bio: 'Traducciones originales', banner_path: 'equipos/grupo.jpg' },
  reader: { username: 'ana', bio: 'Me gusta leer novelas', avatar_url: '' }
};
const originalFetch = globalThis.fetch, oldEnv = { ...process.env };
process.env.VERCEL_ENV = 'production';
process.env.OBI_SUPABASE_URL = 'https://publica.supabase.co';
process.env.OBI_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
const respond = (body, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(String(url));
  if (u.pathname === '/index.html') return respond(shell);
  if (u.pathname.endsWith('/series')) return respond(u.searchParams.get('slug') === 'eq.desconocida' ? [] : [data.series]);
  if (u.pathname.endsWith('/chapters')) return respond([data.chapters]);
  if (u.pathname.endsWith('/teams')) return respond([data.teams]);
  if (u.pathname.endsWith('/rpc/reader_public')) {
    assert.equal(opts.method, 'POST');
    return respond(JSON.parse(opts.body).p_username === 'privado' ? { username: 'privado', bio: '¡SECRETO!', private: 'none' } : data.reader);
  }
  throw new Error('Petición de red imprevista: ' + u);
};
function response() {
  return { headers: {}, statusCode: 200, body: '', setHeader(k,v) { this.headers[k.toLowerCase()] = v; },
    status(code) { this.statusCode = code; return this; }, send(x) { this.body = x; return this; },
    end() { return this; } };
}
async function run(url) { const r = response(); await handler({ method: 'GET', url }, r); return r; }
try {
  let r = await run('/api/public-meta?kind=serie&slug=ejemplo');
  assert.equal(r.statusCode, 200);
  assert.match(r.body, /og:title/);
  assert.match(r.body, /Obra &lt;especial&gt;/);
  assert.match(r.body, /https:\/\/elobidellector.com\/serie\/ejemplo/);
  assert.doesNotMatch(r.body, /<title>Obra <especial>/);
  assert.match(r.body, /<section aria-label="Presentación pública"/);
  r = await run('/api/public-meta?kind=leer&slug=ejemplo&chapter=12');
  assert.equal(r.statusCode, 200);
  assert.match(r.body, /Capítulo 12/);
  r = await run('/api/public-meta?kind=equipo&slug=grupo&vista=123');
  assert.equal(r.statusCode, 200);
  assert.match(r.headers['x-robots-tag'], /noindex/);
  assert.doesNotMatch(r.body, /canonical" href="[^"]*vista=/);
  r = await run('/api/public-meta?kind=lector&slug=ana');
  assert.equal(r.statusCode, 200);
  assert.match(r.body, /Carnet de ana/);
  r = await run('/api/public-meta?kind=lector&slug=privado');
  assert.equal(r.statusCode, 200);
  assert.match(r.headers['x-robots-tag'], /noindex/);
  assert.doesNotMatch(r.body, /SECRETO/);
  r = await run('/api/public-meta?kind=serie&slug=desconocida');
  assert.equal(r.statusCode, 404);
  assert.match(r.headers['x-robots-tag'], /noindex/);
  const cfg = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)));
  assert.ok(cfg.rewrites.some(x => x.source === '/serie/:slug'));
  assert.ok(cfg.rewrites.some(x => x.source === '/equipo/:slug'));
  assert.ok(cfg.rewrites.some(x => x.source === '/lector/:slug'));
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const share = readFileSync(new URL('../src/share.js', import.meta.url), 'utf8');
  assert.match(app, /installPublicShare\(\)/);
  assert.match(share, /navigator\.share/);
  assert.match(share, /wa\.me/);
  assert.match(share, /t\.me\/share\/url/);
  assert.match(share, /clipboard\.writeText/);
  const home = readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');
  assert.match(home, /og:image/);
  console.log('seo-share: metadatos, noindex, privacidad, rutas y botones OK');
} finally {
  globalThis.fetch = originalFetch;
  process.env = oldEnv;
}
