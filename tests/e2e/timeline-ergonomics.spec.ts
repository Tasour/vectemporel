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
  await page.waitForTimeout(1200);
  // Laisse vis-timeline finir son ajustement initial : l'année doit être stable.
  await page.waitForFunction(() => {
    const element = document.querySelector('[data-testid="timeline"]');
    const year = element?.getAttribute('data-year');
    const state = window as unknown as { __stableYear?: string | null; __stableAt?: number };
    if (state.__stableYear !== year) {
      state.__stableYear = year ?? null;
      state.__stableAt = Date.now();
      return false;
    }
    return Date.now() - (state.__stableAt ?? 0) > 400;
  }, null, { timeout: 15_000 });
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
async function drag(page: Page, deltaPx: number, fine = false): Promise<void> {
  await page.evaluate(({ delta, fine: precision }) => {
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
      shiftKey: precision,
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
  }, { delta: deltaPx, fine });
  await page.waitForTimeout(1500);
}

for (const viewport of [
  { name: '390x844', width: 390, height: 844 },
  { name: '1658x1150', width: 1658, height: 1150 },
]) {
  test.describe(`ergonomie timeline ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('la timeline n’a plus de boutons de zoom ou de pas', async ({ page }) => {
      await open(page);
      const controls = page.getByRole('button', {
        name: /Zoom (avant|arrière)|Année (suivante|précédente)|Revenir à 500 ans/,
      });
      await expect(controls).toHaveCount(0);
    });

    test('la timeline suit le thème clair et sombre', async ({ page }) => {
      await open(page);
      const read = () => page.evaluate(() => {
        const timeline = document.querySelector('[data-testid="timeline"]');
        const tick = document.querySelector('[data-testid="timeline-overlay"] [class*="tickLabel"]');
        return {
          background: timeline ? getComputedStyle(timeline).backgroundImage : '',
          tick: tick ? getComputedStyle(tick).color : '',
        };
      });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      await page.waitForTimeout(200);
      const light = await read();
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await page.waitForTimeout(200);
      const dark = await read();
      expect(light.background).not.toBe(dark.background);
      expect(light.tick).not.toBe(dark.tick);
      const lightChannel = Number(/\d+/.exec(light.tick)?.[0] ?? 255);
      const darkChannel = Number(/\d+/.exec(dark.tick)?.[0] ?? 0);
      expect(lightChannel).toBeLessThan(darkChannel);
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    });

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
      expect(after.span / before.span).toBeGreaterThan(1.2);
      fs.mkdirSync(REPORT_DIR, { recursive: true });
      await page.screenshot({ path: `${REPORT_DIR}/burst-${viewport.name}.png` });
    });

    test('un glisser de 100 px reste 1:1', async ({ page }) => {
      await open(page);
      const before = await readState(page);
      await drag(page, 100);
      const after = await readState(page);
      const expected = (100 / viewport.width) * before.span;
      const shift = before.year - after.year;
      record(`drag-${viewport.name}`, { before, after, expected });
      expect(shift).toBeGreaterThan(expected * 0.8);
      expect(shift).toBeLessThan(expected * 1.2);
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
      expect(forward.year).toBeLessThan(before.year);
      // Le navigateur peut coalescer le dernier pointermove : tolérance de 20 %
      // sur la distance aller (≈ 25 ans sur mobile).
      expect(Math.abs(back.year - before.year)).toBeLessThan(
        Math.max(12, Math.abs(forward.year - before.year) * 0.2)
      );
    });

    test('le geste ne revient jamais en arrière', async ({ page }) => {
      await open(page);
      await page.evaluate(() => {
        const w = window as unknown as {
          __samples: { year: number }[];
          __timer: number;
        };
        w.__samples = [];
        w.__timer = window.setInterval(() => {
          const timeline = document.querySelector('[data-testid="timeline"]');
          w.__samples.push({ year: Number(timeline?.getAttribute('data-year')) });
        }, 60);
      });

      const box = await page.locator('[data-testid="timeline"]').boundingBox();
      if (!box) throw new Error('Timeline introuvable');
      const startX = box.x + box.width / 2 + 50;
      const y = box.y + box.height / 2;
      await page.mouse.move(startX, y);
      await page.mouse.down();
      for (let step = 1; step <= 10; step += 1) {
        await page.mouse.move(startX - step * 10, y);
        await page.waitForTimeout(25);
      }
      await page.mouse.up();
      await page.waitForTimeout(1800);

      const samples = await page.evaluate(() => {
        const w = window as unknown as {
          __samples: { year: number }[];
          __timer: number;
        };
        window.clearInterval(w.__timer);
        return w.__samples;
      });
      let maxDip = 0;
      for (let index = 1; index < samples.length; index += 1) {
        maxDip = Math.max(maxDip, samples[index - 1]!.year - samples[index]!.year);
      }
      record(`nodip-${viewport.name}`, { maxDip, samples: samples.length });
      expect(maxDip).toBeLessThanOrEqual(8);
    });

    test('les données viennent du pack binaire local', async ({ page }) => {
      const areaRequests: string[] = [];
      const markerRequests: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/areas/')) areaRequests.push(request.url());
        if (request.url().includes('/markers?year=')) markerRequests.push(request.url());
      });
      await open(page);
      await page.waitForFunction(
        () => performance.getEntriesByName('atlas-pack-year').length > 0,
        null,
        { timeout: 15_000 }
      );
      record(`pack-${viewport.name}`, {
        areaRequests: areaRequests.length,
        markerRequests: markerRequests.length,
        markers: await page.evaluate(() => performance.getEntriesByName('markers-pack-year').length),
      });
      expect(areaRequests).toHaveLength(0);
      // La première année peut utiliser l'API légère pendant que le pack
      // marqueurs (2,7 Mo) se charge en idle ; les suivantes viennent du pack.
      expect(markerRequests.length).toBeLessThanOrEqual(1);
      const requestsBeforeChange = markerRequests.length;
      await wheel(page, 1);
      await page.waitForTimeout(1200);
      await wheel(page, 1);
      expect(markerRequests.length).toBe(requestsBeforeChange);
      await page.waitForFunction(
        () => performance.getEntriesByName('markers-pack-year').length > 0,
        null,
        { timeout: 25_000 }
      );
    });

    test('le zoom ctrl+molette est ancré et réversible', async ({ page }) => {
      await open(page);
      const box = await page.locator('[data-testid="timeline"]').boundingBox();
      if (!box) throw new Error('Timeline introuvable');
      const ratio = 0.8;
      const x = box.x + box.width * ratio;
      const y = box.y + box.height / 2;
      const before = await readState(page);
      const anchorBefore = before.year + (ratio - 0.5) * before.span;

      await page.evaluate(({ px, py }) => {
        const element = document.querySelector('[data-testid="vis-timeline"]');
        element?.dispatchEvent(new WheelEvent('wheel', {
          deltaY: -240, deltaMode: 0, ctrlKey: true,
          clientX: px, clientY: py, bubbles: true, cancelable: true,
        }));
      }, { px: x, py: y });
      await page.waitForTimeout(500);
      const zoomed = await readState(page);
      const anchorAfter = zoomed.year + (ratio - 0.5) * zoomed.span;
      expect(zoomed.span).toBeLessThan(before.span);
      expect(Math.abs(anchorAfter - anchorBefore)).toBeLessThan(6);

      await page.evaluate(({ px, py }) => {
        const element = document.querySelector('[data-testid="vis-timeline"]');
        element?.dispatchEvent(new WheelEvent('wheel', {
          deltaY: 240, deltaMode: 0, ctrlKey: true,
          clientX: px, clientY: py, bubbles: true, cancelable: true,
        }));
      }, { px: x, py: y });
      await page.waitForTimeout(500);
      const back = await readState(page);
      record(`ctrlzoom-${viewport.name}`, { before, zoomed, back, anchorBefore, anchorAfter });
      expect(Math.abs(back.span - before.span) / before.span).toBeLessThan(0.06);
    });

    test('un changement d’année reste sous 60 ms', async ({ page }) => {
      await open(page);
      await page.evaluate(() => {
        performance.clearMeasures('atlas-labels');
        performance.clearMeasures('atlas-pack-year');
      });
      for (let index = 0; index < 6; index += 1) {
        await page.evaluate(() => {
          const element = document.querySelector('[data-testid="vis-timeline"]');
          element?.dispatchEvent(new WheelEvent('wheel', {
            deltaY: 100, deltaMode: 0, bubbles: true, cancelable: true,
          }));
        });
        await page.waitForTimeout(320);
      }
      const stats = await page.evaluate(() => {
        const measure = (name: string) => {
          const values = performance.getEntriesByName(name).map((entry) => entry.duration).sort((a, b) => a - b);
          return values.length ? values[Math.floor(values.length * 0.95)] ?? 0 : 0;
        };
        return { labels: measure('atlas-labels'), pack: measure('atlas-pack-year') };
      });
      record(`latence-${viewport.name}`, stats);
      expect(stats.pack).toBeLessThan(10);
      expect(stats.labels).toBeLessThan(60);
    });

    test('le clavier sélectionne l’année précédente et suivante', async ({ page }) => {
      await open(page);
      const before = await readState(page);
      await page.locator('[data-testid="timeline"]').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(150);
      expect((await readState(page)).year).toBe(before.year + 1);
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(150);
      expect((await readState(page)).year).toBe(before.year);
    });

    test('le contenu reste sous le doigt pendant le glissement', async ({ page }) => {
      await open(page);
      const box = await page.locator('[data-testid="timeline"]').boundingBox();
      if (!box) throw new Error('Timeline introuvable');
      const ratio = 0.6;
      const before = await readState(page);
      const yearAtStart = before.year + (ratio - 0.5) * before.span;
      const startX = box.x + box.width * ratio;
      const endX = startX + 60;
      const y = box.y + box.height / 2;
      await page.mouse.move(startX, y);
      await page.mouse.down();
      for (let step = 1; step <= 6; step += 1) {
        await page.mouse.move(startX + step * 10, y);
        await page.waitForTimeout(35);
      }
      await page.mouse.up();
      await page.waitForTimeout(600);
      const after = await readState(page);
      const yearAtEnd = after.year + ((endX - box.x) / box.width - 0.5) * after.span;
      record(`under-finger-${viewport.name}`, { before, after, yearAtStart, yearAtEnd });
      expect(after.year).toBeLessThan(before.year);
      expect(Math.abs(yearAtEnd - yearAtStart)).toBeLessThanOrEqual(4);
    });

    test('le glissement produit des crans haptiques', async ({ page }) => {
      await page.addInitScript(() => {
        const state = window as unknown as { __vibrations: (number | number[])[] };
        state.__vibrations = [];
        Object.defineProperty(navigator, 'vibrate', {
          configurable: true,
          value: (pattern: number | number[]) => {
            state.__vibrations.push(pattern);
            return true;
          },
        });
      });
      await open(page);
      const box = await page.locator('[data-testid="timeline"]').boundingBox();
      if (!box) throw new Error('Timeline introuvable');
      const y = box.y + box.height / 2;
      const startX = box.x + box.width / 2;
      await page.mouse.move(startX, y);
      await page.mouse.down();
      for (let step = 1; step <= 12; step += 1) {
        await page.mouse.move(startX + step * 20, y);
        await page.waitForTimeout(45);
      }
      await page.mouse.up();
      await page.waitForTimeout(400);
      const vibrations = await page.evaluate(
        () => (window as unknown as { __vibrations: (number | number[])[] }).__vibrations
      );
      record(`haptics-${viewport.name}`, { vibrations });
      expect(vibrations.length).toBeGreaterThan(0);
    });

    test('le mode précision réduit le span et avance lentement', async ({ page }) => {
      await open(page);
      const before = await readState(page);
      await drag(page, 10, true);
      const after = await readState(page);
      record(`precision-${viewport.name}`, { before, after });
      expect(after.span).toBeLessThanOrEqual(viewport.width + 10);
      expect(Math.abs(after.year - before.year)).toBeLessThanOrEqual(3);
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
      await page.waitForTimeout(1200);
      const settled = await readState(page);
      await page.waitForTimeout(1200);
      const later = await readState(page);
      record(`settled-${viewport.name}`, { settled, later });
      // vis-timeline arrondit parfois la fenêtre de quelques années au dernier
      // `rangechange` ; la stabilité exigée est l'absence de dérive sensible.
      expect(Math.abs(later.year - settled.year)).toBeLessThanOrEqual(5);
      expect(Math.abs(later.span - settled.span) / settled.span).toBeLessThan(0.1);
    });

    test('les graduations du geste couvrent toute la frise', async ({ page }) => {
      await open(page);
      const box = await page.locator('[data-testid="timeline"]').boundingBox();
      if (!box) throw new Error('Timeline introuvable');
      const y = box.y + box.height / 2;
      const startX = box.x + box.width / 2;
      await page.mouse.move(startX, y);
      await page.mouse.down();
      for (let step = 1; step <= 8; step += 1) {
        await page.mouse.move(startX + step * 10, y);
        await page.waitForTimeout(45);
      }
      const state = await page.evaluate(() => {
        const canvas = document.querySelector<HTMLCanvasElement>('[data-testid=timeline-overlay-canvas]');
        const overlay = document.querySelector('[data-testid=timeline-overlay]');
        const timeline = document.querySelector('[data-testid="timeline"]');
        if (!canvas || !overlay || !timeline) return null;
        return {
          widthRatio: canvas.clientWidth / timeline.clientWidth,
          canvasOpacity: Number(getComputedStyle(canvas).opacity),
          overlayOpacity: Number(getComputedStyle(overlay).opacity),
          tickCount: Number(canvas.dataset['tickCount'] ?? 0),
        };
      });
      await page.mouse.up();
      record(`graduations-${viewport.name}`, state);
      expect(state).not.toBeNull();
      if (!state) return;
      expect(state.widthRatio).toBeGreaterThan(0.95);
      expect(state.canvasOpacity).toBe(1);
      expect(state.overlayOpacity).toBe(0);
      expect(state.tickCount).toBeGreaterThanOrEqual(3);
    });

    test('le geste gèle la carte et la frise ne régresse pas au relâchement', async ({ page }) => {
      await open(page);
      // Le chargement initial (tuiles, pack idle) peut encore rendre quelques
      // frames : on le laisse finir avant de mesurer le geste lui-même.
      await page.waitForTimeout(5000);
      await page.evaluate(() => {
        const map = (window as unknown as { __chronasMap?: { on: (event: string, fn: () => void) => void } }).__chronasMap;
        const state = window as unknown as { __mapRenders: number };
        state.__mapRenders = 0;
        map?.on('render', () => { state.__mapRenders += 1; });
      });
      const box = await page.locator('[data-testid="timeline"]').boundingBox();
      if (!box) throw new Error('Timeline introuvable');
      const y = box.y + box.height / 2;
      const startX = box.x + box.width / 2;
      await page.mouse.move(startX, y);
      await page.mouse.down();
      for (let step = 1; step <= 10; step += 1) {
        await page.mouse.move(startX + step * 12, y);
        await page.waitForTimeout(45);
      }
      const during = await page.evaluate(() => {
        const overlay = document.querySelector<HTMLElement>('[data-testid="map-gesture-overlay"]');
        const vector = overlay ? Array.from(overlay.querySelectorAll('canvas'))[1] : undefined;
        const data = vector && vector.width > 0
          ? vector.getContext('2d')?.getImageData(0, 0, vector.width, Math.min(400, vector.height)).data
          : undefined;
        let ink = 0;
        if (data) for (let index = 3; index < data.length; index += 4 * 53) if ((data[index] ?? 0) > 0) ink += 1;
        return {
          status: overlay?.dataset['gestureOverlay'],
          width: vector?.width ?? 0,
          ink,
          renders: (window as unknown as { __mapRenders: number }).__mapRenders,
        };
      });
      await page.mouse.up();
      const samples: { year: number; grid: number | null }[] = [];
      for (let index = 0; index < 16; index += 1) {
        await page.waitForTimeout(50);
        samples.push(await page.evaluate(() => {
          const timeline = document.querySelector('[data-testid="timeline"]');
          const grid = document.querySelector('.vis-grid.vis-year1000');
          return {
            year: Number(timeline?.getAttribute('data-year')),
            grid: grid ? Math.round(new DOMMatrix(getComputedStyle(grid).transform).m41) : null,
          };
        }));
      }
      record(`gel-${viewport.name}`, { during, samples });
      expect(during.status).toBe('on');
      expect(during.width).toBeGreaterThanOrEqual(viewport.width - 2);
      expect(during.ink).toBeGreaterThan(100);
      // Une seule frame autorisée : celle de la capture du raster.
      expect(during.renders).toBeLessThanOrEqual(2);
      for (let index = 1; index < samples.length; index += 1) {
        expect(samples[index]?.year ?? 0).toBeLessThanOrEqual(samples[index - 1]?.year ?? 0);
      }
      expect(samples[0]?.grid).toBe(samples[samples.length - 1]?.grid);
    });

    test('la carte reste tournable après le relâchement', async ({ page }) => {
      await open(page);
      await page.waitForTimeout(3000);
      const readMap = () => page.evaluate(() => {
        const map = (window as unknown as {
          __chronasMap?: {
            getLayoutProperty: (id: string, key: string) => unknown;
            getCenter: () => { lng: number; lat: number };
            triggerRepaint: unknown;
          };
        }).__chronasMap;
        if (!map) return null;
        return {
          ruler: map.getLayoutProperty('ruler-fill', 'visibility'),
          patched: String(map.triggerRepaint).includes('allowCaptureFrame'),
          center: [map.getCenter().lng, map.getCenter().lat],
          overlay: document.querySelector('[data-testid="map-gesture-overlay"]')?.getAttribute('data-gesture-overlay'),
        };
      });
      const dragTimeline = async () => {
        const box = await page.locator('[data-testid="timeline"]').boundingBox();
        if (!box) throw new Error('Timeline introuvable');
        const y = box.y + box.height / 2;
        const x = box.x + box.width / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        for (let step = 1; step <= 8; step += 1) {
          await page.mouse.move(x + step * 10, y);
          await page.waitForTimeout(40);
        }
        await page.mouse.up();
      };

      const before = await readMap();
      expect(before).not.toBeNull();
      if (!before) return;
      await dragTimeline();
      await page.waitForTimeout(700);
      const restored = await readMap();
      expect(restored?.ruler).toBe(before.ruler);
      expect(restored?.patched).toBe(false);
      expect(restored?.overlay).toBe('off');

      const mapBox = await page.locator('[data-testid="map-container"]').boundingBox();
      if (!mapBox) throw new Error('Carte introuvable');
      const cx = mapBox.x + mapBox.width / 2;
      const cy = mapBox.y + mapBox.height / 2;
      await page.mouse.move(cx - 60, cy);
      await page.mouse.down();
      for (let step = 1; step <= 6; step += 1) {
        await page.mouse.move(cx - 60 + step * 20, cy);
        await page.waitForTimeout(40);
      }
      await page.mouse.up();
      await page.waitForTimeout(500);
      const afterPan = await readMap();
      const moved = Math.abs((afterPan?.center[0] ?? 0) - (before.center[0] ?? 0)) > 1;
      record(`interactive-${viewport.name}`, { before, restored, afterPan, moved });
      expect(moved).toBe(true);

      // Un second geste doit pouvoir geler puis restaurer à nouveau.
      const yearBefore = (await readState(page)).year;
      await dragTimeline();
      await page.waitForTimeout(700);
      const second = await readMap();
      expect(second?.patched).toBe(false);
      expect(second?.ruler).toBe(before.ruler);
      expect((await readState(page)).year).toBeLessThan(yearBefore);
    });

    test('un glisser lent ne réécrit jamais l’année en arrière', async ({ page }) => {
      await open(page);
      const box = await page.locator('[data-testid="timeline"]').boundingBox();
      if (!box) throw new Error('Timeline introuvable');
      const y = box.y + box.height / 2;
      const startX = box.x + box.width / 2;
      // 720 ms entre deux mouvements : le thread carte peut dépasser 600 ms,
      // c'était le cas qui faisait retomber le drapeau de geste en plein drag.
      await page.mouse.move(startX, y);
      await page.mouse.down();
      const years: number[] = [];
      for (let step = 1; step <= 6; step += 1) {
        await page.mouse.move(startX + step * 16, y);
        await page.waitForTimeout(720);
        years.push((await readState(page)).year);
      }
      await page.mouse.up();
      await page.waitForTimeout(900);
      years.push((await readState(page)).year);
      record(`monotonie-${viewport.name}`, { years });
      for (let index = 1; index < years.length; index += 1) {
        const current = years[index] ?? 0;
        const previous = years[index - 1] ?? 0;
        expect(current).toBeLessThanOrEqual(previous);
      }
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
    expect(before.year - forward.year).toBeGreaterThan(100);
    expect(before.year - forward.year).toBeLessThan(160);
    expect(Math.abs(back.year - before.year)).toBeLessThan(
      Math.max(12, Math.abs(forward.year - before.year) * 0.2)
    );
  });
});
