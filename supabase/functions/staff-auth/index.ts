import { corsResponse, getCorsHeaders } from '../_shared/cors.ts';
import { signJwt, setAuthCookie } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse(req);

  try {
    const { branch_id, password } = await req.json();
    if (!branch_id || !password) {
      return new Response(JSON.stringify({ error: 'Missing credentials' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const sb = getServiceClient();
    const { data: staff, error } = await sb
      .from('attendance_staff')
      .select('password_hash, branch_id')
      .eq('branch_id', branch_id)
      .single();

    if (error || !staff) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Simple hash comparison using Web Crypto
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex !== staff.password_hash) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const sessionSecret = Deno.env.get('SESSION_SECRET')!;
    const token = await signJwt({
      role: 'staff',
      branch_id: staff.branch_id,
      exp: Math.floor(Date.now() / 1000) + 86400,
    }, sessionSecret);

    return new Response(JSON.stringify({ success: true, branch_id: staff.branch_id, token }), {
      status: 200,
      headers: {
        ...getCorsHeaders(req),
        'Content-Type': 'application/json',
        'Set-Cookie': setAuthCookie(token),
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
