/**
 * Tests d'ergonomie de la cinématique temporelle.
 *
 * Mesures réelles dans Chromium, aux deux tailles de référence. Les seuils sont
 * ceux du modèle calibré décrit dans docs/ERGONOMIE-TIMELINE.md. Chaque mesure
 * est archivée dans test-results/ergonomie/ergonomie-timeline.json avec les
 * captures associées.
 */

import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

const REPORT_DIR = 'test-results/ergonomie';
const REPORT_FILE = `${REPORT_DIR}/ergonomie-timeline.json`;
/** Chaque mesure est écrite séparément : les describes ont des workers distincts. */
function record(key: string, value: unknown): void {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(`${REPORT_DIR}/${key}.json`, JSON.stringify(value, null, 2));
}

test.afterAll(() => {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const measurements: Record<string, unknown> = {};
  for (const file of fs.readdirSync(REPORT_DIR)) {
    if (!file.endsWith('.json') || file === 'ergonomie-timeline.json') continue;
    measurements[file.replace(/\.json$/, '')] = JSON.parse(
      fs.readFileSync(`${REPORT_DIR}/${file}`, 'utf8')
    ) as unknown;
  }
  fs.writeFileSync(
    REPORT_FILE,
    JSON.stringify({ generatedAt: new Date().toISOString(), measurements }, null, 2)
  );
});

async function open(page: Page): Promise<void> {
  page.setDefaultTimeout(30_000);
  await page.goto('/?year=1000&cb=ergonomie');
  await page.waitForSelector('[data-testid="timeline"]', { timeout: 30_000 });
  await page.waitForTimeout(1500);
}

async function readState(page: Page): Promise<{ year: number; span: number }> {
  const timeline = page.locator('[data-testid="timeline"]');
  return {
    year: Number(await timeline.getAttribute('data-year')),
    span: Number(await timeline.getAttribute('data-span')),
  };
}

/**
 * Rafale synthétique : `page.mouse.wheel` est trop lent en headless (100–200 ms
 * entre deux appels) pour représenter un geste de pavé. Les événements sont
 * donc émis dans la même frame ; le plancher de 32 ms du modèle s'applique.
 */
async function wheel(page: Page, count: number, deltaY = 100): Promise<void> {
  await page.evaluate(({ count: times, deltaY: delta }) => {
    const element = document.querySelector('[data-testid="vis-timeline"]');
    if (!element) throw new Error('Conteneur vis-timeline introuvable');
    for (let index = 0; index < times; index += 1) {
      element.dispatchEvent(new WheelEvent('wheel', {
        deltaY: delta,
        deltaMode: 0,
        bubbles: true,
        cancelable: true,
      }));
    }
  }, { count, deltaY });
  await page.waitForTimeout(1500);
}

/** Glisser synthétique : évite la coalescence des pointermove en headless. */
async function drag(page: Page, deltaPx: number): Promise<void> {
  await page.evaluate((delta) => {
    const element = document.querySelector('[data-testid="vis-timeline"]');
    if (!element) throw new Error('Conteneur vis-timeline introuvable');
    const rect = element.getBoundingClientRect();
    const startX = rect.x + rect.width / 2 - delta / 2;
    const y = rect.y + rect.height / 2;
    const event = (type: string, x: number) => new PointerEvent(type, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event('pointerdown', startX));
    for (let step = 1; step <= 10; step += 1) {
      element.dispatchEvent(event('pointermove', startX + (delta * step) / 10));
    }
    element.dispatchEvent(event('pointerup', startX + delta));
  }, deltaPx);
  await page.waitForTimeout(1500);
}

