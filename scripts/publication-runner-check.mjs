import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/20261023151500_fix_publication_runner_ambiguous_alias.sql', import.meta.url), 'utf8');
assert.match(migration, /CREATE OR REPLACE FUNCTION private\.run_publications\(\)/i, 'La corrección reemplaza el ejecutor existente');
assert.match(migration, /LANGUAGE plpgsql/i, 'Conservar lenguaje');
assert.match(migration, /SECURITY DEFINER/i, 'Conservar contexto de seguridad');
assert.match(migration, /SET search_path TO ''/i, 'Conservar search_path cerrado');
assert.match(migration, /for v in\s+update public\.volumes/i, 'Conservar promoción de volúmenes');
assert.match(migration, /update public\.chapters c/i, 'Conservar promoción de capítulos');
assert.match(migration, /select 1 from public\.volumes ready_volume/i, 'Evitar colisión con la variable v');
assert.match(migration, /ready_volume\.id = c\.volume_id/i, 'Validar asociación de capítulos');
assert.doesNotMatch(migration, /select 1 from public\.volumes v\s+where v\.id = c\.volume_id/i, 'Alias v ambiguo prohibido');
assert.match(migration, /insert into public\.notifications/i, 'Conservar aviso al publicar');
console.log('✓ Ejecutor de publicaciones: alias sin colisiones, función y avisos preservados.');
