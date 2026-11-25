import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    imageService: 'passthrough',
    platformProxy: { enabled: true },
    sessionKVBindingName: 'KV'
  }),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@lib': '/src/lib',
        '@db': '/src/db'
      }
    }
  },
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'kk', 'zh'],
    routing: {
      prefixDefaultLocale: true
    }
  }
});
