/* Sphère WebGL plein écran. Une seule boucle rAF, pause sur document.hidden,
 * picking par raycast puis test de polygone, déterminisme et zéro réseau. */
import { FEATURES, INDEX, AREAS, featureByName } from '../map/data.js';
import { computeZones } from './zones.js';
import { pointInFeature, clamp } from '../map/projection.js';
import {
  vectorFromLonLat, lonLatFromVector, centerOfBounds, clampLatitude, normalizeLongitude,
} from './lonlat.js';
import { createGlobeTexture, globeQuality, DIMENSIONS } from './texture.js';
import { createProvinceMesh, ZOOM_MAX } from './vector-provinces.js';
import { THREE } from './three.js';

const SEED = 20261121;
const DEG = Math.PI / 180;
const mulberry32 = (seed) => () => {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const distanceForZoom = (zoom) => 3.2 - clamp(zoom, 0, ZOOM_MAX) * 0.19;
const clampZoom = (zoom) => clamp(zoom, 0, ZOOM_MAX);

export function createGlobe(canvas, {
  onSelect, onZoneSelect, onCitySelect, onView, onError, onHover, onFrame,
} = {}) {
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
  scene.background = new THREE.Color(0x0d1524);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

  const latGroup = new THREE.Group();
  const lonGroup = new THREE.Group();
  latGroup.add(lonGroup);
  scene.add(latGroup);

  const quality = globeQuality();
  const { texture: globeTexture } = createGlobeTexture(THREE, quality, renderer);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, quality.segments[0], quality.segments[1]),
    new THREE.MeshPhongMaterial({ map: globeTexture, shininess: 8, specular: 0x222222, emissive: 0x141414 }),
  );
  lonGroup.add(sphere);

  let provinceMesh = null;
  let provinceStatistics = null;
  let zones = { zones: [], byFeature: new Map() };
  function rebuildProvinces(areas, dimension = 'culture') {
    if (provinceMesh) {
      lonGroup.remove(provinceMesh.group);
      provinceMesh.dispose();
    }
    const index = DIMENSIONS.find((item) => item.id === dimension)?.index ?? 1;
    zones = computeZones(areas || AREAS, index);
    const outerEdges = new Set();
    for (const zone of zones.zones) for (const edge of zone.edges) outerEdges.add(edge);
    provinceMesh = createProvinceMesh(THREE, areas || AREAS, index, { edges: outerEdges });
    provinceStatistics = provinceMesh.statistics;
    lonGroup.add(provinceMesh.group);
  }
  rebuildProvinces(AREAS, 'culture');

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.06, 128, 80),
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

  /* Ombre stylisée et déterministe : la direction du « soleil » dépend de
   * l'année affichée, jamais de l'heure réelle. Aucune animation. */
  let sunYear = null;
  const sunMaterial = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: new THREE.Vector3(1, 0, 0) } },
    vertexShader: 'varying vec3 vWorldNormal; void main(){ vWorldNormal = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uSun; varying vec3 vWorldNormal; void main(){ float d = dot(normalize(vWorldNormal), normalize(uSun)); float night = 1.0 - smoothstep(-0.22, 0.22, d); gl_FragColor = vec4(0.0, 0.01, 0.05, night * 0.62); }',
    transparent: true,
    depthWrite: false,
  });
  const terminator = new THREE.Mesh(new THREE.SphereGeometry(1.003, 96, 64), sunMaterial);
  terminator.visible = false;
  scene.add(terminator);
  let wireframe = false;

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

  const ambient = new THREE.AmbientLight(0x8fa4bd, 1.35);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff0d2, 1.45);
  sun.position.set(4, 2.5, 5);
  scene.add(sun);

  const marker = new THREE.Group();
  lonGroup.add(marker);
  const arcs = new THREE.Group();
  lonGroup.add(arcs);
  let arcCount = 0;
  let arcHits = [];

  /* F38 : disque-local au lieu du carré par défaut de THREE.Points. */
  const discCanvas = document.createElement('canvas');
  discCanvas.width = 64;
  discCanvas.height = 64;
  const discCtx = discCanvas.getContext('2d');
  discCtx.beginPath();
  discCtx.arc(32, 32, 28, 0, Math.PI * 2);
  discCtx.fillStyle = '#ffffff';
  discCtx.fill();
  discCtx.lineWidth = 4;
  discCtx.strokeStyle = 'rgba(10,15,22,.85)';
  discCtx.stroke();
  const discTexture = new THREE.CanvasTexture(discCanvas);
  discTexture.minFilter = THREE.LinearFilter;
  discTexture.magFilter = THREE.LinearFilter;
  discTexture.generateMipmaps = false;
  const pointSize = 7 * Math.min(2, window.devicePixelRatio || 1);

  let cityPoints = null;
  let cityCount = 0;
  let currentCities = [];
  let cityHits = [];
  let currentCityYear = 0;
  function setCities(cities, year) {
    currentCities = cities || [];
    currentCityYear = year;
    if (cityPoints) {
      lonGroup.remove(cityPoints);
      cityPoints.geometry.dispose();
      cityPoints.material.dispose();
      cityPoints = null;
    }
    cityHits = [];
    if (!currentCities.length) { cityCount = 0; return; }
    const positions = [];
    for (const [lon, lat, name, start, end, capital] of currentCities) {
      if (year < start || (end && year > end)) continue;
      if (!capital) continue;
      const vector = vectorFromLonLat(lon, lat, 1.012);
      positions.push(vector.x, vector.y, vector.z);
      cityHits.push({ name, vector });
    }
    if (!positions.length) { cityCount = 0; return; }
    cityCount = positions.length / 3;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    cityPoints = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: 0xf4d69e,
      map: discTexture,
      size: pointSize,
      sizeAttenuation: false,
      transparent: true,
      alphaTest: 0.5,
      depthWrite: false,
      opacity: 0.9,
    }));
    cityPoints.visible = current.zoom >= 2.5;
    lonGroup.add(cityPoints);
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pointers = new Map();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;

  let target = { lon: 0, lat: 20, zoom: 1.6 };
  let current = { ...target };
  let velocity = { lon: 0, lat: 0 };
  let dragging = false;
  let dragMoved = false;
  let suppressClick = false;
  let gesture = null;
  let pendingTapTimer = 0;
  let lastTap = null;
  let lastGesture = 'none';
  let lastPointer = null;
  let pinch = null;
  let lastInteraction = performance.now();
  let lastInput = 'init';
  let selected = null;
  let tourAuto = false;
  let frame = 0;
  let running = false;
  let framesSinceView = 0;

  function applyView() {
    latGroup.rotation.x = current.lat * DEG;
    lonGroup.rotation.y = -(Math.PI / 2 + current.lon * DEG);
    camera.position.z = distanceForZoom(current.zoom);
    if (cityPoints) cityPoints.visible = current.zoom >= 2.5;
  }

  /* F49 : projection lon/lat -> écran pour les libellés, sans boucle dédiée. */
  function project(lon, lat) {
    latGroup.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    const vector = vectorFromLonLat(lon, lat, 1.02);
    const world = lonGroup.localToWorld(new THREE.Vector3(vector.x, vector.y, vector.z));
    const facing = world.clone().normalize().dot(camera.position.clone().normalize()) > 0.15;
    const projected = world.project(camera);
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + ((projected.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - projected.y) / 2) * rect.height,
      visible: facing && projected.z >= -1 && projected.z <= 1,
    };
  }

  /* F44 : positions écran des capitales, pour un hit-test indépendant du raster. */
  function cityScreenPoints() {
    if (!cityPoints?.visible || current.zoom < 2.5) return [];
    latGroup.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    const rect = canvas.getBoundingClientRect();
    return cityHits.map(({ name, vector }) => {
      const world = lonGroup.localToWorld(new THREE.Vector3(vector.x, vector.y, vector.z));
      const projected = world.project(camera);
      if (projected.z < -1 || projected.z > 1) return null;
      return {
        name,
        x: rect.left + ((projected.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - projected.y) / 2) * rect.height,
      };
    }).filter(Boolean);
  }

  function setSunYear(year, enabled = true) {
    if (!enabled) {
      terminator.visible = false;
      sunYear = null;
    } else {
      const phase = ((Number(year) - 2000) % 360) * DEG;
      sunMaterial.uniforms.uSun.value.set(Math.cos(phase), 0.42, Math.sin(phase)).normalize();
      terminator.visible = true;
      sunYear = Number(year);
    }
    renderer.render(scene, camera);
  }

  function setWireframe(enabled) {
    wireframe = Boolean(enabled);
    sphere.material.wireframe = wireframe;
    if (provinceMesh) provinceMesh.group.visible = !wireframe;
    atmosphere.visible = !wireframe;
    renderer.render(scene, camera);
  }

  function arcScreenPoints() {
    if (!arcHits.length) return [];
    latGroup.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    const rect = canvas.getBoundingClientRect();
    return arcHits.map(({ name, vector }) => {
      const world = lonGroup.localToWorld(new THREE.Vector3(vector.x, vector.y, vector.z));
      const facing = world.clone().normalize().dot(camera.position.clone().normalize()) > 0.12;
      const projected = world.project(camera);
      return {
        name,
        x: rect.left + ((projected.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - projected.y) / 2) * rect.height,
        visible: facing && projected.z >= -1 && projected.z <= 1,
      };
    });
  }

  function surfacePoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    latGroup.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(sphere, false);
    if (!hits.length) return null;
    return lonLatFromVector(sphere.worldToLocal(hits[0].point.clone()));
  }

  function zoomAround(clientX, clientY, delta) {
    const before = surfacePoint(clientX, clientY);
    const nextZoom = clampZoom(target.zoom + delta);
    if (nextZoom === target.zoom) return;
    if (before) {
      const ratio = distanceForZoom(nextZoom) / distanceForZoom(target.zoom);
      target.lon = normalizeLongitude(target.lon + (before.lon - target.lon) * (1 - ratio));
      target.lat = clampLatitude(target.lat + (before.lat - target.lat) * (1 - ratio));
    }
    target.zoom = nextZoom;
    lastInteraction = performance.now();
  }

  function pickCity(clientX, clientY, radius = 12) {
    let best = null;
    let bestDistance = radius;
    for (const point of cityScreenPoints()) {
      const distance = Math.hypot(point.x - clientX, point.y - clientY);
      if (distance < bestDistance) { bestDistance = distance; best = point.name; }
    }
    return best;
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

  function clearArcs() {
    for (const child of [...arcs.children]) {
      arcs.remove(child);
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    }
    arcCount = 0;
  }

  /* Arcs de simultanéité : interpolation great-circle entre deux centres de
   * province. Une seule frame rendue ici, aucune boucle supplémentaire. */
  function setArcs(pairs = []) {
    clearArcs();
    arcHits = [];
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    for (const { from, to } of pairs) {
      const aBox = INDEX[from];
      const bBox = INDEX[to];
      if (!aBox || !bBox) continue;
      const a = centerOfBounds(aBox);
      const b = centerOfBounds(bBox);
      const av = vectorFromLonLat(a.lon, a.lat);
      const bv = vectorFromLonLat(b.lon, b.lat);
      const va = new THREE.Vector3(av.x, av.y, av.z);
      const vb = new THREE.Vector3(bv.x, bv.y, bv.z);
      const omega = Math.acos(clamp(va.dot(vb), -1, 1));
      if (omega < 0.02) continue;
      const sinOmega = Math.sin(omega);
      const height = reduced ? 0.02 : Math.min(0.16, 0.06 + omega * 0.05);
      const points = [];
      for (let index = 0; index <= 32; index += 1) {
        const t = index / 32;
        const direction = va.clone().multiplyScalar(Math.sin((1 - t) * omega) / sinOmega)
          .add(vb.clone().multiplyScalar(Math.sin(t * omega) / sinOmega))
          .normalize();
        points.push(direction.multiplyScalar(1.014 + height * Math.sin(Math.PI * t)));
      }
      arcHits.push({ name: to, vector: points[16].clone().normalize() });
      const segments = [];
      for (let index = 0; index < points.length - 1; index += 1) {
        segments.push(points[index], points[index + 1]);
      }
      arcs.add(new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(segments),
        new THREE.LineBasicMaterial({ color: 0xe6b96f, transparent: true, opacity: 0.9 }),
      ));
      arcCount += 1;
    }
    renderer.render(scene, camera);
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
    /* ADR-0006 : aucune rotation automatique. Le tour du monde est manuel. */
    if (tourAuto && !dragging) target.lon = normalizeLongitude(target.lon + 0.035);

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
    onFrame?.({ ...current });

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

  function cancelPendingTap() {
    if (pendingTapTimer) clearTimeout(pendingTapTimer);
    pendingTapTimer = 0;
  }

  function resetGesture() {
    cancelPendingTap();
    gesture = null;
    dragging = false;
    dragMoved = false;
    lastPointer = null;
    pinch = null;
  }

  const onPointerDown = (event) => {
    /* Tout nouveau toucher annule une sélection en attente : c'est
     * potentiellement le second tap d'un double-tap. */
    cancelPendingTap();
    lastInput = event.pointerType || 'mouse';
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!gesture) {
      gesture = {
        type: event.pointerType || 'mouse',
        start: performance.now(),
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        totalMovement: 0,
        maxPointers: 1,
        multi: false,
        secondStart: null,
        moved: false,
        ids: new Set([event.pointerId]),
      };
    } else {
      gesture.ids.add(event.pointerId);
      gesture.maxPointers = Math.max(gesture.maxPointers, pointers.size);
      if (pointers.size === 2 && gesture.secondStart === null) {
        gesture.secondStart = performance.now();
        gesture.multi = true;
        const [a, b] = [...pointers.values()];
        gesture.midpointX = (a.x + b.x) / 2;
        gesture.midpointY = (a.y + b.y) / 2;
        /* Un second doigt annule une éventuelle sélection en attente. */
        cancelPendingTap();
      }
    }
    dragging = true;
    lastPointer = { x: event.clientX, y: event.clientY };
    lastInteraction = performance.now();
    velocity = { lon: 0, lat: 0 };
    try { canvas.setPointerCapture?.(event.pointerId); } catch { /* pointeur synthétique */ }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: target.zoom };
    }
  };

  const onPointerMove = (event) => {
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gesture) {
      gesture.totalMovement += Math.hypot(event.clientX - gesture.lastX, event.clientY - gesture.lastY);
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
      const threshold = gesture.type === 'touch' ? 8 : 2;
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > threshold
        || gesture.totalMovement > threshold) gesture.moved = true;
      if (gesture.moved) cancelPendingTap();
    }
    if (pointers.size >= 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const centerX = (a.x + b.x) / 2;
      const centerY = (a.y + b.y) / 2;
      target.zoom = clampZoom(pinch.zoom + Math.log2(distance / pinch.distance) * 2);
      if (pinch.centerX !== undefined) {
        const dx = centerX - pinch.centerX;
        const dy = centerY - pinch.centerY;
        const sensitivity = 0.14 / (1 + current.zoom * 0.12);
        target.lon = normalizeLongitude(target.lon - dx * sensitivity);
        target.lat = clampLatitude(target.lat + dy * sensitivity);
      }
      pinch.centerX = centerX;
      pinch.centerY = centerY;
      dragMoved = true;
      lastInteraction = performance.now();
      return;
    }
    if (dragging && lastPointer) {
      const dx = event.clientX - lastPointer.x;
      const dy = event.clientY - lastPointer.y;
      const isTouch = event.pointerType === 'touch';
      const threshold = isTouch ? 8 : 2;
      if (Math.abs(dx) + Math.abs(dy) > threshold) dragMoved = true;
      if (dragMoved && tourAuto) tourAuto = false;
      const sensitivity = (isTouch ? 0.14 : 0.22) / (1 + current.zoom * 0.12);
      target.lon = normalizeLongitude(target.lon - dx * sensitivity);
      target.lat = clampLatitude(target.lat + dy * sensitivity);
      const cap = isTouch ? 0.8 : 1.2;
      velocity = {
        lon: clamp(-dx * sensitivity * 0.28, -cap, cap),
        lat: clamp(dy * sensitivity * 0.28, -cap, cap),
      };
      lastPointer = { x: event.clientX, y: event.clientY };
      lastInteraction = performance.now();
      return;
    }
    if (event.pointerType === 'mouse') {
      const city = pickCity(event.clientX, event.clientY, 12);
      canvas.classList.toggle('point-hover', Boolean(city));
      onHover?.(city ? null : pick(event.clientX, event.clientY), event.clientX, event.clientY);
    }
  };

  const finishPointer = (event, cancelled = false) => {
    pointers.delete(event.pointerId);
    try { canvas.releasePointerCapture?.(event.pointerId); } catch { /* pointeur synthétique */ }
    if (gesture) gesture.ids.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    lastInteraction = performance.now();
    if (pointers.size > 0 || !gesture) return;

    const g = gesture;
    const isTouch = g.type === 'touch';
    const duration = performance.now() - g.start;
    const x = g.startX;
    const y = g.startY;
    gesture = null;
    dragging = false;
    lastPointer = null;
    cancelPendingTap();

    if (cancelled) { lastGesture = 'cancel'; return; }

    if (isTouch) {
      if (g.maxPointers >= 2) {
        const twoFingerTap = g.secondStart !== null
          && g.secondStart - g.start <= 120
          && duration <= 600
          && g.totalMovement < 12;
        if (twoFingerTap) {
          lastGesture = 'two-finger-tap';
          zoomAround(g.midpointX ?? x, g.midpointY ?? y, -0.8);
        } else {
          lastGesture = g.totalMovement > 12 ? 'pinch' : 'two-finger';
        }
        return;
      }
      if (g.moved || duration >= 600) {
        lastGesture = g.totalMovement > 12 ? 'pinch' : 'drag';
        return;
      }
      /* On mesure l'écart entre la fin du 1er tap et le début du 2e,
       * pas entre les deux fins (qui inclut la durée du second tap). */
      const gap = g.start - lastTap?.time;
      if (lastTap && gap >= 0 && gap < 600 && Math.hypot(x - lastTap.x, y - lastTap.y) < 30) {
        lastGesture = 'double-tap';
        lastTap = null;
        zoomAround(x, y, 0.8);
        return;
      }
      lastTap = { time: performance.now(), x, y };
      lastGesture = 'tap';
      pendingTapTimer = setTimeout(() => {
        pendingTapTimer = 0;
        selectAt(x, y);
        lastGesture = 'tap-select';
      }, 600);
      return;
    }

    suppressClick = g.moved;
    lastGesture = g.moved ? 'drag' : 'mouse-click';
  };

  const onPointerUp = (event) => finishPointer(event);
  const onPointerCancel = (event) => finishPointer(event, true);

  const onPointerLeave = () => {
    canvas.classList.remove('point-hover');
    onHover?.(null, 0, 0);
  };

  function selectAt(clientX, clientY) {
    const radius = lastInput === 'touch' ? 20 : 12;
    const city = pickCity(clientX, clientY, radius);
    if (city) {
      onCitySelect?.(city);
      return;
    }
    const name = pick(clientX, clientY);
    if (name) {
      selected = name;
      buildMarker(name);
      const zone = zones.byFeature.get(name);
      if (zone) onZoneSelect?.(zone);
      else onSelect?.(name);
    }
  }

  const onClick = (event) => {
    /* Le tactile est entièrement géré par la machine à gestes pointer. */
    if (lastInput === 'touch') return;
    if (suppressClick) { suppressClick = false; return; }
    if (event.detail > 1) return;
    selectAt(event.clientX, event.clientY);
  };

  const onDoubleClick = (event) => {
    if (lastInput === 'touch') return;
    event.preventDefault();
    zoomAround(event.clientX, event.clientY, event.shiftKey ? -0.8 : 0.8);
    lastInput = 'mouse';
  };

  const onWheel = (event) => {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
    const delta = clamp(event.deltaY * unit, -600, 600);
    zoomAround(event.clientX, event.clientY, -delta / 600);
    lastInput = event.ctrlKey ? 'trackpad' : 'wheel';
  };

  const onVisibility = () => { if (document.hidden) stop(); else start(); };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('dblclick', onDoubleClick);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('visibilitychange', onVisibility);
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  window.addEventListener('resize', resize);
  resize();
  applyView();
  start();

  return {
    setTheme(theme) {
      const light = theme === 'light';
      scene.background.set(light ? 0xe9e2d5 : 0x0d1524);
      ambient.intensity = light ? 1.6 : 1.35;
      sun.intensity = light ? 1.6 : 1.45;
    },
    getView: () => ({
      ...current,
      lastInput,
      targetZoom: target.zoom,
      lastGesture,
    }),
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
    setArcs,
    setSunYear,
    setWireframe,
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
      lastInput = 'button';
    },
    isTouring: () => tourAuto,
    toggleTour() {
      tourAuto = !tourAuto;
      lastInteraction = performance.now();
      return tourAuto;
    },
    setYearAreas(areas, dimension) {
      rebuildProvinces(areas, dimension);
      renderer.render(scene, camera);
    },
    setCities,
    statistics: () => ({
      ...provinceStatistics,
      zoomMax: ZOOM_MAX,
      cityCount,
      arcCount,
      sunYear,
      wireframe,
      citySprite: Boolean(discTexture?.image),
    }),
    rotateBy(dLon, dLat) {
      target.lon = normalizeLongitude(target.lon + dLon);
      target.lat = clampLatitude(target.lat + dLat);
      velocity = { lon: 0, lat: 0 };
      lastInteraction = performance.now();
      lastInput = 'keyboard';
    },
    pick,
    zoneOf: (name) => zones.byFeature.get(name) || null,
    zones: () => zones.zones,
    project,
    arcScreenPoints,
    pickCity,
    cityScreenPoints,
    getSelected: () => selected,
    destroy() {
      stop();
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('dblclick', onDoubleClick);
      canvas.removeEventListener('wheel', onWheel);
      cancelPendingTap();
      clearMarker();
      clearArcs();
      if (provinceMesh) { lonGroup.remove(provinceMesh.group); provinceMesh.dispose(); }
      if (cityPoints) { cityPoints.geometry.dispose(); cityPoints.material.dispose(); }
      discTexture.dispose();
      sphere.geometry.dispose();
      sphere.material.map?.dispose?.();
      sphere.material.dispose();
      terminator.geometry.dispose();
      terminator.material.dispose();
      atmosphere.geometry.dispose();
      atmosphere.material.dispose();
      starsGeometry.dispose();
      stars.material.dispose();
      renderer.dispose();
    },
  };
}
