export function formatKZT(tiyin: number, locale: string = 'ru'): string {
  const amount = tiyin / 100;
  const formatted = new Intl.NumberFormat(locale === 'kk' ? 'kk-KZ' : locale === 'zh' ? 'zh-CN' : 'ru-KZ', {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ₸`;
}

export function toTiyin(kzt: number): number {
  return Math.round(kzt * 100);
}
