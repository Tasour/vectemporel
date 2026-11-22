#!/usr/bin/env node
/* Serveur statique local — EXCLUSIVEMENT 127.0.0.1, whitelist de chemins.
 * Contrats : aucun réseau externe, aucune donnée du dépôt hors public/, src/,
 * index.html et styles.css. Toute entrée inattendue est refusée (isError). */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const REAL_ROOT = fs.realpathSync(ROOT);
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 4181);
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const ALLOWED_FILES = new Set(['index.html', 'styles.css', 'sw.js', 'manifest.webmanifest']);
const ALLOWED_PREFIXES = ['public/', 'src/', 'icons/'];

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(JSON.stringify({ isError: true, cause: 'PORT invalide', port: process.env.PORT }));
  process.exit(1);
}

const TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
});

const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; worker-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cache-Control': 'no-cache',
});

/* Uniquement pour le proxy local du MCP devtools : le pont injecte un script
 * inline et ouvre un WebSocket sur 9222. La CSP de production reste stricte. */
const DEVTOOLS_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://localhost:9222 ws://127.0.0.1:9222; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; worker-src 'self'";

function isInside(root, candidate) {
  const rel = path.relative(root, candidate);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function isAllowed(rel) {
  if (rel.includes('\0') || rel.includes('..')) return false;
  if (ALLOWED_FILES.has(rel)) return true;
  return ALLOWED_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

const gzipCache = new Map();
const COMPRESSIBLE = /\.(js|css|html|json|svg|csv|md)$/i;

function send(response, status, body = '', type = 'text/plain; charset=utf-8', extra = {}) {
  const csp = response.devtoolsCsp
    ? { 'Content-Security-Policy': DEVTOOLS_CSP }
    : {};
  response.writeHead(status, { 'Content-Type': type, ...SECURITY_HEADERS, ...csp, ...extra });
  response.end(body);
}

function encoded(request, file, data, cacheKey) {
  if (!/\bgzip\b/.test(request.headers['accept-encoding'] || '') || !COMPRESSIBLE.test(file)) {
    return { data, extra: {} };
  }
  let compressed = gzipCache.get(cacheKey);
  if (!compressed) {
    compressed = zlib.gzipSync(data, { level: 9 });
    if (gzipCache.size >= 64) gzipCache.clear();
    gzipCache.set(cacheKey, compressed);
  }
  return { data: compressed, extra: { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' } };
}

function fail(status, message) {
  return (response) => send(response, status, message);
}

const handler = (request, response) => {
  response.devtoolsCsp = String(request.url || '').includes('devtools=1');
  let rel = '';
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      fail(405, 'Method Not Allowed')(response);
      return;
    }
    const host = request.headers.host;
    if (host !== undefined && !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) {
      fail(400, 'Bad Request')(response);
      return;
    }
    // Base d'URL fixe : le Host fourni par le client n'est jamais une entrée.
    const url = new URL(request.url || '/', 'http://localhost');
    const raw = url.pathname === '/' ? '/index.html' : url.pathname;
    const pathname = decodeURIComponent(raw);
    if (typeof pathname !== 'string' || pathname.includes('\0')) {
      fail(400, 'Bad Request')(response);
      return;
    }
    rel = path.normalize(pathname.replace(/^\/+/, ''));
    if (!isAllowed(rel)) {
      fail(403, 'Forbidden')(response);
      return;
    }
    const file = path.join(ROOT, rel);
    if (!isInside(ROOT, file)) {
      fail(403, 'Forbidden')(response);
      return;
    }
    fs.realpath(file, (realError, real) => {
      if (realError || !isInside(REAL_ROOT, real)) {
        fail(realError ? 404 : 403, realError ? 'Not found' : 'Forbidden')(response);
        return;
      }
      fs.stat(real, (statError, stats) => {
        if (statError || !stats.isFile()) {
          fail(404, 'Not found')(response);
          return;
        }
        if (stats.size > MAX_FILE_BYTES) {
          fail(413, 'Payload Too Large')(response);
          return;
        }
        if (request.method === 'HEAD') {
          send(response, 200, '', TYPES[path.extname(real).toLowerCase()] || 'application/octet-stream');
          return;
        }
        fs.readFile(real, (readError, data) => {
          if (readError) {
            fail(404, 'Not found')(response);
            return;
          }
          const { data: payload, extra } = encoded(request, real, data, `${real}:${stats.mtimeMs}`);
          send(response, 200, payload, TYPES[path.extname(real).toLowerCase()] || 'application/octet-stream', extra);
        });
      });
    });
  } catch (error) {
    // Entrée malformée (URI, Host, chemin) : 400. Aucune erreur avalée sans log.
    console.error(JSON.stringify({ isError: true, cause: 'requête refusée', reason: error.message, rel }));
    if (!response.headersSent) fail(400, 'Bad Request')(response);
    else response.end();
  }
};

const server = http.createServer(handler);
server.requestTimeout = 10_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
server.on('clientError', (_error, socket) => socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'));

process.on('uncaughtException', (error) => {
  console.error(JSON.stringify({ isError: true, cause: 'exception non capturée', reason: error.message }));
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error(JSON.stringify({ isError: true, cause: 'promise rejetée', reason: String(reason) }));
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Vectemporel — Atlas sur http://${HOST}:${PORT} (whitelist active)`);
});
