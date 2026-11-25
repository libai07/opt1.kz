export function uid(prefix = ''): string {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return prefix ? `${prefix}_${id}` : id;
}

export function orderId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${date}-${rand}`;
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function localized<T extends Record<string, any>>(obj: T, field: string, locale: string): string {
  const key = `${field}_${locale}` as keyof T;
  const ruKey = `${field}_ru` as keyof T;
  return (obj[key] as string) || (obj[ruKey] as string) || '';
}
