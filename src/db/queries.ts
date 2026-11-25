import type { D1Database } from '@cloudflare/workers-types';
import { parseJson } from '../lib/utils';

export interface Category {
  id: string;
  slug: string;
  name_ru: string;
  name_kk: string | null;
  name_zh: string | null;
  icon: string;
  sort_order: number;
  is_active: number;
}

export interface Product {
  id: string;
  sku: string;
  category_id: string | null;
  category_slug?: string | null;
  category_name_ru?: string | null;
  category_name_kk?: string | null;
  category_name_zh?: string | null;
  category_icon?: string | null;
  title_ru: string;
  title_kk: string | null;
  title_zh: string | null;
  description_ru: string | null;
  description_kk: string | null;
  description_zh: string | null;
  price_tiyin: number;
  old_price_tiyin: number | null;
  stock: number;
  images: string;
  attrs: string;
  badge: string | null;
  is_active: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface Order {
  id: string;
  product_id: string;
  qty: number;
  selected_attrs: string;
  buyer_name: string;
  buyer_phone: string;
  city: string;
  address: string;
  comment: string | null;
  status: string;
  kaspi_invoice_id: string | null;
  paid_at: number | null;
  shipped_at: number | null;
  tracking_no: string | null;
  carrier: string | null;
  created_at: number;
  updated_at: number;
}

export type ProductView = Omit<Product, 'images' | 'attrs'> & {
  images: string[];
  attrs: Record<string, string[]>;
  title: string;
  description: string;
  category_name: string;
};

function localize(row: any, field: string, locale: string): string {
  return row[`${field}_${locale}`] || row[`${field}_ru`] || '';
}

export function mapProduct(row: any, locale: string): ProductView {
  return {
    ...row,
    images: parseJson<string[]>(row.images, []),
    attrs: parseJson<Record<string, string[]>>(row.attrs, {}),
    title: localize(row, 'title', locale),
    description: localize(row, 'description', locale),
    category_name: localize({ name_ru: row.category_name_ru, name_kk: row.category_name_kk, name_zh: row.category_name_zh }, 'name', locale),
  };
}

const PRODUCT_SELECT = `
  SELECT p.*, c.slug as category_slug, c.name_ru as category_name_ru, c.name_kk as category_name_kk,
         c.name_zh as category_name_zh, c.icon as category_icon
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

export const q = (db: D1Database) => ({
  async listCategories(activeOnly = true): Promise<Category[]> {
    const sql = activeOnly
      ? 'SELECT * FROM categories WHERE is_active=1 ORDER BY sort_order, name_ru'
      : 'SELECT * FROM categories ORDER BY sort_order, name_ru';
    const { results } = await db.prepare(sql).all<Category>();
    return results;
  },

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    return db.prepare('SELECT * FROM categories WHERE slug=? AND is_active=1').bind(slug).first<Category>();
  },

  async listProducts(opts: { locale?: string; categorySlug?: string; activeOnly?: boolean; limit?: number; offset?: number } = {}) {
    const { locale = 'ru', categorySlug, activeOnly = true, limit = 24, offset = 0 } = opts;
    let sql = `${PRODUCT_SELECT} WHERE 1=1`;
    const args: any[] = [];
    if (activeOnly) sql += ' AND p.is_active=1';
    if (categorySlug) { sql += ' AND c.slug=?'; args.push(categorySlug); }
    sql += ' ORDER BY p.sort_order, p.created_at DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);
    const { results } = await db.prepare(sql).bind(...args).all<any>();
    return results.map((r) => mapProduct(r, locale));
  },

  async getProductById(id: string, locale = 'ru') {
    const row = await db.prepare(`${PRODUCT_SELECT} WHERE p.id=?`).bind(id).first<any>();
    return row ? mapProduct(row, locale) : null;
  },

  async getProductBySku(sku: string, locale = 'ru') {
    const row = await db.prepare(`${PRODUCT_SELECT} WHERE p.sku=?`).bind(sku).first<any>();
    return row ? mapProduct(row, locale) : null;
  },

  async decStock(id: string, qty: number) {
    return db.prepare('UPDATE products SET stock=stock-?, updated_at=strftime(\'%s\',\'now\') WHERE id=? AND stock>=?')
      .bind(qty, id, qty).run();
  },

  async createOrder(o: { id: string; product_id: string; qty: number; selected_attrs: Record<string, string>; buyer_name: string; buyer_phone: string; city: string; address: string; comment: string | null }) {
    return db.prepare(
      `INSERT INTO orders (id,product_id,qty,selected_attrs,buyer_name,buyer_phone,city,address,comment,status)
       VALUES (?,?,?,?,?,?,?,?,?,'pending')`
    ).bind(o.id, o.product_id, o.qty, JSON.stringify(o.selected_attrs), o.buyer_name, o.buyer_phone, o.city, o.address, o.comment).run();
  },

  async getOrderById(id: string) {
    return db.prepare('SELECT * FROM orders WHERE id=?').bind(id).first<Order>();
  },

  async listOrders(opts: { status?: string; phone?: string; limit?: number; offset?: number } = {}) {
    const { status, phone, limit = 50, offset = 0 } = opts;
    let sql = `SELECT o.*, p.title_ru, p.sku, p.price_tiyin, p.images FROM orders o JOIN products p ON p.id=o.product_id WHERE 1=1`;
    const args: any[] = [];
    if (status) { sql += ' AND o.status=?'; args.push(status); }
    if (phone) { sql += ' AND o.buyer_phone LIKE ?'; args.push(`%${phone}%`); }
    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);
    const { results } = await db.prepare(sql).bind(...args).all<any>();
    return results.map(r => ({ ...r, selected_attrs: parseJson(r.selected_attrs, {}), images: parseJson(r.images, []) }));
  },

  async updateOrderStatus(id: string, status: string, extra: Record<string, any> = {}) {
    const sets = ['status=?', "updated_at=strftime('%s','now')"];
    const vals: any[] = [status];
    for (const [k, v] of Object.entries(extra)) {
      if (['kaspi_invoice_id', 'paid_at', 'shipped_at', 'tracking_no', 'carrier'].includes(k)) {
        sets.push(`${k}=?`);
        vals.push(v);
      }
    }
    vals.push(id);
    return db.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id=?`).bind(...vals).run();
  },

  async getAdminByEmail(email: string) {
    return db.prepare('SELECT * FROM admins WHERE email=?').bind(email).first<{ id: string; email: string; pwd_hash: string; role: string }>();
  },

  async getSettings(): Promise<Record<string, string>> {
    const { results } = await db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
    return Object.fromEntries(results.map(r => [r.key, r.value]));
  },

  async setSetting(key: string, value: string) {
    return db.prepare('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
      .bind(key, value).run();
  },
});
