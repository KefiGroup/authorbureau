

# Abby Chatbot Security Vulnerability Fix Plan

## Vulnerabilities Found (7 issues)

### Critical
1. **`getClaims()` does not exist on Supabase JS client** — The `requireAuth()` function calls `supabase.auth.getClaims(token)` which is not a real method. This means auth verification may be silently failing or throwing, causing the function to 500 instead of properly authenticating. Must replace with `supabase.auth.getUser(token)`.

### Medium
2. **`save_session` action has no rate limiting** — An attacker can flood the `chat_sessions` table with unlimited requests.
3. **`save_session` messages stored unsanitized** — Raw JSONB of arbitrary size is inserted without validation or size cap.
4. **`screenshot_url` stored without validation** — Bug reports accept any string as a URL, allowing injection of phishing links or arbitrary data into admin-facing views.

### Low
5. **`priority`, `type`, `importance` fields have no whitelist validation** — Arbitrary strings can be stored instead of expected enum values.
6. **Error catch block leaks `e.message`** — Internal error details (paths, secrets) could be exposed to clients.
7. **Client `submitAction` silently fails** — User sees success toast even if submission actually failed.

## Changes

### Edge Function: `supabase/functions/abby-help-chat/index.ts`

**Fix #1 — Replace `getClaims` with `getUser`**
```typescript
async function requireAuth(req: Request, supabase: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Unauthorized", status: 401 };
  }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: "Unauthorized", status: 401 };
  }
  return { user };
}
```
Then extract `userId = authResult.user.id` and `userEmail = authResult.user.email`.

**Fix #2 — Add rate limit to `save_session`**
Add the same escalation rate limit check (3 req/60s) before the save_session insert.

**Fix #3 — Validate and cap `save_session` messages**
- Validate `data.messages` is an array, cap at 50 entries
- Truncate each message content to 3,000 chars
- Force roles to user/assistant

**Fix #4 — Validate `screenshot_url`**
Only accept URLs starting with `https://` and cap at 500 chars; reject or null-out anything else.

**Fix #5 — Whitelist enum fields**
- `priority`: only allow `"low" | "medium" | "high" | "critical"`, default to `"low"`
- `type`: only allow `"feature_request" | "improvement" | "general"`, default to `"general"`
- `importance`: only allow `"critical" | "important" | "nice_to_have"`, default to `"nice_to_have"`

**Fix #6 — Sanitize error responses**
Replace `e.message` with a generic `"Internal server error"` in the catch block.

**Fix #7 — N/A server-side** (client-only improvement, optional)

### Frontend: `src/components/AbbyHelpChatbot.tsx`

**Fix #7 — Handle `submitAction` failures**
Check response status and show an error toast if submission fails, instead of always showing success.

