"use client";

// Shared profile links — click any user id/name to open where it originates.
const linkStyle = { color: "inherit", textDecoration: "none", borderBottom: "1px dotted var(--faint)" };

// A Discord user id → their Discord profile.
export function DiscordLink({ id, children, style }) {
  if (!id) return <>{children ?? "—"}</>;
  return (
    <a href={`https://discord.com/users/${id}`} target="_blank" rel="noopener noreferrer" title="Open Discord profile"
      style={{ ...linkStyle, ...style }}>{children ?? id}</a>
  );
}

// A Roblox user id → their Roblox profile.
export function RobloxLink({ id, children, style }) {
  if (!id) return <>{children ?? "—"}</>;
  return (
    <a href={`https://www.roblox.com/users/${id}/profile`} target="_blank" rel="noopener noreferrer" title="Open Roblox profile"
      style={{ ...linkStyle, ...style }}>{children ?? id}</a>
  );
}

// Pull a Roblox user id out of a "username (12345)" style string. Returns null if none.
export function robloxIdFrom(s) {
  const m = String(s || "").match(/\((\d+)\)/);
  return m ? m[1] : null;
}
