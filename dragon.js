/* Vectemporel — Queue du dragon.
 *
 * Un canevas temporel infini de type Prezi : le temps est une spirale
 * logarithmique auto-similaire. Le zoom et le déplacement font avancer ou
 * reculer le long de la queue ; chaque écaille est un repère daté.
 *
 * Géométrie : r(u) = e^(−b·Δθ·u), θ(u) = Δθ·u. En centrant la caméra sur
 * P(u) et en fixant sa hauteur de vue à k·r(u), la disposition relative des
 * écailles ne dépend que de leur écart à l’indice courant : la queue peut
 * donc être parcourue sans discontinuité, et le zoom est exactement un
 * déplacement dans le temps.
 *
 * Aucune donnée n’est inventée : les écailles hors corpus sont explicitement
 * marquées « hors corpus » ; les visuels non photographiques sont signalés
 * comme motifs génératifs non documentaires.
 */
(() => {
  'use strict';

  const THREE = window.THREE;
  const DATA = window.VECTEMPOREL_DATA;
  const META = window.VECTEMPOREL_SPIRAL_META || {};
  const IMAGES = window.VECTEMPOREL_EVENT_IMAGES || {};
  const TAGS = DATA?.tags || {};
  const COUNTRIES = (DATA?.countries || []).filter((country) => country.events?.length);

  const PHI = (1 + Math.sqrt(5)) / 2;
  const GOLDEN_B = Math.log(PHI) / (Math.PI / 2);
  const B = GOLDEN_B * 0.55;
  const DTHETA = 0.58;
  const VIEW = 1.28;
  const TILE_W = 0.48;
  const BASE_W = 132;
  const BASE_H = 170;
  const PAD = 3;
  const PHI0 = -1.74;
  const TAU = Math.PI * 2;

  const state = {
    initialized: false,
    open: false,
    countryId: null,
    story: null,
    p: 0,
    target: 0,
    cardIndex: -1,
    renderer: null,
    scene: null,
    camera: null,
    root: null,
    resizeObserver: null,
    raf: 0,
    size: { w: 0, h: 0 },
    focusScreen: 0.5,
    tileEls: new Map(),
    positions: new Map(),
    mediaCache: new Map(),
    artCache: new Map(),
    lastFocus: null,
    hideTimer: 0,
    pointers: new Map(),
    drag: null,
    pinchDist: 0,
    suppressClick: false,
    suppressTimer: 0,
    used: false,
    labelEra: -1,
    lastSceneRender: 0,
  };

  const els = {};

  /* ---------------------------------------------------------------------- */
  /* Utilitaires                                                            */
  /* ---------------------------------------------------------------------- */

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function formatYear(year) {
    if (year === null || year === undefined || Number.isNaN(year)) return '—';
    if (year < 0) return `${Math.abs(year)} av. J.-C.`;
    if (year === 0) return 'an 1';
    return String(year);
  }

  function formatRange(start, end) {
    return `${formatYear(start)} → ${formatYear(end)}`;
  }

  function tagColor(tag) {
    return TAGS[tag]?.color || '#e6b96f';
  }

  function tagLabel(tag) {
    return TAGS[tag]?.label || tag;
  }

  function hash(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      value ^= text.charCodeAt(i);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  function rng(seed) {
    let value = seed || 1;
    return () => {
      value ^= value << 13;
      value ^= value >>> 17;
      value ^= value << 5;
      return ((value >>> 0) % 10000) / 10000;
    };
  }

  function mix(hexA, hexB, t) {
    const a = hexA.replace('#', '');
    const b = hexB.replace('#', '');
    const parse = (value) => [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
    ];
    const [r1, g1, b1] = parse(a.length === 3 ? a.split('').map((c) => c + c).join('') : a);
    const [r2, g2, b2] = parse(b.length === 3 ? b.split('').map((c) => c + c).join('') : b);
    const channel = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
    return `#${channel(r1 + (r2 - r1) * t)}${channel(g1 + (g2 - g1) * t)}${channel(b1 + (b2 - b1) * t)}`;
  }

  function rgba(hex, alpha) {
    const value = hex.replace('#', '');
    const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function eraIndexForYear(country, year) {
    for (let i = 0; i < country.eras.length; i += 1) {
      const era = country.eras[i];
      if (year >= era.start && (year < era.end || (i === country.eras.length - 1 && year <= era.end))) {
        return i;
      }
    }
    return -1;
  }

  /* ---------------------------------------------------------------------- */
  /* Illustrations génératives                                              */
  /* ---------------------------------------------------------------------- */

  function motifs(tag, seed, color, pale, width, height) {
    const rand = rng(seed);
    const cx = width * 0.58;
    const cy = height * 0.44;
    const parts = [];

    if (tag === 'guerre') {
      for (let i = 0; i < 6; i += 1) {
        const x = width * (0.12 + i * 0.15);
        const span = height * (0.22 + rand() * 0.16);
        parts.push(`<path d="M${x} ${cy + span} L${x + span * 0.32} ${cy} L${x} ${cy - span}" fill="none" stroke="${pale}" stroke-opacity="${0.18 + i * 0.045}" stroke-width="2.2" />`);
      }
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${width * 0.24}" fill="none" stroke="${color}" stroke-opacity=".5" stroke-width="1.2" stroke-dasharray="3 7" />`);
    } else if (tag === 'politique') {
      for (let i = 0; i < 5; i += 1) {
        const x = width * (0.24 + i * 0.13);
        const top = cy - height * 0.16;
        parts.push(`<rect x="${x}" y="${top}" width="${width * 0.045}" height="${height * 0.31}" fill="${pale}" fill-opacity="${0.18 + i * 0.03}" />`);
        parts.push(`<rect x="${x - width * 0.012}" y="${top - 5}" width="${width * 0.069}" height="5" fill="${color}" fill-opacity=".45" />`);
      }
      parts.push(`<path d="M${width * 0.17} ${cy + height * 0.16} h${width * 0.66}" stroke="${color}" stroke-opacity=".55" stroke-width="1.4" />`);
    } else if (tag === 'sciences') {
      for (let i = 0; i < 4; i += 1) {
        parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${width * (0.13 + i * 0.055)}" ry="${height * (0.055 + i * 0.03)}" fill="none" stroke="${pale}" stroke-opacity="${0.42 - i * 0.06}" stroke-width="1.2" transform="rotate(${-24 + i * 18} ${cx} ${cy})" />`);
      }
      for (let i = 0; i < 18; i += 1) {
        parts.push(`<circle cx="${cx + (rand() - 0.5) * width * 0.5}" cy="${cy + (rand() - 0.5) * height * 0.32}" r="${0.8 + rand() * 1.6}" fill="${pale}" fill-opacity="${0.2 + rand() * 0.5}" />`);
      }
    } else if (tag === 'arts') {
      for (let i = 0; i < 5; i += 1) {
        const y = height * (0.22 + i * 0.11);
        parts.push(`<path d="M${width * 0.02} ${y} C ${width * 0.32} ${y - height * 0.18}, ${width * 0.58} ${y + height * 0.20}, ${width * 0.98} ${y - height * 0.06}" fill="none" stroke="${i % 2 ? color : pale}" stroke-opacity="${0.16 + i * 0.06}" stroke-width="${1 + i * 0.4}" />`);
      }
      parts.push(`<circle cx="${width * 0.72}" cy="${height * 0.32}" r="${width * 0.09}" fill="${color}" fill-opacity=".22" />`);
    } else if (tag === 'religion') {
      parts.push(`<path d="M${width * 0.28} ${height * 0.56} V${height * 0.33} Q${width * 0.28} ${height * 0.19} ${width * 0.46} ${height * 0.19} Q${width * 0.64} ${height * 0.19} ${width * 0.64} ${height * 0.33} V${height * 0.56}" fill="none" stroke="${pale}" stroke-opacity=".4" stroke-width="2" />`);
      for (let i = 0; i < 9; i += 1) {
        const angle = (-Math.PI / 2) + (i - 4) * 0.16;
        parts.push(`<line x1="${width * 0.46}" y1="${height * 0.22}" x2="${width * 0.46 + Math.cos(angle) * width * 0.26}" y2="${height * 0.22 + Math.sin(angle) * width * 0.26}" stroke="${color}" stroke-opacity=".22" stroke-width="1.1" />`);
      }
    } else if (tag === 'societe') {
      for (let i = 0; i < 44; i += 1) {
        const x = width * (0.1 + rand() * 0.8);
        const y = height * (0.18 + rand() * 0.42);
        parts.push(`<circle cx="${x}" cy="${y}" r="${1.1 + rand() * 3.4}" fill="${i % 5 === 0 ? color : pale}" fill-opacity="${0.12 + rand() * 0.4}" />`);
      }
    } else if (tag === 'economie') {
      for (let i = 0; i < 7; i += 1) {
        const x = width * (0.14 + i * 0.105);
        const h = height * (0.06 + rand() * 0.24);
        parts.push(`<rect x="${x}" y="${height * 0.58 - h}" width="${width * 0.055}" height="${h}" fill="${pale}" fill-opacity="${0.16 + i * 0.035}" />`);
      }
      parts.push(`<path d="M${width * 0.14} ${height * 0.42} L${width * 0.30} ${height * 0.34} L${width * 0.45} ${height * 0.40} L${width * 0.60} ${height * 0.24} L${width * 0.76} ${height * 0.3}" fill="none" stroke="${color}" stroke-opacity=".62" stroke-width="1.3" />`);
    } else {
      for (let i = 0; i < 4; i += 1) {
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${width * (0.08 + i * 0.06)}" fill="none" stroke="${pale}" stroke-opacity="${0.34 - i * 0.055}" stroke-width="1.2" />`);
      }
      parts.push(`<path d="M${cx} ${cy - height * 0.17} L${cx + width * 0.026} ${cy} L${cx} ${cy + height * 0.17} L${cx - width * 0.026} ${cy} Z" fill="${color}" fill-opacity=".5" />`);
    }

    return parts.join('');
  }

  function artSvg(item, compact) {
    const key = `${item.event.id}:${compact ? 't' : 'b'}`;
    if (state.artCache.has(key)) return state.artCache.get(key);
    const event = item.event;
    const width = 400;
    const height = 500;
    const seed = hash(event.id);
    const tag = event.tags?.[0] || 'politique';
    const color = tagColor(tag);
    const era = item.era?.color || '#8a6fb2';
    const countryColor = state.story?.country.color || '#7f9cff';
    const base = mix('#080b10', era, 0.34);
    const pale = mix(color, '#ffffff', 0.34);
    const deep = mix(base, color, 0.42);
    const uid = `a${seed.toString(36)}`;
    const year = Math.abs(event.year);
    const suffix = event.year < 0 ? 'av. J.-C.' : '';
    const label = tagLabel(tag).toUpperCase();

    const svg = `<svg class="dragon-art-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="${uid}bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${mix('#05070a', era, 0.14)}" />
          <stop offset=".52" stop-color="${base}" />
          <stop offset="1" stop-color="${deep}" />
        </linearGradient>
        <radialGradient id="${uid}glow" cx=".68" cy=".3" r=".72">
          <stop offset="0" stop-color="${rgba(color, 0.4)}" />
          <stop offset=".55" stop-color="${rgba(countryColor, 0.12)}" />
          <stop offset="1" stop-color="${rgba('#000000', 0)}" />
        </radialGradient>
        <pattern id="${uid}hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="${rgba('#ffffff', 0.05)}" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#${uid}bg)" />
      <rect width="${width}" height="${height}" fill="url(#${uid}glow)" />
      <g>${motifs(tag, seed, color, pale, width, height)}</g>
      <rect width="${width}" height="${height}" fill="url(#${uid}hatch)" />
      <circle cx="${width * 0.78}" cy="${height * 0.14}" r="${width * 0.035}" fill="none" stroke="${rgba(color, 0.7)}" stroke-width="1" />
      <circle cx="${width * 0.78}" cy="${height * 0.14}" r="${width * 0.008}" fill="${color}" />
      <text x="30" y="${height - 94}" fill="${rgba('#f4efe4', 0.92)}" font-family="Georgia, 'Times New Roman', serif" font-size="86" font-weight="400" letter-spacing="-4">${year}</text>
      ${suffix ? `<text x="34" y="${height - 62}" fill="${rgba('#f4efe4', 0.55)}" font-family="system-ui, sans-serif" font-size="13" letter-spacing="2">${suffix}</text>` : ''}
      <text x="${width - 26}" y="${height - 28}" text-anchor="end" fill="${rgba(color, 0.9)}" font-family="system-ui, sans-serif" font-size="10" letter-spacing="2.4">${label}</text>
      <rect x="30" y="${height - 30}" width="${compact ? 44 : 68}" height="1.2" fill="${rgba(color, 0.62)}" />
    </svg>`;
    state.artCache.set(key, svg);
    return svg;
  }

  /* ---------------------------------------------------------------------- */
  /* Données et histoire                                                    */
  /* ---------------------------------------------------------------------- */

  function prepareStory(countryId) {
    const country = COUNTRIES.find((item) => item.id === countryId) || COUNTRIES[0];
    const meta = META[country.id]?.eras || [];
    const items = [...country.events]
      .sort((a, b) => a.year - b.year || String(a.id).localeCompare(String(b.id)))
      .map((event) => {
        const eraIndex = eraIndexForYear(country, event.year);
        return {
          event,
          eraIndex: eraIndex >= 0 ? eraIndex : 0,
          t: 0,
        };
      });
    const eras = country.eras.map((era, index) => ({
      ...era,
      index,
      startIndex: Infinity,
      endIndex: -1,
      count: 0,
      actors: meta[index]?.actors || [],
      places: meta[index]?.places || [],
    }));
    items.forEach((item, index) => {
      item.index = index;
      item.era = eras[item.eraIndex];
      const era = item.era;
      era.startIndex = Math.min(era.startIndex, index);
      era.endIndex = Math.max(era.endIndex, index);
      era.count += 1;
    });
    for (const era of eras) {
      if (era.endIndex < era.startIndex) {
        era.startIndex = 0;
        era.endIndex = 0;
      }
    }
    state.artCache.clear();
    return { country, items, eras, meta };
  }

  function pointAt(u) {
    const theta = u * DTHETA;
    const r = Math.exp(-B * theta);
    const angle = theta + PHI0;
    return { x: r * Math.cos(angle), y: r * Math.sin(angle), r, theta, angle };
  }

  /* ---------------------------------------------------------------------- */
  /* Rendu Three.js                                                         */
  /* ---------------------------------------------------------------------- */

  function ensureRenderer() {
    if (state.renderer || !THREE) return;
    state.scene = new THREE.Scene();
    state.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    state.camera.position.z = 3;
    state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    state.renderer.setClearColor(0x000000, 0);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    state.renderer.domElement.setAttribute('aria-hidden', 'true');
    els.stage.prepend(state.renderer.domElement);
    state.resizeObserver = new ResizeObserver(resize);
    state.resizeObserver.observe(els.stage);
  }

  function disposeGroup(group) {
    if (!group) return;
    state.scene.remove(group);
    group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
        else child.material.dispose();
      }
    });
    group.clear();
  }

  /* Les bandes de même opacité sont fusionnées : trois groupes seulement
   * (halo, corps doré, ères), soit trois draw calls au lieu d'une par ère. */
  function buildRibbons(strips) {
    const groups = new Map();
    for (const strip of strips) {
      const key = String(strip.opacity);
      if (!groups.has(key)) groups.set(key, { opacity: strip.opacity, positions: [], colors: [], indices: [], offset: 0 });
      const group = groups.get(key);
      const count = Math.max(8, strip.samples);
      const tint = new THREE.Color(strip.color);
      for (let i = 0; i <= count; i += 1) {
        const u = strip.from + ((strip.to - strip.from) * i) / count;
        const point = pointAt(u);
        const before = pointAt(u - 0.001);
        const after = pointAt(u + 0.001);
        const tx = after.x - before.x;
        const ty = after.y - before.y;
        const length = Math.hypot(tx, ty) || 1;
        const nx = -ty / length;
        const ny = tx / length;
        const w = strip.width * point.r;
        group.positions.push(
          point.x - nx * w, point.y - ny * w, 0,
          point.x + nx * w, point.y + ny * w, 0
        );
        group.colors.push(tint.r, tint.g, tint.b, tint.r, tint.g, tint.b);
        if (i < count) {
          const index = group.offset + i * 2;
          group.indices.push(index, index + 1, index + 2, index + 1, index + 3, index + 2);
        }
      }
      group.offset += (count + 1) * 2;
    }
    const meshes = [];
    for (const group of groups.values()) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(group.positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(group.colors, 3));
      geometry.setIndex(group.indices);
      const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: group.opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 1;
      meshes.push(mesh);
    }
    return meshes;
  }

  function buildScene() {
    if (!state.renderer || !state.story) return;
    if (state.root) disposeGroup(state.root);
    state.root = new THREE.Group();
    state.scene.add(state.root);

    const { items, eras } = state.story;
    const count = items.length;
    const start = -PAD - 0.6;
    const end = count - 1 + PAD + 0.6;
    const samples = clamp(Math.ceil((end - start) * 70), 700, 2400);

    const strips = [
      { from: start, to: end, width: 0.085, color: 0xe6b96f, opacity: 0.13, samples },
      { from: start, to: end, width: 0.034, color: 0xf4d69e, opacity: 0.8, samples },
    ];
    for (const era of eras) {
      if (!era.count) continue;
      strips.push({
        from: Math.max(start, era.startIndex - 0.5),
        to: Math.min(end, era.endIndex + 0.5),
        width: 0.115,
        color: era.color || '#8a6fb2',
        opacity: 0.26,
        samples: Math.max(24, Math.ceil((era.endIndex - era.startIndex + 1) * 90)),
      });
    }
    for (const mesh of buildRibbons(strips)) state.root.add(mesh);

    // Vertèbres : un tiret perpendiculaire par repère.
    const tickPositions = [];
    for (const item of items) {
      const point = pointAt(item.index);
      const before = pointAt(item.index - 0.001);
      const after = pointAt(item.index + 0.001);
      const tx = after.x - before.x;
      const ty = after.y - before.y;
      const length = Math.hypot(tx, ty) || 1;
      const nx = -ty / length;
      const ny = tx / length;
      const w = 0.046 * point.r;
      tickPositions.push(
        point.x - nx * w, point.y - ny * w, 0,
        point.x + nx * w, point.y + ny * w, 0
      );
    }
    const tickGeometry = new THREE.BufferGeometry();
    tickGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tickPositions, 3));
    const ticks = new THREE.LineSegments(
      tickGeometry,
      new THREE.LineBasicMaterial({ color: 0xf4d69e, transparent: true, opacity: 0.3, depthWrite: false, depthTest: false })
    );
    ticks.renderOrder = 2;
    state.root.add(ticks);
  }

  function stageMetrics() {
    const w = els.stage.clientWidth;
    const h = els.stage.clientHeight;
    return { w, h, aspect: w / Math.max(1, h), mobile: window.innerWidth < 900 };
  }

  function renderScene() {
    if (!state.renderer || !state.story) return;
    const { w, h, aspect, mobile } = stageMetrics();
    if (w < 20 || h < 20) return;
    state.size = { w, h };
    state.focusScreen = mobile ? 0.34 : 0.5;
    const focus = pointAt(state.p);
    const halfH = VIEW * focus.r;
    const camera = state.camera;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.left = -halfH * aspect;
    camera.right = halfH * aspect;
    camera.position.x = focus.x;
    camera.position.y = focus.y - (0.5 - state.focusScreen) * 2 * halfH;
    camera.updateProjectionMatrix();
    state.renderer.render(state.scene, state.camera);
  }

  /* ---------------------------------------------------------------------- */
  /* Écailles DOM                                                           */
  /* ---------------------------------------------------------------------- */

  function itemAt(index) {
    const items = state.story?.items || [];
    if (index < 0 || index >= items.length) return null;
    return items[index];
  }

  function tileScreenPosition(index, focus, unit, cx, cy) {
    const d = index - focus;
    const ratio = Math.exp(-B * DTHETA * d);
    const angle = DTHETA * d;
    const frame = focus * DTHETA + PHI0;
    const cosFrame = Math.cos(frame);
    const sinFrame = Math.sin(frame);
    const localX = ratio * Math.cos(angle) - 1;
    const localY = ratio * Math.sin(angle);
    const dx = localX * cosFrame - localY * sinFrame;
    const dy = localX * sinFrame + localY * cosFrame;
    const side = index % 2 === 0 ? 1 : -1;
    const offset = side * 0.1 * ratio * unit;
    const sx = cx + dx * unit;
    const sy = cy - dy * unit;
    const x = sx + Math.cos(frame + angle) * offset;
    const y = sy - Math.sin(frame + angle) * offset;
    return { x, y, sx, sy, ratio, d, frame: frame + angle };
  }

  function makeTile(index) {
    const item = itemAt(index);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'dragon-tile';
    el.dataset.index = String(index);
    if (!item) {
      el.classList.add('is-void');
      el.setAttribute('aria-label', 'Écaille hors corpus documenté');
      el.innerHTML = '<span class="dragon-tile-art"><span class="dragon-void-mark">···</span></span><span class="dragon-tile-foot"><span class="dragon-tile-year">—</span><span class="dragon-tile-title">Hors corpus</span></span>';
      return el;
    }
    const event = item.event;
    el.setAttribute('aria-label', `${event.title}, ${formatYear(event.year)}. Ouvrir la fiche.`);
    el.title = `${event.title} · ${formatYear(event.year)}`;
    el.style.setProperty('--tag', tagColor(event.tags?.[0]));
    el.innerHTML = '<span class="dragon-tile-art"></span><span class="dragon-tile-foot"><span class="dragon-tile-year"></span><span class="dragon-tile-title"></span></span>';
    el.querySelector('.dragon-tile-year').textContent = formatYear(event.year);
    el.querySelector('.dragon-tile-title').textContent = event.title;
    fillTileArt(el, item);
    return el;
  }

  function fillTileArt(el, item) {
    const holder = el.querySelector('.dragon-tile-art');
    if (!holder) return;
    const real = IMAGES[item.event.id];
    if (real?.src) {
      const img = document.createElement('img');
      img.src = real.src;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      img.addEventListener('error', () => {
        holder.innerHTML = artSvg(item, true);
      }, { once: true });
      holder.innerHTML = '';
      holder.appendChild(img);
    } else {
      holder.innerHTML = artSvg(item, true);
    }
  }

  function updateTiles() {
    const { items } = state.story;
    const count = items.length;
    const { w, h, mobile } = stageMetrics();
    const focus = state.p;
    const unit = h / (2 * VIEW);
    const cx = w / 2;
    const cy = h * (mobile ? 0.34 : 0.5);
    const from = Math.floor(focus) - 9;
    const to = Math.ceil(focus) + 11;
    const valid = new Set();

    for (let index = Math.max(-PAD, from); index <= Math.min(count - 1 + PAD, to); index += 1) {
      valid.add(index);
      let el = state.tileEls.get(index);
      if (!el) {
        el = makeTile(index);
        state.tileEls.set(index, el);
        els.tiles.appendChild(el);
      }
      const { x, y, sx, sy, ratio, d } = tileScreenPosition(index, focus, unit, cx, cy);
      if (!el._link) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const group = document.createElementNS(svgNS, 'g');
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('class', 'dragon-link');
        const dot = document.createElementNS(svgNS, 'circle');
        dot.setAttribute('class', 'dragon-link-dot');
        dot.setAttribute('r', '1.7');
        group.append(line, dot);
        els.links.appendChild(group);
        el._link = { group, line, dot };
      }
      const link = el._link;
      if (!link.pos || Math.abs(link.pos.x - x) > 0.3 || Math.abs(link.pos.y - y) > 0.3) {
        link.pos = { x, y };
        link.line.setAttribute('x1', sx.toFixed(1));
        link.line.setAttribute('y1', sy.toFixed(1));
        link.line.setAttribute('x2', x.toFixed(1));
        link.line.setAttribute('y2', y.toFixed(1));
        link.dot.setAttribute('cx', sx.toFixed(1));
        link.dot.setAttribute('cy', sy.toFixed(1));
      }
      const size = (TILE_W * ratio * unit) / BASE_W;
      const opacity = clamp(1 - Math.max(0, Math.abs(d) - 0.55) * 0.17, 0.16, 1);
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) scale(${size.toFixed(4)})`;
      el.style.opacity = opacity.toFixed(3);
      const z = 200 - Math.round(Math.abs(d) * 10);
      if (el._z !== z) {
        el._z = z;
        el.style.zIndex = String(z);
      }
      const isFocus = index === Math.round(focus) && Math.abs(focus - index) < 0.5;
      if (el._isFocus !== isFocus) {
        el._isFocus = isFocus;
        el.classList.toggle('is-focus', isFocus);
      }
      const isOut = index < 0 || index >= count;
      if (el._isOut !== isOut) {
        el._isOut = isOut;
        el.classList.toggle('is-out', isOut);
      }
      const isPast = index < focus - 0.5;
      if (el._isPast !== isPast) {
        el._isPast = isPast;
        el.classList.toggle('is-past', isPast);
      }
      const isFuture = index > focus + 0.5;
      if (el._isFuture !== isFuture) {
        el._isFuture = isFuture;
        el.classList.toggle('is-future', isFuture);
      }
    }

    for (const [index, el] of state.tileEls) {
      if (!valid.has(index)) {
        el._link?.group.remove();
        el.remove();
        state.tileEls.delete(index);
      }
    }
  }

  function updateEraLabel() {
    if (!state.story) return;
    const item = itemAt(clamp(Math.round(state.p), 0, state.story.items.length - 1));
    if (!item) {
      els.eraLabel.hidden = true;
      return;
    }
    const era = item.era;
    els.eraLabel.hidden = false;
    els.eraLabel.style.setProperty('--era', era.color || '#8a6fb2');
    if (state.labelEra !== era.index) {
      state.labelEra = era.index;
      els.eraName.textContent = era.name;
      els.eraRange.textContent = formatRange(era.start, era.end);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Fiche                                                                  */
  /* ---------------------------------------------------------------------- */

  function setMedia(item) {
    const holder = els.media;
    holder.innerHTML = '';
    if (!item) {
      holder.classList.add('is-void');
      holder.innerHTML = '<div class="dragon-void-card"><span>Hors corpus</span><strong>Documentation à poursuivre</strong></div>';
      return;
    }
    holder.classList.remove('is-void');
    const real = IMAGES[item.event.id];
    if (real?.src) {
      const img = document.createElement('img');
      img.src = real.src;
      img.alt = real.alt || real.caption || `Illustration : ${item.event.title}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      const caption = document.createElement('span');
      caption.className = 'dragon-media-caption';
      caption.textContent = real.caption || item.event.title;
      holder.append(img, caption);
      img.addEventListener('error', () => {
        holder.classList.add('is-generated');
        holder.innerHTML = artSvg(item, false);
        const note = document.createElement('span');
        note.className = 'dragon-media-caption';
        note.textContent = 'Motif génératif';
        holder.appendChild(note);
        els.credit.textContent = 'Motif génératif dérivé des métadonnées · non documentaire';
      }, { once: true });
    } else {
      holder.classList.add('is-generated');
      holder.innerHTML = artSvg(item, false);
      const note = document.createElement('span');
      note.className = 'dragon-media-caption';
      note.textContent = `${item.era.name} · motif génératif`;
      holder.appendChild(note);
    }
  }

  function setCredit(item) {
    const real = item ? IMAGES[item.event.id] : null;
    els.credit.innerHTML = '';
    if (!real) {
      els.credit.textContent = 'Motif génératif dérivé des métadonnées · non documentaire';
      return;
    }
    const line = document.createElement('span');
    line.textContent = [real.credit, real.license].filter(Boolean).join(' · ') || 'Wikimedia Commons';
    els.credit.appendChild(line);
    if (real.source) {
      const link = document.createElement('a');
      link.href = real.source;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'source';
      els.credit.append(document.createTextNode(' · '), link);
    }
  }

  function updateCard() {
    if (!state.story) return;
    const count = state.story.items.length;
    const rounded = Math.round(state.p);
    const index = clamp(rounded, 0, count - 1);
    if (rounded === state.cardIndex) {
      els.position.textContent = `Repère ${index + 1} / ${count}`;
      return;
    }
    state.cardIndex = rounded;
    const item = itemAt(index);
    const outside = state.p < -0.5 || state.p > count - 0.5;
    if (outside || !item) {
      els.card.classList.add('is-void');
      els.era.textContent = 'Hors corpus documenté';
      els.position.textContent = '—';
      els.title.textContent = 'La queue continue';
      els.year.textContent = '';
      els.summary.textContent = 'Cette écaille n’est pas documentée dans le corpus actuel. Elle reste visible pour montrer que la queue du dragon continue au-delà des repères vérifiés.';
      els.tags.innerHTML = '';
      els.figures.innerHTML = '';
      els.credit.textContent = 'Aucun contenu inventé';
      els.media.classList.add('is-void');
      els.media.innerHTML = '<div class="dragon-void-card"><span>Hors corpus</span><strong>Documentation à poursuivre</strong></div>';
      els.open.disabled = true;
      els.card.dataset.event = '';
      return;
    }
    els.card.classList.remove('is-void');
    els.open.disabled = false;
    els.card.dataset.event = item.event.id;
    setMedia(item);
    setCredit(item);
    els.era.textContent = item.era.name;
    els.position.textContent = `Repère ${index + 1} / ${count}`;
    els.title.textContent = item.event.title;
    els.year.innerHTML = '';
    const year = document.createElement('strong');
    year.textContent = formatYear(item.event.year);
    const range = document.createElement('span');
    range.textContent = item.event.subtitle || formatRange(item.era.start, item.era.end);
    els.year.append(year, range);
    els.summary.textContent = item.event.summary || '';
    els.tags.innerHTML = '';
    for (const tag of item.event.tags || []) {
      const chip = document.createElement('span');
      chip.className = 'dragon-tag';
      chip.style.setProperty('--tag', tagColor(tag));
      chip.textContent = tagLabel(tag);
      els.tags.appendChild(chip);
    }
    els.figures.innerHTML = '';
    const figures = [
      ...(item.era.actors || []).slice(0, 2).map((actor) => ({ kind: 'actor', label: actor.label })),
      ...(item.era.places || []).slice(0, 2).map((place) => ({ kind: 'place', label: place.label })),
    ];
    if (figures.length) {
      const heading = document.createElement('span');
      heading.className = 'dragon-figures-heading';
      heading.textContent = 'Figures & lieux';
      els.figures.appendChild(heading);
      for (const figure of figures) {
        const chip = document.createElement('span');
        chip.className = `dragon-figure is-${figure.kind}`;
        chip.textContent = figure.label;
        els.figures.appendChild(chip);
      }
    }
    els.card.classList.remove('is-enter');
    void els.card.offsetWidth;
    els.card.classList.add('is-enter');
  }

  /* ---------------------------------------------------------------------- */
  /* Profondeur et progression                                              */
  /* ---------------------------------------------------------------------- */

  function buildDepth() {
    const { eras, items } = state.story;
    const total = items.length;
    els.depth.innerHTML = '';
    const top = document.createElement('span');
    top.className = 'dragon-depth-cap';
    top.textContent = formatYear(state.story.country.domain[0]);
    const bottom = document.createElement('span');
    bottom.className = 'dragon-depth-cap is-bottom';
    bottom.textContent = formatYear(state.story.country.domain[1]);
    els.depth.append(top, bottom);
    for (const era of eras) {
      if (!era.count) continue;
      const segment = document.createElement('button');
      segment.type = 'button';
      segment.className = 'dragon-depth-segment';
      segment.style.height = `${(era.count / total) * 100}%`;
      segment.style.setProperty('--era', era.color || '#8a6fb2');
      segment.title = `${era.name} · ${formatRange(era.start, era.end)} (${era.count} repères)`;
      segment.setAttribute('aria-label', `Aller à ${era.name}`);
      segment.addEventListener('click', () => goTo(era.startIndex));
      els.depth.appendChild(segment);
    }
    const marker = document.createElement('span');
    marker.className = 'dragon-depth-marker';
    marker.id = 'dragon-depth-marker';
    els.depth.appendChild(marker);
  }

  function updateDepth() {
    const count = state.story.items.length;
    const marker = document.getElementById('dragon-depth-marker');
    if (!marker) return;
    const ratio = clamp(state.p / Math.max(1, count - 1), 0, 1);
    marker.style.top = `${ratio * 100}%`;
    marker.style.setProperty('--era', itemAt(clamp(Math.round(state.p), 0, count - 1))?.era.color || '#e6b96f');
    els.rail.style.width = `${ratio * 100}%`;
    const index = clamp(Math.round(state.p), 0, count - 1);
    els.readout.textContent = `Écaille ${index + 1} / ${count}`;
  }

  /* ---------------------------------------------------------------------- */
  /* Rendu global                                                           */
  /* ---------------------------------------------------------------------- */

  function render(now) {
    if (!state.story) return;
    const time = now ?? performance.now();
    // Le ruban évolue lentement : 30 images/s suffisent, les écailles DOM
    // restent à la fréquence de l'écran.
    if (state.p === state.target || time - state.lastSceneRender >= 33) {
      renderScene();
      state.lastSceneRender = time;
    }
    updateTiles();
    updateEraLabel();
    updateCard();
    updateDepth();
  }

  function requestRender() {
    if (state.raf) return;
    state.raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    state.raf = 0;
    if (!state.open) return;
    const diff = state.target - state.p;
    if (Math.abs(diff) > 0.0004) {
      state.p += diff * 0.16;
      if (Math.abs(state.target - state.p) < 0.0004) state.p = state.target;
    } else {
      state.p = state.target;
    }
    render(now);
    if (state.p !== state.target) requestRender();
  }

  function resize() {
    if (!state.open || !state.renderer) return;
    const { w, h } = stageMetrics();
    if (w > 20 && h > 20) state.renderer.setSize(w, h, false);
    renderScene();
    updateTiles();
    updateEraLabel();
    updateDepth();
  }

  /* ---------------------------------------------------------------------- */
  /* Navigation                                                             */
  /* ---------------------------------------------------------------------- */

  function clampedTarget(value) {
    return clamp(value, -PAD + 0.2, state.story.items.length - 1 + PAD - 0.2);
  }

  function setTarget(value) {
    if (!state.story) return;
    state.target = clampedTarget(value);
    markUsed();
    requestRender();
  }

  function goTo(index) {
    setTarget(index);
  }

  function markUsed() {
    if (state.used) return;
    state.used = true;
    els.stage.classList.add('is-used');
  }

  function onWheel(event) {
    if (!state.open) return;
    if (event.target.closest('.dragon-card')) return;
    event.preventDefault();
    const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
    const speed = event.ctrlKey ? 0.02 : 0.0055;
    setTarget(state.target - event.deltaY * factor * speed);
  }

  function onPointerDown(event) {
    if (!state.open) return;
    if (event.target.closest('button, select, a, .dragon-card, .dragon-depth, .dragon-era-label')) return;
    state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (state.pointers.size === 1) {
      state.drag = { x: event.clientX, y: event.clientY, moved: false };
      state.suppressClick = false;
      els.stage.setPointerCapture(event.pointerId);
    } else if (state.pointers.size === 2) {
      const [a, b] = [...state.pointers.values()];
      state.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      state.suppressClick = true;
    }
  }

  function onPointerMove(event) {
    if (!state.open) return;
    const pointer = state.pointers.get(event.pointerId);
    if (!pointer) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (state.pointers.size === 2) {
      const [a, b] = [...state.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (state.pinchDist > 0) {
        setTarget(state.target + Math.log(dist / state.pinchDist) * 2.4);
      }
      state.pinchDist = dist;
      state.suppressClick = true;
      return;
    }
    if (!state.drag) return;
    const dx = event.clientX - state.drag.x;
    const dy = event.clientY - state.drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) state.drag.moved = true;
    if (state.drag.moved) {
      setTarget(state.target - dy * 0.007 + dx * 0.0016);
      state.suppressClick = true;
      els.stage.classList.add('is-dragging');
    }
  }

  function onPointerUp(event) {
    state.pointers.delete(event.pointerId);
    if (state.pointers.size < 2) state.pinchDist = 0;
    if (state.pointers.size === 0) {
      state.drag = null;
      els.stage.classList.remove('is-dragging');
      if (els.stage.hasPointerCapture(event.pointerId)) {
        try { els.stage.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
      }
      clearTimeout(state.suppressTimer);
      state.suppressTimer = window.setTimeout(() => { state.suppressClick = false; }, 260);
    }
  }

  function onTileClick(event) {
    const tile = event.target.closest('.dragon-tile');
    if (!tile) return;
    if (state.suppressClick) return;
    const index = Number(tile.dataset.index);
    const item = itemAt(index);
    if (!item) return;
    if (Math.abs(state.p - index) > 0.6) {
      goTo(index);
      return;
    }
    openEvent(item.event.id);
  }

  function openEvent(id) {
    close({ restoreFocus: false, immediate: true });
    if (window.VECTEMPOREL_APP?.openEvent) {
      window.VECTEMPOREL_APP.openEvent(id);
    } else {
      window.dispatchEvent(new CustomEvent('vectemporel:open-event', { detail: { id } }));
    }
  }

  function step(delta) {
    setTarget(Math.round(state.p) + delta);
  }

  /* ---------------------------------------------------------------------- */
  /* Ouverture / fermeture                                                  */
  /* ---------------------------------------------------------------------- */

  function populateCountries() {
    els.country.innerHTML = '';
    for (const country of COUNTRIES) {
      const option = document.createElement('option');
      option.value = country.id;
      option.textContent = `${country.flag || ''} ${country.name}`.trim();
      els.country.appendChild(option);
    }
  }

  function loadCountry(countryId) {
    if (state.story) state.positions.set(state.story.country.id, state.p);
    state.countryId = countryId;
    state.story = prepareStory(countryId);
    els.country.value = state.story.country.id;
    els.context.textContent = `${state.story.country.name} · ${formatRange(state.story.country.domain[0], state.story.country.domain[1])}`;
    els.stage.style.setProperty('--country', state.story.country.color || '#7f9cff');
    document.documentElement.style.setProperty('--dragon-country', state.story.country.color || '#7f9cff');
    const saved = state.positions.get(state.story.country.id);
    state.p = saved !== undefined ? clamp(saved, 0, state.story.items.length - 1) : 0;
    state.target = state.p;
    state.cardIndex = -1;
    state.labelEra = -1;
    for (const [, el] of state.tileEls) el.remove();
    state.tileEls.clear();
    buildScene();
    buildDepth();
    render();
    requestRender();
  }

  function open(countryId) {
    if (!state.initialized) init();
    if (!els.overlay || !THREE || !DATA) return;
    ensureRenderer();
    const requested = COUNTRIES.find((country) => country.id === countryId)?.id
      || COUNTRIES.find((country) => country.id === (window.VECTEMPOREL_APP?.getCountryId?.() || 'france'))?.id
      || COUNTRIES[0].id;
    if (!state.story || state.story.country.id !== requested) {
      loadCountry(requested);
    } else {
      render();
    }
    state.open = true;
    state.lastFocus = document.activeElement;
    clearTimeout(state.hideTimer);
    els.overlay.hidden = false;
    requestAnimationFrame(() => {
      els.overlay.classList.add('is-open');
      resize();
      requestRender();
      els.close.focus({ preventScroll: true });
    });
  }

  function close(options = {}) {
    if (!state.open) return;
    state.open = false;
    els.overlay.classList.remove('is-open');
    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }
    if (options.immediate) {
      clearTimeout(state.hideTimer);
      els.overlay.hidden = true;
    } else {
      state.hideTimer = window.setTimeout(() => {
        if (!state.open) els.overlay.hidden = true;
      }, 340);
    }
    if (options.restoreFocus !== false && state.lastFocus?.isConnected) {
      window.setTimeout(() => state.lastFocus.focus({ preventScroll: true }), 40);
    }
  }

  function onKeyDown(event) {
    if (!state.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === '+' || event.key === '=') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === '-') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      goTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      goTo(state.story.items.length - 1);
    } else if (event.key === 'Tab') {
      const focusable = [...els.overlay.querySelectorAll('button:not([disabled]), select, a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Initialisation                                                         */
  /* ---------------------------------------------------------------------- */

  function cacheElements() {
    els.overlay = document.getElementById('spiral-overlay');
    els.stage = document.getElementById('spiral-stage');
    els.tiles = document.getElementById('dragon-tiles');
    els.links = document.getElementById('dragon-links');
    els.eraLabel = document.getElementById('dragon-era-label');
    els.eraLabel.innerHTML = '<span class="dragon-era-dot"></span><span class="dragon-era-name"></span><span class="dragon-era-range"></span>';
    els.eraName = els.eraLabel.querySelector('.dragon-era-name');
    els.eraRange = els.eraLabel.querySelector('.dragon-era-range');
    els.country = document.getElementById('spiral-country');
    els.context = document.getElementById('spiral-context');
    els.close = document.getElementById('spiral-close');
    els.prev = document.getElementById('dragon-prev');
    els.next = document.getElementById('dragon-next');
    els.open = document.getElementById('dragon-open');
    els.zoomIn = document.getElementById('dragon-zoom-in');
    els.zoomOut = document.getElementById('dragon-zoom-out');
    els.title = document.getElementById('spiral-title');
    els.era = document.getElementById('dragon-era');
    els.position = document.getElementById('dragon-position');
    els.year = document.getElementById('dragon-year');
    els.summary = document.getElementById('dragon-summary');
    els.tags = document.getElementById('dragon-tags');
    els.figures = document.getElementById('dragon-figures');
    els.media = document.getElementById('dragon-media');
    els.credit = document.getElementById('dragon-credit');
    els.card = document.getElementById('dragon-card');
    els.depth = document.getElementById('dragon-depth');
    els.rail = document.getElementById('dragon-rail-bar');
    els.readout = document.getElementById('dragon-readout');
    els.openBtn = document.getElementById('spiral-btn');
  }

  function bind() {
    els.openBtn?.addEventListener('click', () => open());
    els.close?.addEventListener('click', close);
    els.overlay?.querySelector('[data-close-spiral]')?.addEventListener('click', close);
    els.prev?.addEventListener('click', () => step(-1));
    els.next?.addEventListener('click', () => step(1));
    els.zoomIn?.addEventListener('click', () => step(1));
    els.zoomOut?.addEventListener('click', () => step(-1));
    els.open?.addEventListener('click', () => {
      const id = els.card.dataset.event;
      if (id) openEvent(id);
    });
    els.country?.addEventListener('change', () => {
      loadCountry(els.country.value);
      requestRender();
    });
    els.tiles?.addEventListener('click', onTileClick);
    els.stage?.addEventListener('wheel', onWheel, { passive: false });
    els.stage?.addEventListener('pointerdown', onPointerDown);
    els.stage?.addEventListener('pointermove', onPointerMove);
    els.stage?.addEventListener('pointerup', onPointerUp);
    els.stage?.addEventListener('pointercancel', onPointerUp);
    els.stage?.addEventListener('pointerleave', () => {
      if (state.pointers.size === 0) {
        state.drag = null;
        els.stage.classList.remove('is-dragging');
      }
    });
    document.addEventListener('keydown', onKeyDown);
  }

  function init() {
    if (state.initialized) return;
    cacheElements();
    if (!els.overlay || !THREE || !DATA) return;
    state.initialized = true;
    populateCountries();
    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.VECTEMPOREL_SPIRAL = { open, close };
  window.VECTEMPOREL_DRAGON = { open, close, goto: (index) => goTo(index) };
})();
