// Public deployment identity only. Never expose application configuration or secrets.
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "local",
    environment: process.env.VERCEL_ENV || "development",
  }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
