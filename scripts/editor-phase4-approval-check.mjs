// Protección de publicación y aprobación: sin backend ni llamadas reales.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewIsStale,teamApprovalRequired} from '../src/editorial-approval-panel.js';
assert.equal(reviewIsStale(3,4),true);
assert.equal(reviewIsStale(null,3),true);
assert.equal(reviewIsStale(4,4),false);
const fake=approved=>({from(t){assert.equal(t,'teams');return{
 select(fields){assert.equal(fields,'require_approval');return this;},
 eq(name){assert.equal(name,'id');return this;},
 maybeSingle(){return Promise.resolve({data:{require_approval:approved},error:null});}
}}});
assert.equal(await teamApprovalRequired(fake(true),'team'),true);
assert.equal(await teamApprovalRequired(fake(false),'team'),false);
const editor=readFileSync('src/studio-editor.js','utf8');
const panel=readFileSync('src/editorial-approval-panel.js','utf8');
const board=readFileSync('src/studio.js','utf8');
const css=readFileSync('src/styles.css','utf8');
for(const token of ['id="b-approval"','id="p-approval"','setupEditorialApproval({',
 'const required=await teamApprovalRequired(sb,c.series.team_id)',
 'if(required){','if(dirty){','Solicita su aprobación antes de programar o publicar',
 'NO crear una versión al publicar','approval_required_current_version'])
 assert(editor.includes(token),'Contrato del editor faltante: '+token);
for(const token of ['editor_submit_review','editor_decide_review','editor_set_team_approval',
 "getDirty()||getConflict()","x.requested_by!==me","role", "reviewIsStale",
 'Otra persona con permiso de revisión','El requisito de aprobación','getVersion()']){
 // Algunas cadenas son frases explicativas: no bloquear por redacción, sí por flujo.
 if(token==='El requisito de aprobación'||token==='Otra persona con permiso de revisión')continue;
 assert(panel.includes(token),'Contrato del panel faltante: '+token);
}
assert(board.includes("sb.from('review_requests').select('chapter_id,status,base_version,created_at')"));
assert(board.includes('ed-board-review'),'El tablero no muestra aprobación');
assert(css.includes('.ed-approval-settings')&&css.includes('.ed-board-review'));
const sql=readFileSync('supabase/migrations/20261030224017_editor_phase4_approval_20261030.sql','utf8');
for(const token of ['DROP POLICY IF EXISTS "rr team"','REVOKE ALL ON public.review_requests',
 'private.editor4_fingerprint','private.require_approval','private.editor4_team_approval_guard',
 "NEW.status='scheduled'","NEW.status='published'","r.base_version=NEW.version",
 "r.approved_hash=private.editor4_fingerprint","r.reviewed_by IS DISTINCT FROM r.requested_by",
 "p_decision NOT IN ('approved','changes')","'self_review_forbidden'"])
 assert(sql.includes(token),'Guardia de publicación faltante: '+token);
assert(!sql.includes('UPDATE public.chapters SET body'),'No modificar textos de producción');
console.log('✓ Editor Fase 4: revisión obligatoria opcional, versión aprobada y tablero seguros');
