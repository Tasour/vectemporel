#!/usr/bin/env node
/* Pont devtools Three.js injecté avant chargement, sans assouplir la CSP.
 * Le serveur MCP n'est pas nécessaire : connect:false donne l'API in-page. */
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { attachDevtools, waitForScene, threeCall } from 'threejs-devtools-mcp/playwright';

const PORT = '4182';
const BASE = `http://127.0.0.1:${PORT}/index.html`;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const server = spawn('node', ['scripts/serve.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stderr.on('data', (c) => { serverLog += c.toString(); });
server.stdout.on('data', (c) => { serverLog += c.toString(); });

const waitForHttp = async (timeoutMs = 15000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(BASE, { signal: AbortSignal.timeout(1000) });
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};

let browser;
try {
  check('service local démarré', await waitForHttp(), serverLog.slice(-200));

  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--enable-webgl', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await attachDevtools(page, { connect: false, overlay: false });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, { timeout: 20000 });

  const ready = await page.evaluate(() => !!window.__THREEJS_DEVTOOLS_READY__);
  check('pont injecté avant chargement', ready);

  const tree = await threeCall(page, 'scene_tree', {});
  const text = typeof tree === 'string' ? tree : JSON.stringify(tree);
  check('arbre de scène lisible', /Scene/.test(text) && text.length > 40, `${text.split('\n').length} lignes`);

  const stats = await threeCall(page, 'draw_call_breakdown', {});
  const summary = stats?.summary || stats?.result?.summary || {};
  const objects = Number(summary.totalObjects || 0);
  const triangles = Number(summary.totalTriangles || 0);
  check('métriques de rendu disponibles', objects > 0 && triangles > 0, `${objects} objets, ${triangles} triangles`);

  const cam = await threeCall(page, 'camera_details', {});
  check('caméra inspectable', !!(cam && (cam.position || cam.result?.position)));
} catch (e) {
  check('exécution du pont', false, e.message);
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}

console.log(failed === 0 ? 'Pont devtools vérifié.' : `${failed} contrôle(s) en échec.`);
process.exit(failed === 0 ? 0 : 1);
