// Verificaciones estructurales sin conectar a Supabase ni alterar datos.
// Ejecutar: node scripts/admin-permissions-check.mjs
// NO reemplaza pruebas de RLS y RPC con usuarios reales en una BD de staging.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const sql = readFileSync('supabase/migrations/20261022145000_bibliotecario_supervision_no_editorial.sql', 'utf8');
const admin = readFileSync('src/admin.js', 'utf8');
const check = spawnSync(process.execPath, ['--check', 'src/admin.js'], { encoding: 'utf8' });
assert.equal(check.status, 0, check.stderr || 'El JS del Mostrador no compila');

const must = (text, regex, description) => assert.match(text, regex, description);

// El privilegio editorial debe venir del equipo, nunca del rol Bibliotecario.
must(sql, /create or replace function private\.team_can\(/i, 'Falta redefinir team_can');
must(sql, /select \(not private\.is_admin\(\)\) and exists/i, 'El Bibliotecario sigue heredando permisos editoriales');
for (const policy of ['series admin', 'teams admin', 'members admin']) {
  must(sql, new RegExp('drop policy if exists "' + policy + '"', 'i'), 'Falta retirar politica global: ' + policy);
}
for (const policy of ['media write', 'media update']) {
  must(sql, new RegExp('create policy "' + policy + '"[\\s\\S]*?not private\\.is_admin\\(\\)', 'i'), 'El Bibliotecario puede escribir recursos en Storage: ' + policy);
}
must(sql, /create trigger team_members_protect_owner[\s\S]*?execute function private\.protect_last_team_owner\(\)/i, 'Falta proteccion al ultimo propietario');
must(sql, /create function public\.admin_create_team\([\s\S]*?p_owner text/i, 'Falta propietario en el RPC de creacion');
must(sql, /create function public\.admin_add_publisher\([\s\S]*?p_reason text/i, 'Falta razon administrativa al agregar integrantes');
must(sql, /create function public\.admin_remove_member\([\s\S]*?p_reason text/i, 'Falta razon administrativa al retirar integrantes');
must(sql, /role_id = null, overrides = '\{\}'::jsonb/i, 'Reasignacion de roles no limpia permisos anteriores');
must(sql, /create or replace function public\.admin_verify_team\([\s\S]*?p_reason text/i, 'Falta verificacion administrativa con motivo');
must(sql, /'verificar_equipo' else 'retirar_verificacion_equipo'/i, 'Falta auditoria de la verificacion oficial');

must(admin, /Propietario inicial<input id="to"/, 'Falta solicitar propietario inicial');
must(admin, /p_owner:\s*\$\('#to'\)\.value\.trim\(\)/, 'El frontend no pasa propietario al RPC');
must(admin, /Object\.entries\(TROLE\)\.filter\(\(\[k\]\) => k !== 'owner'\)/, 'El selector permite asignar propietario sin transferencia');
must(admin, /p_reason: reason/g, 'El frontend no incluye motivos administrativos');
must(admin, /rpc\('admin_verify_team', \{ p_team: id, p_verified: verified, p_reason: reason\.trim\(\) \}\)/, 'Mostrador sin RPC de verificacion');
assert.equal((admin.match(/p_reason: reason/g) || []).length, 2, 'Ambas operaciones de miembros deben incluir motivo');

console.log('OK: sintaxis del Mostrador y contratos estructurales de la migracion.');
console.log('PENDIENTE: aplicar y ensayar en Supabase aislado; sin pruebas RLS reales NO desplegar.');
