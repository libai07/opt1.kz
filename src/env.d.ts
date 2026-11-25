/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type D1Database = import('@cloudflare/workers-types').D1Database;
type KVNamespace = import('@cloudflare/workers-types').KVNamespace;
type R2Bucket = import('@cloudflare/workers-types').R2Bucket;

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  BUCKET: R2Bucket;
  AUTH_SECRET: string;
  SITE_URL: string;
  WHATSAPP_NUMBER: string;
  TIKTOK_URL: string;
  INSTAGRAM_URL: string;
  SITE_NAME: string;
  DEFAULT_LOCALE: string;
  SUPPORTED_LOCALES: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    locale: 'ru' | 'kk' | 'zh';
    t: (key: string, params?: Record<string, string | number>) => string;
  }
}
