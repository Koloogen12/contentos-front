"use client";

/**
 * Shared trial-mode page guard.
 *
 * Drop `<TrialRedirect />` at the top of any page that shouldn't be
 * visitable by anonymous trial users (settings / voice / plan /
 * performance — anywhere with pre-filled brand data or features
 * gated to regular orgs). Renders nothing on success; pushes to
 * /dashboard when the auth-store reports `org.kind === "trial"`.
 *
 * Why a component and not a `useEffect`+`if` per page: keeps the
 * guard 1-liner discoverable AND centralised. Future tweaks
 * (rate-limited friendly screens, "upgrade to Pro" CTAs) plug into
 * one place.
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/stores/auth";


export function TrialRedirect() {
  const router = useRouter();
  // Only redirect PREVIEW (anonymous) users. Trial-registered users
  // have full access to all pages. The component name stays for
  // historical reasons / backward import compatibility.
  const isPreview = useAuthStore((s) => s.organization?.kind === "preview");
  React.useEffect(() => {
    if (isPreview) router.replace("/dashboard");
  }, [isPreview, router]);
  return null;
}
