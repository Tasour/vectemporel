#!/usr/bin/env node
/* Gate live : mesures DOM sur desktop et mobile, sans screenshot.
 * Vérifie cibles tactiles, collisions HUD, débordement, console et réseau. */
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = process.env.LIVE_PORT || '4185';
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}/index.html?type=area&value=Berry&pos=47.08,2.4,4.2&year=1000`;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const server = process.env.BASE_URL ? null : spawn(process.execPath, ['scripts/serve.mjs'], {
  cwd: ROOT,
  env: { ...process.env, PORT },
  stdio: 'ignore',
});

const waitForHttp = async () => {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return true;
    } catch { /* serveur pas encore prêt */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
};

let browser;
try {
  check('serveur live démarré', await waitForHttp());

  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--enable-webgl', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  const errors = [];
  const badResponses = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  async function measure(label, width, height, mobile) {
    await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 15000 }).catch(() => {});
    if (mobile) {
      await page.evaluate(() => document.getElementById('hud-card-close')?.click());
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const result = await page.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element || element.hidden || !element.getClientRects().length) return null;
        const r = element.getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height };
      };
      const overlaps = (a, b) => {
        if (!a || !b) return false;
        return a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
      };
      const interactive = [...document.querySelectorAll(
        'button, select, input, [role="button"], [role="radio"], [role="slider"]',
      )].filter((element) => element.getClientRects().length && !element.closest('[hidden]'));
      const tiny = interactive
        .map((element) => {
          const r = element.getBoundingClientRect();
          return { id: element.id, cls: String(element.className).slice(0, 32), w: r.width, h: r.height };
        })
        .filter((item) => item.w > 0 && item.h > 0 && (item.w < 44 || item.h < 44));

      const timeline = rect('#timeline');
      return {
        nodes: document.querySelectorAll('*').length,
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        brand: rect('.hud-brand'),
        actions: rect('.hud-actions'),
        card: rect('#hud-card'),
        timeline,
        readout: rect('#hud-readout'),
        nav: rect('.nav-controls'),
        collisions: {
          brandActions: overlaps(rect('.hud-brand'), rect('.hud-actions')),
          cardTimeline: overlaps(rect('#hud-card'), timeline),
          readoutTimeline: overlaps(rect('#hud-readout'), timeline),
          navTimeline: overlaps(rect('.nav-controls'), timeline),
        },
        tiny,
      };
    });

    check(`${label} : pas de débordement horizontal`, !result.overflowX);
    check(`${label} : titre et actions séparés`, !result.collisions.brandActions);
    check(`${label} : fiche hors timeline`, !result.collisions.cardTimeline);
    check(`${label} : readout hors timeline`, !result.collisions.readoutTimeline);
    if (result.nav) check(`${label} : navigation hors timeline`, !result.collisions.navTimeline);
    check(`${label} : cibles ≥ 44 px`, result.tiny.length === 0, result.tiny.map((item) => `${item.id || item.cls} ${Math.round(item.w)}x${Math.round(item.h)}`).slice(0, 5).join(', '));
    check(`${label} : HUD présent`, result.nodes > 100 && Boolean(result.timeline), `${result.nodes} nœuds`);
    return result;
  }

  await measure('desktop', 1440, 1000, false);
  await measure('mobile', 390, 844, true);

  check('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
  check('aucune réponse 4xx/5xx', badResponses.length === 0, badResponses.slice(0, 3).join(' | '));
} catch (error) {
  check('exécution du gate live', false, error.message);
} finally {
  if (browser) await browser.close();
  if (server && !server.killed) server.kill('SIGTERM');
}

console.log(failed ? `${failed} échec(s)` : 'Gate live OK.');
process.exit(failed ? 1 : 0);
