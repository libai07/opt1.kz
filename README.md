# Opt1 KZ

E-commerce MVP для Казахстана: **TikTok/Instagram → витрина → заказ → Kaspi POS → WhatsApp**.  
Слоган: **Оптовые цены от 1 шт.**

## Что внутри

- **Astro 5 SSR** + **Cloudflare Workers**
- **D1** (товары, категории, заказы, админы, настройки)
- **R2** (изображения, binding готов)
- **KV** (binding готов, для сессий/лимитов)
- **Hono-ready API routes** через Astro endpoints
- **Мультиязычность**: `ru`, `kk`, `zh`
- **Категории товаров**: отдельная таблица `categories`
- **Соцсети**: TikTok и Instagram настраиваются через env/settings
- **Админка MVP**: `/admin/login`, `/admin/` (заказы + статусы)
- **Auth**: JWT (jose) + PBKDF2-SHA256 через WebCrypto (совместимо с Workers)

## Структура

```text
opt1kz/
  scripts/create-admin.mjs
  src/
    components/
    db/
      migrations/0001_init.sql
      queries.ts
      seed.sql
    layouts/
    lib/
    pages/
      [locale]/index.astro
      [locale]/category/[slug].astro
      [locale]/product/[id].astro
      api/orders.ts
      api/admin/auth.ts
      api/admin/orders.ts
      api/admin/products.ts
      api/admin/settings.ts
      admin/login.astro
      admin/index.astro
    styles/global.css
    middleware.ts
    worker.ts
  astro.config.mjs
  wrangler.jsonc
  package.json
```

## Быстрый старт

### 1. Установка

```bash
npm install
```

### 2. Создать ресурсы Cloudflare

```bash
npx wrangler d1 create opt1kz-db
npx wrangler r2 bucket create opt1kz-images
npx wrangler kv namespace create KV
```

Скопируйте `database_id` и KV `id` в `wrangler.jsonc`.

### 3. Секреты

```bash
npx wrangler secret put AUTH_SECRET
# используйте длинный случайный секрет, например:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Миграции и seed

```bash
npm run db:migrate:local
npm run db:seed:local

# для продакшена
npm run db:migrate:remote
npm run db:seed:remote
```

### 5. Создать админа

```bash
node scripts/create-admin.mjs admin@opt1.kz 'StrongPassword123'
```

Команда выдаст SQL. Выполните его:

```bash
npx wrangler d1 execute opt1kz-db --local --command="INSERT INTO admins ..."
npx wrangler d1 execute opt1kz-db --remote --command="INSERT INTO admins ..."
```

### 6. Локальная разработка

```bash
npm run dev
```

### 7. Деплой

```bash
npm run deploy
```

## Настройки соцсетей

В `wrangler.jsonc` есть переменные:

- `WHATSAPP_NUMBER`
- `TIKTOK_URL`
- `INSTAGRAM_URL`

Их также можно хранить в таблице `settings` (ключи с теми же именами) — UI читает settings с fallback на env.

## Бизнес-процесс заказа

1. Клиент выбирает товар и оформляет заказ.
2. Заказ создаётся со статусом `pending`, склад уменьшается атомарной проверкой `stock >= qty`.
3. Админ видит заказ в `/admin/`, отправляет счёт через Kaspi POS.
4. Статусы: `pending → invoiced → paid → shipped` (или `cancelled`).
5. Клиенту доступна ссылка WhatsApp с предзаполненным сообщением.

## Что важно до production

- Добавить rate limit на `/api/orders` и `/api/admin/auth` (KV).
- Добавить CSRF/Origin проверки для админских мутаций, если перейдёте на cookie-auth.
- Добавить загрузку изображений в R2 и админ-CRUD категорий/товаров с UI.
- Добавить аудит-лог действий админа.
- Добавить D1 backup/экспорт.
- Для корзины/мульти-товарных заказов перейти на `orders + order_items`.

## Примечания

- Текущая модель заказа — **один товар на заказ** (MVP).
- Категории уже выделены в отдельную таблицу — это база для масштабирования каталога.
- UI прототипный, но адаптивный и готовый к дальнейшей полировке.
