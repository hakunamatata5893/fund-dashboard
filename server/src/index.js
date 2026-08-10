import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import {createReadStream, existsSync, statSync} from 'node:fs';
import {extname, join, normalize, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import router from './routes.js';

const app = new Koa();
const PORT = Number(process.env.FUND_DASHBOARD_PORT) || 51888;
const HOST = '127.0.0.1';
const distDir = resolve(fileURLToPath(new URL('../../web/dist/', import.meta.url)));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

app.use(cors());
app.use(bodyParser());

app.use(async (ctx, next) => {
  const start = Date.now();
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = { success: false, message: err.message || '服务器错误' };
    console.error('[error]', err);
  }
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} ${ctx.status} ${ms}ms`);
});

app.use(router.routes()).use(router.allowedMethods());

app.use(async (ctx) => {
  if (ctx.method !== 'GET' && ctx.method !== 'HEAD') return;
  if (!existsSync(distDir)) {
    ctx.status = 503;
    ctx.body = '前端尚未构建，请先运行 npm run build';
    return;
  }

  const requestPath = decodeURIComponent(ctx.path).replace(/^\/+/, '');
  const candidate = resolve(join(distDir, normalize(requestPath)));
  const safeCandidate = candidate.startsWith(distDir) ? candidate : '';
  const filePath =
    safeCandidate && existsSync(safeCandidate) && statSync(safeCandidate).isFile()
      ? safeCandidate
      : join(distDir, 'index.html');

  ctx.type = MIME_TYPES[extname(filePath)] || 'application/octet-stream';
  ctx.body = createReadStream(filePath);
});

app.listen(PORT, HOST, () => {
  console.log(`基金看板已启动：http://${HOST}:${PORT}`);
});
