// Encontrar exclusivamente un deployment Preview READY para el SHA exacto del PR.
// Usar credenciales de Vercel solo en CI con entorno seo-qa protegido.
import { appendFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const token = process.env.VERCEL_TOKEN || '';
const sha = process.env.SEO_EXPECT_SHA || '';
const project = process.env.VERCEL_PROJECT_ID || '';
const team = process.env.VERCEL_ORG_ID || '';
assert.ok(token, 'Falta el secreto VERCEL_TOKEN en el entorno GitHub seo-qa');
assert.match(sha, /^[a-f0-9]{40}$/i, 'Se necesita el SHA exacto de la rama de PR');
assert.match(project, /^prj_[\w]+$/, 'VERCEL_PROJECT_ID inválido');
assert.match(team, /^team_[\w]+$/, 'VERCEL_ORG_ID inválido');

const endpoint = new URL('https://api.vercel.com/v6/deployments');
endpoint.searchParams.set('projectId', project);
endpoint.searchParams.set('teamId', team);
endpoint.searchParams.set('sha', sha);
endpoint.searchParams.set('limit', '20');
const started = Date.now();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let ready = null;
for (let n = 0; n < 32; n++) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  let deployments;
  try {
    const result = await fetch(endpoint, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      signal: ctrl.signal,
      redirect: 'error',
    });
    if (!result.ok) throw new Error('Vercel API: HTTP ' + result.status);
    const payload = await result.json();
    deployments = Array.isArray(payload.deployments) ? payload.deployments : [];
  } finally { clearTimeout(timer); }
  const matching = deployments
    .filter(d => d.meta?.githubCommitSha === sha || d.gitSource?.sha === sha)
    .filter(d => d.projectId === project || !d.projectId)
    .sort((a,b) => (b.created || 0) - (a.created || 0));
  const deploy = matching[0];
  if (deploy) {
    if (deploy.target === 'production') throw new Error('No se permiten despliegues de producción');
    if (!deploy.url) throw new Error('Deployment Vercel sin URL');
    if (deploy.state === 'ERROR' || deploy.state === 'CANCELED' || deploy.state === 'BLOCKED') {
      throw new Error('El despliegue Preview terminó en estado ' + deploy.state);
    }
    if (deploy.state === 'READY') {
      const origin = new URL('https://' + deploy.url);
      assert.ok(origin.hostname.endsWith('.vercel.app') && origin.pathname === '/' &&
        !origin.username && !origin.password, 'Dominio Preview inválido');
      ready = origin.origin;
      break;
    }
  }
  if (n % 6 === 0) console.log('Preview Vercel del commit validado: pendiente (' + n + '/32)');
  if (n < 31) await pause(15000);
}
if (!ready) throw new Error('No apareció una Preview READY del SHA exacto dentro del período de comprobación');
if (!process.env.GITHUB_OUTPUT) throw new Error('Falta archivo de salida de GitHub Actions');
appendFileSync(process.env.GITHUB_OUTPUT, 'preview_url=' + ready + '\n', { encoding: 'utf8' });
console.log('Preview READY verificada para commit ' + sha.slice(0,8) + ' (' +
  Math.round((Date.now() - started) / 1000) + 's).');
