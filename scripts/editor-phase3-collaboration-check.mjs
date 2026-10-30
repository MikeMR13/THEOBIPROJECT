// Contratos de colaboración y comparación de bloques; no hay backend real.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareChapterVersions,suggestionIsStale,editorialBlockText} from '../src/editorial-collaboration.js';
const original={title:'Capítulo',body:[
 {type:'heading',text:'Apertura'}, {type:'paragraph',text:'Uno'},
 {type:'image',alt:'Una espada',url:'img:espada'}, {type:'paragraph',text:'Final'}]};
const current={title:'Capítulo revisado',body:[
 {type:'heading',text:'Apertura'}, {type:'paragraph',text:'Dos'},
 {type:'image',alt:'Una espada',url:'img:espada'}, {type:'paragraph',text:'Final'}]};
const copy=JSON.stringify({original,current});
let comparison=compareChapterVersions(original,current);
assert.equal(comparison.titleChanged,true);
assert.equal(comparison.sharedPrefix,1);
assert.equal(comparison.sharedSuffix,2);
assert.equal(comparison.removed,1);
assert.equal(comparison.added,1);
assert.deepEqual(comparison.before,['Uno']);
assert.deepEqual(comparison.after,['Dos']);
assert.equal(comparison.changed,true);
assert.equal(JSON.stringify({original,current}),copy,'Comparar no reescribe contenido');
assert.equal(suggestionIsStale(3,4),true);
assert.equal(suggestionIsStale(4,4),false);
assert.match(editorialBlockText({type:'image',alt:'Ilustración'}),/Ilustración/);
comparison=compareChapterVersions(current,current);
assert.equal(comparison.changed,false);
const many=compareChapterVersions({body:Array.from({length:40},(_,i)=>({type:'paragraph',text:'A'+i}))},
 {body:Array.from({length:40},(_,i)=>({type:'paragraph',text:'B'+i}))});
assert.equal(many.before.length,12);
assert.equal(many.truncated,true);
const editor=readFileSync('src/studio-editor.js','utf8');
const panel=readFileSync('src/editorial-suggestion-panel.js','utf8');
const css=readFileSync('src/styles.css','utf8');
for(const token of ['id="b-sug"','id="p-sug"','data-hd="${r.id}"','setupEditorialCollaboration('])
 assert(editor.includes(token),'Editor sin integración: '+token);
for(const token of ['editor_create_suggestion','editor_review_suggestion','getDirty()||getConflict()',
 'getVersion()','can(\'review\')','x.created_by!==userId','suggestionIsStale',
 'getRevision(d.hd)','compareChapterVersions','esc(x.excerpt)','esc(x.replacement'])
 assert(panel.includes(token),'Panel sin protección: '+token);
assert(css.includes('.ed-sug-form')&&css.includes('.ed-diff'),'Falta diseño responsive');
console.log('✓ Fase 3: diferencias no destructivas, revisión aislada y permisos UI');
