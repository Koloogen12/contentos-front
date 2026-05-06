"use client";

import * as React from "react";

/**
 * Tiny localStorage-backed map of `nodeId -> scheduled_date` (YYYY-MM-DD).
 *
 * Why localStorage: the backend doesn't currently expose a way to look up
 * planned posts by node_id, so we keep the "В плане · 12 мая" badge state
 * client-side. Persistence is per-browser; if the user clears storage we
 * just lose the badge until they re-schedule. The actual planned post lives
 * in the backend either way.
 *
 * Format: a single JSON blob under `contentos.scheduled-badges` —
 * `{ [nodeId]: "YYYY-MM-DD" }`.
 */

const KEY = "contentos.scheduled-badges";

type Snapshot = Record<string, string>;

function read(): Snapshot {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Snapshot;
    }
    return {};
  } catch {
    return {};
  }
}

function write(snap: Snapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snap));
    // Notify same-tab listeners; storage events only fire across tabs.
    window.dispatchEvent(new Event("contentos.scheduled-badges:changed"));
  } catch {
    /* ignore quota errors */
  }
}

export function getScheduledBadge(nodeId: string): string | null {
  return read()[nodeId] ?? null;
}

export function setScheduledBadge(nodeId: string, date: string): void {
  const snap = read();
  snap[nodeId] = date;
  write(snap);
}

export function clearScheduledBadge(nodeId: string): void {
  const snap = read();
  if (!(nodeId in snap)) return;
  delete snap[nodeId];
  write(snap);
}

/** React hook returning the current badge value for a node id, reactively. */
export function useScheduledBadge(nodeId: string): string | null {
  const subscribe = React.useCallback((onChange: () => void) => {
    if (typeof window === "undefined") return () => {};
    const handler = () => onChange();
    window.addEventListener("storage", handler);
    window.addEventListener("contentos.scheduled-badges:changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(
        "contentos.scheduled-badges:changed",
        handler,
      );
    };
  }, []);
  const getSnapshot = React.useCallback(
    () => getScheduledBadge(nodeId),
    [nodeId],
  );
  return React.useSyncExternalStore(subscribe, getSnapshot, () => null);
}
