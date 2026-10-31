// QA de estados reales del calendario de temporadas; sin backend ni credenciales.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SEASONS} from '../src/anim.js';
import {describeAdminSeasons} from '../src/season-admin-view.js';

const y='2026-10-30',auto=Object.keys(SEASONS);
const rows=[{key:'otono',starts:'2026-09-22',hemi:'norte'},
 {key:'primavera',starts:'2026-09-22',hemi:'sur'},
 {key:'muertos',starts:'2026-11-01',hemi:null}];
const list=describeAdminSeasons({seasons:SEASONS,calendar:rows,auto,hemi:'norte',today:y});
const by=k=>list.find(x=>x.key===k);
assert.equal(by('halloween').state,'applied','Halloween se muestra del 25 al 31 de octubre');
assert.equal(by('halloween').period.end,'2026-10-31');
assert.equal(by('muertos').state,'upcoming','Muertos empieza el 1 de noviembre');
assert.equal(by('muertos').period.start,'2026-11-01');
assert.equal(by('obon').state,'finished','Obon ya terminó en 2026');
assert.equal(by('obon').period.end,'2026-08-16');
assert.equal(by('otono').state,'current','Otoño se superpone y no tiene prioridad sobre Halloween');
assert.equal(by('otono').period.start,'2026-09-22');
assert.equal(by('primavera').state,'finished','La primavera del norte terminó');
assert(by('halloween').periodLabel.includes('octubre'),'Se muestra la fecha completa');
const off=describeAdminSeasons({seasons:SEASONS,calendar:rows,auto:[],today:y});
assert(off.every(x=>x.state==='disabled'),'Desactivada es independiente de calendario');
assert.equal(off.find(x=>x.key==='obon').phase,'finished','Desactivada conserva vigencia histórica');
const cross=describeAdminSeasons({seasons:SEASONS,auto:['anonuevo'],today:'2027-01-01'});
assert.equal(cross.find(x=>x.key==='anonuevo').state,'applied','Año Nuevo cruza diciembre-enero');
assert.equal(cross.find(x=>x.key==='anonuevo').period.start,'2026-12-30');
const newCalendar=[{key:'tsukimi',starts:'2026-09-22',day:'2026-10-05'}];
const lunar=describeAdminSeasons({seasons:SEASONS,auto:['tsukimi'],calendar:newCalendar,today:'2026-10-04'});
assert.equal(lunar.find(x=>x.key==='tsukimi').state,'applied','Sincronización lunar prevalece en la vista');
assert.equal(SEASONS.tsukimi.d.years[2026],'09-25','No se modifica el catálogo compartido');

const admin=readFileSync('src/admin.js','utf8');
for(const marker of ['describeAdminSeasons','data-season-filter=','data-season-state=','data-greet-toggle=','aria-expanded=','aria-pressed=','sea-preview','Activación automática','Edición del año finalizada','min-height:44px'])
  assert(admin.includes(marker),'Falta interfaz de Temporadas: '+marker);
assert(!admin.includes('style="padding:4px 10px;font-size:12px">Ver'),'No recuperar botón Ver demasiado pequeño');
const ui=readFileSync('src/ui.js','utf8');
for(const marker of ['ui-vol-reading-state','data-vol-read-state=','ui-series-reading-note','Sin capítulos disponibles','Todo lo disponible leído','ui-v-actions>:is(a,button){min-height:44px','.ui-read-chapter,.ui-read-volume{display:inline-flex;align-items:center;justify-content:center;min-height:44px'])
  assert(ui.includes(marker),'Falta mejora de volúmenes: '+marker);
console.log('✓ Temporadas: calendario, fin de periodo, cruces de año, prioridad, desactivación, UI y volúmenes');
