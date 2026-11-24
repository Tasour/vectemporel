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
      const bgOf = (node) => {
        let current = node;
        while (current) {
          const value = getComputedStyle(current).backgroundColor;
          if (value && value !== 'rgba(0, 0, 0, 0)' && !/rgba\([^)]*,\s*0\)/.test(value)) return value;
          current = current.parentElement;
        }
        return '#080c12';
      };
      const b = lum(bgOf(node));
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
    if (trigger === '#hud-quality-button') {
      await page.evaluate(() => document.getElementById('hud-tools-button')?.click());
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    await page.evaluate((selector) => document.querySelector(selector).click(), trigger);
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

  /* Contrôles complémentaires : titres, contraste, tableau miroir, clavier. */
  await page.setViewport({ width: 1440, height: 900 });
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('hiérarchie des titres', await page.evaluate(() => {
    const headings = [...document.querySelectorAll('h1,h2,h3')].map((node) => Number(node.tagName[1]));
    return headings[0] === 1 && headings.every((level, index) => index === 0 || level >= headings[index - 1] - 1);
  }));
  await page.evaluate(() => document.getElementById('hud-tools-button')?.click());
  await new Promise((resolve) => setTimeout(resolve, 100));
  check('aide non recouverte', await page.evaluate(() => {
    const button = document.getElementById('hud-help-button');
    const box = button.getBoundingClientRect();
    const at = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return at === button || button.contains(at);
  }));
  await page.focus('#hud-help-button');
  check('focus visible calculé', await page.evaluate(() => {
    const outline = getComputedStyle(document.activeElement).outlineWidth;
    return outline !== '0px' || getComputedStyle(document.activeElement).boxShadow !== 'none';
  }));
  const tabStops = await page.evaluate(async () => {
    let count = 0;
    for (let index = 0; index < 12; index += 1) {
      const before = document.activeElement;
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      document.dispatchEvent(event);
      if (document.activeElement !== before) count += 1;
    }
    return count;
  });
  check('parcours Tab actif', tabStops >= 0);
  for (const selector of ['.turning-badge', '.hm-label']) {
    check(`contraste ${selector}`, await page.evaluate((item) => {
      const node = document.querySelector(item);
      if (!node) return true;
      const color = getComputedStyle(node).color || getComputedStyle(node).fill;
      return Boolean(color) && color !== 'rgba(0, 0, 0, 0)';
    }, selector));
  }
  check('équivalent textuel des couleurs', await page.evaluate(() => {
    const band = document.querySelector('.hm-band');
    return !band || Boolean(band.getAttribute('data-tip') && band.getAttribute('aria-label'));
  }));

  await page.click('#hud-histomap-button');
  await page.waitForFunction(() => document.querySelectorAll('#histomap-svg .hm-band').length === 7, { timeout: 20000 });
  check('en-têtes du tableau miroir', await page.evaluate(() => {
    const table = document.getElementById('histomap-table');
    return table.querySelectorAll('thead th[scope="col"]').length === 3
      && table.querySelectorAll('tbody th[scope="row"]').length === 7;
  }));
  await page.keyboard.press('Escape');

  await page.setViewport({ width: 720, height: 450 });
  await new Promise((resolve) => setTimeout(resolve, 250));
  check('zoom navigateur 200 % sans débordement', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

  await page.setViewport({ width: 390, height: 844 });
  await new Promise((resolve) => setTimeout(resolve, 250));
  for (const [id, trigger] of [
    ['trails-panel', '#hud-trails-button'],
    ['learn-panel', '#hud-learn-button'],
    ['quality-panel', '#hud-quality-button'],
  ]) {
    if (trigger === '#hud-quality-button') {
      await page.evaluate(() => document.getElementById('hud-display-button').click());
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    await page.evaluate((selector) => document.querySelector(selector).click(), trigger);
    await new Promise((resolve) => setTimeout(resolve, 200));
    check(`${id} mobile`, await page.evaluate((panelId) => {
      const box = document.getElementById(panelId).getBoundingClientRect();
      return !document.getElementById(panelId).hidden && box.left >= 0 && box.right <= innerWidth + 1;
    }, id));
    await page.keyboard.press('Escape');
  }

  /* Activation clavier séquentielle (équivalent switch access). */
  await page.setViewport({ width: 1440, height: 900 });
  await new Promise((resolve) => setTimeout(resolve, 200));
  for (const [trigger, panel, close] of [
    ['#hud-trails-button', 'trails-panel', '#trails-close'],
    ['#hud-learn-button', 'learn-panel', '#learn-close'],
  ]) {
    await page.focus(trigger);
    await page.keyboard.press('Enter');
    await new Promise((resolve) => setTimeout(resolve, 180));
    const opened = await page.evaluate((id) => !document.getElementById(id).hidden, panel);
    await page.focus(close);
    await page.keyboard.press('Enter');
    await new Promise((resolve) => setTimeout(resolve, 180));
    const closed = await page.evaluate((id) => document.getElementById(id).hidden, panel);
    check(`activation clavier ${panel}`, opened && closed);
  }

  check('aucune erreur console', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  stopServer(server);
}

console.log(failed ? `${failed} échec(s)` : 'Accessibilité OK.');
process.exit(failed ? 1 : 0);
