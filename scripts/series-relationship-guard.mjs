// Contrato del historial SQL: evitar relaciones bidireccionales que rompen
// las fichas de las obras con PostgREST/PGRST201 (HTTP 300).
// Sin red, credenciales, base de datos ni escritura de progreso.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = 'supabase/migrations/';
const migrations = readdirSync(root).filter(name => name.endsWith('.sql')).sort();
const original = '20261031220515_editorial_reading_start_20261031.sql';
const repair = '20261031221858_repair_series_chapters_ambiguous_relationship_20261031.sql';
assert(migrations.includes(original), 'Falta migración editorial original');
assert(migrations.includes(repair), 'Falta migración de reparación de la ficha pública');
assert(migrations.indexOf(repair) > migrations.indexOf(original), 'La reparación debe seguir al cambio original');

const originalSql = readFileSync(root + original, 'utf8');
const repairedSql = readFileSync(root + repair, 'utf8');
assert.match(originalSql, /ADD CONSTRAINT series_reading_start_same_series_fk/i,
  'Se perdió la explicación del origen de la ambigüedad');
assert.match(repairedSql, /DROP CONSTRAINT IF EXISTS series_reading_start_same_series_fk/i,
  'La relación inversa que rompe chapters(count) sigue presente');
assert.match(repairedSql, /BEFORE INSERT OR UPDATE OF reading_start_chapter_id/i,
  'Falta validación de inicio editorial al crear o editar');
assert.match(repairedSql, /c\.series_id = NEW\.id/i, 'Debe validar la pertenencia a la misma novela');
assert.match(repairedSql, /c\.deleted_at IS NULL/i, 'El inicio no puede ser capítulo eliminado');
assert.doesNotMatch(repairedSql, /(?:UPDATE|DELETE|TRUNCATE)\s+(?:TABLE\s+)?public\.(?:reading_progress|read_chapters|chapters|volumes)/i,
  'No reescribir lecturas ni capítulos para corregir la relación');

for (const filename of migrations.slice(migrations.indexOf(repair) + 1)) {
  const sql = readFileSync(root + filename, 'utf8');
  assert.doesNotMatch(sql, /ALTER TABLE\s+(?:IF EXISTS\s+)?public\.series[\s\S]{0,250}?ADD CONSTRAINT\s+series_reading_start_same_series_fk/i,
    filename + ' volvió a introducir la FK inversa');
}

const ui = readFileSync('src/ui.js', 'utf8');
assert.match(ui, /chapters\(count\)/, 'La ficha pública depende del conteo integrado de capítulos');
assert.match(ui, /No pudimos cargar esta novela/, 'La ficha debe manejar error de consulta');
console.log('OK: fichas públicas sin FK inversa ambigua, pertenencia protegida, progreso intacto');
