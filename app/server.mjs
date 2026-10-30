import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { NovaboxService, ServiceError } from './src/core/service.mjs';
import { PUBLIC_DIR } from './src/core/paths.mjs';
import { UpdaterError, checkUpdate, configureRepo, status as getUpdateStatus, installUpdate } from './src/core/updater.mjs';

const PORT = Number(process.env.NOVABOX_PORT || 8787);
const HOST = process.env.NOVABOX_HOST || '127.0.0.1';
const MAX_BODY = 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
};

const service = new NovaboxService();

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  securityHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function sendError(res, error) {
  if (error instanceof ServiceError) {
    sendJson(res, error.status, { error: { code: error.code, message: error.message, details: error.details } });
    return;
  }
  if (error instanceof UpdaterError) {
    sendJson(res, 400, { error: { code: error.code, message: error.message } });
    return;
  }
  console.error('[novabox]', error);
  sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: '本地服务内部错误' } });
}

async function readBody(req) {
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.includes('application/json')) {
    throw new ServiceError('请求必须使用 application/json', { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' });
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new ServiceError('请求体超过 1MB 上限', { status: 413, code: 'BODY_TOO_LARGE' });
    chunks.push(chunk);
  }
  if (!size) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    throw new ServiceError(`JSON 解析失败：${error.message}`, { status: 400, code: 'INVALID_JSON' });
  }
}

function serveStatic(req, res, pathname) {
  let relative = decodeURIComponent(pathname);
  if (relative === '/' || relative === '') relative = '/index.html';
  const fullPath = path.resolve(PUBLIC_DIR, `.${relative}`);
  if (!fullPath.startsWith(`${PUBLIC_DIR}${path.sep}`) && fullPath !== PUBLIC_DIR) {
    sendJson(res, 403, { error: { code: 'FORBIDDEN', message: '禁止访问该路径' } });
    return;
  }
  let stat;
  try {
    stat = fs.statSync(fullPath);
  } catch {
    sendJson(res, 404, { error: { code: 'NOT_FOUND', message: '文件不存在' } });
    return;
  }
  if (!stat.isFile()) {
    sendJson(res, 404, { error: { code: 'NOT_FOUND', message: '文件不存在' } });
    return;
  }
  securityHeaders(res);
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(fullPath).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': stat.size
  });
  fs.createReadStream(fullPath).pipe(res);
}

