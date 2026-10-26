import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const candidate=read('sql/diffusion-4b-dispatch-candidate.sql')
 .replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
const recorded=read('supabase/migrations/20261026173610_diffusion_phase4b_opt_in_dispatch_20261026.sql');
assert.equal(candidate,recorded,'La migración versionada debe ser EXACTAMENTE la aplicada a Supabase');
const active=read('sql/diffusion-4b-activate-cron.sql');
assert.equal(active,read('supabase/migrations/20261026173641_diffusion_phase4b_cron_activation_20261026.sql'),
 'La activación del cron debe conservar la definición aplicada');
const ui=read('src/diffusion-panel.js');
const edge=read('supabase/functions/diffusion-dispatch/handler.mjs');
const sql=read('sql/diffusion-4b-dispatch-candidate.sql');
for(const val of ["delivery_mode text not null default 'manual'","p_delivery text",
 "for update skip locked","lease_expired","status='unknown'","source_mismatch",
 "diffusion_4b_consume_ticket","extensions.gen_random_bytes(32)","diffusion_4b_complete",
 "not (coalesce(se.access,'public')='public'"]) assert.ok(sql.includes(val),'Contrato SQL ausente: '+val);
for(const val of ["id=\"df-ann-delivery\"","value=\"manual\"","value=\"automatic\"",
 "p_delivery:delivery","Entrega incierta: revisar antes de reenviar"]) assert.ok(ui.includes(val),'UI sin contrato: '+val);
assert.match(edge,/allowed_mentions:\{parse:\[\]\}/,'Discord sin menciones masivas');
assert.match(edge,/if\(!\/\^\[a-f0-9\]\{64\}\$\/\.test\(ticket\)\)/,
 'Fail-closed: la solicitud anónima se rechaza sin ticket');
assert.match(edge,/diffusion_4b_consume_ticket/,'No se envía antes de consumir ticket');
assert.match(active,/cron\.schedule\('obi-diffusion-4b','\* \* \* \* \*'/,'Cron un minuto');
assert.doesNotMatch(active,/http_post\(|x-cron-secret|service_role|Bearer/i,
 'La definición de cron no puede incluir secretos o enviar directamente');
console.log('Difusión 4B: archivos aplicados/versionados idénticos, opt-in y ACL declarados — PASS');
