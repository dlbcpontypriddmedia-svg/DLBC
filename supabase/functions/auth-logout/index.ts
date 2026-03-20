import { corsHeaders, corsResponse } from '../_shared/cors.ts';
import { clearAuthCookie } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Set-Cookie': clearAuthCookie(),
    },
  });
});
