import { defineMiddleware } from 'astro:middleware';
import { createT, defaultLocale, locales, type Locale } from './lib/i18n';

function getLocale(pathname: string): Locale {
  const seg = pathname.split('/')[1] as Locale;
  return locales.includes(seg) ? seg : defaultLocale;
}

export const onRequest = defineMiddleware(async ({ url, locals, redirect }, next) => {
  const pathname = url.pathname;

  // Skip API/admin/static-like paths from locale redirect
  if (pathname.startsWith('/api') || pathname.startsWith('/admin') || pathname.startsWith('/_') || pathname.includes('.')) {
    const locale = getLocale(pathname);
    locals.locale = locale;
    locals.t = createT(locale);
    return next();
  }

  const seg = pathname.split('/')[1];
  if (!locales.includes(seg as Locale)) {
    const target = `/${defaultLocale}${pathname === '/' ? '/' : pathname}`;
    return redirect(target, 302);
  }

  const locale = seg as Locale;
  locals.locale = locale;
  locals.t = createT(locale);
  return next();
});
