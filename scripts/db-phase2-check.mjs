// Contratos estáticos de la fase 2; Node nativo, sin nuevas dependencias.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = f => readFileSync(f,'utf8');
const sql = read('docs/SQL-FASE2-HOME-SNAPSHOT.sql');
const match = sql.match(/create or replace trigger series_home_stale\s+after insert or delete or update of\s+([\s\S]+?)\s+on public\.series\s+for each statement execute function private\.home_stale\(\);/i);
assert(match, 'Falta definición del trigger de invalidación selectiva');
const columns = match[1].split(',').map(x=>x.trim().toLowerCase());
assert(!columns.includes('views'), 'Contador views no debe invalidar home_snapshot');
const all = [
'id','team_id','slug','title','short','original','author','work_type',
'status','genres','synopsis','adult','warnings','theme','cover_path',
'official_url','official_verified','created_at','original_status',
'translation_status','sequel_status','final_volume','archived_at',
'demographic','published','legacy_id','tags','illustrator','publisher',
'title_romaji','cover_thumb_path','relations','media','access',
'access_min_price','access_until'
];
assert.equal(columns.length, all.length, 'No deben faltar columnas');
for (const col of all) assert(columns.includes(col), 'Falta invalidar por: '+col);
assert(!/create index|security definer|alter policy|disable row level security/i.test(sql),
  'Cambios de índices o permisos no justificados en fase 2');

const ui = read('src/ui.js');
assert(ui.includes('let recentCache = null'), 'Falta consulta reutilizable de catálogo');
assert(ui.includes('recentCache?.who === who'), 'Caché no separa sesiones');
assert(ui.includes('now - recentCache.at < 20000'), 'La caché debe expirar rápidamente');
assert(ui.includes('catalogRecent(),'), 'Catálogo no usa la consulta compartida');
assert(ui.includes("sb.from('series_last').select('series_id,num,publish_at')"), 'Debe conservar RLS de la vista');
assert(ui.includes("sb.from('chapters').select('num,publish_at,series_id')"), 'Debe conservar respaldo');
assert(read('.github/workflows/ci.yml').includes('npm run db-phase2-check'));
console.log('Fase 2: contratos SQL y caché RLS del catálogo OK');
