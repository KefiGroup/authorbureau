// Builds a ZIP of an author's social pack: captions.md + each graphic image.
// Auth: bearer token (signed-in author) — checks ownership via author_profiles.user_id.
import { createClient } from 'npm:@supabase/supabase-js@2';
// deno-lint-ignore-file no-explicit-any
// @ts-ignore - esm.sh types are loose
import JSZip from 'https://esm.sh/jszip@3.10.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', twitter: 'X (Twitter)',
  x: 'X (Twitter)', linkedin: 'LinkedIn', tiktok: 'TikTok', threads: 'Threads',
};

function safeName(s: string) {
  return (s || 'file').replace(/[^a-z0-9-_.]+/gi, '_').slice(0, 80);
}
function extFromUrl(u: string) {
  const m = u.split('?')[0].match(/\.(png|jpe?g|webp|gif|svg)$/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(JSON.stringify({ success: false, status: 401, message: 'Missing token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ success: false, status: 401, message: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const { author_id, book_id, node_id } = body || {};
    if (!author_id) {
      return new Response(JSON.stringify({ success: false, status: 400, message: 'author_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Ownership check
    const { data: prof } = await admin.from('author_profiles')
      .select('id, pen_name, user_id').eq('id', author_id).maybeSingle();
    if (!prof || prof.user_id !== userId) {
      return new Response(JSON.stringify({ success: false, status: 403, message: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let q = admin.from('social_posts')
      .select('id, platform, content, scheduled_at, posted_at, status, graphic_url, post_index, post_type, node_id, book_id')
      .eq('author_id', author_id)
      .order('scheduled_at', { ascending: true, nullsFirst: false });
    if (book_id) q = q.eq('book_id', book_id);
    if (node_id) q = q.eq('node_id', node_id);
    const { data: posts, error } = await q;
    if (error) throw error;

    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ success: false, status: 404, message: 'No social posts to export' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const zip = new JSZip();

    // captions.md grouped by platform
    const byPlatform: Record<string, any[]> = {};
    for (const p of posts) (byPlatform[p.platform] ||= []).push(p);
    const md: string[] = [`# Social Pack — ${prof.pen_name || 'Author'}`, '',
      `Generated ${new Date().toISOString().slice(0, 10)} · ${posts.length} posts`, ''];
    for (const [plat, list] of Object.entries(byPlatform)) {
      md.push(`## ${PLATFORM_LABELS[plat] || plat} (${list.length})`, '');
      list.forEach((p, i) => {
        md.push(`### Post ${i + 1}`);
        if (p.scheduled_at) md.push(`- Scheduled: ${new Date(p.scheduled_at).toISOString()}`);
        md.push(`- Status: ${p.status}${p.posted_at ? ` (posted ${new Date(p.posted_at).toISOString()})` : ''}`);
        if (p.graphic_url) md.push(`- Graphic: graphics/${plat}_${i + 1}.${extFromUrl(p.graphic_url)}`);
        md.push('', '```', String(p.content || '').trim(), '```', '');
      });
    }
    zip.file('captions.md', md.join('\n'));

    // CSV for spreadsheet workflows
    const csv = ['platform,scheduled_at,posted_at,status,graphic_url,content'];
    for (const p of posts) {
      const cell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      csv.push([p.platform, p.scheduled_at, p.posted_at, p.status, p.graphic_url, p.content].map(cell).join(','));
    }
    zip.file('schedule.csv', csv.join('\n'));

    // Fetch graphics in parallel
    const graphicsFolder = zip.folder('graphics')!;
    await Promise.all(Object.entries(byPlatform).flatMap(([plat, list]) =>
      list.map(async (p, i) => {
        if (!p.graphic_url) return;
        try {
          const r = await fetch(p.graphic_url);
          if (!r.ok) return;
          const buf = new Uint8Array(await r.arrayBuffer());
          graphicsFolder.file(`${safeName(plat)}_${i + 1}.${extFromUrl(p.graphic_url)}`, buf);
        } catch (_e) { /* skip */ }
      })
    ));

    const blob = await zip.generateAsync({ type: 'uint8array' });
    const filename = `social-pack-${safeName(prof.pen_name || 'author')}-${Date.now()}.zip`;

    return new Response(blob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error('export-social-pack-zip error', e);
    return new Response(JSON.stringify({ success: false, status: 500, message: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
