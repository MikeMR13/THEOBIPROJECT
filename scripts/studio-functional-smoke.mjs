// Smoke tests de flujo real sobre createStudio con DOM y Supabase simulados.
// No accede a cuentas, tablas ni Vercel; mantiene JavaScript ES nativo sin
// dependencias de navegador ni de pruebas adicionales.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const events=[];
const fieldMap=new Map();
const field=id=>{
  if(!fieldMap.has(id))fieldMap.set(id,{
    id,tagName:id==='nw-work_type'?'SELECT':'INPUT',value:'',textContent:'',
    dataset:id==='nw-title'?{w:'title'}:{},
    focus(){},addEventListener(type,fn){this['on'+type]=fn},removeEventListener(){}
  });
  return fieldMap.get(id);
};
const mockFields={querySelectorAll(sel){return sel==='[data-w]'?[field('nw-title')]:[]},querySelector(){return null}};
globalThis.document={
  addEventListener(type){events.push(type);},
  getElementById(id){return id==='st2-css'?{sheet:{}}:null;},
  querySelectorAll(){return[];},querySelector(){return null;},
  body:{classList:{add(){},contains(){return true},remove(){}},contains(){return true}},
  head:{appendChild(){}}
};
const data=new Map();
globalThis.localStorage={
 getItem:key=>data.get(key)??null,
 setItem:(key,val)=>data.set(key,String(val)),
 removeItem:key=>data.delete(key)
};
const {createStudio}=await import('../src/studio.js');
const source=readFileSync('src/studio.js','utf8');
const importer=readFileSync('src/studio-importer.js','utf8');
const key=/const slugify = s => ([^\n]+);/;
const a=key.exec(source),b=key.exec(importer);
assert(a&&b,'Se perdió la función de URL de Nueva obra / Importador');
assert.equal(a[1],b[1],'El flujo manual y el importador deben producir los mismos slugs');

// Respuestas de PostgREST y RPC por operación, sin acceso a la red.
function fixture({perms={create:true,import:true,edit:true,publish:true}}={}){
  const inserted=[],calls=[],redirects=[],notices=[];
  const app={_html:'',set innerHTML(v){this._html=v},get innerHTML(){return this._html},querySelectorAll(){return []},querySelector(){return null}};
  function valueFor(table,field=''){
    if(table==='team_members')return field.includes('team_roles')
      ?{data:{team_roles:{name:'Propietario'}}}
      :{data:[{role:'owner',teams:{id:'team-1',slug:'equipo',name:'Equipo'}}]};
    if(table==='teams')return {data:{settings:{timezone:'America/Monterrey'}}};
    if(table==='series')return {data:[],count:0};
    if(table==='notifications')return {data:[],count:0};
    return {data:[],count:0};
  }
  const sb={
    rpc(name){calls.push('rpc:'+name);return Promise.resolve({data:name==='my_team_permissions'?perms:[]})},
    from(table){
      const state={field:'',insert:null};
      const q={
        select(name){state.field=name;return q},
        eq(){return q},is(){return q},limit(){return q},order(){return q},or(){return q},not(){return q},gte(){return q},
        insert(v){state.insert=v;inserted.push({table,values:v});return q},
        single(){return Promise.resolve(state.insert?{data:table==='series'?{id:'series-1',slug:state.insert.slug,title:state.insert.title}:table==='volumes'?{id:'volume-1',num:1}:{id:'chapter-1'}}:valueFor(table,state.field))},
        maybeSingle(){return Promise.resolve(valueFor(table,state.field))},
        then(resolve,reject){return Promise.resolve(valueFor(table,state.field)).then(resolve,reject)}
      };
      return q;
    }
  };
  const ctx={
    sb,app,$:s=>s==='#nw-fields'?mockFields:s.startsWith('#nw-')?field(s.slice(1)):null,
    esc:s=>String(s??''),toast:s=>notices.push(s),go:s=>redirects.push(s),
    getUser:()=>({id:'user-1'}),getMe:()=>({platform_role:'member'}),
    url:'https://example.supabase.co'
  };
  return {studio:createStudio(ctx),app,inserted,calls,redirects,notices};
}
function reset(){fieldMap.clear();data.clear();}
reset();
const happy=fixture();
await happy.studio.newWork();
assert.match(happy.app.innerHTML,/Datos de la obra/);
const title=field('nw-title');
title.oninput({target:{value:'Crónicas del Dragón'}}); 
await field('nw-go').onclick({currentTarget:{disabled:false,textContent:'Crear obra y continuar',dataset:{}}});
assert.equal(happy.inserted.length,1,'La creación debe alcanzar PostgREST; si falta slugify falla silenciosamente');
assert.equal(happy.inserted[0].table,'series');
assert.equal(happy.inserted[0].values.slug,'cronicas-del-dragon');
assert.equal(happy.inserted[0].values.work_type,'Novela ligera','El tipo editorial no debe guardarse como un solo carácter');
assert.equal(happy.inserted[0].values.published,false);
assert.match(happy.app.innerHTML,/Volumen 1/);
field('nw-vt').oninput({target:{value:'Volumen inicial'}});
await field('nw-v').onclick({currentTarget:{disabled:false,textContent:'Crear volumen',dataset:{}}});
assert.deepEqual(happy.inserted.map(v=>v.table),['series','volumes','chapters']);
assert.equal(happy.inserted[1].values.status,'draft');
assert.equal(happy.inserted[2].values.status,'draft');
assert(happy.redirects.includes('/estudio/editar/chapter-1'),'No se abre el editor tras crear capítulo');
assert(!happy.notices.some(n=>/Error|not defined|permiso/i.test(n)),'No debe ocultar errores de ejecución');

reset();
const denied=fixture({perms:{create:false,import:false}});
await denied.studio.newWork();
assert.match(denied.app.innerHTML,/no permite crear obras/i);
assert.equal(denied.inserted.length,0,'El botón de crear nunca debe escribir sin permiso');

const {createImporter}=await import('../src/studio-importer.js');
const {createEditor}=await import('../src/studio-editor.js');
const {createLibrary}=await import('../src/studio-media.js');
let queried=0;
const restricted=createImporter({
  ensure:async()=>true,can:()=>false,
  app:{innerHTML:''},
  shell:(title,body)=>body,bindPicker:()=>{},sb:{from(){queried++;throw Error('DB read forbidden')}}
});

await restricted();
assert.equal(queried,0,'Importar sin rol no debe consultar obras');
assert.equal(await createEditor({ensure:async()=>false})('any'),undefined);
assert.equal(await createLibrary({ensure:async()=>false})(''),undefined);
console.log('Flujos simulados Studio: nueva obra → volumen → capítulo, permisos y rutas OK');
