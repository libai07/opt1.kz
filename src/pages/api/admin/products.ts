import type { APIRoute } from 'astro';
import { q } from '../../../db/queries';
import { getAdminFromRequest } from '../../../lib/auth';
import { uid } from '../../../lib/utils';

async function guard(request: Request, env: Env) { return getAdminFromRequest(request, env); }

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  if (!await guard(request, env)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const locale = (url.searchParams.get('locale') || 'ru') as 'ru'|'kk'|'zh';
  const products = await q(env.DB).listProducts({ locale, activeOnly: false, limit: 200 });
  const categories = await q(env.DB).listCategories(false);
  return Response.json({ products, categories });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  if (!await guard(request, env)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json() as any;
  const id = body.id || uid('p');
  const db = env.DB;
  if (body._delete && body.id) {
    await db.prepare('UPDATE products SET is_active=0, updated_at=strftime(\'%s\',\'now\') WHERE id=?').bind(body.id).run();
    return Response.json({ ok: true });
  }
  // upsert simple
  const exists = await db.prepare('SELECT id FROM products WHERE id=?').bind(id).first();
  if (exists) {
    await db.prepare(`UPDATE products SET sku=?,category_id=?,title_ru=?,title_kk=?,title_zh=?,description_ru=?,description_kk=?,description_zh=?,price_tiyin=?,old_price_tiyin=?,stock=?,badge=?,is_active=?,sort_order=?,updated_at=strftime('%s','now') WHERE id=?`)
      .bind(body.sku, body.category_id || null, body.title_ru, body.title_kk || null, body.title_zh || null, body.description_ru || null, body.description_kk || null, body.description_zh || null, body.price_tiyin, body.old_price_tiyin || null, body.stock ?? 0, body.badge || null, body.is_active ?? 1, body.sort_order ?? 0, id).run();
  } else {
    await db.prepare(`INSERT INTO products (id,sku,category_id,title_ru,title_kk,title_zh,description_ru,description_kk,description_zh,price_tiyin,old_price_tiyin,stock,images,attrs,badge,is_active,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, body.sku, body.category_id || null, body.title_ru, body.title_kk || null, body.title_zh || null, body.description_ru || null, body.description_kk || null, body.description_zh || null, body.price_tiyin, body.old_price_tiyin || null, body.stock ?? 0, JSON.stringify(body.images || []), JSON.stringify(body.attrs || {}), body.badge || null, body.is_active ?? 1, body.sort_order ?? 0).run();
  }
  return Response.json({ ok: true, id });
};
