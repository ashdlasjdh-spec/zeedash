import assert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function productionStatus(deployment, statuses, commit) {
  if (deployment.sha !== commit || deployment.environment?.toLowerCase() !== 'production') return null;
  const latest = statuses.find(row => row.creator?.login === 'vercel[bot]');
  if (latest?.state !== 'success' || latest.environment?.toLowerCase() !== 'production') return null;
  return latest;
}
export async function verifyProduction(env = process.env, request = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  for (const key of ['GH_TOKEN', 'GITHUB_REPOSITORY', 'GITHUB_SHA', 'EXPECTED_DOMAIN']) assert.ok(env[key]?.trim(), 'Missing release setting: ' + key);
  assert.match(env.GITHUB_REPOSITORY, /^[\w.-]+\/[\w.-]+$/);
  assert.match(env.EXPECTED_DOMAIN, /^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/);
  async function github(path) {
    const response = await request('https://api.github.com/repos/' + env.GITHUB_REPOSITORY + path, {
      headers: { Authorization: 'Bearer ' + env.GH_TOKEN, Accept: 'application/vnd.github+json' },
      redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    assert.ok(response.ok, 'GitHub verification failed (HTTP ' + response.status + ')');
    return response.json();
  }
  for (let attempt = 0; attempt < 60; attempt++) {
    const deployments = await github('/deployments?sha=' + encodeURIComponent(env.GITHUB_SHA) + '&per_page=100');
    for (const deployment of deployments) {
      if (deployment.sha !== env.GITHUB_SHA || deployment.environment?.toLowerCase() !== 'production') continue;
      const statuses = await github('/deployments/' + deployment.id + '/statuses');
      if (!productionStatus(deployment, statuses, env.GITHUB_SHA)) continue;
      // Probe the actual domain, not a preview URL. No credentials are sent to the site.
      let url = new URL('https://' + env.EXPECTED_DOMAIN + '/api/release?check=' + Date.now());
      try {
        for (let hop = 0; hop < 3; hop++) {
          const response = await request(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' } });
          if ([301, 302, 307, 308].includes(response.status)) {
            url = new URL(response.headers.get('location'), url);
            assert.ok(url.protocol === 'https:' && [env.EXPECTED_DOMAIN, 'www.' + env.EXPECTED_DOMAIN].includes(url.hostname) && !url.username && !url.password && !url.port, 'Unexpected production redirect');
            continue;
          }
          if (response.ok) {
            const release = await response.json();
            if (release.commit === env.GITHUB_SHA && release.environment === 'production') return { domain: env.EXPECTED_DOMAIN, commit: env.GITHUB_SHA };
          }
          break;
        }
      } catch { /* Allow the new production alias to settle; timeout still fails closed. */ }
    }
    if (attempt < 59) await pause(10000);
  }
  throw new Error('Timed out waiting for this exact commit on the production domain');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await verifyProduction();
    console.log('Verified production: https://' + result.domain + ' at ' + result.commit);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      'Production verified: https://' + result.domain + '\n\nCommit: ' + result.commit + '\n');
  } catch (error) { console.error('Production verification failed: ' + error.message.split('\n')[0]); process.exitCode = 1; }
}
