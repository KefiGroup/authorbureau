## Remove Google Sign-In from `/auth`

Authentication is centralized via PublishNow.io SSO, so the standalone Google button on `/auth` should not be exposed.

### Scope

Single file: `src/pages/Auth.tsx`.

### Changes

1. Delete the entire Google sign-in block (lines ~285-312):
   - The "Continue with Google" `<Button>` and its inline SVG
   - The "or" divider that follows it
2. Remove the now-unused `lovable` import (line 5: `import { lovable } from "@/integrations/lovable/index"`).
3. Leave the email + one-time-code + password flows intact — they remain the supported paths alongside the PublishNow SSO redirect.

### Not changing

- `src/integrations/lovable/index.ts` and the `@lovable.dev/cloud-auth-js` package stay installed (harmless, auto-managed). Removing the package isn't necessary and could be re-added later if Google sign-in is reinstated.
- `ReaderAuth.tsx` — already has no Google button, no change needed.
- PublishNow SSO route (`/sso`) and the existing redirect logic are untouched.

### Verification

- Visit `/auth` — only "One-time Code" / "Password" tabs visible, no Google button, no divider.
- TypeScript compiles cleanly (no unused-import warning).

Reply YES to apply.