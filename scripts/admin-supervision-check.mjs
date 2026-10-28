// Garantías de integración visual: sin backend ni escrituras nuevas.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=readFileSync('src/admin.js','utf8');
const verify=spawnSync(process.execPath,['--check','src/admin.js'],{encoding:'utf8'});
assert.equal(verify.status,0,verify.stderr||'src/admin.js: sintaxis inválida');
assert.match(source,/\['supervision','Supervisión'\]/,'Debe existir la pestaña de supervisión');
assert.match(source,/async function supervision\(epoch\)/,'Debe existir una consulta global con protección de navegación');
assert.match(source,/sb\.from\('series'\)\.select\('id,title,slug,published,archived_at,team_id,teams\(name\)'\)/,'La supervisión debe leer series');
const mod=source.split('  async function supervision(epoch){')[1]?.split('  async function solicitudes(epoch){')[0];
assert.ok(mod,'No se pudo aislar supervisión');
assert.match(mod,/\.range\(offset,offset\+pageSize\)/,'La consulta de capítulos debe paginar');
assert.doesNotMatch(mod,/\.update\(|\.insert\(|\.delete\(|admin_(?:suspend|remove|intervene)/,'Supervisión no debe editar obras');
assert.match(source,/async function temporadas\(epoch\)/,'No eliminar Temas de temporada');
assert.match(source,/data-t=\"\$\{k\}\"/,'Conservar navegación del Mostrador');
console.log('OK: Mostrador con supervisión de solo lectura y temporadas conservadas');
