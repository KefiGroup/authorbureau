import { hasRequiredAssets } from "/dev-server/supabase/functions/_shared/node-readiness.ts";
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data: ap } = await sb.from("author_profiles").select("id").eq("author_slug","pauline-teo").single();
const { data } = await sb.from("author_nodes").select("node_id,status,content_json").eq("author_id", ap!.id).order("node_id");
let live=0, passing=0;
for (const r of data!) {
  const ok = hasRequiredAssets(r.node_id, r.content_json);
  if (r.status==="live") live++;
  if (r.status==="live" && ok) passing++;
  console.log(r.node_id.padEnd(6), r.status.padEnd(15), ok?"PASS":"FAIL");
}
console.log(`---\nlive=${live} passing=${passing}`);
