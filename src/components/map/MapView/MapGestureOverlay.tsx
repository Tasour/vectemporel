/**
 * Surcouche de geste : pendant un déplacement de la timeline, MapLibre ne rend
 * plus (triggerRepaint neutralisé) et la carte garde sa dernière frame. Les
 * seules entités visibles sont recolorées en canvas 2D par-dessus.
 *
 * Aucune capture du canvas WebGL ni masquage de couche : si la surcouche ne
 * peut pas peindre, la carte reste affichée avec l'année précédente au lieu
 * de devenir vide. Le gel n'est donc jamais une condition de correction.
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

/** Rafraîchissement des couleurs : inutile d'aller plus vite pendant le geste. */
const REFRESH_MS = 70;
const LAND_LIGHT = '#e9e5db';
const LAND_DARK = '#2a2926';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectedRef = useRef<ProjectedFeature[] | null>(null);
  const geometryDirtyRef = useRef(true);
  const frameRef = useRef(0);
  const lastDrawRef = useRef(0);
  /** `triggerRepaint` d'origine, restauré au relâchement. */
  const repaintRef = useRef<(() => void) | null>(null);
  const restoreFrameRef = useRef(0);
  const restoreTimerRef = useRef(0);
  /** Abandon immédiat du gel (carte déplacée, onglet de retour, unmount). */
  const restoreNowRef = useRef<(() => void) | null>(null);
  const handlersRef = useRef({ areaData, activeColor, metadata, labels, resolveReligionGeneral });

  useEffect(() => {
    handlersRef.current = { areaData, activeColor, metadata, labels, resolveReligionGeneral };
  }, [areaData, activeColor, metadata, labels, resolveReligionGeneral]);

  /** Projette les géométries une seule fois et ne garde que ce qui touche l'écran. */
  const projectGeometry = (): ProjectedFeature[] => {
    if (!map || !provinces) return [];
    const canvas = canvasRef.current;
    const width = canvas?.clientWidth ?? map.getCanvas().clientWidth;
    const height = canvas?.clientHeight ?? map.getCanvas().clientHeight;
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

  const drawVector = (): void => {
    const canvas = canvasRef.current;
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
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const land = dark ? LAND_DARK : LAND_LIGHT;
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
        // Fond opaque : il efface l'année précédente et ses libellés avant de
        // poser la nouvelle couleur à l'opacité MapLibre.
        ctx.globalAlpha = 1;
        ctx.fillStyle = land;
        ctx.fill();
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
      ctx.strokeStyle = dark ? 'rgba(30,28,24,0.85)' : 'rgba(255,255,255,0.85)';
      ctx.fillStyle = dark ? 'rgba(241,236,225,0.95)' : 'rgba(30,28,24,0.95)';
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
    canvas.dataset['tickCount'] = String(projectedRef.current.length);
  };

  useEffect(() => {
    if (!map) return undefined;
    const invalidate = () => {
      geometryDirtyRef.current = true;
      // Un déplacement de la carte pendant le gel signifie que l'utilisateur
      // tourne le globe : on rend la main à MapLibre immédiatement.
      restoreNowRef.current?.();
    };
    map.on('move', invalidate);
    return () => { map.off('move', invalidate); };
  }, [map]);

  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const stopLoop = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };

    const restoreRepaint = () => {
      if (!map || !repaintRef.current) return;
      map.triggerRepaint = repaintRef.current;
      repaintRef.current = null;
      map.triggerRepaint();
    };

    const finishRestore = () => {
      cancelAnimationFrame(restoreFrameRef.current);
      restoreFrameRef.current = 0;
      window.clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = 0;
      restoreRepaint();
      root.style.opacity = '0';
      root.dataset['gestureOverlay'] = 'off';
      projectedRef.current = null;
      geometryDirtyRef.current = true;
      restoreNowRef.current = null;
    };

    const deactivate = (restore = true) => {
      stopLoop();
      if (!restore) {
        // Le cleanup de l'effet actif a déjà programmé `finishRestore` : ne
        // surtout pas l'annuler ici, sinon la carte resterait gelée à vie.
        root.style.opacity = '0';
        root.dataset['gestureOverlay'] = 'off';
        return undefined;
      }
      // Laissons d'abord vis-timeline appliquer et peindre sa fenêtre finale.
      restoreFrameRef.current = requestAnimationFrame(() => {
        restoreFrameRef.current = requestAnimationFrame(finishRestore);
      });
      // Filet dur : dans un onglet masqué, le rAF peut ne jamais venir.
      window.clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = window.setTimeout(finishRestore, 400);
      return undefined;
    };

    if (!active) {
      deactivate(false);
      return undefined;
    }
    if (!map) {
      root.dataset['gestureOverlay'] = 'fallback';
      return undefined;
    }
    restoreNowRef.current = finishRestore;
    const onVisibility = () => { if (!document.hidden) finishRestore(); };
    const onPageHide = () => finishRestore();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);

    cancelAnimationFrame(restoreFrameRef.current);
    restoreFrameRef.current = 0;
    window.clearTimeout(restoreTimerRef.current);
    restoreTimerRef.current = 0;
    map.stop();
    if (repaintRef.current) {
      // eslint-disable-next-line react-hooks/immutability
      map.triggerRepaint = repaintRef.current;
      repaintRef.current = null;
    }
    repaintRef.current = map.triggerRepaint.bind(map);
    // Aucune frame n'est nécessaire : la carte garde la dernière déjà peinte.
    map.triggerRepaint = () => undefined;

    drawVector();
    root.style.opacity = '1';
    root.dataset['gestureOverlay'] = 'on';
    const tick = (now: number) => {
      frameRef.current = requestAnimationFrame(tick);
      if (now - lastDrawRef.current < REFRESH_MS) return;
      lastDrawRef.current = now;
      drawVector();
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      deactivate();
    };
  // `drawVector` est volontairement exclu : il est recréé à chaque rendu et
  // l'effet ne doit dépendre que de l'état du geste et de l'instance carte.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, map]);

  return (
    <div ref={rootRef} className={styles['root']} aria-hidden="true" data-testid="map-gesture-overlay">
      <canvas ref={canvasRef} className={styles['layer']} />
    </div>
  );
}

export default MapGestureOverlay;