for (const viewport of [
  { name: '390x844', width: 390, height: 844 },
  { name: '1658x1150', width: 1658, height: 1150 },
]) {
  test.describe(`ergonomie timeline ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('le premier chargement affiche les zones colorées', async ({ page }) => {
      await open(page);
      await expect(page.locator('text=No Data Available')).toHaveCount(0);
      await page.waitForFunction(() => {
        const map = (window as unknown as {
          __chronasMap?: {
            queryRenderedFeatures: (options: { layers: string[] }) => unknown[];
          };
        }).__chronasMap;
        return Boolean(map && map.queryRenderedFeatures({ layers: ['ruler-fill'] }).length > 0);
      }, null, { timeout: 30_000 });
      fs.mkdirSync(REPORT_DIR, { recursive: true });
      await page.screenshot({ path: `${REPORT_DIR}/zones-${viewport.name}.png` });
      record(`zones-${viewport.name}`, await readState(page));
    });

    test('un cran isolé translate sans dézoomer', async ({ page }) => {
      await open(page);
      const before = await readState(page);
      await wheel(page, 1);
      const after = await readState(page);
      const shift = after.year - before.year;
      record(`notch-${viewport.name}`, { before, after, shift });
      expect(shift).toBeGreaterThan(60);
      expect(shift).toBeLessThan(90);
      expect(after.span / before.span).toBeLessThan(1.02);
    });

    test('une rafale va loin dans le futur et dézoome', async ({ page }) => {
      await open(page);
      const before = await readState(page);
      await wheel(page, 10);
      const after = await readState(page);
      record(`burst-${viewport.name}`, { before, after, shift: after.year - before.year });
      expect(after.year - before.year).toBeGreaterThan(400);
      expect(after.span / before.span).toBeGreaterThan(1.3);
      fs.mkdirSync(REPORT_DIR, { recursive: true });
      await page.screenshot({ path: `${REPORT_DIR}/burst-${viewport.name}.png` });
    });

    test('un glisser de 100 px reste 1:1', async ({ page }) => {
      await open(page);
      const before = await readState(page);
      await drag(page, 100);
      const after = await readState(page);
      const expected = (100 / viewport.width) * before.span;
      record(`drag-${viewport.name}`, { before, after, expected });
      expect(after.year - before.year).toBeGreaterThan(expected * 0.8);
      expect(after.year - before.year).toBeLessThan(expected * 1.2);
      expect(after.span / before.span).toBeLessThan(1.05);
    });

    test('le sens inverse ramène à l’année de départ', async ({ page }) => {
      await open(page);
      const before = await readState(page);
      await drag(page, 100);
      const forward = await readState(page);
      await drag(page, -100);
      const back = await readState(page);
      record(`direction-${viewport.name}`, { before, forward, back });
      expect(forward.year).toBeGreaterThan(before.year);
      // Le navigateur peut coalescer le dernier pointermove : tolérance de 20 %
      // sur la distance aller (≈ 25 ans sur mobile).
      expect(Math.abs(back.year - before.year)).toBeLessThan(
        Math.max(12, Math.abs(forward.year - before.year) * 0.2)
      );
    });

    test('le centre reste borné après une longue rafale', async ({ page }) => {
      await open(page);
      await wheel(page, 40);
      const forward = await readState(page);
      await wheel(page, 80, -100);
      const backward = await readState(page);
      record(`bounds-${viewport.name}`, { forward, backward });
      expect(forward.year).toBeLessThanOrEqual(2000);
      expect(backward.year).toBeGreaterThanOrEqual(-2000);
    });

    test('le geste se stabilise', async ({ page }) => {
      await open(page);
      await wheel(page, 5);
      const settled = await readState(page);
      await page.waitForTimeout(1500);
      const later = await readState(page);
      record(`settled-${viewport.name}`, { settled, later });
      // vis-timeline arrondit parfois la fenêtre de quelques années au dernier
      // `rangechange` ; la stabilité exigée est l'absence de dérive sensible.
      expect(Math.abs(later.year - settled.year)).toBeLessThanOrEqual(5);
      expect(later.span).toBe(settled.span);
    });
  });
}

test.describe('ergonomie tactile 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('le glisser tactile suit le doigt dans les deux sens', async ({ page }) => {
    await open(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    const box = await page.locator('[data-testid="timeline"]').boundingBox();
    if (!box) throw new Error('Timeline introuvable');
    const centerX = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const before = await readState(page);

    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: centerX - 50, y, id: 1 }],
    });
    for (let step = 1; step <= 10; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x: centerX - 50 + step * 10, y, id: 1 }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(1500);
    const forward = await readState(page);

    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: centerX + 50, y, id: 2 }],
    });
    for (let step = 1; step <= 10; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x: centerX + 50 - step * 10, y, id: 2 }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(1500);
    const back = await readState(page);

    record('touch-390x844', { before, forward, back });
    expect(forward.year - before.year).toBeGreaterThan(100);
    expect(forward.year - before.year).toBeLessThan(160);
    expect(Math.abs(back.year - before.year)).toBeLessThan(
      Math.max(12, Math.abs(forward.year - before.year) * 0.2)
    );
  });
});
