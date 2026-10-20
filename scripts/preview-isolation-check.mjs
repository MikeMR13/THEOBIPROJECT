// Comprobar el build Preview separado de Supabase real; sin llamadas externas.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const config = readFileSync('dist/config.js', 'utf8');
const html = readFileSync('dist/index.html', 'utf8');
assert(config.includes('obi-qa-backend.invalid'), 'Preview no usa el endpoint de ensayo');
assert(!config.includes('qfllthjpjuaztppvpsrk.supabase.co'), 'Preview expone la URL productiva');
assert(!html.includes('qfllthjpjuaztppvpsrk.supabase.co'), 'El HTML Preview mantiene preconexión productiva');
assert(!config.includes('service_role') && !config.includes('sb_secret_'), 'La clave privada llegó al navegador');
console.log('Preview aislado: sin dominio Supabase productivo en config.js o HTML: OK');
