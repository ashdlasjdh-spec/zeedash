import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { getConfig } from "@/lib/config";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Uploads a PNG to the account tied to the Open Cloud key (ROBLOX_CREATOR_ID),
// polls Roblox moderation, and returns the finished decal asset id — so staff can
// attach a crew-tag icon without leaving the dashboard. Gated by the tag permission
// (Discord login already required to reach here).
export async function POST(req) {
  const s = await getSession();
  if (!s || !can(s.role, "tag")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { apiKey } = await getConfig();
  const creatorId = process.env.ROBLOX_CREATOR_ID;
  if (!apiKey) return NextResponse.json({ error: "Open Cloud not configured (set API key in Settings)." }, { status: 500 });
  if (!creatorId) return NextResponse.json({ error: "Server not configured (ROBLOX_CREATOR_ID — the Roblox user id that owns the API key)." }, { status: 500 });

  let form;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Expected multipart form." }, { status: 400 }); }
  const file = form.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image too large (5MB max)." }, { status: 400 });

  const request = {
    assetType: "Decal",
    displayName: String(form.get("name") || "CrewTagIcon").slice(0, 50),
    description: "Crew tag icon",
    creationContext: { creator: { userId: Number(creatorId) } },
  };

  const rbxForm = new FormData();
  rbxForm.append("request", JSON.stringify(request));
  rbxForm.append("fileContent", file, file.name || "icon.png");

  const up = await fetch("https://apis.roblox.com/assets/v1/assets", {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: rbxForm,
  });
  if (!up.ok) return NextResponse.json({ error: `Upload ${up.status}: ${(await up.text()).slice(0, 200)}` }, { status: 500 });

  const op = await up.json();
  const opPath = op.path || (op.operationId ? `operations/${op.operationId}` : null);
  if (!opPath) return NextResponse.json({ error: "No operation returned by Roblox." }, { status: 500 });

  let assetId = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const pr = await fetch(`https://apis.roblox.com/assets/v1/${opPath}`, { headers: { "x-api-key": apiKey } });
    if (!pr.ok) continue;
    const pd = await pr.json();
    if (pd.done) {
      if (pd.error) return NextResponse.json({ error: `Upload rejected: ${pd.error.message || JSON.stringify(pd.error)}` }, { status: 400 });
      assetId = pd.response && (pd.response.assetId || pd.response.id);
      break;
    }
  }
  if (!assetId) return NextResponse.json({ error: "Timed out waiting for Roblox moderation — try again shortly." }, { status: 504 });
  return NextResponse.json({ ok: true, assetId: String(assetId) });
}
