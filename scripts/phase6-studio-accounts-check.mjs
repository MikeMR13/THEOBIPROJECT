// Fase 6.3 — pruebas sin red ni datos personales para compartir borradores y cambiar cuentas.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {previewShareLink, resetTeamSession} from '../src/studio-preview-share.js';

const uuid='55555555-5555-4555-8555-555555555555';
let tokens=0;
const generateToken=async()=>{tokens++;return uuid};
const base={
  origin:'https://elobidellector.com',slug:'equipo-qa',token:null,savedDesign:'{"theme":"tinta"}',
  currentDesign:'{"theme":"tinta"}',generateToken
};
const created=await previewShareLink(base);
assert.equal(created.link,'https://elobidellector.com/equipo/equipo-qa?vista='+uuid);
assert.equal(created.token,uuid);assert.equal(tokens,1);
const reused=await previewShareLink({...base,token:uuid,generateToken:()=>{throw Error('No renovar token existente')}});
assert.equal(reused.link,created.link);
for(const change of [
  {savedDesign:null},
  {queued:true},{saving:true},{currentDesign:'{"theme":"sakura"}'}
]){
  const before=tokens;
  await assert.rejects(previewShareLink({...base,...change}),/guardad|pendientes/i);
  assert.equal(tokens,before,'No generar token ni escribir nada cuando el borrador no se puede compartir');
}
await assert.rejects(previewShareLink({...base,generateToken:async()=>'token-roto'}),/válido/);

const state={userId:'u1',team:{id:'t1'},teams:[{id:'t1'}],perms:{owner:true,profile:true},works:9,tz:'UTC'};
assert.equal(resetTeamSession(state,'u1'),false,'Una misma cuenta mantiene la selección');
assert.equal(resetTeamSession(state,'u2'),true,'Cambiar de cuenta debe invalidar la selección');
assert.deepEqual({team:state.team,teams:state.teams,perms:state.perms,works:state.works},
  {team:null,teams:[],perms:{},works:null},'No compartir equipos ni permisos entre cuentas');

const studio=readFileSync('src/studio.js','utf8');
const handler=studio.match(/\$\('#pf-share'\)\.onclick[\s\S]*?(?=\n  \})/);
assert(handler,'El botón compartir debe existir');
assert(!handler[0].includes("team_design_save"),'El botón compartir jamás guarda diseños');
assert(!handler[0].includes("team_design_publish"),'El botón compartir jamás publica diseños');
assert(handler[0].includes('previewShareLink('),'Se usa el contrato de borrador guardado');
assert(studio.includes("if (!can('profile'))"),'La sección de edición debe exigir permiso de perfil');
assert(studio.includes("sb.rpc('my_team_permissions', { t: team.id })"),'Los permisos dependen del equipo actual');
assert(studio.includes("if (T.userId !== uid || getUser()?.id !== uid || T.team?.id !== team.id) return false;"),'No aplicar permisos de otra sesión');
assert(studio.includes("if (await pickTeam(e.target.value))"),'El selector no continúa si falla el cambio de equipo');
assert(studio.includes('TP.render(D, previewDesign'),'Vista previa renderizada desde el diseño sin publicar');
assert(studio.includes("team_design_publish"),'Publicación explícita preservada');
assert(studio.includes("team_design_restore"),'Historial de versiones preservado');
assert(studio.includes("team_design_save"),'Guardado automático de escritorio preservado');
assert(studio.includes('mountTeamReaderDefaults'),'Editor de predeterminados ligado a Studio con permiso profile');

// Prueba funcional del controlador real: dos usuarios distintos no heredan equipo ni permisos.
globalThis.document={
  addEventListener(){},getElementById:id=>id==='st2-css'?{sheet:{}}:null,
  querySelectorAll(){return[]},querySelector(){return null},
  body:{classList:{add(){},remove(){},contains(){return true}},contains(){return true}},
  head:{appendChild(){}}
};
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const {createStudio}=await import('../src/studio.js');
let uid='u1';const queried=[],redirects=[];
const app={innerHTML:'',querySelector(){return null},querySelectorAll(){return[]}};
const sb={
  rpc(name,args){if(name==='my_team_permissions'){queried.push({user:uid,team:args.t});return Promise.resolve({data:{create:false,profile:false}})}return Promise.resolve({data:null})},
  from(table){
    const q={filter:'',selected:'',select(x){this.selected=x;return this},eq(k,v){if(k==='user_id'||k==='team_id')this.filter=v;return this},
      is(){return this},order(){return this},limit(){return this},
      maybeSingle(){if(table==='team_members')return Promise.resolve({data:{team_roles:{name:'Colaborador'}}});if(table==='teams')return Promise.resolve({data:{settings:{}}});return Promise.resolve({data:null})},
      then(resolve,reject){
        let data=[],count=0;
        if(table==='team_members')data=[{role:'collaborator',teams:{id:'team-'+this.filter,slug:'equipo-'+this.filter,name:'Equipo '+this.filter}}];
        return Promise.resolve({data,count}).then(resolve,reject);
      }
    };return q;
  }
};
const st=createStudio({sb,app,$:()=>null,esc:x=>String(x??''),toast:()=>{},go:x=>redirects.push(x),getUser:()=>uid?{id:uid}:null,getMe:()=>({platform_role:'member'}),url:'https://example.supabase.co'});
await st.newWork();assert.match(app.innerHTML,/no permite crear obras/i);
uid='u2';await st.newWork();assert.match(app.innerHTML,/no permite crear obras/i);
uid=null;await st.newWork();assert(redirects.includes('/entrar'),'Salir de sesión exige autenticación nueva');
uid='u1';await st.newWork();
assert.deepEqual(queried.map(x=>x.team),['team-u1','team-u2','team-u1'],'Los permisos siempre se consultan para el equipo perteneciente a la cuenta actual');
assert.deepEqual(queried.map(x=>x.user),['u1','u2','u1']);
console.log('Fase 6.3: borradores compartidos sin guardado y cuentas/roles aislados correctamente.');
