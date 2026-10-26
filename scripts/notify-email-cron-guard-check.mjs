// Comprueba el control de acceso SIN invocar Supabase, Resend ni APIs externas.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const code = readFileSync(new URL('../supabase/functions/notify-email/index.ts', import.meta.url), 'utf8');
const server = code.indexOf('Deno.serve(');
const guard = code.match(/if\s*\(\s*!SECRET\s*\|\|\s*req\.headers\.get\(\s*['"]x-cron-secret['"]\s*\)\s*!==\s*SECRET\s*\)\s*return\s+new\s+Response\(/);
const batch = code.indexOf("sb.rpc('email_batch'");
const provider = code.indexOf("fetch('https://api.resend.com/emails'");
assert.ok(server >= 0, 'El endpoint no está disponible en el archivo esperado');
assert.match(code, /Deno\.env\.get\(\s*['"]CRON_SECRET['"]\s*\)/, 'Debe usar CRON_SECRET');
assert.ok(guard?.index !== undefined, 'CRON_SECRET debe comprobarse también cuando está ausente (fail closed)');
assert.ok(server < guard.index, 'La validación debe estar en el handler');
assert.ok(batch > guard.index, 'Bloquear antes de consultar email_batch');
assert.ok(provider > guard.index, 'Bloquear antes de invocar Resend');
assert.doesNotMatch(code, /if\s*\(\s*SECRET\s*&&\s*req\.headers\.get\(/, 'La validación opcional es insegura si falta el secreto');
console.log('OK: notify-email exige CRON_SECRET antes de consumir recursos o enviar correo.');
