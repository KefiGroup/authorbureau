

The user wants me to:
1. Force-redeploy `submit-funnel` to production
2. Trigger one test quiz submission
3. Pull the actual production logs and paste them
4. Diagnose from real logs, not from repo code

This requires `supabase--deploy_edge_functions`, `supabase--curl_edge_functions`, `supabase--edge_function_logs`, and `supabase--read_query` — all available in default mode after approval.

I have everything I need (funnel id can be looked up via SQL, anon key is in context). No clarifying questions needed.

## Plan

### Step 1 — Force redeploy
- Deploy `submit-funnel` via `supabase--deploy_edge_functions(["submit-funnel"])` so the deployed bundle matches the repo (lines 145–205 with the `crm_contacts` mirror block and `📝 WRITE AUDIT` / `✅ crm_contacts mirrored` logs).

### Step 2 — Look up Pauline's live BP-02 funnel
- SQL: `select id, author_id, node_id, slug, status from funnels where author_id = '92326a2f-3ed0-4873-a8cf-7a0b1350995a' and node_id = 'BP-02' and status = 'live' limit 1;`

### Step 3 — Submit one test quiz lead directly to the deployed function
- Call `submit-funnel` via `supabase--curl_edge_functions` with:
  - `funnel_id` = the id from step 2
  - `email` = `sprint37.lovable.audit+<timestamp>@testmail.com`
  - `name` = `Sprint37 Audit`
  - `quiz_responses` = 1 sample answer
- This guarantees we hit the freshly deployed function and produce log lines.

### Step 4 — Pull production logs
- `supabase--edge_function_logs("submit-funnel")` filtered for the test email and for these markers:
  - `📝 WRITE AUDIT`
  - `✅ crm_contacts mirrored`
  - `crm_contacts mirror failed`
  - `⚠️ no author_user_id`
- Paste the raw log output back to the user.

### Step 5 — Verify DB write
- SQL after the call:
  - `select id, author_id, email, created_at from crm_contacts where email = '<test email>';`
  - `select id, author_id, email, created_at from leads where email = '<test email>';`
- This proves whether the mirror actually wrote a row, regardless of what the UI shows.

### Step 6 — Decide based on real evidence
- If logs show `✅ crm_contacts mirrored` AND row exists in `crm_contacts` → the deploy was the gap; CRM should now show the contact. No code changes.
- If logs show `⚠️ no author_user_id` → fix is in the `author_profiles` lookup (line ~52: `.eq('id', funnel.author_id)`).
- If logs show `crm_contacts mirror failed` with an error → fix that exact insert/update statement based on the error message.
- Only then push a targeted code change.

### Files potentially touched (only if logs prove it's needed)
- `supabase/functions/submit-funnel/index.ts` — only the specific failing branch.

No speculative edits. Deploy → trigger → read logs → decide.

