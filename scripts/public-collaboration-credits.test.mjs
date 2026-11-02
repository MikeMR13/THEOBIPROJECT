// Pruebas aisladas de créditos públicos (sin conectar a Supabase ni modificar datos).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attachPublicCredits, creditTeams, creditsHTML } from '../src/public-collaboration-credits.js';

const esc = x => String(x ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const media = path => 'https://cdn.example/obi-media/' + path;
const series = [
  { id:'s-1', team_id:'t-owner', teams: { name:'Principal',slug:'principal',avatar_path:'principal.png',settings:{show_reader_logo:true},reader_defaults:{size:20} } },
  { id:'s-2', team_id:'t-two', teams: { name:'Otra editorial', slug:'otra', avatar_path:'otra.png' } }
];
const creditResult = [
  { series_id:'s-1',team_id:'t-owner',name:'Principal',slug:'principal',avatar_path:'principal.png',status:'Activo',show_reader_logo:true,is_primary:true },
  { series_id:'s-1',team_id:'t-accepted',name:'Colaboradora',slug:'colaboradora',avatar_path:'colaboradora.png',status:'Activo',show_reader_logo:true,is_primary:false },
  { series_id:'s-2',team_id:'t-two',name:'Otra editorial',slug:'otra',avatar_path:'otra.png',status:'Activo',show_reader_logo:true,is_primary:true }
];
const calls=[];
const sb={rpc(name,args){calls.push({name,args});return Promise.resolve({data:creditResult,error:null});}};
await attachPublicCredits(sb,series);
assert.equal(calls.length,1, 'Una sola consulta por grupo de obras');
assert.equal(calls[0].name,'series_public_credits');
assert.deepEqual(calls[0].args.p_series_ids,['s-1','s-2']);
assert.equal(creditTeams(series[0]).length,2);
assert.equal(creditTeams(series[1]).length,1);
assert.equal(series[0].teams.reader_defaults.size,20,'Mantener ajustes del traductor principal');

const page = creditsHTML(series[0],{esc,media,mode:'detail'});
assert.match(page,/principal\.png/);
assert.match(page,/colaboradora\.png/);
assert.match(page,/href="\/equipo\/colaboradora"/);
assert.match(page,/Traductor principal/);
assert.match(page,/Equipo colaborador/);
const carousel = creditsHTML(series[0],{esc,media,mode:'carousel'});
assert.match(carousel,/colaboradora\.png/);
assert.doesNotMatch(carousel,/<a\b/,'Evitar enlaces anidados en tarjetas que ya son enlaces');
const reader = creditsHTML(series[0],{esc,media,mode:'reader'});
assert.match(reader,/principal\.png/);
assert.match(reader,/colaboradora\.png/);

series[0].publicCredits[1].show_reader_logo=false;
const optedOut = creditsHTML(series[0],{esc,media,mode:'reader'});
assert.doesNotMatch(optedOut,/colaboradora\.png/,'Respetar la preferencia del equipo colaborador en el lector');
assert.match(optedOut,/>Colaboradora<\/span>/);
assert.match(creditsHTML(series[0],{esc,media,mode:'detail'}),/colaboradora\.png/,
  'El ajuste de logo del lector no oculta el PNG en la ficha');
series[0].publicCredits[1].avatar_path=null;
assert.match(creditsHTML(series[0],{esc,media,mode:'carousel'}),/>Colaboradora<\/span>/);

const unsafe={...series[0],publicCredits:[{team_id:'t-risk',slug:'risk',name:'<img onerror=alert(1)>',is_primary:false}]};
const safe=creditsHTML(unsafe,{esc,media,mode:'reader'});
assert.doesNotMatch(safe,/<img onerror/);
assert.match(safe,/&lt;img/);

// Fallo de RPC: mantiene al traductor principal, sin inventar colaboradores ni exponer invitaciones.
const fallback={id:'offline',team_id:'t-owner',teams:{name:'Principal',slug:'principal',avatar_path:'principal.png'}};
await attachPublicCredits({rpc:async()=>({data:null,error:{message:'RPC no instalada'}})},[fallback]);
assert.equal(creditTeams(fallback).length,1);
const stale={id:'revoked',team_id:'t-owner',
  teams:{name:'Principal',slug:'principal',avatar_path:'principal.png'},
  publicCredits:[{team_id:'t-owner',name:'Principal',slug:'principal',is_primary:true},
    {team_id:'t-old',name:'Revocada',slug:'revocada',avatar_path:'stale.png'}]};
await attachPublicCredits({rpc:async()=>({data:null,error:{message:'sin conexión'}})},[stale]);
assert.equal(creditTeams(stale).length,1,'No conservar PNGs sin poder confirmar colaboradores');
assert.doesNotMatch(creditsHTML(stale,{esc,media,mode:'detail'}),/stale\.png/);


// Contrato público: obras publicadas y únicamente estado active.
const sql=readFileSync(new URL('../sql/public-accepted-collaborator-credits.sql',import.meta.url),'utf8');
assert.match(sql,/c\.status = 'active'/);
assert.match(sql,/s\.published IS TRUE/);
assert.match(sql,/s\.archived_at IS NULL/);
assert.match(sql,/REVOKE ALL ON FUNCTION public\.series_public_credits\(uuid\[\]\) FROM PUBLIC/);
assert.doesNotMatch(sql,/(?:c\.status = 'pending'|c\.status IN \('pending')/);
const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const rd=readFileSync(new URL('../src/reader.js',import.meta.url),'utf8');
assert.match(ui,/const creditsRequest = Promise\.all\(\[feedRequest, Promise\.resolve\(adultRequest\)\]\)/,
  'Inicio debe consultar créditos en paralelo con los volúmenes y tras validación +18');
assert.match(ui,/return attachPublicCredits\(sb, visible\)/,
  'Inicio debe hidratar los logos de colaboradores solo en obras visibles');
assert.match(ui,/await softWait\(creditsRequest, null, 650\);/,
  'Inicio debe limitar la espera de créditos');
assert.match(ui,/void creditsRequest\.then\(\(\) => \{[\s\S]*?previous\.outerHTML = html/,
  'Inicio debe completar logos de colaboradores que respondan tarde');
assert.match(ui,/await softWait\(attachPublicCredits\(sb, works\), null, 550\)/, 'La búsqueda conserva los logos sin bloquearse');
assert.match(ui,/creditsHTML\(x, \{ esc, media, mode: 'carousel' \}\)/, 'Búsqueda muestra logos sin enlaces anidados');
const appSource=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
assert.match(appSource,/libraryCreditTask = Promise\.resolve\(attachPublicCredits\(sb, ser \|\| \[\]\)\)/,
  'La biblioteca consulta solo créditos públicos aceptados');
assert.match(appSource,/void libraryCreditTask\?\.then\(\(\) => \{[\s\S]*?current\.outerHTML = html/,
  'La biblioteca debe completar logos tardíos sin perder los filtros');
assert.match(appSource,/creditsHTML\(w\.s, \{ esc, media: MED, mode: 'carousel' \}\)/, 'La biblioteca muestra logos sin enlaces anidados');
assert.match(ui,/await attachPublicCredits\(sb, ser \|\| \[\]\)/, 'Lanzamientos deben mostrar colaboradores aceptados');
assert.match(ui,/creditTeams\(g\.s\)\.some\(t => t\.name === R\.team\)/, 'Filtrar lanzamientos por equipo colaborador');
const calendar=readFileSync(new URL('../src/agenda.js',import.meta.url),'utf8');
assert.match(calendar,/await optional\(attachPublicCredits\(sb, Object\.values\(D\.series\)/, 'El calendario carga créditos, sin retener el calendario');
assert.match(calendar,/creditTeams\(g\.s\)\.some\(t => t\.slug === V\.team\)/, 'Filtrar calendario por colaboradores');
const teamPage=readFileSync(new URL('../src/teampage.js',import.meta.url),'utf8');
assert.match(teamPage,/team_public_collaboration_series/, 'La página de equipo muestra obras compartidas');
assert.match(teamPage,/Obras en colaboración/);
assert.match(teamPage,/creditsHTML\(w, \{ esc, media, mode: 'carousel' \}\)/);
assert.match(sql,/CREATE OR REPLACE FUNCTION public\.team_public_collaboration_series/);
assert.match(sql,/REVOKE ALL ON FUNCTION public\.team_public_collaboration_series\(uuid\) FROM PUBLIC/);
assert.match(ui,/mode: 'carousel'/);
assert.match(ui,/mode: 'detail'/);
assert.match(rd,/creditsHTML\(S\.series, \{ esc, media, mode: 'reader' \}\)/);
console.log('Créditos públicos: logos, privacidad, estados y preferencias OK');
