/**
 * Surcouche de geste : pendant un déplacement de la timeline, la carte est
 * figée sur un raster du fond de carte et seules les entités visibles sont
 * recolorées en canvas 2D. Aucun rendu MapLibre n'est demandé pendant le geste.
 *
 * Au relâchement, les couches sont restaurées : MapLibre fait un seul rendu
 * complet (planète entière) et la surcouche disparaît avec un fondu courts.
 */

import { useEffect, useRef } from 'react';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  type AreaColorDimension,
  type AreaData,
  type EntityMetadata,
  type LabelFeatureCollection,
} from '../../../stores/mapStore';
import { getProvinceStyle } from './provinceStyle';
import styles from './MapGestureOverlay.module.css';

const FILL_LAYER_IDS = [
  'ruler-fill',
  'culture-fill',
  'religion-fill',
  'religionGeneral-fill',
  'population-fill',
];

/** Rafraîchissement des couleurs : inutile d'aller plus vite pendant le geste. */
const REFRESH_MS = 70;

export interface MapGestureOverlayProps {
  active: boolean;
  map: MapLibreMap | null;
  provinces: Feature<Polygon | MultiPolygon>[] | null;
  areaData: AreaData | null;
  activeColor: AreaColorDimension;
  metadata: EntityMetadata | null;
  labels: LabelFeatureCollection | null;
  resolveReligionGeneral: (religionId: string) => string;
}

/** Géométrie projetée d'une entité visible (anneaux en pixels écran). */
interface ProjectedFeature {
  id: string;
  rings: number[][];
}

