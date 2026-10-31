// Entrega 3: QA local de Difusión, sin conexiones ni envíos.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 DIFFUSION_TABS,diffusionTabFromSearch,diffusionTabUrl,
 schedulePresentation,jobPresentation,historyPresentation,diffusionContentUrl
} from '../src/diffusion-presentation.js';

const now=Date.parse('2026-10-31T17:30:00Z');
const overdue={id:'plan1',status:'planned',delivery_mode:'automatic',scheduled_at:'2026-10-29T03:57:00Z'};
assert.deepEqual(schedulePresentation(overdue,now).late,true);
assert.match(schedulePresentation(overdue,now).label,/Retrasado.*automático sin confirmación/);
assert.match(schedulePresentation({...overdue,delivery_mode:'manual'},now).detail,/Fecha cumplida: pendiente de envío manual/);
assert.equal(schedulePresentation({...overdue,scheduled_at:'2026-11-02T10:00:00Z'},now).late,false);
for(const status of ['sent','unknown','blocked','cancelled','processing']){
 assert.equal(schedulePresentation({...overdue,status},now).late,false,'No clasificar un estado final como retrasado: '+status);
}
assert.equal(jobPresentation('sent'),'Enviado y confirmado');
assert.equal(jobPresentation('unknown'),'Entrega sin confirmar');
const base='https://elobidellector.com/estudio?team=ejemplo&k=c&id=abc&s=def#difusion';
for(const tab of DIFFUSION_TABS){
 const url=diffusionTabUrl(base,tab);
 assert.equal(diffusionTabFromSearch(new URL('https://elobidellector.com'+url).search),tab);
 assert.match(url,/team=ejemplo/);assert.match(url,/k=c/);
 assert.match(url,/id=abc/);assert.match(url,/s=def/);
 assert.ok(url.endsWith('#difusion'));
}
assert.equal(diffusionTabFromSearch('?tab=__unknown__'),'');
assert.equal(diffusionTabFromSearch('?tab=historial'),'historial');
assert.equal(diffusionTabUrl(base,'__unknown__'),'');
assert.equal(diffusionContentUrl('https://elobidellector.com/serie/ejemplo?desde=redes'),'https://elobidellector.com/serie/ejemplo?desde=redes');
for(const invalid of [
 'javascript:alert(1)','https://phishing.example/serie/ejemplo',
 'https://elobidellector.com.evil.test/serie/ejemplo',
 'https://u:p@elobidellector.com/serie/ejemplo',
 'http://elobidellector.com/serie/ejemplo'
])assert.equal(diffusionContentUrl(invalid),'','Nunca abrir un enlace no verificado: '+invalid);
const job={status:'sent',attempts:1,provider_post_id:'12345'};
const event={source_type:'series',safe_payload:{title:'Obra',message:'Anuncio de prueba',url:'https://elobidellector.com/serie/obra'}};
const connection={provider:'discord',label:'Novedades'};
const d=historyPresentation(job,event,connection);
assert.equal(d.channel,'DISCORD · Novedades');assert.equal(d.title,'Obra');
assert.equal(d.message,'Anuncio de prueba');assert.equal(d.status,'Enviado y confirmado');
assert.equal(d.reference,'12345');assert.equal(d.attempts,1);
assert.match(d.result,/Entrega confirmada/);
const unknown=historyPresentation({status:'unknown',attempts:0,last_error:'timeout'},null,null);
assert.equal(unknown.url,'');assert.equal(unknown.message,'');
assert.match(unknown.result,/timeout/);

const ui=readFileSync(new URL('../src/diffusion-panel.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/diffusion.css',import.meta.url),'utf8');
for(const text of [
 "import { diffusionTabFromSearch, diffusionTabUrl, schedulePresentation, historyPresentation }",
 "scoped(sb.from('diffusion_events')",
 "select('id,kind,source_type,safe_payload,created_at')",
 "id,status,connection_id,event_id,campaign_id,scheduled_at,last_error,provider_post_id,attempts,created_at",
 "id=\"df-history-refresh\"",
 "setTab(b.dataset.dtab || b.dataset.goto)",
 "window.addEventListener('popstate'",
 "window.removeEventListener('popstate'",
 "schedulePresentation(item).late&&item.delivery_mode==='automatic'",
 "data-schedule-cancel",
 "data-schedule-save",
 "diffusion_schedule_reschedule",
 "diffusion_schedule_cancel"
])assert.ok(ui.includes(text),'Falta contrato en pantalla: '+text);
assert.match(ui,/if\(!canLogs\)return/,'Sin permiso de historial no se consultan eventos');
assert.match(ui,/const safe = v => esc\(String\(v \?\? ''\)\)/,'Escapar datos del servidor');
assert.match(ui,/href="'\+safe\(item.url\)/,'Escapar la URL pública');
assert.doesNotMatch(ui,/\bdiffusion_dispatch\b/,'La interfaz no debe disparar el despacho automático');
assert.ok(css.includes('.df-overdue-note') && css.includes('.df-history-link'));
console.log('Entrega 3: historial trazable, estados vencidos, URL de pestañas y permisos — PASS sin backend');
