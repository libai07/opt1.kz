import { handle } from '@astrojs/cloudflare/handler';

export default {
  fetch: handle,
} as unknown as ExportedHandler<Env>;