export function MapGestureOverlay({
  active,
  map,
  provinces,
  areaData,
  activeColor,
  metadata,
  labels,
  resolveReligionGeneral,
}: MapGestureOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rasterRef = useRef<HTMLCanvasElement>(null);
  const vectorRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const projectedRef = useRef<ProjectedFeature[] | null>(null);
  const geometryDirtyRef = useRef(true);
  const frameRef = useRef(0);
  const lastDrawRef = useRef(0);
  const previousVisibilityRef = useRef<Record<string, string>>({});
  /** `triggerRepaint` neutralisé pendant le gel : aucun rendu MapLibre. */
  const repaintRef = useRef<(() => void) | null>(null);
  /** Restauration des couches différée de deux frames pour laisser peindre la frise. */
  const restoreFrameRef = useRef(0);
  const handlersRef = useRef({ areaData, activeColor, metadata, labels, resolveReligionGeneral });
  useEffect(() => {
    handlersRef.current = { areaData, activeColor, metadata, labels, resolveReligionGeneral };
  }, [areaData, activeColor, metadata, labels, resolveReligionGeneral]);

  /** Projette les géométries une seule fois et ne garde que ce qui touche l'écran. */
  const projectGeometry = (): ProjectedFeature[] => {
    if (!map || !provinces || !bitmapRef.current) return projectedRef.current ?? [];
    const width = map.getCanvas().clientWidth;
    const height = map.getCanvas().clientHeight;
    const inside = (x: number, y: number) => x >= -40 && x <= width + 40 && y >= -40 && y <= height + 40;
    const result: ProjectedFeature[] = [];
    for (const feature of provinces) {
      const id = feature.properties?.['name'] as string | undefined;
      if (!id) continue;
      const geometry = feature.geometry;
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
      const rings: number[][] = [];
      for (const polygon of polygons) {
        for (const ring of polygon) {
          const points: number[] = [];
          let visible = false;
          for (const [lng, lat] of ring) {
            const point = map.project([Number(lng), Number(lat)]);
            if (inside(point.x, point.y)) visible = true;
            points.push(point.x, point.y);
          }
          if (visible) rings.push(points);
        }
      }
      if (rings.length > 0) result.push({ id, rings });
    }
    return result;
  };

  const drawRaster = (): void => {
    const canvas = rasterRef.current;
    const bitmap = bitmapRef.current;
    if (!canvas || !bitmap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) return;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
  };

  const drawVector = (): void => {
    const canvas = vectorRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (geometryDirtyRef.current || !projectedRef.current) {
      projectedRef.current = projectGeometry();
      geometryDirtyRef.current = false;
    }
    const { areaData: data, activeColor: dimension, metadata: meta, labels: labelCollection, resolveReligionGeneral: resolve } = handlersRef.current;
    if (data && meta) {
      ctx.lineWidth = 0.5;
      for (const feature of projectedRef.current) {
        const style = getProvinceStyle(feature.id, data, dimension, meta, resolve);
        ctx.beginPath();
        for (const ring of feature.rings) {
          ctx.moveTo(ring[0] ?? 0, ring[1] ?? 0);
          for (let index = 2; index < ring.length; index += 2) {
            ctx.lineTo(ring[index] ?? 0, ring[index + 1] ?? 0);
          }
          ctx.closePath();
        }
        ctx.globalAlpha = style.opacity;
        ctx.fillStyle = style.fill;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = style.border;
        ctx.stroke();
      }
    }

    if (map && labelCollection) {
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.fillStyle = 'rgba(30,28,24,0.95)';
      for (const feature of labelCollection.features) {
        const name = feature.properties.name;
        if (typeof name !== 'string') continue;
        const coordinates = feature.geometry.coordinates;
        if (!Array.isArray(coordinates)) continue;
        const point = map.project([Number(coordinates[0]), Number(coordinates[1])]);
        if (point.x < -20 || point.x > width + 20 || point.y < -20 || point.y > height + 20) continue;
        ctx.strokeText(name, point.x, point.y);
        ctx.fillText(name, point.x, point.y);
      }
    }
  };

  useEffect(() => {
    if (!map) return undefined;
    const invalidate = () => { geometryDirtyRef.current = true; };
    map.on('move', invalidate);
    return () => { map.off('move', invalidate); };
  }, [map]);

  // Le gel neutralise temporairement `map.triggerRepaint` : c'est une mutation
  // volontaire de l'instance MapLibre, restaurée intégralement au relâchement.
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let cancelled = false;

    const stopLoop = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };

    const restoreLayers = () => {
      if (!map) return;
      if (repaintRef.current) {
        map.triggerRepaint = repaintRef.current;
        repaintRef.current = null;
      }
      for (const [id, visibility] of Object.entries(previousVisibilityRef.current)) {
        try { map.setLayoutProperty(id, 'visibility', visibility as 'visible' | 'none'); } catch { /* style pas chargé */ }
      }
      previousVisibilityRef.current = {};
      map.triggerRepaint();
    };

    const deactivate = (restore = true) => {
      stopLoop();
      cancelAnimationFrame(restoreFrameRef.current);
      if (!restore) {
        root.style.opacity = '0';
        root.dataset['gestureOverlay'] = 'off';
        return undefined;
      }
      // Laissons d'abord vis-timeline appliquer et peindre sa fenêtre finale :
      // restaurer les couches immédiatement déclenchait un rendu MapLibre qui
      // affamait le rAF de la frise pendant ~600 ms.
      restoreFrameRef.current = requestAnimationFrame(() => {
        restoreFrameRef.current = requestAnimationFrame(() => {
          restoreFrameRef.current = 0;
          restoreLayers();
          root.style.opacity = '0';
          root.dataset['gestureOverlay'] = 'off';
          bitmapRef.current?.close();
          bitmapRef.current = null;
          projectedRef.current = null;
          geometryDirtyRef.current = true;
        });
      });
      return undefined;
    };

    if (!active) {
      deactivate(false);
      return undefined;
    }
    if (!map || typeof createImageBitmap !== 'function') {
      // Repli : on laisse la carte vivante plutôt qu'un écran vide.
      root.dataset['gestureOverlay'] = 'fallback';
      return undefined;
    }

    const captured = () => {
      createImageBitmap(map.getCanvas()).then((bitmap) => {
        if (cancelled) { bitmap.close(); return; }
        bitmapRef.current = bitmap;
        drawRaster();
        drawVector();
        root.style.opacity = '1';
        root.dataset['gestureOverlay'] = 'on';
        cancelAnimationFrame(frameRef.current);
        const tick = (now: number) => {
          frameRef.current = requestAnimationFrame(tick);
          if (now - lastDrawRef.current < REFRESH_MS) return;
          lastDrawRef.current = now;
          drawVector();
        };
        frameRef.current = requestAnimationFrame(tick);
      }).catch(() => {
        if (!cancelled) deactivate();
      });
    };

    // Une seule frame est autorisée : celle qui produit le raster. Toutes les
    // demandes suivantes (setProps de react-map-gl, timers, animations) sont
    // ignorées jusqu'au relâchement.
    cancelAnimationFrame(restoreFrameRef.current);
    restoreFrameRef.current = 0;
    map.stop();
    if (repaintRef.current) {
      // eslint-disable-next-line react-hooks/immutability
      map.triggerRepaint = repaintRef.current;
      repaintRef.current = null;
    }
    repaintRef.current = map.triggerRepaint.bind(map);
    let allowCaptureFrame = true;
    map.triggerRepaint = () => {
      if (!allowCaptureFrame) return;
      allowCaptureFrame = false;
      repaintRef.current?.();
    };

    previousVisibilityRef.current = {};
    for (const id of FILL_LAYER_IDS) {
      if (!map.getLayer(id)) continue;
      const current = map.getLayoutProperty(id, 'visibility');
      previousVisibilityRef.current[id] = typeof current === 'string' ? current : 'visible';
      try { map.setLayoutProperty(id, 'visibility', 'none'); } catch { /* style pas chargé */ }
    }
    // Chaque `setLayoutProperty` ci-dessus demande déjà un rendu : le premier
    // `render` suffit à capturer le raster sans déclencher de frame supplémentaire.
    map.once('render', captured);

    return () => {
      cancelled = true;
      map.off('render', captured);
      deactivate();
    };
  // `drawVector` est volontairement exclu : il est recréé à chaque rendu et
  // l'effet ne doit dépendre que de l'état du geste et de l'instance carte.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, map]);

  return (
    <div ref={rootRef} className={styles['root']} aria-hidden="true" data-testid="map-gesture-overlay">
      <canvas ref={rasterRef} className={styles['layer']} />
      <canvas ref={vectorRef} className={styles['layer']} />
    </div>
  );
}

export default MapGestureOverlay;
