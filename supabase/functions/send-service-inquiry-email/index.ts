const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { authorName, authorSlug, serviceType, fullName, email, phone, message } = await req.json();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    // Build email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">New ${serviceType} Inquiry</h2>
        <p>A new service inquiry has been submitted through Authors Bureau.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Author</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${authorName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Service</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${serviceType}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">From</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fullName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td></tr>
          ${phone ? `<tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${phone}</td></tr>` : ''}
          ${message ? `<tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Message</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${message}</td></tr>` : ''}
        </table>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">This inquiry was submitted via <a href="https://authorbureau.lovable.app/authors/${authorSlug}">Authors Bureau</a>.</p>
      </div>
    `;

    // If Resend is configured, send email
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
          subject: `New ${serviceType} Inquiry for ${authorName} — Authors Bureau`,
          html: emailHtml,
          reply_to: email,
        }),
      });

      const result = await res.json();
      console.log('Email sent:', result);

      if (!res.ok) {
        console.error('Resend error:', result);
      }
    } else {
      console.log('RESEND_API_KEY not configured. Email notification skipped.');
      console.log('Inquiry details:', { authorName, serviceType, fullName, email, phone, message });
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
