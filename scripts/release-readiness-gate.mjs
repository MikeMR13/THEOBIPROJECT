// Release acceptance is evidence-based, not inferred from CI or fake sessions.
// Free/offline only: reads repository files, no network, secrets or writes to production.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const fromRepo=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

export const REQUIRED=[
 'reader-real','editor-real','librarian-real','responsive-real',
 'security-auth','public-url','vercel-no-charge'
];

function evidenceValid(x){
 if(x.status!=='approved')return false;
 if(typeof x.reviewed_by!=='string'||x.reviewed_by.trim().length<2)return false;
 if(typeof x.reviewed_at!=='string'||!/^\\d{4}-\\d{2}-\\d{2}T/.test(x.reviewed_at)
    ||!Number.isFinite(Date.parse(x.reviewed_at)))return false;
 try{
   const u=new URL(x.evidence_url);
   return u.protocol==='https:' && Boolean(u.hostname)
      && !u.username && !u.password;
 }catch{return false;}
}
export function assessRelease(m,config){
 assert.equal(m.schema,'obi.release-acceptance.v1');
 assert.equal(config?.git?.deploymentEnabled,false,
   'Vercel auto deployments MUST remain disabled until zero-cost release is established');
 const ids=m.manual?.map(x=>x.id)||[];
 assert.equal(new Set(ids).size,ids.length,'Duplicate manual criteria');
 for(const id of REQUIRED)assert(ids.includes(id),'Missing criterion '+id);
 const unexpected=ids.filter(id=>!REQUIRED.includes(id));
 assert.deepEqual(unexpected,[],'Unreviewed criterion added');
 for(const x of m.manual){
   assert(['pending','approved'].includes(x.status),'Invalid status '+x.id);
   if(x.status==='approved')assert(evidenceValid(x),'Approved without evidence: '+x.id);
 }
 assert(m.automated?.ci_run?.startsWith('https://github.com/'),
   'CI requires a verifiable workflow URL');
 const pending=m.manual.filter(x=>x.status!=='approved').map(x=>x.id);
 const authorized=m.deployment?.authorized===true;
 const deployed=m.deployment?.production_verified===true;
 const state=pending.length ? 'REQUIRES_MANUAL_REVIEW'
   : !authorized ? 'BLOCKED_NO_DEPLOY_AUTHORIZATION'
   : !deployed ? 'READY_FOR_DEPLOYMENT'
   : 'RELEASED';
 if(authorized)assert(!pending.length,'Cannot approve deploy with manual checks pending');
 if(deployed)assert(authorized&&typeof m.deployment.release_sha==='string'
    && /^[a-f0-9]{40}$/.test(m.deployment.release_sha),
    'Production release cannot be claimed without verified SHA and approval');
 return {state,pending,checks:m.manual.length,approved:m.manual.length-pending.length,
   auto_deploy_disabled:true,production_deployed:deployed};
}
const manifest=JSON.parse(fromRepo('qa/aceptacion-preestreno.json'));
const config=JSON.parse(fromRepo('vercel.json'));
const assessment=assessRelease(manifest,config);
if(process.argv.includes('--self-test')){
 const fake=structuredClone(manifest);
 fake.manual[0].status='approved';
 assert.throws(()=>assessRelease(fake,config),/Approved without evidence/);
 const missing=structuredClone(manifest);
 missing.manual.pop();
 assert.throws(()=>assessRelease(missing,config),/Missing criterion/);
 assert.throws(()=>assessRelease(manifest,{git:{deploymentEnabled:true}}),/MUST remain disabled/);
 console.log('PASS: no accidental approvals, missing criteria or paid auto-deploy');
}
const report={schema:'obi.release-acceptance-result.v1',generated_at:new Date().toISOString(),...assessment,
 verified_ci:manifest.automated.ci_run};
mkdirSync(new URL('../qa-evidencia/',import.meta.url),{recursive:true});
writeFileSync(new URL('../qa-evidencia/release-readiness.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--strict')&&assessment.state!=='RELEASED')process.exitCode=1;
