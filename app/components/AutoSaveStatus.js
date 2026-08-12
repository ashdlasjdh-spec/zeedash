"use client";

// Small inline indicator for auto-saving forms. status: idle | saving | saved | error.
export default function AutoSaveStatus({ status, error }) {
  if (status === "saving") return <span className="autosave">Saving…</span>;
  if (status === "saved") return <span className="autosave ok">✓ Saved</span>;
  if (status === "error") return <span className="autosave bad">⚠ {error || "Save failed"}</span>;
  return <span className="autosave dim">Changes auto-save</span>;
}
