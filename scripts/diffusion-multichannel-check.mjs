import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('sql/diffusion-multichannel-rules-candidate.sql');
const ui=read('src/diffusion-panel.js');
for(const s of ["connection_ids uuid[] not null default '{}'::uuid[]",
 "diffusion_rule_toggle_multi(","cardinality(ids)>8",
 "private.diffusion_rule_occurrences","primary key(rule_id,source_type,source_id,connection_id)",
 "cross join lateral unnest(rule.connection_ids)",
 "s.connection_id=any(rule.connection_ids)",
 "rule_or_destination_inactive","and o.connection_id=r.connection_id",
 "case when p_connection is null then null::uuid[] else array[p_connection] end"])
  assert.ok(sql.toLowerCase().includes(s.toLowerCase()),'Missing SQL invariant '+s);
assert.equal((sql.match(/cross join lateral unnest\(rule\.connection_ids\)/g)||[]).length,2,
 'Publication and prelaunch triggers must fan out to all selected destinations');
assert.match(ui,/type="checkbox" data-rule-destination=/,'Use accessible native multi-checkbox selection');
assert.match(ui,/\.querySelectorAll\('\[data-rule-destination=/,'Collect multiple checked values');
assert.match(ui,/diffusion_rule_toggle_multi/,'Use atomic multi-channel rule RPC');
assert.match(ui,/connection_ids,template_campaign_id,enabled_at/,'Display previously chosen targets');
assert.match(ui,/Selecciona entre 1 y 8 canales/,'Do not activate empty selection');
assert.match(ui,/selected\.map\(c=>c\.provider/,'Show all selected channels per rule');
console.log('Difusión multicanal: contrato de UI, permisos, fan-out, dedupe y desactivación — PASS');
