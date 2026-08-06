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
// Resolve a Decal wrapper asset id to the underlying image/texture id the game renders.
// Uploaded decals wrap an Image; the game needs that inner id. We use the authenticated
// Open Cloud key (owned asset, so this succeeds where anonymous calls 403). If resolution
// fails we return the decal id unchanged — the game's ResolveIcon unwraps it as a fallback.
async function resolveDecalTexture(decalId, apiKey) {
  const id = String(decalId || "").replace(/\D/g, "");
  if (!id) return id;
  // assetdelivery v2 with the api key returns the asset's content location; the decal XML
  // references the underlying image as rbxassetid://<textureId>.
  try {
    const r = await fetch(`https://assetdelivery.roblox.com/v2/assetId/${id}`, {
      headers: { "x-api-key": apiKey, Accept: "application/json" },
    });
    if (r.ok) {
      const d = await r.json();
      const loc = d?.locations?.[0]?.location;
      if (loc) {
        const body = await fetch(loc).then((x) => (x.ok ? x.text() : "")).catch(() => "");
        const m = body.match(/rbxassetid:\/\/(\d+)/) || body.match(/asset\/?\?id=(\d+)/i);
        if (m && m[1]) return m[1];
      }
    }
  } catch { /* fall through */ }
  return id; // fallback: game-side ResolveIcon will unwrap it
}

export async function POST(req) {
  const s = await getSession();
  if (!s || !can(s.level, "tag")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  // Resolve the Decal wrapper to its inner texture id so the datastore stores a ready-to-render
  // id (no game-side unwrapping / first-load cost). Falls back to the decal id if resolution fails.
  const textureId = await resolveDecalTexture(assetId, apiKey);
  return NextResponse.json({ ok: true, assetId: String(textureId), decalId: String(assetId) });
}
