import { corsHeaders, corsResponse } from '../_shared/cors.ts';
import { signJwt, setAuthCookie } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const { password } = await req.json();
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');
    const sessionSecret = Deno.env.get('SESSION_SECRET');

    if (!password || password !== adminPassword) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = await signJwt({ role: 'admin', exp: Math.floor(Date.now() / 1000) + 86400 }, sessionSecret!);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Set-Cookie': setAuthCookie(token),
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
