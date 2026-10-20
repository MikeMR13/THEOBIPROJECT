// Verifica los nombres de migraciones registrados en la auditoría.
// No ejecuta SQL ni consulta a una base de datos.
import assert from 'node:assert/strict';
import { readFileSync,readdirSync } from 'node:fs';
const snapshot=JSON.parse(readFileSync('docs/SNAPSHOT-MIGRACIONES-SUPABASE-20261020.json','utf8'));
const local=readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort();
const stem=f=>f.replace(/^20\d{6}_/,'').replace(/\.sql$/,'');
assert.equal(snapshot.remote.length,32);
assert.deepEqual(local,snapshot.local,'Cambió el inventario local; actualizar la auditoría antes de nuevas migraciones');
const remoteNames=new Set(snapshot.remote.map(m=>m.name));
const identical=local.filter(f=>remoteNames.has(stem(f)));
assert.equal(identical.length,11,'La conciliación nominal necesita revisión');
console.log('SQL de solo lectura: locales='+local.length+', remotas='+snapshot.remote.length+', coincidencias nominales='+identical.length);
console.log('Un nombre coincidente NO implica contenido ni esquema equivalentes. No ejecutar migraciones aquí.');
