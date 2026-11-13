/*
 * Vectemporel — moteur de globe Three.js.
 *
 * Choix de performance :
 * - une seule sphère texturée (1 draw call) au lieu d'un maillage par pays ;
 * - une texture de picking pour trouver le pays sous le curseur, sans raycast
 *   sur des centaines de meshes ;
 * - aucun post-processing, aucune lumière dynamique, aucun shadow map ;
 * - DPR plafonné par un budget de pixels, rendu suspendu hors overlay ;
 * - aucune allocation dans la boucle de rendu.
 */
(() => {
  'use strict';

  const THREE = window.THREE;
  if (!THREE) {
    console.error('Vectemporel : Three.js est absent.');
    return;
  }

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
    autoRotate: true,
    autoRotateTimer: 0,
    hoverCheckAt: 0,
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
    state.callbacks.onHover(code);
  }

  function setSelected(code) {
    state.selectedCode = code;
    applySelectedUniform();
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
    const now = performance.now();
    if (now - state.hoverCheckAt < 45) return;
    state.hoverCheckAt = now;
    setHover(pickAtClient(clientX, clientY));
  }

  function pauseAutoRotate() {
    state.autoRotate = false;
    clearTimeout(state.autoRotateTimer);
  }

  function scheduleAutoRotate(delay = 3800) {
    clearTimeout(state.autoRotateTimer);
    state.autoRotateTimer = setTimeout(() => {
      if (state.visible && !state.dragging && !state.pinching) state.autoRotate = true;
    }, delay);
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    pauseAutoRotate();
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
      return;
    }

    if (event.pointerType !== 'touch') updateHoverFromPointer(event.clientX, event.clientY);
  }

  function onPointerUp(event) {
    const wasClick = state.pointers.size === 1 && !state.dragMoved && !state.pinching;
    state.pointers.delete(event.pointerId);
    if (state.renderer.domElement.hasPointerCapture(event.pointerId)) {
      state.renderer.domElement.releasePointerCapture(event.pointerId);
    }
    if (state.pointers.size < 2) state.pinching = null;
    if (state.dragging && event.pointerId === state.dragPointerId) {
      state.dragging = false;
      state.dragPointerId = null;
    }

    if (wasClick) {
      const code = pickAtClient(event.clientX, event.clientY);
      if (code) {
        setSelected(code);
        state.callbacks.onSelect(code);
      }
    }
    scheduleAutoRotate();
  }

  function onPointerLeave() {
    if (!state.dragging && !state.pinching) setHover(null);
    scheduleAutoRotate(2200);
  }

  function onWheel(event) {
    event.preventDefault();
    pauseAutoRotate();
    state.camera.position.z = clamp(state.camera.position.z + event.deltaY * 0.0014, 1.8, 4.8);
    scheduleAutoRotate();
  }

  function frame() {
    if (!state.visible) return;
    const dt = Math.min(0.05, state.clock.getDelta());
    if (state.autoRotate) state.globeGroup.rotation.y += dt * 0.065;
    state.renderer.render(state.scene, state.camera);
    state.lastFrame = dt;
  }

  function start() {
    if (state.running) return;
    state.running = true;
    state.visible = true;
    state.clock.start();
    state.renderer.setAnimationLoop(frame);
  }

  function stop() {
    state.visible = false;
    state.running = false;
    if (state.renderer) state.renderer.setAnimationLoop(null);
    clearTimeout(state.autoRotateTimer);
  }

  function setupInteractions() {
    const canvas = state.renderer.domElement;
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerenter', pauseAutoRotate);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    state.resizeObserver = new ResizeObserver(() => resize());
    state.resizeObserver.observe(state.container);
    document.addEventListener('visibilitychange', () => {
      if (!state.ready) return;
      if (document.hidden) {
        state.running = false;
        state.renderer.setAnimationLoop(null);
      } else if (state.visible) {
        state.running = true;
        state.renderer.setAnimationLoop(frame);
      }
    });
  }

  async function init(container, callbacks = {}) {
    if (state.ready) return;
    if (state.initPromise) return state.initPromise;

    state.container = container;
    state.callbacks = { ...state.callbacks, ...callbacks };

    state.initPromise = (async () => {
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

      const maxTexture = renderer.capabilities.maxTextureSize;
      const useHighResolution = maxTexture >= 4096 && window.innerWidth >= 700;
      const mapUrl = useHighResolution ? 'globe-map.png' : 'globe-map-2k.png';

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
      setupInteractions();
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
    state.autoRotate = true;
    state.hoverCode = null;
    if (state.uniforms) state.uniforms.uHover.value.set(-1, -1, -1);
    start();
  }

  function close() {
    stop();
    setHover(null);
    state.pointers.clear();
    state.dragging = false;
    state.pinching = null;
  }

  window.VECTEMPOREL_GLOBE = {
    init,
    open,
    close,
    resize,
    setSelected,
    setHover,
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
