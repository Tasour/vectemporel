#!/usr/bin/env node
/* Harnais runtime du serveur : whitelist, en-têtes, entrées malformées, survie.
 * Aucune regex sur le source : chaque contrat est vérifié contre un vrai serveur. */
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});

const waitReady = async (url) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      await response.arrayBuffer();
      return true;
    } catch { /* serveur pas encore prêt */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
};

const rawRequest = (port, pathValue, headers = {}) => new Promise((resolve, reject) => {
  const request = http.request({ host: '127.0.0.1', port, method: 'GET', path: pathValue, headers, timeout: 2000 }, (response) => {
    response.resume();
    response.on('end', () => resolve(response.statusCode));
  });
  request.on('error', reject);
  request.on('timeout', () => request.destroy(new Error('timeout')));
  request.end();
});

const port = await freePort();
const child = spawn(process.execPath, ['scripts/serve.mjs'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', (chunk) => { logs += chunk; });
child.stderr.on('data', (chunk) => { logs += chunk; });

try {
  const base = `http://127.0.0.1:${port}`;
  check('démarrage', await waitReady(`${base}/`), logs.trim().slice(0, 120));
  check('log annonce 127.0.0.1', logs.includes(`http://127.0.0.1:${port}`), logs.trim().slice(0, 120));
  check('log n annonce pas *:', !logs.includes('*:'), logs.trim().slice(0, 120));

  const allowed = ['/', '/index.html', '/styles.css', '/sw.js', '/manifest.webmanifest', '/src/app.js', '/src/map/projection.js', '/src/globe/globe.js', '/src/globe/lonlat.js', '/src/data/chronas-map.js', '/public/three.min.js', '/icons/icon-192.png'];
  for (const pathValue of allowed) {
    const response = await fetch(`${base}${pathValue}`, { signal: AbortSignal.timeout(2000) });
    check(`200 ${pathValue}`, response.status === 200, `HTTP ${response.status}`);
  }

  const denied = [
    '/.git/config', '/.git/HEAD', '/node_modules/.package-lock.json',
    '/scripts/verify.mjs', '/tests/e2e.mjs', '/README.md', '/package.json',
    '/archive/v0-atlas/README.md', '/docs/veille/2026-11-21-chronas-histography.md',
    '/src/../scripts/serve.mjs', '/src/%2e%2e/scripts/serve.mjs',
  ];
  for (const pathValue of denied) {
    const response = await fetch(`${base}${pathValue}`, { signal: AbortSignal.timeout(2000) });
    check(`403 ${pathValue}`, response.status === 403, `HTTP ${response.status}`);
  }

  const home = await fetch(`${base}/`, { signal: AbortSignal.timeout(2000) });
  const headers = Object.fromEntries(home.headers.entries());
  check('CSP', /default-src 'self'/.test(headers['content-security-policy'] || ''), headers['content-security-policy']);
  check('connect-src self', /connect-src 'self'/.test(headers['content-security-policy'] || ''), 'fetch local globe-palette');
  check('nosniff', headers['x-content-type-options'] === 'nosniff');
  check('X-Frame-Options', headers['x-frame-options'] === 'DENY');
  check('Referrer-Policy', headers['referrer-policy'] === 'no-referrer');
  check('Permissions-Policy', /camera=\(\)/.test(headers['permissions-policy'] || ''));

  check('400 /%', (await rawRequest(port, '/%')) === 400);
  check('400 /%ZZ', (await rawRequest(port, '/%ZZ')) === 400);
  check('400 Host invalide', (await rawRequest(port, '/', { host: '[' })) === 400);
  check('400 Host hostile', (await rawRequest(port, '/', { host: 'evil.example' })) === 400);

  const post = await fetch(`${base}/`, { method: 'POST', signal: AbortSignal.timeout(2000) });
  check('405 POST', post.status === 405, `HTTP ${post.status}`);
  const head = await fetch(`${base}/src/app.js`, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
  check('200 HEAD sans corps', head.status === 200 && (await head.text()) === '');

  check('service vivant après entrées malformées', child.exitCode === null && child.signalCode === null,
    `exitCode=${child.exitCode} signal=${child.signalCode}`);
  check('aucune erreur non capturée journalisée', !logs.includes('exception non capturée'), logs.slice(-200));
} finally {
  child.kill('SIGTERM');
}

console.log(failed ? `${failed} échec(s)` : 'Tous les contrôles HTTP passent.');
process.exit(failed ? 1 : 0);
