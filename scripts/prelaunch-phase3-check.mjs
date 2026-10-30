// SEO y recordatorios de Fase 3: contrato público, sin red ni credenciales.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import sitemap from '../api/sitemap.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const original={env:process.env.VERCEL_ENV,base:process.env.OBI_SUPABASE_URL,key:process.env.OBI_SUPABASE_PUBLISHABLE_KEY,fetch:globalThis.fetch};
process.env.VERCEL_ENV='production';
process.env.OBI_SUPABASE_URL='https://example.supabase.co';
process.env.OBI_SUPABASE_PUBLISHABLE_KEY='public_ci_dummy';
const now=Date.now(), soon=new Date(now+864e5).toISOString(),old=new Date(now-864e5).toISOString();
const work={id:'p1',slug:'public-book',published:true,archived_at:null,access:'public',adult:false,theme:{}};
const teams=[{id:'t1',slug:'team',status:'active',settings:{}},{id:'t2',slug:'hidden-team',status:'Proyecto privado',settings:{}},{id:'t3',slug:'noindex-team',status:'active',settings:{seo:{noindex:true}}}];
const previews=[
{kind:'volp',series_id:'n1',volume_id:'v1',slug:'public-preview',team_slug:'team',at:soon,adult:false,acc:'public',can_read:false},
{kind:'volp',series_id:'n1',volume_id:'v2',slug:'public-preview',team_slug:'team',at:soon,adult:false,acc:'public',can_read:false},
{kind:'volp',slug:'adult-preview',team_slug:'team',at:soon,adult:true,acc:'public',can_read:false},
{kind:'volp',slug:'tier-preview',team_slug:'team',at:soon,adult:false,acc:'tier',can_read:false},
{kind:'volp',slug:'old-preview',team_slug:'team',at:old,adult:false,acc:'public',can_read:false},
{kind:'volp',slug:'reader-preview',team_slug:'team',at:soon,adult:false,acc:'public',can_read:true},
{kind:'volp',slug:'hidden-preview',team_slug:'hidden-team',at:soon,adult:false,acc:'public',can_read:false},
{kind:'volp',slug:'noindex-preview',team_slug:'noindex-team',at:soon,adult:false,acc:'public',can_read:false},
{kind:'prog',slug:'chapter-leak',team_slug:'team',at:soon,adult:false,acc:'public',can_read:false}
];
let rpcFails=false, requests=[];
globalThis.fetch=async (url,opts={})=>{
 const u=new URL(url);requests.push({path:u.pathname,method:opts.method||'GET'});
 let rows=[];
 if(u.pathname.endsWith('/rpc/prelaunch_calendar')){
   if(rpcFails) return {ok:false,status:503};
   const body=JSON.parse(opts.body);
   assert.ok(body.p_from&&body.p_to);
   rows=previews;
 }else if(u.pathname.endsWith('/series'))rows=[work];
 else if(u.pathname.endsWith('/teams'))rows=teams;
 else if(u.pathname.endsWith('/volumes')||u.pathname.endsWith('/chapters'))rows=[];
 else throw Error('Unexpected table queried: '+u.pathname);
 return {ok:true,json:async()=>rows};
};
const get=async()=>{
 const response={headers:{},statusCode:0,setHeader(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(x){this.body=x;return this;},end(){this.body='';return this;}};
 await sitemap({method:'GET'},response);return response;
};
try{
 let r=await get();assert.equal(r.statusCode,200);
 assert.match(r.body,/\/serie\/public-preview/);
 assert.match(r.body,/\/serie\/public-book/);
 assert.equal((r.body.match(/\/serie\/public-preview/g)||[]).length,1);
 for(const invalid of ['adult-preview','tier-preview','old-preview','reader-preview','hidden-preview','noindex-preview','chapter-leak']){
   assert.doesNotMatch(r.body,new RegExp(invalid),'Do not index '+invalid);
 }
 assert.ok(requests.some(x=>x.path.endsWith('/rpc/prelaunch_calendar')&&x.method==='POST'));
 assert.ok(!requests.some(x=>x.path.includes('reminders')),'Sitemap must never touch private reminders');
 rpcFails=true;r=await get();assert.equal(r.statusCode,200);
 assert.doesNotMatch(r.body,/public-preview/,'Unavailable RPC must fail closed');
 assert.match(r.body,/public-book/,'Retain existing public work URLs if RPC is offline');
 assert.match(read('api/public-meta.js'),/isAccessibleForFree: !data\.prelaunch/);
 const preview=read('src/prelaunch.js');
 assert.match(preview,/upsert\(\{user_id:u\.id,series_id:pre\.series\.id,kind:'volp',at/);
 assert.match(preview,/onConflict:'user_id,series_id,kind,at'/);
 assert.match(preview,/\.eq\('user_id',u\.id\)\.maybeSingle\(\)/);
 assert.match(preview,/if\(!ready\)\{await sync\(\);if\(!ready\)return;\}/);
 assert.doesNotMatch(preview,/\.from\('chapters'\)/);
 assert.match(read('src/app.js'),/\/ui\.js\?v=61/);
 assert.match(read('src/index.html'),/\/app\.js\?v=51/);
 console.log('✓ Fase 3: sitemap público, JSON-LD sin lectura anticipada y avisos idempotentes.');
}finally{
 globalThis.fetch=original.fetch;
 if(original.env===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=original.env;
 if(original.base===undefined)delete process.env.OBI_SUPABASE_URL;else process.env.OBI_SUPABASE_URL=original.base;
 if(original.key===undefined)delete process.env.OBI_SUPABASE_PUBLISHABLE_KEY;else process.env.OBI_SUPABASE_PUBLISHABLE_KEY=original.key;
}
