// Guardrail de SQL para evitar un carrusel estancado tras importaciones grandes.
// Se ejecuta offline, sin permisos ni costes de Vercel/Supabase.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql = readFileSync('supabase/migrations/20261031225243_home_carousel_feed_diversity_20261031.sql', 'utf8');
assert.match(sql,/CREATE OR REPLACE FUNCTION private\.build_home\(\)/i);
assert.match(sql,/partition by c\.series_id order by c\.publish_at desc/i,
  'Las novedades deben calcular un último capítulo independiente por obra');
assert.match(sql,/case when ranked\.series_rank = 1 then 0 else 1 end/i,
  'Las últimas novedades de todas las obras deben reservar una plaza primero');
assert.match(sql,/jsonb_agg\(to_jsonb\(c\) order by c\.publish_at desc nulls last/i,
  'El lector debe recibir capítulos ordenados por fecha, no por prioridad de cuota');
assert.match(sql,/limit 80\s*\) c\), '\[\]'::jsonb\)/i,
  'El feed debe conservar el límite de 80 para evitar elevar carga');
assert.match(sql,/'rkW'|\b'rkH'/i,'No se deben eliminar los rankings del feed');
assert.match(sql,/'nextRel'/i,'El calendario de próximos lanzamientos debe permanecer');
assert.doesNotMatch(sql,/\b(?:delete|truncate)\s+(?:from\s+)?(?:public\.)?(?:chapters|volumes|reading_progress)\b/i);
console.log('OK: feed de novedades con diversidad por obra, límite 80 y salida compatible');
