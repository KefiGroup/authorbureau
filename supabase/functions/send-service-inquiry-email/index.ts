const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// HTML-escape user input to prevent injection
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { authorName, authorSlug, serviceType, fullName, email, phone, message } = body;

    // Server-side validation
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0 || fullName.length > 100) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid name' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (phone && (typeof phone !== 'string' || phone.length > 30)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid phone' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (message && (typeof message !== 'string' || message.length > 2000)) {
      return new Response(JSON.stringify({ success: false, error: 'Message too long' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!serviceType || typeof serviceType !== 'string' || serviceType.length > 100) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid service type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Escape all user inputs before embedding in HTML
    const safeAuthorName = escapeHtml(String(authorName || ''));
    const safeAuthorSlug = encodeURIComponent(String(authorSlug || ''));
    const safeServiceType = escapeHtml(String(serviceType));
    const safeFullName = escapeHtml(fullName.trim());
    const safeEmail = escapeHtml(email.trim());
    const safePhone = phone ? escapeHtml(String(phone).trim()) : '';
    const safeMessage = message ? escapeHtml(String(message).trim()) : '';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">New ${safeServiceType} Inquiry</h2>
        <p>A new service inquiry has been submitted through Authors Bureau.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Author</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${safeAuthorName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Service</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${safeServiceType}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">From</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${safeFullName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          ${safePhone ? `<tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${safePhone}</td></tr>` : ''}
          ${safeMessage ? `<tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Message</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${safeMessage}</td></tr>` : ''}
        </table>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">This inquiry was submitted via <a href="https://authorbureau.lovable.app/authors/${safeAuthorSlug}">Authors Bureau</a>.</p>
      </div>
    `;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Authors Bureau <onboarding@resend.dev>',
          to: ['support@authorsbureau.com'],
          subject: `New ${safeServiceType} Inquiry for ${safeAuthorName} — Authors Bureau`,
          html: emailHtml,
          reply_to: email.trim(),
        }),
      });

      const result = await res.json();
      console.log('Email sent:', result);

      if (!res.ok) {
        console.error('Resend error:', result);
      }
    } else {
      console.log('RESEND_API_KEY not configured. Email notification skipped.');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending inquiry email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
