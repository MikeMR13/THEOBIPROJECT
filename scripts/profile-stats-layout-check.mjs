// Contratos de estadísticas del carnet: nombres veraces y barras autocontenidas.
// Sin datos reales de usuarios, credenciales ni dependencia de servicios externos.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const profile = readFileSync(new URL('../src/profile.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/migrations/20261025_lectores_avisos_estadisticas.sql', import.meta.url), 'utf8');
const statsStart = app.indexOf('const statsHTML = st =>');
const statsEnd = app.indexOf('async function lector(name)', statsStart);
assert(statsStart > 0 && statsEnd > statsStart, 'Existe el renderizador de estadísticas');
const stats = app.slice(statsStart, statsEnd);

assert(profile.includes("const css = () =>") && profile.includes("css();"), 'Los estilos del carnet se inyectan al abrir el perfil');
for (const selector of [
  '.lc-public .lc-stats .st-gen{',
  '.lc-public .lc-stats .st-gen-row{',
  '.lc-public .lc-stats .st-gen-track{',
  '.lc-public .lc-stats .st-gen-track i{',
  '.lc-public .lc-stats .st-gen-count{'
]) assert(profile.includes(selector), 'Las barras de géneros deben tener estilos propios: ' + selector);
assert(profile.includes('.lc-public .lc-badges-grid{') &&
  profile.includes('400px));gap:12px;justify-content:start'), 'Una sola insignia no debe ocupar toda la pantalla');
assert(stats.includes('Géneros más leídos'), 'Separar estadísticas de géneros favoritos declarados');
assert(stats.includes('Capítulos leídos por género.'), 'Explicar los recuentos por género');
assert(stats.includes('st-gen-row') && stats.includes('st-gen-track') && stats.includes('st-gen-count'), 'El renderizado utiliza las barras del carnet');
assert(stats.includes('Math.round(g.count / max * 100)'), 'Barras proporcionales sobre un máximo seguro');
assert(stats.includes('Math.max(1, ...genres.map(g => g.count))'), 'Evitar barras con porcentaje inválido o infinito');
assert(stats.includes("a.name.localeCompare(b.name, 'es')"), 'Orden estable por importancia y nombre');
assert(stats.includes('obras con capítulos leídos'), 'El número de obras refleja exactamente el RPC');
assert(stats.includes('obras completas leídas'), 'El título de finalizadas respeta el RPC');
assert(profile.includes('selectedGenres(r.sections?.favorite_genres)'), 'Los gustos elegidos por el lector siguen siendo independientes');
assert(profile.includes('SOLO TÚ VES ESTO') && profile.includes('HACERLAS PÚBLICAS'), 'Conservar controles y advertencia de privacidad');
assert(sql.includes("if not coalesce(ok, false) then return null; end if;"), 'El acceso a estadísticas no debe perder el control de privacidad');
console.log('Perfil: barras, género estadístico vs elegido, sellos compactos y privacidad OK');
