// Fase 7 — contrato estático de convivencia con los servicios preexistentes.
// No conecta a servicios externos, no hace escrituras, no lee credenciales.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
const get=p=>{assert(existsSync(p),'Falta módulo de plataforma: '+p);return readFileSync(p,'utf8')};
const expect=(p,terms)=>{const s=get(p);for(const term of terms)assert(s.includes(term),'Contrato de '+p+' ausente: '+term)};
const migrations=readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql'));
assert(migrations.length>=25,'Se eliminaron scripts históricos de migración');
for(const p of ['supabase/config.toml','supabase/SCHEMA.md',
  'public/sw.js','src/boot.js','src/agenda.js','src/captcha.js','src/admin.js',
  'src/studio.js','src/studio-importer.js','src/studio-media.js','src/profile.js',
  'src/reader.js','src/season.js','src/teampage.js','src/ui.js',
  'src/patreon.js','workers/notify/src/index.js','workers/patreon/src/index.js'])get(p);
const vercel=JSON.parse(get('vercel.json'));
assert.equal(vercel.buildCommand,'npm run build');
assert.equal(vercel.outputDirectory,'dist');
assert(!vercel.installCommand,'No incluir un workaround de otro proyecto');
const hdr=vercel.headers?.find(r=>r.source==='/(.*)')?.headers||[];
const csp=hdr.find(h=>h.key==='Content-Security-Policy')?.value||'';
for(const term of ["default-src 'self'","frame-ancestors 'self'","object-src 'none'","https://challenges.cloudflare.com","https://*.supabase.co","wss://*.supabase.co","https://fonts.gstatic.com"])assert(csp.includes(term),'Restricción CSP eliminada: '+term);
for(const key of ['X-Content-Type-Options','Referrer-Policy','Permissions-Policy','X-Frame-Options','Cross-Origin-Opener-Policy'])
 assert(hdr.some(h=>h.key===key),'Cabecera de seguridad eliminada '+key);
expect('src/index.html',['manifest.webmanifest','/reader-a11y.css','Saltar al contenido principal','elobidellector.com'].filter(x=>x!=='elobidellector.com'));
expect('scripts/build.mjs',['OBI_SUPABASE_URL','OBI_SUPABASE_PUBLISHABLE_KEY','VERCEL_ENV','preview','service_role','qfllthjpjuaztppvpsrk.supabase.co']);
expect('src/studio.js',["my_team_permissions","team_design_publish","team_design_save","mountTeamReaderDefaults"]);
expect('src/reader.js',["reading_progress","reader_prefs","read_chapters","epub_fonts","per_volume"]);
expect('src/profile.js',["reader_prefs","ui_prefs"]);
expect('src/season.js',["season_calendar","platform_settings","isOff()"]);
expect('src/ui.js',["heroSlide","ob-s-ann","Nuevos volúmenes y capítulos"]);
assert(!get('src/ui.js').includes('obTicker'),'No reintroducir la cinta móvil eliminada');
expect('src/blocks.js',["'STRONG'","'RUBY'"]);
const w=get('src/app.js');
for(const route of ['/catalogo','/studio','/preferencias','/biblioteca','/leer/'])assert(w.includes(route),'Ruta existente perdida '+route);
console.log('Fase 7: contrato de infraestructura y funcionalidad preexistente conservado. Seguridad RLS real requiere auditoría externa.');
