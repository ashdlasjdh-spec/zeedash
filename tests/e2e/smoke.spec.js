const { test, expect } = require("@playwright/test");

// Smoke E2E for the public, no-auth surface — the pages every visitor hits. Guards against a broken
// build, a crashing server component, or a bad import reaching production. Auth-gated flows aren't
// covered here (they need a signed-in session); this is the always-runnable safety net.

test("landing page renders with the brand + login", async ({ page }) => {
  const res = await page.goto("/");
  expect(res.ok()).toBeTruthy();
  await expect(page.locator("h1").first()).toBeVisible();
  // The staff login / dashboard entry point is always present on the landing.
  await expect(page.getByText(/login|dashboard/i).first()).toBeVisible();
});

test("login page renders", async ({ page }) => {
  const res = await page.goto("/login");
  expect(res.ok()).toBeTruthy();
  await expect(page.getByText(/discord/i).first()).toBeVisible();
});

test("status page renders the health rows", async ({ page }) => {
  const res = await page.goto("/status");
  expect(res.ok()).toBeTruthy();
  await expect(page.getByText(/operational|down|…/i).first()).toBeVisible();
});

test("docs render", async ({ page }) => {
  const res = await page.goto("/docs");
  expect(res.ok()).toBeTruthy();
  await expect(page.locator("h1, h2").first()).toBeVisible();
});

test("no server 500 on the public API", async ({ request }) => {
  const r = await request.get("/api/public-status");
  // 200 normally; 429 is an acceptable rate-limit response. Never a 5xx.
  expect(r.status()).toBeLessThan(500);
});
