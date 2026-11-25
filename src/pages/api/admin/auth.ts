import type { APIRoute } from 'astro';
import { z } from 'zod';
import { q } from '../../../db/queries';
import { createToken, getAdminFromRequest, verifyPwd } from '../../../lib/auth';

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const url = new URL(request.url);
  const action = url.pathname.split('/').pop();

  if (action === 'login' || url.pathname.endsWith('/auth')) {
    // support both /api/admin/auth (login) and /api/admin/auth/login style? keep simple: POST /api/admin/auth = login
  }

  const body = await request.json().catch(() => ({})) as Record<string, any>;
  // If body has email/password, treat as login
  if (body.email && body.password) {
    const parsed = schema.safeParse(body);
    if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });
    const admin = await q(env.DB).getAdminByEmail(parsed.data.email);
    if (!admin) return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    const ok = await verifyPwd(parsed.data.password, admin.pwd_hash);
    if (!ok) return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    const token = await createToken(admin, env);
    return Response.json({ token, admin: { id: admin.id, email: admin.email, role: admin.role } });
  }

  // verify
  const admin = await getAdminFromRequest(request, env);
  if (!admin) return Response.json({ valid: false }, { status: 401 });
  return Response.json({ valid: true, admin });
};
