// Guardarraíl estático para cambios en Patreon y los calendarios editoriales.
// Ejecutarlo en cada build evita reintroducir atajos que entreguen el texto bloqueado.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const file = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sql = file('supabase/migrations/20261119_volumes_chapters_patreon_access_schedule.sql');
const studio = file('src/studio.js');
const editor = file('src/studio-editor.js');
const has = (s, text, desc) => assert.ok(s.includes(text), desc);
const lacks = (s, text, desc) => assert.ok(!s.includes(text), desc);
const section = (a, b) => {
  const start = sql.indexOf(a);
  assert.ok(start >= 0, 'No se encontró: ' + a);
  const end = sql.indexOf(b, start + a.length);
  assert.ok(end > start, 'No se encontró el cierre: ' + b);
  return sql.slice(start, end);
};

const chapterRead = section('create or replace function private.chapter_readable(', 'create policy "chapters read"');
has(sql, 'drop policy if exists "chapters volume access"', 'Eliminar la política SELECT que omitía el permiso del volumen');
has(chapterRead, 'private.chapter_row_open(', 'El cuerpo del capítulo debe respetar las reglas heredadas');
has(chapterRead, 'ch.status::text = \'published\'', 'No exponer capítulos sin publicar');
has(chapterRead, 'ch.publish_at <= now()', 'No anticipar fechas de publicación');
has(chapterRead, "v.status = 'published'", 'No exponer capítulos de volumen sin publicar');
has(chapterRead, 'v.id, ch.access', 'Comprobar el volumen real antes del capítulo');
lacks(chapterRead, 'private.is_donor()', 'El Patreon general no debe intervenir');
const toc = section('create or replace function public.series_toc(', '-- Publicar un volumen');
has(toc, 'not private.chapter_row_open(', 'El índice debe mostrar el candado');
has(toc, "c.status::text = 'published'", 'El índice no debe adelantar capítulos individuales');
has(toc, "v.status = 'published'", 'El índice no debe adelantar capítulos de volumen');

const publishVolume = section('create or replace function public.publish_volume(', '-- Primero publicar volúmenes');
has(publishVolume, "status = 'draft'", 'Publicar solo borradores del volumen');
lacks(publishVolume, "status <> 'published'", 'No sobrescribir programaciones individuales');
lacks(publishVolume, "set status = 'scheduled', publish_at = p_at", 'No reprogramar capítulos al programar el volumen');
const scheduler = section('create or replace function private.run_publications()', '-- No dejar abrir una URL directa');
has(scheduler, "c.publish_at <= now()", 'Respetar las fechas futuras individuales');
has(scheduler, "where volume_id = v.id and status = 'draft'", 'Publicar borradores del volumen en su fecha');
has(scheduler, "v.status = 'published'", 'No publicar un capítulo antes que su volumen');
const downloads = section('create or replace function public.download_open(', 'revoke all on function public.download_open');
has(downloads, 'private.volume_open(v.id)', 'No permitir archivos completos de volumen bloqueado');
has(downloads, 'private.chapter_row_open(', 'No permitir archivos completos que eludan capítulos individuales');

has(studio, 'name="unlock_auto"', 'Ofrecer opción de desbloqueo en volúmenes');
has(studio, 'id="lk-auto"', 'Ofrecer opción de desbloqueo de obra');
has(studio, 'autoReleaseEnabled', 'Conservar opción de liberación en ediciones de capítulos');
has(studio, 'Sin programación: el volumen y TODOS sus capítulos seguirán restringidos', 'Explicar exclusivo indefinido');
has(studio, "access_until: au", 'Guardar fecha opcional o NULL en volumen');
has(studio, "access_until: dateOf(x.value)", 'Conservar fecha individual de liberación pública en capítulos');
has(studio, "['accesos', 'Acceso y Patreon']", 'Distinguir accesos de los datos editoriales');
has(studio, 'data-va=', 'Editar permisos de volumen en Acceso y Patreon');
has(studio, 'data-lc=', 'Mantener permisos individuales de capítulos');
has(studio, 'expandedGroups', 'No colapsar listas al cambiar un permiso');
has(studio, "status: 'draft', published_at: null", 'Cancelar programación del volumen sin alterar capítulos');
lacks(studio, "await sb.from('chapters').update({ status: 'draft' }).eq('volume_id', b.dataset.unsch)", 'Nunca cancelar calendarios individuales en bloque');
has(editor, 'Esta fecha programa solo la publicación de ESTE capítulo', 'Explicar publicación independiente en editor');

console.log('Accesos por obra/volumen/capítulo, liberación opcional y calendarios: verificaciones estáticas correctas');
