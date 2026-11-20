/*
 * Vectemporel — moteur de globe Three.js.
 *
 * Choix de performance :
 * - une seule sphère texturée (1 draw call) au lieu d'un maillage par pays ;
 * - une texture de picking pour trouver le pays sous le curseur, sans raycast
 *   sur des centaines de meshes ;
 * - aucun post-processing, aucune lumière dynamique, aucun shadow map ;
 * - DPR plafonné par un budget de pixels, rendu suspendu hors overlay ;
 * - rendu à la demande : la boucle s'arrête après quelques frames sans
 *   mouvement (invalidate() la réveille) ;
 * - texture allégée sur petit écran / peu de mémoire / économie de données ;
 * - aucune allocation dans la boucle de rendu.
 */
(() => {
  'use strict';

  const THREE = window.THREE;
  if (!THREE) {
    console.error('Vectemporel : Three.js est absent.');
    return;
  }

  // Nombre de frames sans mouvement avant d'arrêter complètement la boucle rAF.
  const IDLE_FRAMES_BEFORE_STOP = 10;

  const state = {
    ready: false,
    visible: false,
    running: false,
    initPromise: null,
    callbacks: { onHover: () => {}, onSelect: () => {}, onReady: () => {}, onError: () => {} },
    container: null,
    renderer: null,
    scene: null,
    camera: null,
    globeGroup: null,
    globeMesh: null,
    glow: null,
    uniforms: null,
    palette: [],
    paletteByCode: new Map(),
    flagTextures: new Map(),   // code ISO -> CanvasTexture (drapeaux locaux)
    flagImages: new Map(),     // code ISO -> Image SVG source
    flagMasks: new Map(),      // `${code}:${tier}` -> CanvasTexture (contour vectoriel)
    flagBounds: new Map(),     // code ISO -> { bounds, centroid, outline }
    zoomTarget: 4.05,          // zoom visé, interpolé dans frame()
    flagTierCurrent: 0,     // palier de résolution du masque/drapeau
    pickData: null,
    pickWidth: 0,
    pickHeight: 0,
    hoverCode: null,
    selectedCode: null,
    raycaster: new THREE.Raycaster(),
    pickSphere: new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1),
    pickPoint: new THREE.Vector3(),
    pointer: new THREE.Vector2(),
    pointers: new Map(),
    dragging: false,
    dragMoved: false,
    dragPointerId: null,
    lastX: 0,
    lastY: 0,
    pinching: null,
    autoRotate: true,          // état actif (mis en pause pendant les interactions)
    autoRotateEnabled: true,   // préférence utilisateur (setAutoRotate)
    autoRotateTimer: 0,
    hovering: false,           // pointeur au-dessus du canvas
    hoverCheckAt: 0,           // throttle du picking au survol (45 ms)
    dirty: false,              // une frame de rendu est demandée
    idleFrames: 0,
    reducedMotion: false,
    interactionsAttached: false,
    onVisibilityChange: null,
    onMotionChange: null,
    motionQuery: null,
    clock: null,
    resizeObserver: null,
    lastFrame: 0,
  };

  const BASE_YAW = -2.18;
  const BASE_PITCH = 0.16;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // Un glisser n'est valide que si le bouton/contact principal est toujours
  // enfoncé. `state.dragging` seul peut rester vrai après un pointerup étouffé
  // ou une capture perdue : un simple survol serait alors pris pour un glisser
  // (saut), puis le vrai geste ramènerait la sphère (retour).
  function primaryHeld(event) {
    return typeof event.buttons !== 'number' || (event.buttons & 1) !== 0;
  }

  function paletteColor(code) {
    return state.paletteByCode.get(code) || null;
  }

  function applySelectedUniform() {
    if (!state.uniforms) return;
    const color = paletteColor(state.selectedCode);
    state.uniforms.uSelected.value.set(
      color ? color[0] / 255 : -1,
      color ? color[1] / 255 : -1,
      color ? color[2] / 255 : -1
    );
  }

  // Réveille la boucle pour quelques frames, puis la laisse se rendormir.
  function invalidate() {
    state.dirty = true;
    if (!state.running && state.visible && state.renderer && !document.hidden) {
      state.running = true;
      state.idleFrames = 0;
      state.clock.start();
      state.renderer.setAnimationLoop(frame);
    }
  }

  function setHover(code) {
    if (state.hoverCode === code) return;
    state.hoverCode = code;
    if (state.uniforms) {
      const color = paletteColor(code);
      state.uniforms.uHover.value.set(
        color ? color[0] / 255 : -1,
        color ? color[1] / 255 : -1,
        color ? color[2] / 255 : -1
      );
      const texture = code ? flagTextureFor(code, flagTier()) : null;
      const box = code ? flagBox(code) : null;
      if (texture && box && color) {
        const mask = buildFlagMask(code, box);
        state.uniforms.uFlagTex.value = texture;
        state.uniforms.uFlagColor.value.set(color[0] / 255, color[1] / 255, color[2] / 255);
        state.uniforms.uFlagMin.value.set(box.minU, box.minV);
        state.uniforms.uFlagSize.value.set(box.sizeU, box.sizeV);
        state.uniforms.uFlagMask.value = mask;
        state.uniforms.uFlagMaskOn.value = mask ? 1 : 0;
        // Cover : ratio du drapeau préservé, centré, recadré pour couvrir
        // tout le rectangle du pays (pas de marge, pas d'étirement).
        const cosLat = Math.max(0.25, Math.cos((state.flagBounds.get(code)?.centroid?.[1] || 0) * Math.PI / 180));
        const boxAspect = (box.sizeU * 360 * cosLat) / (box.sizeV * 180);
        if (boxAspect > FLAG_ASPECT) state.uniforms.uFlagCover.value.set(1, FLAG_ASPECT / boxAspect);
        else state.uniforms.uFlagCover.value.set(boxAspect / FLAG_ASPECT, 1);
        state.uniforms.uFlagActive.value = 1;
      } else {
        state.uniforms.uFlagActive.value = 0;
        state.uniforms.uFlagMaskOn.value = 0;
      }
    }
    invalidate();
    state.callbacks.onHover(code);
  }

  function setSelected(code) {
    state.selectedCode = code;
    applySelectedUniform();
    invalidate();
  }

  /* Drapeaux locaux : un CanvasTexture par pays, étiré sur la boîte
     équirectangulaire du pays relevée dans la texture de picking. */
  const FLAG_CODES = ['FR', 'GB', 'US', 'DE', 'IT', 'ES', 'CN', 'IN', 'JP', 'EG'];

  /* Rectangle équirectangulaire du drapeau, centré sur le pays et dont le
     ratio 3:2 est préservé en degrés (correction du cosinus de latitude).
     Le drapeau n'est plus étiré sur la boîte englobante, ce qui déformait
     les étoiles chinoises ou le disque indien. */
  const FLAG_ASPECT = 1.5;
  const FLAG_FIT = 0.86;

  /* Centre géométrique du contour métropolitain (centroïde aires pondérées).
     On l'utilise comme origine du drapeau, pas le milieu de la boîte. */
  function polygonCentroid(points) {
    if (!Array.isArray(points) || points.length < 3) return null;
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < points.length; i += 1) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[(i + 1) % points.length];
      if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
      const cross = x0 * y1 - x1 * y0;
      area += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
    }
    if (Math.abs(area) < 1e-9) return null;
    return [cx / (3 * area), cy / (3 * area)];
  }

  function flagBox(code) {
    const record = state.flagBounds.get(code);
    if (!record) return null;
    const { bounds, centroid } = record;
    const { minLon, maxLon, minLat, maxLat } = bounds;
    if (![minLon, maxLon, minLat, maxLat].every(Number.isFinite)) return null;
    const centerLon = centroid ? centroid[0] : (minLon + maxLon) / 2;
    const centerLat = centroid ? centroid[1] : (minLat + maxLat) / 2;
    // Rectangle COUVRE-TOUT : centré sur le centroïde, assez grand pour
    // envelopper tout le pays. Le drapeau sera découpé sur ce rectangle, donc
    // il remplira toute la surface du pays sans marge.
    const pad = 1.03;
    const halfLon = Math.max(0.25, Math.max(centerLon - minLon, maxLon - centerLon)) * pad;
    const halfLat = Math.max(0.25, Math.max(centerLat - minLat, maxLat - centerLat)) * pad;
    return {
      minU: (centerLon - halfLon + 180) / 360,
      minV: (centerLat - halfLat + 90) / 180,
      sizeU: (2 * halfLon) / 360,
      sizeV: (2 * halfLat) / 180,
    };
  }

  async function prepareFlags() {
    await Promise.all(FLAG_CODES.map((code) => new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        state.flagImages.set(code, image);
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = Math.round(1024 / FLAG_ASPECT);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = Math.min(4, state.renderer.capabilities.getMaxAnisotropy());
        state.flagTextures.set(code, texture);
        resolve();
      };
      image.onerror = () => resolve();
      image.src = `public/flags/${code}.svg`;
    })));
  }

  /* Masque vectoriel du pays, rasterisé uniquement pour le pays survolé et à
     une résolution adaptée au zoom. L'antialiasing du canvas remplace les
     marches d'escalier du picking 2048×1024. */
  function flagTier() {
    const z = state.zoomTarget;
    return z <= 2.2 ? 2048 : z <= 3.0 ? 1024 : 512;
  }

  function buildFlagMask(code, box) {
    const rgb = state.paletteByCode.get(code);
    if (!rgb || !box || !state.pickData) return null;
    const tier = flagTier();
    const key = `${code}:${tier}`;
    if (state.flagMasks.has(key)) return state.flagMasks.get(key);
    const width = tier;
    const height = Math.max(1, Math.round(tier * box.sizeV / box.sizeU));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const out = ctx.createImageData(width, height);
    const data = state.pickData;
    const pw = state.pickWidth;
    const ph = state.pickHeight;
    const sample = (px, py) => {
      const x0 = Math.max(0, Math.min(pw - 1, Math.floor(px)));
      const y0 = Math.max(0, Math.min(ph - 1, Math.floor(py)));
      const x1 = Math.min(pw - 1, x0 + 1);
      const y1 = Math.min(ph - 1, y0 + 1);
      const fx = Math.max(0, Math.min(1, px - x0));
      const fy = Math.max(0, Math.min(1, py - y0));
      const result = [0, 0, 0];
      for (let c = 0; c < 3; c += 1) {
        const a = data[(y0 * pw + x0) * 4 + c];
        const b = data[(y0 * pw + x1) * 4 + c];
        const d = data[(y1 * pw + x0) * 4 + c];
        const e = data[(y1 * pw + x1) * 4 + c];
        result[c] = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
      }
      return result;
    };
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const u = box.minU + ((x + 0.5) / width) * box.sizeU;
        const v = box.minV + (1 - (y + 0.5) / height) * box.sizeV;
        const [r, g, b] = sample(u * pw - 0.5, (1 - v) * ph - 0.5);
        const dist = Math.sqrt((r - rgb[0]) ** 2 + (g - rgb[1]) ** 2 + (b - rgb[2]) ** 2);
        const alpha = Math.max(0, Math.min(1, (0.16 - dist) / 0.1));
        const i = (y * width + x) * 4;
        out.data[i] = 255;
        out.data[i + 1] = 255;
        out.data[i + 2] = 255;
        out.data[i + 3] = Math.round(alpha * 255);
      }
    }
    ctx.putImageData(out, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    state.flagMasks.set(key, texture);
    return texture;
  }

  /* Texture du drapeau à la résolution du palier de zoom. Seul le pays
     survolé est reconstruit en haute définition, pas les 10 à la fois. */
  function flagTextureFor(code, tier) {
    const base = state.flagTextures.get(code);
    if (tier <= 1024 || !state.flagImages.has(code)) return base;
    const key = `${code}:${tier}`;
    if (state.flagTextures.has(key)) return state.flagTextures.get(key);
    const image = state.flagImages.get(code);
    const canvas = document.createElement('canvas');
    canvas.width = tier;
    canvas.height = Math.round(tier / FLAG_ASPECT);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = Math.min(4, state.renderer.capabilities.getMaxAnisotropy());
    state.flagTextures.set(key, texture);
    return texture;
  }

  function buildScene(pickTexture, mapTexture) {
    state.scene = new THREE.Scene();
    state.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
    state.camera.position.set(0, 0, 4.05);

    state.globeGroup = new THREE.Group();
    state.globeGroup.rotation.set(BASE_PITCH, BASE_YAW, 0);
    state.scene.add(state.globeGroup);

    state.uniforms = {
      uMap: { value: mapTexture },
      uPick: { value: pickTexture },
      uHover: { value: new THREE.Vector3(-1, -1, -1) },
      uSelected: { value: new THREE.Vector3(-1, -1, -1) },
      uLightDir: { value: new THREE.Vector3(-0.42, 0.62, 0.72).normalize() },
      uFlagTex: { value: null },
      uFlagColor: { value: new THREE.Vector3(-1, -1, -1) },
      uFlagMin: { value: new THREE.Vector2(0, 0) },
      uFlagSize: { value: new THREE.Vector2(1, 1) },
      uFlagActive: { value: 0 },
      uFlagMask: { value: null },
      uFlagMaskOn: { value: 0 },
      uFlagCover: { value: new THREE.Vector2(1, 1) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: state.uniforms,
      depthWrite: true,
      depthTest: true,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform sampler2D uPick;
        uniform vec3 uHover;
        uniform vec3 uSelected;
        uniform vec3 uLightDir;
        uniform sampler2D uFlagTex;
        uniform vec3 uFlagColor;
        uniform vec2 uFlagMin;
        uniform vec2 uFlagSize;
        uniform float uFlagActive;
        uniform sampler2D uFlagMask;
        uniform float uFlagMaskOn;
        uniform vec2 uFlagCover;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vec4 base = texture2D(uMap, vUv);
          vec3 pickColor = texture2D(uPick, vUv).rgb;

          float light = 0.72 + 0.28 * max(dot(normalize(vNormal), uLightDir), 0.0);
          vec3 color = base.rgb * light;
          float rim = pow(1.0 - clamp(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.0);
          color += vec3(0.22, 0.15, 0.06) * rim * 0.3;

          if (uFlagActive > 0.5) {
            vec2 rawUv = (vUv - uFlagMin) / uFlagSize;
            vec2 flagUv = clamp(rawUv, 0.0, 1.0);
            float inside = step(0.0, rawUv.x) * step(rawUv.x, 1.0)
                         * step(0.0, rawUv.y) * step(rawUv.y, 1.0);
            // Masque vectoriel haute résolution pour le pays survolé : des
            // bords nets même en zoomant, au lieu du picking pixelisé.
            float mask = uFlagMaskOn > 0.5 ? texture2D(uFlagMask, flagUv).a : step(0.02, 1.0 - distance(pickColor, uFlagColor));
            if (inside > 0.5 && mask > 0.04) {
              vec2 texUv = (flagUv - 0.5) * uFlagCover + 0.5;
              vec3 flag = texture2D(uFlagTex, texUv).rgb;
              color = mix(color, flag * light, 0.94 * mask);
            } else if (distance(pickColor, uHover) < 0.018) {
              color = mix(color, vec3(0.98, 0.87, 0.62), 0.54);
            }
          } else if (distance(pickColor, uHover) < 0.018) {
            color = mix(color, vec3(0.98, 0.87, 0.62), 0.54);
          }
          if (distance(pickColor, uSelected) < 0.018) {
            color = mix(color, vec3(1.0, 0.82, 0.48), 0.18);
          }

          gl_FragColor = vec4(color, 1.0);
          #include <encodings_fragment>
        }
      `,
    });

    const geometry = new THREE.SphereGeometry(1, 64, 40);
    state.globeMesh = new THREE.Mesh(geometry, material);
    state.globeGroup.add(state.globeMesh);

    applySelectedUniform();
  }

  function resize() {
    if (!state.renderer || !state.container) return;
    const width = state.container.clientWidth;
    const height = state.container.clientHeight;
    if (width < 20 || height < 20) return;

    // Plus de budget de pixels uniquement quand la scène visible est zoomée.
    const pixelBudget = state.zoomTarget <= 2.8 ? 3600000 : 2200000;
    const budgetDpr = Math.sqrt(pixelBudget / Math.max(1, width * height));
    const dpr = clamp(Math.min(window.devicePixelRatio || 1, 1.5, budgetDpr), 0.7, 1.5);

    state.renderer.setPixelRatio(dpr);
    state.renderer.setSize(width, height, false);
    state.camera.aspect = width / height;
    state.camera.updateProjectionMatrix();
    invalidate();
  }

  function codeAtLocalPoint(point) {
    if (!state.pickData) return null;
    const y = clamp(point.y, -1, 1);
    const latitude = Math.asin(y);
    let longitude = Math.atan2(point.z, -point.x);
    if (longitude < 0) longitude += Math.PI * 2;
    const u = longitude / (Math.PI * 2);
    const v = (latitude + Math.PI / 2) / Math.PI;
    const x = clamp(Math.floor(u * state.pickWidth), 0, state.pickWidth - 1);
    const py = clamp(Math.floor((1 - v) * state.pickHeight), 0, state.pickHeight - 1);
    const index = (py * state.pickWidth + x) * 4;
    const data = state.pickData;
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];

    if (r + g + b < 24) return null;

    let best = null;
    let bestDistance = Infinity;
    for (const item of state.palette) {
      const dr = r - item[0];
      const dg = g - item[1];
      const db = b - item[2];
      const distance = dr * dr + dg * dg + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = item;
      }
    }
    return best ? best[3] : null;
  }

  function pickAtClient(clientX, clientY) {
    if (!state.renderer || !state.globeMesh) return null;
    const rect = state.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    state.raycaster.setFromCamera(state.pointer, state.camera);
    if (!state.raycaster.ray.intersectSphere(state.pickSphere, state.pickPoint)) return null;
    state.globeMesh.updateWorldMatrix(true, false);
    state.globeMesh.worldToLocal(state.pickPoint);
    return codeAtLocalPoint(state.pickPoint);
  }

  function debugPick(clientX, clientY) {
    if (!state.renderer || !state.globeMesh) return null;
    const rect = state.renderer.domElement.getBoundingClientRect();
    state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    state.raycaster.setFromCamera(state.pointer, state.camera);
    if (!state.raycaster.ray.intersectSphere(state.pickSphere, state.pickPoint)) return null;
    state.globeMesh.updateWorldMatrix(true, false);
    state.globeMesh.worldToLocal(state.pickPoint);
    return {
      local: [state.pickPoint.x, state.pickPoint.y, state.pickPoint.z],
      code: codeAtLocalPoint(state.pickPoint),
    };
  }

  function updateHoverFromPointer(clientX, clientY) {
    state.hovering = true;
    const now = performance.now();
    if (now - state.hoverCheckAt < 45) return;
    state.hoverCheckAt = now;
    setHover(pickAtClient(clientX, clientY));
  }

  function pauseAutoRotate() {
    state.autoRotate = false;
    clearTimeout(state.autoRotateTimer);
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  function scheduleAutoRotate(delay = 3800) {
    clearTimeout(state.autoRotateTimer);
    state.autoRotateTimer = setTimeout(() => {
      if (state.dragging || state.pinching) {
        // Geste encore en cours : on reprogramme au lieu de perdre la reprise.
        scheduleAutoRotate(delay);
        return;
      }
      if (state.visible && state.autoRotateEnabled && !state.reducedMotion) {
        state.autoRotate = true;
        invalidate(); // la boucle a pu s'arrêter entre-temps
      }
    }, delay);
  }

  // Préférence utilisateur : setAutoRotate(false) désactive aussi la reprise.
  function setAutoRotate(enabled) {
    state.autoRotateEnabled = !!enabled;
    if (!state.autoRotateEnabled) {
      pauseAutoRotate();
    } else if (state.visible && !state.reducedMotion &&
               !state.dragging && !state.pinching) {
      state.autoRotate = true;
      invalidate();
    }
  }

  function onMotionChange(event) {
    state.reducedMotion = !!event.matches;
    if (state.reducedMotion) {
      // Coupure « à chaud » : arrêt immédiat de la rotation et de sa reprise.
      pauseAutoRotate();
      invalidate();
    } else if (state.autoRotateEnabled && state.visible) {
      state.autoRotate = true;
      invalidate();
    }
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    pauseAutoRotate();
    invalidate();
    // Un pointeur synthétique n'a pas de capture active : setPointerCapture()
    // peut lever NotFoundError. Le glisser reste valide sans capture, on ne
    // laisse donc pas une exception interrompre l'initialisation du geste.
    try {
      state.renderer.domElement.setPointerCapture(event.pointerId);
    } catch { /* capture indisponible : le glisser reste géré sur le canvas */ }
    state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (state.pointers.size === 1) {
      state.dragging = true;
      state.dragMoved = false;
      state.dragPointerId = event.pointerId;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
    } else if (state.pointers.size === 2) {
      const points = [...state.pointers.values()];
      state.dragging = false;
      state.dragMoved = true;
      state.pinching = {
        distance: Math.max(20, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)),
        cameraZ: state.camera.position.z,
      };
    }
  }

  function onPointerMove(event) {
    if (state.pointers.has(event.pointerId)) {
      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (state.pointers.size >= 2 && state.pinching) {
      const points = [...state.pointers.values()].slice(0, 2);
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      state.zoomTarget = clamp(
        state.pinching.cameraZ * (state.pinching.distance / Math.max(20, distance)),
        1.8,
        4.8
      );
      invalidate();
      return;
    }

    if (state.dragging && event.pointerId === state.dragPointerId) {
      if (!primaryHeld(event)) {
        // Survol (bouton relâché) : on resynchronise l'origine sans tourner.
        // C'est ce décalage d'origine qui faisait sauter puis revenir la sphère.
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        return;
      }
      const dx = event.clientX - state.lastX;
      const dy = event.clientY - state.lastY;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 2) state.dragMoved = true;
      state.globeGroup.rotation.y += dx * 0.0042;
      state.globeGroup.rotation.x = clamp(state.globeGroup.rotation.x + dy * 0.0042, -1.15, 1.15);
      invalidate();
      return;
    }

    if (event.pointerType !== 'touch') updateHoverFromPointer(event.clientX, event.clientY);
  }

  function releasePointer(event) {
    state.pointers.delete(event.pointerId);
    if (state.renderer.domElement.hasPointerCapture(event.pointerId)) {
      state.renderer.domElement.releasePointerCapture(event.pointerId);
    }
    if (state.pointers.size < 2) state.pinching = null;
    if (state.dragging && event.pointerId === state.dragPointerId) {
      state.dragging = false;
      state.dragPointerId = null;
    }
    invalidate();
  }

  function onPointerUp(event) {
    // Le clic n'est reconnu que sur un pointerup « propre » (jamais sur un
    // pointercancel, qui reste une annulation et ne doit rien sélectionner).
    const wasClick = state.pointers.size === 1 &&
      event.pointerId === state.dragPointerId && !state.dragMoved && !state.pinching;
    releasePointer(event);
    if (wasClick) {
      const code = pickAtClient(event.clientX, event.clientY);
      if (code) {
        setSelected(code);
        state.callbacks.onSelect(code);
      }
    }
    scheduleAutoRotate();
  }

  function onPointerCancel(event) {
    // Annulation (interruption système, sortie de capture, geste avorté) :
    // on nettoie l'état sans jamais déclencher de sélection fantôme.
    state.dragMoved = true;
    releasePointer(event);
    scheduleAutoRotate();
  }

  function onLostPointerCapture(event) {
    // Capture perdue avant le pointerup (changement de vue, annulation natif) :
    // sans ce nettoyage, state.dragging resterait vrai et le prochain survol
    // ferait tourner la sphère à partir d'une origine périmée.
    if (!state.dragging || event.pointerId !== state.dragPointerId) return;
    state.dragMoved = true;
    releasePointer(event);
    scheduleAutoRotate();
  }

  function onPointerLeave() {
    state.hovering = false;
    if (!state.dragging && !state.pinching) setHover(null);
    invalidate();
    scheduleAutoRotate(2200);
  }

  function onWheel(event) {
    event.preventDefault();
    pauseAutoRotate();
    state.zoomTarget = clamp(state.zoomTarget + event.deltaY * 0.0014, 1.8, 4.8);
    invalidate();
    scheduleAutoRotate();
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  function stopLoop() {
    state.running = false;
    if (state.renderer) state.renderer.setAnimationLoop(null);
  }

  function frame() {
    if (!state.visible || !state.renderer || document.hidden) {
      stopLoop();
      return;
    }
    const dt = Math.min(0.05, state.clock.getDelta());
    state.lastFrame = dt;

    // L'auto-rotation ne doit jamais s'additionner au geste en cours : sinon
    // la sphère repart toute seule dès qu'un timer la réactive pendant un drag.
    const spinning = state.autoRotate && !state.reducedMotion &&
      !state.dragging && !state.pinching;
    const dz = state.zoomTarget - state.camera.position.z;
    const zooming = Math.abs(dz) > 0.002;
    if (zooming) {
      state.camera.position.z += dz * Math.min(1, dt * 12);
      state.dirty = true;
      const tier = flagTier();
      if (tier !== state.flagTierCurrent) {
        state.flagTierCurrent = tier;
        resize(); // plus de pixels uniquement quand on est zoomé sur la scène visible
        if (state.hoverCode) { const code = state.hoverCode; setHover(null); setHover(code); }
      }
    }
    const moving = spinning || state.dragging || !!state.pinching || zooming;
    if (spinning) state.globeGroup.rotation.y += dt * 0.065;

    if (moving || state.dirty) {
      state.renderer.render(state.scene, state.camera);
      state.dirty = false;
      state.idleFrames = 0;
      return;
    }

    // Plus de rotation, plus de geste, plus de rendu demandé : on compte les
    // frames inutiles puis on arrête la boucle rAF (au repos, 0 render()).
    state.idleFrames += 1;
    if (state.idleFrames >= IDLE_FRAMES_BEFORE_STOP) stopLoop();
  }

  function start() {
    if (state.running) return;
    state.running = true;
    state.visible = true;
    state.idleFrames = 0;
    state.dirty = true;
    attachInteractions();
    state.clock.start();
    state.renderer.setAnimationLoop(frame);
  }

  function stop() {
    state.visible = false;
    stopLoop();
    clearTimeout(state.autoRotateTimer);
  }

  function onVisibilityChange() {
    if (!state.ready) return;
    if (document.hidden) {
      stopLoop();
      clearTimeout(state.autoRotateTimer);
    } else if (state.visible) {
      invalidate();
    }
  }

  function attachInteractions() {
    if (state.interactionsAttached || !state.renderer) return;
    const canvas = state.renderer.domElement;
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('lostpointercapture', onLostPointerCapture);
    canvas.addEventListener('pointerenter', pauseAutoRotate);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    if (!state.resizeObserver) state.resizeObserver = new ResizeObserver(() => resize());
    state.resizeObserver.observe(state.container);
    document.addEventListener('visibilitychange', onVisibilityChange);

    if (state.motionQuery && state.onMotionChange) {
      if (state.motionQuery.addEventListener) {
        state.motionQuery.addEventListener('change', state.onMotionChange);
      } else if (state.motionQuery.addListener) {
        state.motionQuery.addListener(state.onMotionChange);
      }
    }
    state.interactionsAttached = true;
  }

  // Retire tous les écouteurs sans détruire la scène : une réouverture
  // (open()) rappelle attachInteractions() et tout est réinstallé.
  function detachInteractions() {
    if (!state.interactionsAttached || !state.renderer) return;
    const canvas = state.renderer.domElement;
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
    canvas.removeEventListener('lostpointercapture', onLostPointerCapture);
    canvas.removeEventListener('pointerenter', pauseAutoRotate);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('wheel', onWheel, { passive: false });
    canvas.removeEventListener('contextmenu', onContextMenu);

    if (state.resizeObserver) state.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (state.motionQuery && state.onMotionChange) {
      if (state.motionQuery.removeEventListener) {
        state.motionQuery.removeEventListener('change', state.onMotionChange);
      } else if (state.motionQuery.removeListener) {
        state.motionQuery.removeListener(state.onMotionChange);
      }
    }
    state.interactionsAttached = false;
  }

  // « Dispose » léger et réversible : on libère les écouteurs et l'observateur
  // mais on garde renderer/textures/géométrie pour permettre une réouverture.
  function dispose() {
    stop();
    detachInteractions();
    state.hovering = false;
    state.pointers.clear();
    state.dragging = false;
    state.pinching = null;
    state.dragPointerId = null;
  }

  function chooseMapUrl(maxTexture) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const saveData = !!(connection && connection.saveData);
    const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4;
    const smallScreen = window.innerWidth < 700;
    // V2-02 : variante 2k par défaut (417 Ko au lieu de 1,25 Mo). La haute
    // définition reste explicitement demandable avec ?hires=1.
    const hires = typeof location !== 'undefined' && new URLSearchParams(location.search).has('hires');
    const canUseHighResolution =
      hires && maxTexture >= 4096 && !smallScreen && !lowMemory && !saveData;
    return canUseHighResolution ? 'public/globe-map.png' : 'public/globe-map-2k.png';
  }

  async function init(container, callbacks = {}) {
    if (state.ready) return;
    if (state.initPromise) return state.initPromise;

    state.container = container;
    state.callbacks = { ...state.callbacks, ...callbacks };

    state.initPromise = (async () => {
      state.reducedMotion = prefersReducedMotion();
      state.autoRotateEnabled = true;
      state.autoRotate = !state.reducedMotion;
      try {
        state.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        state.onMotionChange = onMotionChange;
      } catch {
        state.motionQuery = null;
        state.onMotionChange = null;
      }

      const renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
        premultipliedAlpha: true,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.autoClear = true;
      if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
      if ('toneMapping' in renderer) renderer.toneMapping = THREE.NoToneMapping;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.className = 'globe-webgl';
      container.appendChild(renderer.domElement);
      state.renderer = renderer;

      state.clock = new THREE.Clock(false);

      const mapUrl = chooseMapUrl(renderer.capabilities.maxTextureSize);

      const loader = new THREE.TextureLoader();
      const [mapTexture, pickTexture, palette] = await Promise.all([
        loader.loadAsync(mapUrl),
        loader.loadAsync('public/globe-pick.png'),
        fetch('public/globe-palette.json').then((response) => {
          if (!response.ok) throw new Error('Palette du globe indisponible.');
          return response.json();
        }),
      ]);

      mapTexture.colorSpace = THREE.SRGBColorSpace;
      mapTexture.minFilter = THREE.LinearMipmapLinearFilter;
      mapTexture.magFilter = THREE.LinearFilter;
      mapTexture.anisotropy = Math.min(4, state.renderer.capabilities.getMaxAnisotropy());
      mapTexture.generateMipmaps = true;

      pickTexture.colorSpace = THREE.NoColorSpace;
      pickTexture.minFilter = THREE.NearestFilter;
      pickTexture.magFilter = THREE.NearestFilter;
      pickTexture.generateMipmaps = false;

      state.palette = palette.palette.map((item) => [...item.rgb, item.code]);
      state.paletteByCode = new Map(
        state.palette.map((item) => [item[3], [item[0], item[1], item[2]]])
      );
      state.pickWidth = palette.width;
      state.pickHeight = palette.height;

      const pickCanvas = document.createElement('canvas');
      pickCanvas.width = palette.width;
      pickCanvas.height = palette.height;
      const pickContext = pickCanvas.getContext('2d', { willReadFrequently: true });
      pickContext.drawImage(pickTexture.image, 0, 0);
      state.pickData = pickContext.getImageData(0, 0, palette.width, palette.height).data;

      await prepareFlags();
      state.flagTierCurrent = flagTier();
      buildScene(pickTexture, mapTexture);
      attachInteractions();
      resize();
      state.ready = true;
      state.callbacks.onReady();
    })().catch((error) => {
      console.error('Globe Three.js :', error);
      state.initPromise = null;
      state.callbacks.onError(error);
      throw error;
    });

    return state.initPromise;
  }

  function open(selectedCode) {
    if (!state.ready) return;
    if (selectedCode !== undefined) setSelected(selectedCode);
    // Sans code à réappliquer, l'uniforme uSelected garderait la couleur du
    // pays précédemment choisi : la surbrillance resterait affichée sur un
    // autre pays que celui de la vue réouverte. On aligne uSelected sur
    // uHover, déjà remis à -1 plus bas.
    else if (state.selectedCode !== null) setSelected(null);
    resize();
    state.autoRotate = state.autoRotateEnabled && !state.reducedMotion &&
      !state.dragging && !state.pinching;
    state.hoverCode = null;
    state.hovering = false;
    if (state.uniforms) {
      state.uniforms.uHover.value.set(-1, -1, -1);
      state.uniforms.uFlagActive.value = 0;
    }
    start();
  }

  function close() {
    stop();
    setHover(null);
    dispose();
  }

  window.VECTEMPOREL_GLOBE = {
    init,
    open,
    close,
    resize,
    setSelected,
    setHover,
    setAutoRotate,
    invalidate,
    dispose,
    debugPick,
    getFlagMaskPng() { return state.uniforms?.uFlagMask.value?.image?.toDataURL?.('image/png') || null; },
    registerCountries(list) {
      if (!Array.isArray(list)) return;
      list.forEach((country) => {
        if (country && country.code && country.bounds) {
          state.flagBounds.set(country.code, {
            bounds: country.bounds,
            centroid: polygonCentroid(country.outline),
            outline: country.outline,
          });
        }
      });
      const current = state.hoverCode;
      if (current) { setHover(null); setHover(current); }
    },
    get ready() {
      return state.ready;
    },
    getInfo() {
      if (!state.renderer) return null;
      const render = state.renderer.info.render;
      return {
        calls: render.calls,
        triangles: render.triangles,
        geometries: state.renderer.info.memory.geometries,
        textures: state.renderer.info.memory.textures,
        pixelRatio: state.renderer.getPixelRatio(),
        width: state.renderer.domElement.width,
        height: state.renderer.domElement.height,
        pointers: state.pointers.size,
        dragging: state.dragging,
        pinching: Boolean(state.pinching),
        rotationY: state.globeGroup.rotation.y,
        flagActive: state.uniforms?.uFlagActive.value,
        maskOn: state.uniforms?.uFlagMaskOn.value,
        cameraZ: state.camera.position.z,
        zoomTarget: state.zoomTarget,
        outlines: state.flagBounds.size,
        flagMin: state.uniforms ? [...state.uniforms.uFlagMin.value.toArray()] : null,
        flagSize: state.uniforms ? [...state.uniforms.uFlagSize.value.toArray()] : null,
      };
    },
  };
})();
