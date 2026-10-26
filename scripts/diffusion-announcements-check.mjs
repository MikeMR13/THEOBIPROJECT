import { transformSync } from 'esbuild';
// Contractos offline, sin secrets ni llamadas HTTP.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql=readFileSync('supabase/migrations/20261026010751_diffusion_discord_announcements_manual_20261025.sql','utf8');
const edge=readFileSync('supabase/functions/diffusion-announcement/index.ts','utf8');
const ui=readFileSync('src/diffusion-panel.js','utf8');
assert.match(sql,/diffusion_discord_announcement_claim/);
assert.match(sql,/private\.diffusion_scope_ok\(conn\.team_id,'diffusion_publish'\)/);
assert.match(sql,/already_announced/);
assert.match(sql,/coalesce\(ch\.access,'public'\)/);
assert.match(sql,/coalesce\(vo\.access,'public'\)/);
assert.match(sql,/coalesce\(se\.access,'public'\)/);
assert.match(sql,/not_public/);
assert.match(sql,/last_announcement_at/);
assert.match(edge,/auth\.getUser/);
assert.match(edge,/diffusion_discord_announcement_claim/);
assert.match(edge,/redirect:'error'/);
assert.match(edge,/allowed_mentions:\{parse:\[\]\}/);
assert.match(edge,/diffusion_discord_announcement_complete/);
assert.doesNotMatch(edge,/cron|setInterval|SUPABASE_SERVICE_ROLE_KEY.*?console\.log/i);
assert.match(ui,/Confirmar y enviar a /);
assert.match(ui,/annProvider\(\)==='telegram'\?'Telegram':'Discord'/);
assert.match(ui,/diffusion_['\"]?\+annProvider\(\)\+'?\_announcement_preview|diffusion_'\+annProvider\(\)\+'_announcement_preview/);
assert.match(ui,/chosenAnnouncementId\(\)/);
console.log('Anuncios manuales Discord: contratos y privilegios verificados (sin enviar)');

// La compilación de Deno/TypeScript valida la sintaxis que Node no interpreta.
const transformed=transformSync(edge,{loader:'ts',format:'esm'});
assert.ok(transformed.code.includes('Deno.serve('),'Edge Function TypeScript inválida');

const coverSql=readFileSync('supabase/migrations/20261026012634_diffusion_discord_cover_by_publication_level_20261025.sql','utf8');
assert.equal((coverSql.match(/cover:=nullif\(btrim\(vo\.cover_path\),''\);/g)||[]).length,2,'Volumen y capítulo deben utilizar la portada del volumen');
assert.match(coverSql,/cover:=nullif\(btrim\(se\.cover_path\),''\);/);
assert.doesNotMatch(coverSql,/coalesce\(nullif\(vo\.cover_path,''\),se\.cover_path\)/);
assert.match(coverSql,/missing_volume_cover/);
assert.match(coverSql,/missing_work_cover/);
assert.match(coverSql,/invalid_cover_path/);
assert.match(ui,/Esta obra no tiene portada general/);
assert.match(ui,/Este volumen no tiene portada propia/);
console.log('Portadas estrictas por nivel: obra, volumen y capítulo PASS');
