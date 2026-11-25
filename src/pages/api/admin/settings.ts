import type { APIRoute } from 'astro';
import { q } from '../../../db/queries';
import { getAdminFromRequest } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  if (!await getAdminFromRequest(request, env)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const settings = await q(env.DB).getSettings();
  return Response.json({ settings });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  if (!await getAdminFromRequest(request, env)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const allowed = ['site_name','site_tagline_ru','site_tagline_kk','site_tagline_zh','whatsapp_number','tiktok_url','instagram_url','maintenance_mode'];
  for (const [k, v] of Object.entries(body)) {
    if (allowed.includes(k) && typeof v === 'string') await q(env.DB).setSetting(k, v);
  }
  return Response.json({ ok: true });
};