function streamEvents(req, res, url) {
  securityHeaders(res);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 1500\n\n');
  let last = Number(req.headers['last-event-id'] || url.searchParams.get('since') || 0);
  let alive = true;
  const timer = setInterval(() => {
    if (!alive) return;
    try {
      const events = service.events(last);
      for (const event of events) {
        last = event.seq;
        res.write(`id: ${event.seq}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      }
      res.write(': ping\n\n');
    } catch (error) {
      console.error('[novabox] SSE', error);
    }
  }, 500);
  req.on('close', () => {
    alive = false;
    clearInterval(timer);
  });
}

function match(pathname, pattern) {
  const result = pathname.match(pattern);
  return result ? result.slice(1).map((item) => decodeURIComponent(item)) : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? `${HOST}:${PORT}`}`);
  const pathname = url.pathname;
  const method = req.method ?? 'GET';

  try {
    if (pathname.startsWith('/api/')) {
      if (method === 'GET' && pathname === '/api/health') {
        sendJson(res, 200, {
          ok: true,
          version: '1.1.0',
          name: 'Novabox',
          uptimeSeconds: Math.round(process.uptime()),
          stats: service.store.stats()
        });
        return;
      }

      if (method === 'GET' && pathname === '/api/tools') {
        sendJson(res, 200, service.listTools({
          query: url.searchParams.get('q') ?? '',
          category: url.searchParams.get('category') ?? 'all',
          favoritesOnly: url.searchParams.get('favorites') === '1'
        }));
        return;
      }

      let parts = match(pathname, /^\/api\/tools\/([^/]+)$/);
      if (parts && method === 'GET') {
        sendJson(res, 200, { tool: service.getTool(parts[0]) });
        return;
      }
      if (parts && method === 'DELETE') {
        sendJson(res, 200, service.deleteTool(decodeURIComponent(parts[0])));
        return;
      }

      parts = match(pathname, /^\/api\/tools\/([^/]+)\/run$/);
      if (parts && method === 'POST') {
        const body = await readBody(req);
        const inputs = body.inputs ?? {};
        const origin = body.origin === 'mcp' ? 'mcp' : 'ui';
        if (origin === 'mcp') service.openTool(parts[0], inputs);
        sendJson(res, 200, service.runTool(parts[0], inputs, { origin }));
        return;
      }

      parts = match(pathname, /^\/api\/tools\/([^/]+)\/favorite$/);
      if (parts && method === 'POST') {
        const body = await readBody(req);
        sendJson(res, 200, { tool: service.setFavorite(parts[0], body.favorite) });
        return;
      }

      if (method === 'GET' && pathname === '/api/history') {
        sendJson(res, 200, service.history({
          limit: url.searchParams.get('limit') ?? 50,
          toolId: url.searchParams.get('toolId')
        }));
        return;
      }

      if (method === 'DELETE' && pathname === '/api/history') {
        sendJson(res, 200, service.clearHistory());
        return;
      }

      if (method === 'GET' && pathname === '/api/drafts') {
        sendJson(res, 200, service.listDrafts());
        return;
      }

      if (method === 'POST' && pathname === '/api/drafts') {
        const body = await readBody(req);
        sendJson(res, 201, { draft: service.createDraft(body.definition ?? body) });
        return;
      }

      parts = match(pathname, /^\/api\/drafts\/([^/]+)$/);
      if (parts && method === 'GET') {
        sendJson(res, 200, { draft: service.getDraft(parts[0]) });
        return;
      }
      if (parts && method === 'DELETE') {
        sendJson(res, 200, service.deleteDraft(parts[0]));
        return;
      }

      parts = match(pathname, /^\/api\/drafts\/([^/]+)\/validate$/);
      if (parts && method === 'POST') {
        sendJson(res, 200, { draft: service.validateDraft(parts[0]) });
        return;
      }

      parts = match(pathname, /^\/api\/drafts\/([^/]+)\/publish$/);
      if (parts && method === 'POST') {
        sendJson(res, 200, service.publishDraft(parts[0]));
        return;
      }

      if (method === 'GET' && pathname === '/api/update/status') {
        sendJson(res, 200, await getUpdateStatus());
        return;
      }

      if (method === 'POST' && pathname === '/api/update/config') {
        const body = await readBody(req);
        const repo = await configureRepo(body.repo);
        sendJson(res, 200, { repo, configured: true });
        return;
      }

      if (method === 'POST' && pathname === '/api/update/check') {
        sendJson(res, 200, await checkUpdate());
        return;
      }

      if (method === 'POST' && pathname === '/api/update/install') {
        sendJson(res, 202, { state: await installUpdate() });
        return;
      }

      if (method === 'GET' && pathname === '/api/settings') {
        sendJson(res, 200, service.settings());
        return;
      }

      if (method === 'PATCH' && pathname === '/api/settings') {
        const body = await readBody(req);
        sendJson(res, 200, service.updateSettings(body));
        return;
      }

      if (method === 'GET' && pathname === '/api/diagnostics') {
        sendJson(res, 200, service.diagnostics());
        return;
      }

      if (method === 'GET' && pathname === '/api/events') {
        streamEvents(req, res, url);
        return;
      }

      if (method === 'POST' && pathname === '/api/system/open-tool') {
        const body = await readBody(req);
        sendJson(res, 200, service.openTool(body.tool_id, body.inputs ?? null));
        return;
      }

      if (method === 'POST' && pathname === '/api/system/sync') {
        sendJson(res, 200, service.syncTools());
        return;
      }

      sendJson(res, 404, { error: { code: 'NOT_FOUND', message: '接口不存在' } });
      return;
    }

    if (method !== 'GET' && method !== 'HEAD') {
      sendJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: '只支持 GET' } });
      return;
    }
    serveStatic(req, res, pathname);
  } catch (error) {
    sendError(res, error);
  }
});

server.listen(PORT, HOST, () => {
  const stats = service.store.stats();
  console.log(`Novabox ready at http://${HOST}:${PORT}`);
  console.log(`Tools: ${stats.tools} published, ${stats.runs} runs, ${stats.drafts} drafts`);
  if (service.loadWarnings.length) console.warn('Tool warnings:', service.loadWarnings);
});

function shutdown(signal) {
  console.log(`\nNovabox stopping (${signal})`);
  server.close(() => {
    service.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 3000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
