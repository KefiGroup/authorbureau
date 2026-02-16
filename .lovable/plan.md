

# Bulletproof SSO Sign-In

## Root Cause

The current `AbortController` fix is insufficient. The `useEffect` depends on `[searchParams, navigate]` -- the `searchParams` reference can change between renders, causing the effect to re-run, abort the previous fetch, and start a new one. In a race between abort and error-setting, the error can slip through.

Additionally, even a single network hiccup shows a permanent failure with no way to recover.

## Solution

Rewrite `src/pages/SSO.tsx` with three reliability guarantees:

### 1. Run-once guard with `useRef`
Use a ref (`hasRun`) to ensure the SSO validation fetch executes exactly once, regardless of re-renders, Strict Mode double-mounting, or dependency changes.

### 2. Empty dependency array
Read `token` from `window.location.search` directly (or from the initial `searchParams` snapshot via ref) and use `navigate` via ref. This eliminates all dependency-driven re-runs. The effect fires once on mount, period.

### 3. Automatic retry with backoff
If the fetch fails due to a network error (not a validation error), retry up to 2 times with a short delay before showing the error. This handles transient network issues during the SSO redirect.

## Changes

### File: `src/pages/SSO.tsx`

```text
import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SSO() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;          // strict-mode / re-render guard
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) { setError("No SSO token provided."); return; }

    let cancelled = false;

    async function run(attempt = 1) {
      try {
        const res = await fetch(
          `${SHARED_BACKEND_URL}/functions/v1/sso-handoff`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "validate", token, source_platform: "authorsbureau",
            }),
          }
        );
        const data = await res.json();
        if (!res.ok || !data.session_data)
          throw new Error(data.error || "SSO validation failed");

        if (cancelled) return;

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session_data.access_token,
          refresh_token: data.session_data.refresh_token,
        });
        if (sessionError) throw sessionError;

        if (!cancelled) navigate("/dashboard", { replace: true });
      } catch (err) {
        if (cancelled) return;
        // Retry transient/network errors up to 2 times
        if (attempt < 3 && err instanceof TypeError) {
          await new Promise(r => setTimeout(r, 800 * attempt));
          if (!cancelled) return run(attempt + 1);
          return;
        }
        setError(err instanceof Error ? err.message : "SSO authentication failed");
      }
    }

    run();
    return () => { cancelled = true; };
  }, [navigate]);

  // ... error and loading UI unchanged
}
```

Key differences from current code:
- **`useRef(hasRun)`** prevents double execution under any circumstance
- **No `searchParams` dependency** -- reads URL params directly from `window.location.search`
- **`cancelled` flag** instead of `AbortController` -- simpler, no "signal aborted" errors possible
- **Retry logic** for network (`TypeError`) failures (up to 2 retries with backoff)
- Dependency array is just `[navigate]` which is always stable

## Technical Details

| Problem | Current behavior | Fixed behavior |
|---------|-----------------|----------------|
| Strict Mode double-mount | AbortController aborts first fetch, error can leak | `useRef` prevents second execution entirely |
| searchParams re-render | Effect re-runs, aborts, restarts | No dependency on searchParams at all |
| Network glitch | Permanent failure shown | Up to 2 automatic retries |
| "signal is aborted" error | Supposed to be caught but still appears | No AbortController used -- impossible to occur |
