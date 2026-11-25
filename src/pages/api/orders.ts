import type { APIRoute } from 'astro';
import { z } from 'zod';
import { q } from '../../db/queries';
import { whatsappOrderLink } from '../../lib/whatsapp';
import { orderId } from '../../lib/utils';

const schema = z.object({
  product_id: z.string().min(1),
  qty: z.coerce.number().int().positive().default(1),
  selected_attrs: z.record(z.string()).default({}),
  buyer_name: z.string().min(1).max(100),
  buyer_phone: z.string().regex(/^\+?\d[\d\s\-()]{8,}$/),
  city: z.string().min(1).max(100),
  address: z.string().min(3).max(500),
  comment: z.string().max(1000).optional().nullable(),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;
    const env = locals.runtime.env;
    const db = env.DB;

    const product = await q(db).getProductById(data.product_id);
    if (!product || !product.is_active) return Response.json({ error: 'Товар не найден' }, { status: 404 });
    if (product.stock < data.qty) return Response.json({ error: 'Недостаточно товара на складе' }, { status: 409 });

    const stockRes = await q(db).decStock(data.product_id, data.qty);
    if (!stockRes.meta.changes) return Response.json({ error: 'Конфликт остатков, попробуйте снова' }, { status: 409 });

    const id = orderId();
    try {
      await q(db).createOrder({
        id,
        product_id: data.product_id,
        qty: data.qty,
        selected_attrs: data.selected_attrs,
        buyer_name: data.buyer_name,
        buyer_phone: data.buyer_phone,
        city: data.city,
        address: data.address,
        comment: data.comment ?? null,
      });
    } catch (err) {
      // compensate stock
      await db.prepare('UPDATE products SET stock=stock+? WHERE id=?').bind(data.qty, data.product_id).run();
      throw err;
    }

    const waNumber = (await q(db).getSettings()).whatsapp_number || env.WHATSAPP_NUMBER;
    const whatsapp_url = whatsappOrderLink(id, product.title_ru, waNumber);
    return Response.json({ order_id: id, amount_tiyin: product.price_tiyin * data.qty, whatsapp_url });
  } catch (e: any) {
    console.error('Create order error', e);
    return Response.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
};
