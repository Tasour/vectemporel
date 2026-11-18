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
    }
    invalidate();
    state.callbacks.onHover(code);
  }

  function setSelected(code) {
    state.selectedCode = code;
    applySelectedUniform();
    invalidate();
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
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vec4 base = texture2D(uMap, vUv);
          vec3 pickColor = texture2D(uPick, vUv).rgb;

          float light = 0.72 + 0.28 * max(dot(normalize(vNormal), uLightDir), 0.0);
          vec3 color = base.rgb * light;
          float rim = pow(1.0 - clamp(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.0);
          color += vec3(0.22, 0.15, 0.06) * rim * 0.3;

          if (distance(pickColor, uHover) < 0.018) {
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

    const pixelBudget = 2200000;
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
      if (state.visible && !state.dragging && !state.pinching &&
          state.autoRotateEnabled && !state.reducedMotion) {
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
    } else if (state.visible && !state.reducedMotion) {
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
    state.renderer.domElement.setPointerCapture(event.pointerId);
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
      state.camera.position.z = clamp(
        state.pinching.cameraZ * (state.pinching.distance / Math.max(20, distance)),
        1.8,
        4.8
      );
      invalidate();
      return;
    }

    if (state.dragging && event.pointerId === state.dragPointerId) {
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
    const wasClick = state.pointers.size === 1 && !state.dragMoved && !state.pinching;
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

  function onPointerLeave() {
    state.hovering = false;
    if (!state.dragging && !state.pinching) setHover(null);
    invalidate();
    scheduleAutoRotate(2200);
  }

  function onWheel(event) {
    event.preventDefault();
    pauseAutoRotate();
    state.camera.position.z = clamp(state.camera.position.z + event.deltaY * 0.0014, 1.8, 4.8);
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

    const spinning = state.autoRotate && !state.reducedMotion;
    const moving = spinning || state.dragging || !!state.pinching;
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
    const canUseHighResolution =
      maxTexture >= 4096 && !smallScreen && !lowMemory && !saveData;
    return canUseHighResolution ? 'globe-map.png' : 'globe-map-2k.png';
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
        loader.loadAsync('globe-pick.png'),
        fetch('globe-palette.json').then((response) => {
          if (!response.ok) throw new Error('Palette du globe indisponible.');
          return response.json();
        }),
      ]);

      mapTexture.colorSpace = THREE.SRGBColorSpace;
      mapTexture.minFilter = THREE.LinearMipmapLinearFilter;
      mapTexture.magFilter = THREE.LinearFilter;
      mapTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
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
    resize();
    state.autoRotate = state.autoRotateEnabled && !state.reducedMotion;
    state.hoverCode = null;
    state.hovering = false;
    if (state.uniforms) state.uniforms.uHover.value.set(-1, -1, -1);
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
      };
    },
  };
})();
