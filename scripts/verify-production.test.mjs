import test from 'node:test';
import assert from 'node:assert/strict';
import { productionStatus, verifyProduction } from './verify-production.mjs';
const deployment = { id: 1, sha: 'abc', environment: 'production' };
const status = { creator: { login: 'vercel[bot]' }, state: 'success', environment: 'production' };
test('only Vercel success for the exact production commit passes', () => {
  assert.equal(productionStatus(deployment, [status], 'abc'), status);
  assert.equal(productionStatus({ ...deployment, environment: 'Preview' }, [status], 'abc'), null);
  assert.equal(productionStatus(deployment, [status], 'old'), null);
  assert.equal(productionStatus(deployment, [{ ...status, creator: { login: 'other' } }], 'abc'), null);
  assert.equal(productionStatus(deployment, [{ ...status, state: 'failure' }, status], 'abc'), null);
});
test('also verifies the live domain commit without disclosing GitHub credentials', async () => {
  const env = { GH_TOKEN: 'test', GITHUB_REPOSITORY: 'owner/repo', GITHUB_SHA: 'abc', EXPECTED_DOMAIN: 'example.com' };
  let siteCalls = 0;
  const request = async (input, options) => {
    const url = new URL(input);
    if (url.hostname === 'api.github.com') {
      assert.equal(options.headers.Authorization, 'Bearer test');
      return { ok: true, json: async () => url.pathname.endsWith('/statuses') ? [status] : [deployment] };
    }
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(url.hostname, 'example.com');
    return { ok: true, json: async () => ({ commit: ++siteCalls === 1 ? 'old' : 'abc', environment: 'production' }) };
  };
  const result = await verifyProduction(env, request, async () => {});
  assert.equal(result.commit, 'abc');
  assert.equal(siteCalls, 2);
});
test('a successful preview can never satisfy production verification', async () => {
  const env = { GH_TOKEN: 'test', GITHUB_REPOSITORY: 'owner/repo', GITHUB_SHA: 'abc', EXPECTED_DOMAIN: 'example.com' };
  await assert.rejects(verifyProduction(env, async () => ({ ok: true, json: async () => [{ ...deployment, environment: 'Preview' }] }), async () => {}), /Timed out/);
});
