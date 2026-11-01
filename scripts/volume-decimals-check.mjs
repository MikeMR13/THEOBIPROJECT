// QA aislada: campos de Studio/importador y SQL usan 4.5 sin redondear ni conectar a Supabase.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseVolumeNumber, nextVolumeNumber, importedVolumeNumber } from '../src/volume-number.js';

for (const [raw,num] of [['4.5',4.5], ['4,5',4.5], ['4',4], ['999',999], ['10.1',10.1]]) {
  assert.equal(parseVolumeNumber(raw),num,'Se debe aceptar el volumen '+raw);
}
for (const raw of ['0','0.5','-1','4.55','1000','4e0','','NaN','1.']) {
  assert.throws(()=>parseVolumeNumber(raw),/volumen|número/i,'No aceptar '+raw);
}
assert.equal(nextVolumeNumber([1,2,3,4.5]),5,'Después de 4.5 corresponde 5 y no 5.5');
assert.equal(nextVolumeNumber([4,4.5,5]),6);
assert.equal(nextVolumeNumber([]),1);

assert.equal(importedVolumeNumber({
  filename: 'Bruja del Silencio 4.5 After - Matsuri Isora_v2.epub',
  title: 'Los secretos de la Bruja del Silencio',
  metadataIndex: 5,
  fallback: 5
}), 4.5, 'El caso real: priorizar 4.5 del archivo sobre el siguiente volumen 5');
assert.equal(importedVolumeNumber({
  filename: 'Bruja del Silencio 4,5 After.epub',
  metadataIndex: null, fallback: 5
}), 4.5, 'Se admite coma decimal en el nombre');
assert.equal(importedVolumeNumber({
  filename: 'serie.epub', title: 'Volumen 4.5', metadataIndex: null, fallback: 5
}), 4.5, 'Se conserva el decimal del título EPUB');
assert.equal(importedVolumeNumber({ filename: 'obra.epub', metadataIndex: 3.5, fallback: 5 }), 3.5);
assert.equal(importedVolumeNumber({ filename: 'obra.epub', metadataIndex: 4, fallback: 5 }), 4);
assert.equal(importedVolumeNumber({ filename: 'obra.epub', fallback: 5 }), 5);
assert.equal(importedVolumeNumber({ filename: 'obra 4.55.epub', fallback: 5 }), 5,
  'No recortar silenciosamente números con dos decimales');

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

assert.match(importer,/D\.vnum = importedVolumeNumber\(\{ filename: f\.name,/,
  'Al importar directamente desde una obra debe usar el número del EPUB/archivo');
assert.match(importer,/D\.vnum = importedVolumeNumber\(\{ filename: file\?\.name,/,
  'Cambiar la obra de destino debe conservar 4.5');
assert.doesNotMatch(importer,/contextualWork \? nextVol\(contextualWork\)/,
  'No reemplazar 4.5 por el siguiente entero al abrir el importador desde Obras');

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

const decimalPublish = readFileSync('supabase/migrations/20261101040000_volumenes_decimales_publicacion_compra.sql','utf8');
const states = readFileSync('supabase/migrations/20261024_series_publication_modes.sql','utf8');
const studioPub = readFileSync('src/studio-series-publication.js','utf8');
assert.match(decimalPublish,/ALTER TABLE public\.series\s+ALTER COLUMN final_volume TYPE numeric\(5,1\)/,
  'El volumen final heredado debe aceptar 4.5');
assert.match(decimalPublish,/CREATE FUNCTION public\.admin_purchase_queue\(\)[\s\S]*vol numeric/,
  'La cola de compras debe devolver el número de volumen sin redondeos');
assert.match(decimalPublish,/GRANT EXECUTE ON FUNCTION public\.admin_purchase_queue\(\) TO authenticated, service_role/,
  'La cola conserva los permisos originales');
assert.match(decimalPublish,/NOTIFY pgrst, 'reload schema'/,
  'PostgREST actualiza el contrato tras el cambio');
assert.match(states,/perform public\.publish_volume\(v\.id\)/,
  'Publicar una novela utiliza el ID del volumen y no recalcula el número');
assert.match(studioPub,/v\.title\.trim\(\) !== String\(v\.num\)/,
  'No duplicar el número decimal en el selector de publicación');
assert.match(studio,/name="is_final"/,
  'Un volumen decimal puede marcarse como último volumen');
assert.match(importer,/\{series_id:w\.id,volume_id:vol\.id,vol:D\.vnum/,
  'Los capítulos nuevos guardan exactamente el decimal del volumen');
assert.match(importer,/p_volume: vol\.id/,
  'La publicación inmediata y programada usan el ID del volumen importado');

console.log('QA volumen 4.5: entrada, edición, importación, orden, migración y permisos OK');
