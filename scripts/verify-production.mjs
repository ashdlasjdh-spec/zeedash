import assert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function verifyDeployment(data, { projectId, commit, domain }) {
  assert.equal(data.target, 'production', 'Deployment must target production');
  assert.equal(data.readyState, 'READY', 'Deployment must be ready');
  assert.equal(data.projectId, projectId, 'Deployment belongs to a different project');
  assert.equal(data.meta?.releaseCommit, commit, 'Deployment commit does not match this release');
  assert.equal(data.aliasAssigned, true, 'Production aliases have not been assigned');
  assert.ok(!data.aliasError, 'Production alias assignment failed');
  assert.ok(Array.isArray(data.alias) && data.alias.includes(domain), 'Production domain is missing from deployment aliases');
  assert.ok(typeof data.id === 'string' && data.id.startsWith('dpl_'), 'Invalid deployment identifier');
  return data.id;
}

export async function verifyProduction(env = process.env, request = fetch) {
  for (const key of ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID', 'GITHUB_SHA', 'EXPECTED_DOMAIN', 'DEPLOYMENT_URL']) {
    assert.ok(env[key]?.trim(), 'Missing required release setting: ' + key);
  }
  const deployment = new URL(env.DEPLOYMENT_URL.trim());
  assert.ok(deployment.protocol === 'https:' && deployment.hostname.endsWith('.vercel.app') &&
    !deployment.username && !deployment.password && !deployment.port &&
    deployment.pathname === '/' && !deployment.search && !deployment.hash, 'Invalid deployment URL');
  assert.match(env.EXPECTED_DOMAIN, /^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/);
  const expected = { projectId: env.VERCEL_PROJECT_ID, commit: env.GITHUB_SHA, domain: env.EXPECTED_DOMAIN };
  async function readDeployment(host) {
    const endpoint = new URL('https://api.vercel.com/v13/deployments/' + encodeURIComponent(host));
    endpoint.searchParams.set('teamId', env.VERCEL_ORG_ID);
    const response = await request(endpoint, {
      headers: { Authorization: 'Bearer ' + env.VERCEL_TOKEN },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    assert.ok(response.ok, 'Vercel deployment verification failed (HTTP ' + response.status + ')');
    // Never log this response: owner-visible deployment metadata may contain secrets.
    return response.json();
  }
  const releasedId = verifyDeployment(await readDeployment(deployment.hostname), expected);
  const domainId = verifyDeployment(await readDeployment(env.EXPECTED_DOMAIN), expected);
  assert.equal(domainId, releasedId, 'Production domain points at a different deployment');
  return { id: releasedId, domain: env.EXPECTED_DOMAIN, commit: env.GITHUB_SHA };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await verifyProduction();
    console.log('Verified production domain: https://' + result.domain);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      'Production verified: https://' + result.domain + '\n\nCommit: ' + result.commit + '\n');
  } catch (error) {
    // Do not dump API responses, URLs with credentials, or request objects.
    console.error('Production verification failed: ' + (error instanceof assert.AssertionError ? error.message.split('\n')[0] : 'Unable to verify deployment'));
    process.exitCode = 1;
  }
}
