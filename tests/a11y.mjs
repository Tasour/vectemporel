#!/usr/bin/env node
/* Audit d'accessibilité DOM : noms, rôles, titres, contraste et panneaux. */
import puppeteer from 'puppeteer-core';
import { startServer, waitForHttp, stopServer } from './lib/server.mjs';

const PORT = process.env.A11Y_PORT || '4195';
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}/index.html`;
const server = startServer(PORT);
let failed = 0;
const errors = [];
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

check('serveur a11y démarré', await waitForHttp(BASE));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--enable-webgl', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 20000 });
  await new Promise((resolve) => setTimeout(resolve, 600));

  const base = await page.evaluate(() => {
    const name = (node) => (node.getAttribute('aria-label') || node.textContent || '').trim();
    const visible = (node) => !!node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
    const buttons = [...document.querySelectorAll('button')].filter(visible);
    const inputs = [...document.querySelectorAll('input, select')].filter(visible);
    const dialogs = [...document.querySelectorAll('[role="dialog"]')];
    return {
      h1: document.querySelectorAll('h1').length,
      canvas: (() => {
        const canvas = document.getElementById('globe-canvas');
        return canvas.getAttribute('role') === 'img' && (canvas.getAttribute('aria-label') || '').length > 40;
      })(),
      unnamedButtons: buttons.filter((button) => name(button).length === 0).map((button) => button.id || button.className),
      unnamedInputs: inputs.filter((input) => !input.getAttribute('aria-label')).map((input) => input.id || input.type),
      unnamedDialogs: dialogs.filter((dialog) => !dialog.getAttribute('aria-label')).map((dialog) => dialog.id),
      live: document.querySelectorAll('[role="status"][aria-live="polite"]').length,
      focusCss: [...document.styleSheets].some((sheet) => {
        try { return [...sheet.cssRules].some((rule) => /:focus-visible/.test(rule.cssText)); } catch { return false; }
      }),
    };
  });
  check('un seul h1', base.h1 === 1, `${base.h1}`);
  check('canvas nommé', base.canvas);
  check('boutons nommés', base.unnamedButtons.length === 0, base.unnamedButtons.join(','));
  check('champs nommés', base.unnamedInputs.length === 0, base.unnamedInputs.join(','));
  check('dialogues nommés', base.unnamedDialogs.length === 0, base.unnamedDialogs.join(','));
  check('régions live présentes', base.live >= 3, `${base.live}`);
  check('focus visible déclaré', base.focusCss);

  const contrast = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const lum = (color) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      const convert = (v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
    };
    const samples = ['.hud-brand strong', '.timeline-year', '.century-btn', '.hm-btn', '.learn-option'];
    const out = [];
    for (const selector of samples) {
      const node = document.querySelector(selector);
      if (!node) continue;
      const style = getComputedStyle(node);
      const a = lum(style.color);
      const b = lum(style.backgroundColor === 'rgba(0, 0, 0, 0)' ? '#080c12' : style.backgroundColor);
      out.push({ selector, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) });
    }
    return out;
  });
  for (const sample of contrast) {
    check(`contraste ${sample.selector}`, sample.ratio >= 4.5, sample.ratio.toFixed(2));
  }

  for (const [id, trigger] of [
    ['trails-panel', '#hud-trails-button'],
    ['learn-panel', '#hud-learn-button'],
    ['quality-panel', '#hud-quality-button'],
  ]) {
    await page.click(trigger);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const state = await page.evaluate((panelId) => {
      const panel = document.getElementById(panelId);
      return {
        open: !panel.hidden,
        label: Boolean(panel.getAttribute('aria-label')),
        heading: Boolean(panel.querySelector('h2')),
        closeNamed: Boolean(panel.querySelector('.hm-close, .hud-close')?.getAttribute('aria-label')),
      };
    }, id);
    check(`${id} accessible`, state.open && state.label && state.heading && state.closeNamed, JSON.stringify(state));
    await page.keyboard.press('Escape');
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  for (const [width, height] of [[320, 700], [768, 1024]]) {
    await page.setViewport({ width, height });
    await new Promise((resolve) => setTimeout(resolve, 250));
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      timeline: document.querySelector('.timeline').getBoundingClientRect().height,
    }));
    check(`viewport ${width} px sans débordement`, layout.overflow <= 1, `${layout.overflow} px`);
    check(`viewport ${width} px frise compacte`, layout.timeline <= 280, `${Math.round(layout.timeline)} px`);
  }

  check('aucune erreur console', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  stopServer(server);
}

console.log(failed ? `${failed} échec(s)` : 'Accessibilité OK.');
process.exit(failed ? 1 : 0);
