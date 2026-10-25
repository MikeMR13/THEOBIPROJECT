// Contratos del conector sin red externa y sin credenciales reales.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDiscordWebhook as valid } from '../supabase/functions/diffusion-discord/validate.mjs';
const good='https://discord.com/api/webhooks/123456789012345678/'+'A'.repeat(64);
for(const url of [good,good.replace('A','_'),good.replace('A','-')]) assert(valid(url),url.slice(0,35));
for(const url of [
 good+'?wait=true',good+'#a',
 good.replace('https://','http://'),
 good.replace('discord.com','discord.com.evil.test'),
 good.replace('discord.com','api.discord.com'),
 good.replace('discord.com','127.0.0.1'),
 good.replace('/api/webhooks/','/other/webhooks/'),
 good.replace('/api/webhooks/','@localhost/api/webhooks/'),
 good.replace('123456789012345678','1'),
 'https://discord.com/api/webhooks/12345/short','',
 null, {url:good}, 'https://discord.com:443/api/webhooks/123456789012345678/'+'A'.repeat(64)
]) assert(!valid(url),'Invalid Discord URL accepted');
const edge=readFileSync('supabase/functions/diffusion-discord/index.ts','utf8');
const sql=readFileSync('supabase/migrations/20261025232432_diffusion_discord_manual_controlled_20261025.sql','utf8');
assert.match(edge,/auth\.getUser\(jwt\)/);
assert.match(edge,/diffusion_discord_test_claim/);
assert.match(edge,/diffusion_discord_secret_resolve/);
assert.match(edge,/allowed_mentions:\{\s*parse:\[\]\s*\}/);
assert.match(sql,/vault\.create_secret/);
assert.match(sql,/vault\.decrypted_secrets/);
assert.match(sql,/grant execute on function public\.diffusion_discord_secret_resolve\(uuid\),[\s\S]*?to service_role;/);
assert.match(sql,/last_test_at<now\(\)-interval '60 seconds'/);
assert.doesNotMatch(sql,/cron\.schedule\(/);
console.log('Difusión Discord: validación URL estricta, autorizaciones y envío manual OK');
