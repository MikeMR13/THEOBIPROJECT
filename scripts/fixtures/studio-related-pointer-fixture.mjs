// Prueba de interacción real con Chromium; Supabase en memoria sin red ni datos de usuario.
import { mountWorkRelationsEditor } from '/studio-related-editor.js';
import { saveWorkWithRelations } from '/studio-related-works.js';
const app = document.getElementById('app');
const id = '00000000-0000-4000-8000-000000000020';
const teamId = '00000000-0000-4000-8000-000000000001';
const works = [
  {id:'00000000-0000-4000-8000-000000000090',title:'Magia de la Bruja del Viento',teams:{name:'Grupo Ónix'}},
  {id:'00000000-0000-4000-8000-000000000091',title:'La Fortaleza del Norte',teams:{name:'Otro equipo'}}
];
const stored = { id,team_id:teamId, title:'Obra de QA', relations:[] };
const esc = value => String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const sb = { from(table) {
  if (table !== 'series') throw Error('No se debe acceder a otras tablas');
  let op = 'select',fields = '',patch;
  const chain = {
    select(cols) {fields=cols;return this;},
    or() {return this;}, is() {return this;},order() {return this;},eq() {return this;},
    range(from,to) {return Promise.resolve({data:works.slice(from,to+1),error:null});},
    update(next) {op='update';patch=next;return this;},
    maybeSingle() {
      if (op==='update') Object.assign(stored,patch);
      return Promise.resolve({data:fields.includes('title')?{id,title:stored.title,relations:structuredClone(stored.relations)}:{id,relations:structuredClone(stored.relations)},error:null});
    }
  };
  return chain;
}};
let editor, relations = [];
const view = () => {
  editor?.destroy();
  document.getElementById('panel').innerHTML = '<p>Reabriendo ficha…</p>';
  relations = structuredClone(stored.relations);
  editor = mountWorkRelationsEditor({
    container: document.getElementById('panel'), sb, teamId, seriesId:id,
    relations, editable:true, esc, initialStatus:'',
    onDirty:()=> {document.getElementById('dirty').textContent='Pendiente';},
    onSave:async()=> {
      try {
        await saveWorkWithRelations(sb,id,teamId,{title:stored.title,relations:structuredClone(relations)});
        editor.setStatus('Guardado confirmado en Supabase simulado: '+relations.length+' obras.');
        document.getElementById('dirty').textContent='';
      } catch(error) {editor.setStatus(String(error),true);}
    }
  });
};
view();
document.getElementById('reopen').addEventListener('click',view);
window.__qaState = {
  selected:()=>structuredClone(relations),
  persisted:()=>structuredClone(stored.relations)
};
document.getElementById('ready').textContent='ready';
