-- Opt1 KZ initial schema

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name_ru     TEXT NOT NULL,
  name_kk     TEXT,
  name_zh     TEXT,
  icon        TEXT DEFAULT '📦',
  sort_order  INTEGER DEFAULT 0,
  is_active   INTEGER DEFAULT 1,
  created_at  INTEGER DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active, sort_order);

CREATE TABLE IF NOT EXISTS products (
  id             TEXT PRIMARY KEY,
  sku            TEXT UNIQUE NOT NULL,
  category_id    TEXT REFERENCES categories(id),
  title_ru       TEXT NOT NULL,
  title_kk       TEXT,
  title_zh       TEXT,
  description_ru TEXT,
  description_kk TEXT,
  description_zh TEXT,
  price_tiyin    INTEGER NOT NULL,
  old_price_tiyin INTEGER,
  stock          INTEGER DEFAULT 0,
  images         TEXT DEFAULT '[]',
  attrs          TEXT DEFAULT '{}',
  badge          TEXT, -- hit | new | sale
  is_active      INTEGER DEFAULT 1,
  sort_order     INTEGER DEFAULT 0,
  created_at     INTEGER DEFAULT (strftime('%s','now')),
  updated_at     INTEGER DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

CREATE TABLE IF NOT EXISTS orders (
  id               TEXT PRIMARY KEY,
  product_id       TEXT NOT NULL REFERENCES products(id),
  qty              INTEGER DEFAULT 1,
  selected_attrs   TEXT DEFAULT '{}',
  buyer_name       TEXT NOT NULL,
  buyer_phone      TEXT NOT NULL,
  city             TEXT NOT NULL,
  address          TEXT NOT NULL,
  comment          TEXT,
  status           TEXT DEFAULT 'pending', -- pending|invoiced|paid|shipped|cancelled
  kaspi_invoice_id TEXT,
  paid_at          INTEGER,
  shipped_at       INTEGER,
  tracking_no      TEXT,
  carrier          TEXT,
  created_at       INTEGER DEFAULT (strftime('%s','now')),
  updated_at       INTEGER DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS admins (
  id         TEXT PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  pwd_hash   TEXT NOT NULL,
  role       TEXT DEFAULT 'owner',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings(key, value) VALUES
  ('site_name', 'Opt1 KZ'),
  ('site_name_kk', 'Opt1 KZ'),
  ('site_name_zh', 'Opt1 KZ'),
  ('site_tagline_ru', 'Оптовые цены от 1 шт.'),
  ('site_tagline_kk', '1 данадан бастап көтерме баға'),
  ('site_tagline_zh', '1件起批发价'),
  ('whatsapp_number', '+77000000000'),
  ('tiktok_url', 'https://tiktok.com/@opt1.kz'),
  ('instagram_url', 'https://instagram.com/opt1.kz'),
  ('currency', 'KZT'),
  ('default_locale', 'ru'),
  ('supported_locales', 'ru,kk,zh'),
  ('maintenance_mode', 'false');
