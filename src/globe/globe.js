/* Sphère WebGL plein écran. Une seule boucle rAF, pause sur document.hidden,
 * picking par raycast puis test de polygone, déterminisme et zéro réseau. */
import { FEATURES, INDEX, featureByName } from '../map/data.js';
import { pointInFeature, clamp } from '../map/projection.js';
import {
  vectorFromLonLat, lonLatFromVector, centerOfBounds, clampLatitude, normalizeLongitude,
} from './lonlat.js';
import { createGlobeTexture } from './texture.js';

const SEED = 20261121;
const DEG = Math.PI / 180;
const mulberry32 = (seed) => () => {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const distanceForZoom = (zoom) => 3.2 - clamp(zoom, 0, 8) * 0.19;
const clampZoom = (zoom) => clamp(zoom, 0, 8);

export function createGlobe(canvas, { onSelect, onView, onError } = {}) {
  const THREE = window.THREE;
  if (!THREE) {
    onError?.('Three.js indisponible');
    return null;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    onError?.(`WebGL indisponible : ${error.message}`);
    return null;
  }

  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05080d);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

  const latGroup = new THREE.Group();
  const lonGroup = new THREE.Group();
  latGroup.add(lonGroup);
  scene.add(latGroup);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64),
    new THREE.MeshPhongMaterial({ map: createGlobeTexture(THREE), shininess: 8, specular: 0x111111 }),
  );
  lonGroup.add(sphere);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.06, 64, 40),
    new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: 'varying vec3 vNormal; void main(){ vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vNormal; void main(){ float i = pow(max(0.0, 0.72 - dot(vNormal, vec3(0.0,0.0,1.0))), 3.0); gl_FragColor = vec4(0.32, 0.52, 1.0, 1.0) * i; }',
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  );
  scene.add(atmosphere);

  const starPositions = [];
  const random = mulberry32(SEED);
  for (let index = 0; index < 900; index += 1) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const radius = 16 + random() * 16;
    starPositions.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta),
    );
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({
    color: 0xbcc8e8, size: 0.06, sizeAttenuation: true, transparent: true, opacity: 0.85,
  }));
  scene.add(stars);

  scene.add(new THREE.AmbientLight(0x506070, 0.95));
  const sun = new THREE.DirectionalLight(0xfff0d2, 1.15);
  sun.position.set(4, 2.5, 5);
  scene.add(sun);

  const marker = new THREE.Group();
  lonGroup.add(marker);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pointers = new Map();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;

  let target = { lon: 0, lat: 20, zoom: 1.6 };
  let current = { ...target };
  let velocity = { lon: 0, lat: 0 };
  let dragging = false;
  let dragMoved = false;
  let lastPointer = null;
  let pinch = null;
  let lastInteraction = performance.now();
  let selected = null;
  let frame = 0;
  let running = false;
  let framesSinceView = 0;

  function applyView() {
    latGroup.rotation.x = current.lat * DEG;
    lonGroup.rotation.y = -(Math.PI / 2 + current.lon * DEG);
    camera.position.z = distanceForZoom(current.zoom);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width));
    const height = Math.max(260, Math.round(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  function clearMarker() {
    for (const child of [...marker.children]) {
      marker.remove(child);
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    }
  }

  function buildMarker(name) {
    clearMarker();
    const feature = featureByName(name);
    if (!feature) return;
    const dot = vectorFromLonLat(centerOfBounds(INDEX[name]).lon, centerOfBounds(INDEX[name]).lat, 1.018);
    marker.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xf4d69e }),
    ));
    marker.children[0].position.set(dot.x, dot.y, dot.z);

    const points = feature.rings[0].map(([lon, lat]) => {
      const vector = vectorFromLonLat(lon, lat, 1.008);
      return new THREE.Vector3(vector.x, vector.y, vector.z);
    });
    if (points.length >= 3) {
      marker.add(new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0xffd98f }),
      ));
    }
  }

  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    latGroup.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(sphere, false);
    if (!hits.length) return null;
    const local = sphere.worldToLocal(hits[0].point.clone());
    const { lon, lat } = lonLatFromVector(local);
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

  function tick(now) {
    if (!running) return;
    const idle = now - lastInteraction > 2600;
    if (!dragging && idle && !reducedMotion) target.lon = normalizeLongitude(target.lon + 0.035);

    if (!dragging) {
      target.lon = normalizeLongitude(target.lon + velocity.lon);
      target.lat = clampLatitude(target.lat + velocity.lat);
      velocity.lon *= 0.93;
      velocity.lat *= 0.93;
      if (Math.abs(velocity.lon) < 0.004) velocity.lon = 0;
      if (Math.abs(velocity.lat) < 0.004) velocity.lat = 0;
    }

    let delta = ((target.lon - current.lon + 540) % 360) - 180;
    current.lon = normalizeLongitude(current.lon + delta * 0.12);
    current.lat += (target.lat - current.lat) * 0.12;
    current.zoom += (target.zoom - current.zoom) * 0.12;
    applyView();
    renderer.render(scene, camera);

    framesSinceView += 1;
    if (framesSinceView >= 15) {
      framesSinceView = 0;
      onView?.({ ...current });
    }
    frame = requestAnimationFrame(tick);
  }

  function start() {
    if (running || document.hidden) return;
    running = true;
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  const onPointerDown = (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragging = true;
    dragMoved = false;
    lastPointer = { x: event.clientX, y: event.clientY };
    lastInteraction = performance.now();
    velocity = { lon: 0, lat: 0 };
    canvas.setPointerCapture?.(event.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: target.zoom };
    }
  };

  const onPointerMove = (event) => {
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      target.zoom = clampZoom(pinch.zoom + Math.log2(distance / pinch.distance) * 2);
      dragMoved = true;
      lastInteraction = performance.now();
      return;
    }
    if (dragging && lastPointer) {
      const dx = event.clientX - lastPointer.x;
      const dy = event.clientY - lastPointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
      const sensitivity = 0.22 / (1 + current.zoom * 0.12);
      target.lon = normalizeLongitude(target.lon - dx * sensitivity);
      target.lat = clampLatitude(target.lat + dy * sensitivity);
      velocity = { lon: -dx * sensitivity * 0.28, lat: dy * sensitivity * 0.28 };
      lastPointer = { x: event.clientX, y: event.clientY };
      lastInteraction = performance.now();
      return;
    }
    if (event.pointerType === 'mouse') {
      canvas.title = pick(event.clientX, event.clientY) || '';
    }
  };

  const onPointerUp = (event) => {
    pointers.delete(event.pointerId);
    canvas.releasePointerCapture?.(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (dragging && !dragMoved) {
      const name = pick(event.clientX, event.clientY);
      if (name) {
        selected = name;
        buildMarker(name);
        onSelect?.(name);
      }
    }
    if (pointers.size === 0) {
      dragging = false;
      lastPointer = null;
    }
    lastInteraction = performance.now();
  };

  const onWheel = (event) => {
    event.preventDefault();
    target.zoom = clampZoom(target.zoom + (event.deltaY < 0 ? 0.5 : -0.5));
    lastInteraction = performance.now();
  };

  const onVisibility = () => { if (document.hidden) stop(); else start(); };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('visibilitychange', onVisibility);
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  window.addEventListener('resize', resize);
  resize();
  applyView();
  start();

  return {
    getView: () => ({ ...current }),
    setView(next) {
      target = { lon: normalizeLongitude(next.lon), lat: clampLatitude(next.lat), zoom: clampZoom(next.zoom) };
      current = { ...target };
      velocity = { lon: 0, lat: 0 };
      lastInteraction = performance.now();
      applyView();
      renderer.render(scene, camera);
    },
    setSelected(name) {
      selected = name;
      buildMarker(name);
    },
    focusRegion(name) {
      const box = INDEX[name];
      if (!box) return;
      const center = centerOfBounds(box);
      target.lon = center.lon;
      target.lat = center.lat;
      target.zoom = Math.max(target.zoom, 3.4);
      lastInteraction = performance.now();
    },
    zoomBy(delta) {
      target.zoom = clampZoom(target.zoom + delta);
      lastInteraction = performance.now();
    },
    rotateBy(dLon, dLat) {
      target.lon = normalizeLongitude(target.lon + dLon);
      target.lat = clampLatitude(target.lat + dLat);
      velocity = { lon: 0, lat: 0 };
      lastInteraction = performance.now();
    },
    pick,
    getSelected: () => selected,
    destroy() {
      stop();
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      clearMarker();
      sphere.geometry.dispose();
      sphere.material.map?.dispose();
      sphere.material.dispose();
      atmosphere.geometry.dispose();
      atmosphere.material.dispose();
      starsGeometry.dispose();
      stars.material.dispose();
      renderer.dispose();
    },
  };
}
