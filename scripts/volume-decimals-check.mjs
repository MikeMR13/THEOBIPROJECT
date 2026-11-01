// QA aislada: campos de Studio/importador y SQL usan 4.5 sin redondear ni conectar a Supabase.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseVolumeNumber, nextVolumeNumber } from '../src/volume-number.js';

for (const [raw,num] of [['4.5',4.5], ['4,5',4.5], ['4',4], ['999',999], ['10.1',10.1]]) {
  assert.equal(parseVolumeNumber(raw),num,'Se debe aceptar el volumen '+raw);
}
for (const raw of ['0','0.5','-1','4.55','1000','4e0','','NaN','1.']) {
  assert.throws(()=>parseVolumeNumber(raw),/volumen|número/i,'No aceptar '+raw);
}
assert.equal(nextVolumeNumber([1,2,3,4.5]),5,'Después de 4.5 corresponde 5 y no 5.5');
assert.equal(nextVolumeNumber([4,4.5,5]),6);
assert.equal(nextVolumeNumber([]),1);
assert.deepEqual([5,4.5,4,6].sort((a,b)=>a-b),[4,4.5,5,6]);

const studio=readFileSync('src/studio.js','utf8');
const importer=readFileSync('src/studio-importer.js','utf8');
const ui=readFileSync('src/ui.js','utf8');
const migration=readFileSync('supabase/migrations/20261101021720_volume_numbers_decimal_20261101.sql','utf8');
assert.match(studio,/name="vnum"[^>]*step="0\.1"/,'Studio debe admitir décimas');
assert.match(studio,/const nn = parseVolumeNumber\(f\('vnum'\)\.value\)/,'No redondear el guardado');
assert.match(studio,/renumber_volume/,'Renumeración con su RPC segura');
assert.match(importer,/id="dv"[^>]*step="0\.1"/,'Importador debe admitir décimas');
assert.match(importer,/parseVolumeNumber\(e\.target\.value\)/);
assert.doesNotMatch(importer,/Math\.round\(\+e\.target\.value\)/);
assert.match(ui,/volumen\\s\*\\d\+\(\?:\\\.\\d\+\)\?/,'Reconocer títulos por defecto con decimal');

for (const [table,col] of [['volumes','num'],['chapters','vol'],['download_links','vol'],['purchase_links','vol']]) {
  assert(migration.includes('ALTER TABLE public.'+table+' ALTER COLUMN '+col+' TYPE numeric(5,1)'),'Falta tipo decimal '+table+'.'+col);
}
assert(migration.includes('CREATE FUNCTION public.renumber_volume(p_volume uuid, p_num numeric)'));
assert(migration.includes('p_num * 10 <> trunc(p_num * 10)'),'Impedir redondeo silencioso en DB');
assert(migration.includes('RETURNS TABLE(id bigint, volume_id uuid, vol numeric'),'Descargas deben conservar decimales');
assert(migration.includes('UPDATE public.chapters SET vol=p_num WHERE volume_id=p_volume'),'Sincronizar capítulos');
assert(migration.includes('UPDATE public.download_links SET vol=p_num WHERE volume_id=p_volume'),'Sincronizar enlaces EPUB/PDF');
assert(migration.includes('GRANT EXECUTE ON FUNCTION public.renumber_volume(uuid,numeric) TO authenticated, service_role'),'Mantener permisos de edición');
assert(migration.trim().startsWith('--') && migration.trim().endsWith('COMMIT;'),'DDL debe ser atómica');
console.log('QA volumen 4.5: entrada, edición, importación, orden, migración y permisos OK');
