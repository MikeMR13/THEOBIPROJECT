// Contrato estatico. Las pruebas RLS reales requieren una base QA.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261025_diffusion_phase1.sql');
const studio=read('src/studio.js'),admin=read('src/admin.js'),app=read('src/app.js');
const shared=read('src/diffusion-panel.js');
for(const file of ['src/diffusion.css','src/studio-diffusion.js','src/admin-diffusion.js'])
  assert.ok(read(file).length>15,file);
assert.match(studio,/\/estudio\/difusion/);
assert.match(app,/p === '\/estudio\/difusion'/);
assert.match(admin,/\['difusion','Difusión'\]/);
assert.match(sql,/private\.diffusion_can\(t uuid, action text\)/);
assert.match(sql,/private\.diffusion_scope_ok\(p_team,'diffusion_manage'\)/);
assert.match(sql,/diffusion_rule_save/);
assert.match(sql,/enabled boolean not null default false/);
assert.match(sql,/and enabled=false/);
assert.match(sql,/status text not null default 'draft'/);
assert.match(sql,/enable row level security/);
assert.match(sql,/revoke all on table/);
assert.doesNotMatch(sql,/cron\.schedule\(/);
assert.doesNotMatch(sql,/service_role/i);
assert.doesNotMatch(shared,/fetch\s*\(\s*['"]https?:/);
assert.match(shared,/No necesita aprobación del Bibliotecario/);
assert.match(shared,/Guardar regla inactiva/);
assert.match(shared,/Borrador guardado/);
console.log('Difusión Fase 1: contratos estáticos OK');
