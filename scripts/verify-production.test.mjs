import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyDeployment, verifyProduction } from './verify-production.mjs';

const expected = { projectId: 'prj_test', commit: 'abc123', domain: 'example.com' };
const ready = { id: 'dpl_test', target: 'production', readyState: 'READY', projectId: 'prj_test',
  meta: { releaseCommit: 'abc123' }, aliasAssigned: true, alias: ['example.com'], aliasError: null };
test('only ready production releases for the exact project, commit, and domain pass', () => {
  assert.equal(verifyDeployment(ready, expected), 'dpl_test');
  for (const patch of [
    { target: null }, { readyState: 'ERROR' }, { projectId: 'prj_other' },
    { meta: { releaseCommit: 'wrong' } }, { aliasAssigned: false }, { aliasAssigned: 'false' },
    { aliasError: { code: 'FAIL' } }, { alias: ['preview.example.com'] },
  ]) assert.throws(() => verifyDeployment({ ...ready, ...patch }, expected));
});
const env = { VERCEL_TOKEN: 'fixture-only', VERCEL_ORG_ID: 'team_test',
  VERCEL_PROJECT_ID: 'prj_test', GITHUB_SHA: 'abc123', EXPECTED_DOMAIN: 'example.com',
  DEPLOYMENT_URL: 'https://fixture.vercel.app' };
test('verifies both deployment and live domain, without sending token to either site', async () => {
  const urls = [];
  const result = await verifyProduction(env, async (url, options) => {
    urls.push(url);
    assert.equal(url.origin, 'https://api.vercel.com');
    assert.equal(url.searchParams.get('teamId'), 'team_test');
    assert.equal(options.redirect, 'error');
    return { ok: true, json: async () => ready };
  });
  assert.equal(result.id, 'dpl_test');
  assert.deepEqual(urls.map(url => url.pathname), ['/v13/deployments/fixture.vercel.app', '/v13/deployments/example.com']);
});
test('rejects a domain still pointing at another deployment', async () => {
  let count = 0;
  await assert.rejects(verifyProduction(env, async () => ({
    ok: true, json: async () => ({ ...ready, id: ++count === 1 ? 'dpl_test' : 'dpl_other' }),
  })), /different deployment/);
});
test('fails closed on missing credentials, hostile URLs, and denied API access', async () => {
  for (const patch of [{ VERCEL_TOKEN: '' }, { DEPLOYMENT_URL: 'https://evil.test' },
    { DEPLOYMENT_URL: 'https://user:password@fixture.vercel.app' }]) {
    await assert.rejects(verifyProduction({ ...env, ...patch }, () => { throw new Error('Must not request'); }));
  }
  await assert.rejects(verifyProduction(env, async () => ({ ok: false, status: 403 })), /HTTP 403/);
});
