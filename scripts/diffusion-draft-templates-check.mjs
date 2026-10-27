import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultDraftPresentation,normalizeDraftPresentation,renderDraftTemplate} from '../src/diffusion-draft-templates.js';
const ctx={novela:'La biblioteca del eclipse',equipo_traductor:'Equipo Aurora',sinopsis:'Un misterio.',autor:'A. Ejemplo'};
assert.deepEqual(defaultDraftPresentation(),{showTitle:true,showTeam:true,showSynopsis:false,showCover:true});
assert.deepEqual(normalizeDraftPresentation({showTitle:false,showTeam:false,showSynopsis:true,showCover:false,evil:true}),
  {showTitle:false,showTeam:false,showSynopsis:true,showCover:false});
assert.equal(renderDraftTemplate('¡Les presentamos {{novela}} por {{equipo_traductor}}!',ctx).text,
  '¡Les presentamos La biblioteca del eclipse por Equipo Aurora!');
assert.equal(renderDraftTemplate('{{equpo traductor}}',ctx).text,'Equipo Aurora');
assert.equal(renderDraftTemplate('{{equipo_productor}}',ctx).text,'Equipo Aurora');
assert.equal(renderDraftTemplate('{{sinopsis}} · {{autor}}',ctx).text,'Un misterio. · A. Ejemplo');
assert.ok(renderDraftTemplate('{{secreto}}',ctx).errors.length);
assert.ok(renderDraftTemplate('{{novela}}',{}).errors.length);
assert.ok(renderDraftTemplate('{{mal',ctx).errors.length);
assert.ok(renderDraftTemplate('x'.repeat(701),ctx).errors.length);
const ui=readFileSync(new URL('../src/diffusion-panel.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261026224217_diffusion_draft_presentation.sql',import.meta.url),'utf8');
for(const token of ['data-draft-variable','renderDraftTemplate','diffusion_campaign_draft_save',
 'df-campaign-form','data-use-campaign','savedDraftOptions(annDraftId)'])
 assert.ok(ui.includes(token),'Falta función de plantilla: '+token);
for(const removed of ['df-campaign-work','df-campaign-live','data-draft-option',
 'annDraftPresentation','draftLivePreview','p_presentation:','draftPresentation='])
 assert.ok(!ui.includes(removed),'La opción de presentación debe desaparecer: '+removed);
assert.ok(!ui.includes("q('series','id,title,slug,synopsis,author,cover_path,team_id'"),
 'Crear plantillas no debe consultar obras privadas');
assert.match(sql,/not private\.diffusion_scope_ok\(p_team,'diffusion_compose'\)/);
assert.match(sql,/team_id is not distinct from p_team and status='draft'/);
assert.match(sql,/grant execute on function public\.diffusion_campaign_draft_save\(uuid,uuid,text,text,jsonb\)/);
assert.doesNotMatch(sql,/insert into public\.diffusion_jobs|pg_net|http_post/i);
for(const token of ['df-ann-draft','data-rule-draft-save','diffusion_rule_template_set',
 'template_campaign_id','savedDraftOptions(annDraftId)','annDraftId=item.id'])
 assert.ok(ui.includes(token),'Falta selector de borradores: '+token);
console.log('PASS: borradores disponibles en Anunciar y Automatizaciones, sin envíos');
