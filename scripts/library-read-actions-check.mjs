import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readingGroups,planReadingChanges,undoReadingChanges,applyReadingChanges,persistReadingChanges} from '../src/library-read-actions.js';

const now=Date.parse('2026-10-27T14:00:00Z');
const chapters=[
 {id:'c1',series_id:'a',volume_id:'v1',vol:1,num:1,title:'El inicio',status:'published',deleted_at:null,publish_at:'2026-10-20T14:00:00Z'},
 {id:'c2',series_id:'a',volume_id:'v1',vol:1,num:2,title:'Dos',status:'published',deleted_at:null},
 {id:'c3',series_id:'a',volume_id:'v2',vol:2,num:3,title:'Tres',status:'published',deleted_at:null},
 {id:'future',series_id:'a',vol:2,num:4,status:'published',publish_at:'2026-11-30T00:00:00Z'},
 {id:'deleted',series_id:'a',vol:2,num:5,status:'published',deleted_at:'2026-10-01'},
 {id:'draft',series_id:'a',vol:2,num:6,status:'draft'},
 {id:'other',series_id:'b',vol:1,num:1,status:'published'}
];
const groups=readingGroups('a',chapters,now);
assert.deepEqual(groups.map(g=>g.chapters.map(c=>c.id)),[['c1','c2'],['c3']],'Solo capítulos publicados visibles de la obra');
assert.deepEqual(groups.map(g=>g.label),['Volumen 1','Volumen 2']);
const initial=[{chapter_id:'c1',read_at:'2026-10-03T13:00:00Z',chapters:{series_id:'a',deleted_at:null}}];
const mark=planReadingChanges(['c1','c2','c3','c3'],initial,true);
assert.deepEqual(mark.map(c=>c.chapter_id),['c2','c3'],'Solo cambios netos, sin duplicados');
let updated=applyReadingChanges(initial,new Map(chapters.map(c=>[c.id,c])),mark,'2026-10-27T14:00:00Z');
assert.equal(updated.length,3);
const undo=undoReadingChanges(mark);
updated=applyReadingChanges(updated,new Map(chapters.map(c=>[c.id,c])),undo);
assert.deepEqual(updated.map(r=>r.chapter_id),['c1'],'Deshacer inserciones sin borrar lecturas anteriores');
const clear=planReadingChanges(['c1','c2','c3'],initial,false);
assert.deepEqual(clear.map(c=>c.chapter_id),['c1']);
const restore=undoReadingChanges(clear);
assert.equal(restore[0].restoreAt,initial[0].read_at,'Deshacer desmarcado recupera la fecha original');
const restored=applyReadingChanges([],new Map(chapters.map(c=>[c.id,c])),restore);
assert.equal(restored[0].read_at,initial[0].read_at,'Estadísticas de últimos 30 días no se alteran al deshacer');

const calls=[];
const sb={from(table){
 assert.equal(table,'read_chapters','No modificar progreso, historial, perfiles ni cualquier otra tabla');
 return {
  upsert(rows,opts){calls.push({op:'insert',rows,opts});return Promise.resolve({error:null})},
  delete(){return{eq(field,value){assert.equal(field,'user_id');assert.equal(value,'u1');return{in(field,ids){
    assert.equal(field,'chapter_id');calls.push({op:'delete',ids});return Promise.resolve({error:null});
  }}}}}
 };
}};
const ids=Array.from({length:175},(_,i)=>'id-'+i);
await persistReadingChanges(sb,'u1',ids.map(chapter_id=>({chapter_id,desired:true})),{size:80});
assert.deepEqual(calls.map(x=>x.rows.length),[80,80,15],'Envío por lotes menores de 1000');
assert(calls.every(x=>x.op==='insert'&&x.opts.onConflict==='user_id,chapter_id'&&x.opts.ignoreDuplicates===true));
calls.length=0;
await persistReadingChanges(sb,'u1',ids.map(chapter_id=>({chapter_id,desired:false})),{size:80});
assert.deepEqual(calls.map(x=>x.ids.length),[80,80,15]);
calls.length=0;
await persistReadingChanges(sb,'u1',restore);
assert.equal(calls[0].rows[0].read_at,initial[0].read_at,'Restaurar fecha real en Supabase');
let tries=0;
const failing={from:()=>({upsert:async()=>{tries++;return {error:new Error('denied')};}})};
await assert.rejects(()=>persistReadingChanges(failing,'u1',[{chapter_id:'c2',desired:true}]),/denied/);
assert.equal(tries,1,'No ocultar errores de Supabase');
await assert.rejects(()=>persistReadingChanges(sb,'',mark),/inválida/,'No modificar sin identidad');

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
for(const snippet of [
 "readingGroups, planReadingChanges, undoReadingChanges, applyReadingChanges, persistReadingChanges",
 ".select('id,num,title,vol,volume_id,series_id,publish_at,status,deleted_at')",
 'const live = () => seq === librarySeq',
 'data-read-work=',
 "toggleWholeWork(",
 "await confirmObi(question)",
 "undoReadingChanges(undoState.changes)",
 "readRows=applyReadingChanges(readRows,chapterById,changes)",
 "await persistReadingChanges(sb,uid,changes)",
 "await readPages((from,to)=>sb.from('read_chapters')",
 'Marcar capítulos disponibles como leídos',
 'Al día con lo publicado',
 'Solo se incluyen los capítulos publicados',
 '↶ Desmarcar lectura',
 'const query=box.querySelector',
 "sb.from('profiles').update({ hidden_series:"
]) assert(app.includes(snippet),'Botón directo/privacidad de Mi biblioteca: '+snippet);
assert(!app.includes('lb-read-dialog')&&!app.includes('dialog.showModal()'), 'No debe añadirse otra ventana ni menú');
for(const snippet of [
 "import { planReadingChanges, persistReadingChanges, applyReadingChanges } from './library-read-actions.js';",
 'data-read-chapter=',
 'data-read-vol=',
 'ui-read-chapter',
 'ui-read-volume',
 "savedReadRows=applyReadingChanges(",
 'refreshReadButtons();',
 "await persistReadingChanges(sb,u.id,changes)",
 "if(isVolume&&changes.length>1&&!await confirmObi(",
 "u ? sb.from('read_chapters').select('chapter_id,read_at')"
]) assert(ui.includes(snippet),'Acciones directas junto al capítulo/volumen: '+snippet);
console.log('✓ Botón sin menú, marcado/desmarcado de novela, volumen y capítulo, lotes y deshacer seguro');
