// Regresión 42703 · el trigger compartido no debe leer columnas exclusivas de volumes en chapters.
// Contratos puramente estáticos; la migración real se comprueba en Supabase con un trigger temporal.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync('supabase/migrations/20261031022443_fix_guard_publish_chapters_no_published_at_20261031.sql','utf8');
const sql=migration.replace(/--[^\n]*/g,'').toLowerCase();
assert.match(sql,/create\s+or\s+replace\s+function\s+private\.guard_publish\s*\(\s*\)/);
assert.match(sql,/security\s+definer/);
assert.match(sql,/set\s+search_path\s+to\s+''/);
assert.match(sql,/if\s+tg_table_schema\s*=\s*'public'\s+and\s+tg_table_name\s*=\s*'volumes'\s+then/);

const [general,volume]=sql.split(/if\s+tg_table_schema\s*=\s*'public'\s+and\s+tg_table_name\s*=\s*'volumes'\s+then/);
assert.equal((sql.match(/new\.published_at/g)||[]).length,1,'Volumen: se debe controlar published_at una vez');
assert.equal((sql.match(/new\.announce_prelaunch/g)||[]).length,1,'Volumen: controlar anuncio previo');
for(const field of ['published_at','announce_prelaunch']) {
  assert(!general.includes('new.'+field) && !general.includes('old.'+field),
    'Se consulta '+field+' antes de comprobar que el registro es un volumen');
  assert(volume.includes('new.'+field) && volume.includes('old.'+field),
    'Se ha perdido la protección de reprogramación de volumen: '+field);
}
for(const check of ['forbidden_publish','forbidden_schedule','forbidden_unpublish',
  'forbidden_unschedule','forbidden_reschedule'])
  assert(sql.includes(check),'Se perdió protección '+check);
assert.match(sql,/return\s+new\s*;/);

const importer=readFileSync('src/studio-importer.js','utf8');
assert(importer.includes("sb.rpc('publish_volume'"),'La importación dejó de usar publicar volumen');
assert(importer.includes("sb.from('chapters').update("),'El importador ya no actualiza capítulos para reemplazo');
console.log('✓ Importación 42703: función de publicación mantiene permisos y aísla campos de volúmenes');
