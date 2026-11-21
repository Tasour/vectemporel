/* Rendu canvas statique de la carte mondiale. Aucune boucle rAF continue :
 * un seul redraw coalescé, uniquement après une interaction. */
import { FEATURES, AREAS, INDEX, areaByName, colorFor } from './data.js';
import {
  project, unproject, panPixels, zoomAt, pointInFeature, clampView,
} from './projection.js';

const COLORS = new Map();
for (const feature of FEATURES) {
  const culture = AREAS[feature.name]?.[1];
  if (!COLORS.has(culture)) COLORS.set(culture, colorFor(culture));
}

export function createMapRenderer(canvas, { onSelect, onView } = {}) {
  const ctx = canvas.getContext('2d');
  let view = clampView({ lat: 20, lon: 0, zoom: 1.6 });
  let size = { w: 800, h: 500 };
  let selected = null;
  let hovered = null;
  let pending = 0;
  let destroyed = false;
  let drag = null;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    size = { w: Math.max(320, Math.round(rect.width)), h: Math.max(260, Math.round(rect.height)) };
    canvas.width = Math.round(size.w * ratio);
    canvas.height = Math.round(size.h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  function drawGraticule() {
    ctx.strokeStyle = 'rgba(255,255,255,.055)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let lon = -180; lon <= 180; lon += 30) {
      let started = false;
      for (let lat = -80; lat <= 80; lat += 5) {
        const [x, y] = project(lon, lat, view, size);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [x0, y0] = project(-180, lat, view, size);
      const [x1, y1] = project(180, lat, view, size);
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
    ctx.stroke();
  }

  function draw() {
    if (!ctx || destroyed) return;
    ctx.fillStyle = '#0a1018';
    ctx.fillRect(0, 0, size.w, size.h);
    drawGraticule();

    for (const feature of FEATURES) {
      const culture = AREAS[feature.name]?.[1];
      const isSelected = feature.name === selected;
      const isHovered = feature.name === hovered;
      ctx.beginPath();
      for (const ring of feature.rings) {
        ring.forEach(([lon, lat], index) => {
          const [x, y] = project(lon, lat, view, size);
          if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath();
      }
      ctx.fillStyle = isSelected ? 'rgba(230,185,111,.62)' : COLORS.get(culture) || '#263345';
      ctx.fill();
      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? '#f4d69e' : 'rgba(244,214,158,.6)';
        ctx.lineWidth = isSelected ? 2.4 : 1.2;
        ctx.stroke();
      }
    }
  }

  function schedule() {
    if (pending || destroyed) return;
    pending = requestAnimationFrame(() => { pending = 0; draw(); });
  }

  function updateView(next, notify = true) {
    view = clampView(next);
    schedule();
    if (notify) onView?.(view);
  }

  function hitTest(x, y) {
    const [lon, lat] = unproject(x, y, view, size);
    let best = null;
    let bestArea = Infinity;
    for (const feature of FEATURES) {
      if (!pointInFeature(lon, lat, feature, INDEX)) continue;
      const box = INDEX[feature.name];
      const area = (box.maxLon - box.minLon) * (box.maxLat - box.minLat);
      if (area < bestArea) { bestArea = area; best = feature.name; }
    }
    return best;
  }

  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  const onPointerDown = (event) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const [x, y] = localPoint(event);
    drag = { x, y, moved: false };
    canvas.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    const [x, y] = localPoint(event);
    if (drag) {
      const dx = x - drag.x;
      const dy = y - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      drag.x = x;
      drag.y = y;
      if (drag.moved) updateView(panPixels(view, dx, dy));
      return;
    }
    if (event.pointerType === 'mouse') {
      const name = hitTest(x, y);
      if (name !== hovered) { hovered = name; canvas.title = name || ''; schedule(); }
    }
  };
  const onPointerUp = (event) => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    canvas.releasePointerCapture?.(event.pointerId);
    if (moved) return;
    const [x, y] = localPoint(event);
    const name = hitTest(x, y);
    if (name) {
      selected = name;
      draw();
      onSelect?.(name);
    }
  };
  const onWheel = (event) => {
    event.preventDefault();
    const [x, y] = localPoint(event);
    updateView(zoomAt(view, event.deltaY < 0 ? 0.45 : -0.45, [x, y], size));
  };
  const onLeave = () => { if (hovered) { hovered = null; schedule(); } };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerleave', onLeave);

  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  window.addEventListener('resize', resize);
  resize();

  return {
    getView: () => ({ ...view }),
    setView(next) { updateView(next, false); },
    getSelected: () => selected,
    setSelected(name) {
      selected = name;
      const area = name ? areaByName(name) : null;
      if (area) {
        const feature = FEATURES.find((item) => item.name === name);
        if (feature) {
          const box = INDEX[name];
          const cx = (box.minLon + box.maxLon) / 2;
          const cy = (box.minLat + box.maxLat) / 2;
          updateView({ ...view, lon: cx, lat: cy }, false);
        }
      }
      draw();
    },
    pan(dx, dy) { updateView(panPixels(view, dx, dy)); },
    zoom(factor) { updateView(zoomAt(view, factor, [size.w / 2, size.h / 2], size)); },
    hitTest,
    project: (lon, lat) => project(lon, lat, view, size),
    size: () => ({ ...size }),
    destroy() {
      destroyed = true;
      if (pending) cancelAnimationFrame(pending);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerleave', onLeave);
    },
  };
}
