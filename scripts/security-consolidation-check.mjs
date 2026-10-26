import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const sources = [
  { pr: 123, install: 'sql/home-snapshot-row-level-invalidation.sql', rollback: 'sql/home-snapshot-row-level-rollback.sql', workflow: '.github/workflows/home-snapshot-postgres-qa.yml' },
  { pr: 126, install: 'sql/cron-administrative-execute-20261025.sql', rollback: 'sql/cron-administrative-execute-rollback.sql', workflow: '.github/workflows/cron-function-permissions-qa.yml' },
  { pr: 127, install: 'sql/public-rpc-auth-grants-20261026.sql', rollback: 'sql/public-rpc-auth-grants-rollback.sql', workflow: '.github/workflows/public-rpc-grants-qa.yml' },
  { pr: 128, install: 'sql/home-feed-anonymous-reviews-20261026.sql', rollback: 'sql/home-feed-anonymous-reviews-rollback.sql', workflow: '.github/workflows/home-anon-reviews-qa.yml' },
  { pr: 129, install: 'sql/team-public-members-visibility-20261026.sql', rollback: 'sql/team-public-members-visibility-rollback.sql', workflow: '.github/workflows/team-public-members-visibility-qa.yml' },
  { pr: 130, install: 'sql/series-downloads-publication-visibility-20261026.sql', rollback: 'sql/series-downloads-publication-visibility-rollback.sql', workflow: '.github/workflows/series-downloads-visibility-qa.yml' }
];
const sql = {};
for (const { pr, install, rollback, workflow } of sources) {
  sql[pr] = read(install);
  assert.match(sql[pr], /begin\s*;/i, '#'+pr+': no BEGIN');
  assert.match(sql[pr], /commit\s*;/i, '#'+pr+': no COMMIT');
  assert.match(read(rollback), /begin\s*;/i, '#'+pr+': rollback missing BEGIN');
  assert.match(read(rollback), /commit\s*;/i, '#'+pr+': rollback missing COMMIT');
  assert.match(read(workflow), /postgres:16-alpine/, '#'+pr+': missing isolated PostgreSQL QA');
}
assert.match(sql[123], /for each row/i, 'Cache triggers still invalidate zero-row UPDATE');
assert.match(sql[128], /case when r\.anonymous then null else p\.username end username/i,
  'Homepage cache must remove names from anonymous reviews');
assert.match(sql[126], /private\.run_publications\(\)/i);
assert.match(sql[127], /public\.report_review\(uuid,text,text,text\)/i);
assert.match(sql[129], /p\.profile_visibility = 'auth'/i);
assert.match(sql[130], /v\.status = 'published'/i);
for(const name of ['home-snapshot-invalidation-check','notify-email-cron-guard-check','security-consolidation-check']){
  assert.ok(packageJson.scripts[name], 'Missing npm script ' + name);
  const count=packageJson.scripts.verify.split(' && ').filter(command=>command==='npm run '+name).length;
  assert.equal(count, 1, name+' must appear exactly once in npm verify');
}
assert.match(read('scripts/notify-email-cron-guard-check.mjs'), /CRON_SECRET/,
  'Missing mail cron fail-closed regression');
assert.match(read('supabase/functions/notify-email/index.ts'),
  /if\s*\(\s*!SECRET\s*\|\|\s*req\.headers\.get\(['"]x-cron-secret['"]\)\s*!==\s*SECRET/,
  'Versioned mail function no longer fail-closes');
console.log('OK: 7 PRs consolidados, 6 candidatos SQL + reversión + QA aislada, 3 verificaciones npm únicas. Sin migraciones ni despliegue.');
