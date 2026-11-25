import type { APIRoute } from 'astro';
import { q } from '../../../db/queries';
import { getAdminFromRequest } from '../../../lib/auth';

async function guard(request: Request, env: Env) {
  const admin = await getAdminFromRequest(request, env);
  return admin;
}

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  if (!await guard(request, env)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const phone = url.searchParams.get('phone') || undefined;
  const orders = await q(env.DB).listOrders({ status, phone, limit: 100 });
  return Response.json({ orders });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  if (!await guard(request, env)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json() as any;
  const { id, action, ...extra } = body;
  if (!id || !action) return Response.json({ error: 'id and action required' }, { status: 400 });

  const map: Record<string, { status: string; extra?: Record<string, any> }> = {
    invoice: { status: 'invoiced', extra: { kaspi_invoice_id: extra.kaspi_invoice_id || null } },
    paid: { status: 'paid', extra: { paid_at: Math.floor(Date.now() / 1000) } },
    ship: { status: 'shipped', extra: { shipped_at: Math.floor(Date.now() / 1000), tracking_no: extra.tracking_no || null, carrier: extra.carrier || null } },
    cancel: { status: 'cancelled' },
  };
  const m = map[action];
  if (!m) return Response.json({ error: 'Unknown action' }, { status: 400 });
  await q(env.DB).updateOrderStatus(id, m.status, m.extra || {});
  return Response.json({ ok: true });
};
