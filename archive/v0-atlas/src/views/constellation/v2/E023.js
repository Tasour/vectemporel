import { register } from './registry.js';

/* Lentille V2 E023 — contraste visuel appliqué aux lunes de la vue Constellation.
   Seconde passe : dix chantiers inédits, tous implémentés, sans réseau ni source
   aléatoire. Là où la passe 1 posait fond, anneau, symboles de confiance, pastille,
   bordures et bascule, la V2 mesure un ratio WCAG et le rend auditable, ajoute des
   textures non colorielles, une cible élargie, un codage des arêtes par tirets,
   une annonce live, un palier à trois niveaux et le respect des préférences
   système. Préfixe exclusif : v2e023 (aucune collision avec la passe 1). */
register('E023', ctx => {
  /* Garde d'entrée : aucun ajout au DOM sans layout courant ni document. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Une seule feuille, un seul identifiant : constellation-v2-e023. */
  css('constellation-v2-e023', `
    /* Mesure et badge de quotient — chiffre tabulaire, revealed au focus. */
    .constellation-layout .v2e023-quotient {
      position: absolute; top: -11px; right: -14px; z-index: 2;
      padding: 0 2px; border: 1px solid var(--line-strong, #33405a);
      border-radius: 3px; background: rgba(8, 11, 16, .94);
      color: var(--gold-bright, #f4d69e); font-size: 7px; font-weight: 700;
      line-height: 1.3; white-space: nowrap; pointer-events: none;
      opacity: 0; font-variant-numeric: tabular-nums;
      transition: opacity .16s linear;
    }
    .constellation-layout .const-moon.is-active .v2e023-quotient,
    .constellation-layout .const-moon:focus-visible .v2e023-quotient { opacity: 1; }
    /* Texture de confiance : hachures simples ou croisées, jamais la couleur seule. */
    .constellation-layout .v2e023-texture {
      position: absolute; inset: 0; z-index: 1;
      border-radius: 50%; pointer-events: none;
    }
    .constellation-layout .const-moon[data-v2e023-texture="mitige"] .v2e023-texture {
      background-image: repeating-linear-gradient(45deg, rgba(255,255,255,.6) 0 1px, transparent 1px 3px);
    }
    .constellation-layout .const-moon[data-v2e023-texture="faible"] .v2e023-texture {
      background-image:
        repeating-linear-gradient(45deg, rgba(255,255,255,.6) 0 1px, transparent 1px 3px),
        repeating-linear-gradient(-45deg, rgba(255,255,255,.6) 0 1px, transparent 1px 3px);
    }
    /* Cible élargie sans agrandir le disque visible : 30 px de zone cliquable. */
    .constellation-layout .v2e023-hit {
      position: absolute; inset: -8px; z-index: 0;
      border-radius: 50%; pointer-events: auto;
    }
    /* Contraste du libellé renforcé par une contourure sombre additive. */
    .constellation-layout .const-moon::after {
      text-shadow: 0 1px 2px #000, 0 0 3px #000;
      color: var(--ink-soft, #d9dee8);
    }
    /* Arêtes lunaires : le motif de tirets porte la confiance, pas la teinte. */
    .constellation-layout .constellation-edges line.is-moon[data-v2e023-dash="mitige"] { stroke-dasharray: 4 3; }
    .constellation-layout .constellation-edges line.is-moon[data-v2e023-dash="faible"] { stroke-dasharray: 2 3; }
    /* Région live masquée, annonces vocales non dupliquées. */
    .v2e023-sr {
      position: absolute !important; width: 1px; height: 1px; padding: 0;
      margin: -1px; overflow: hidden; clip: rect(0 0 0 0);
      white-space: nowrap; border: 0;
    }
    /* Palier de contraste : radiogroupe à trois choix, cibles >= 36 px. */
    .v2e023-levels-wrap { margin: 6px 0 0; }
    .v2e023-levels-label {
      margin: 0 0 2px; color: var(--muted, #8b97ad); font-size: 9px;
    }
    .v2e023-levels { display: flex; gap: 4px; flex-wrap: wrap; }
    .v2e023-level {
      min-height: 36px; padding: 0 10px; border: 1px solid var(--line-strong, #33405a);
      border-radius: 8px; background: rgba(255,255,255,.03);
      color: var(--ink-soft, #d9dee8); font: inherit; font-size: 9px; cursor: pointer;
    }
    .v2e023-level[aria-checked="true"] {
      border-color: var(--gold-bright, #f4d69e);
      background: rgba(244,214,158,.14); color: var(--gold-bright, #f4d69e);
      font-weight: 700;
    }
    .v2e023-level:focus-visible { outline: 2px solid var(--gold-bright, #f4d69e); outline-offset: 2px; }
    /* Tableau de bord chiffré du contraste. */
    .v2e023-audit {
      margin: 4px 0 0; color: var(--muted, #8b97ad); font-size: 9px;
      line-height: 1.5; font-variant-numeric: tabular-nums;
    }
    /* Escalier de paliers, cumulable avec la feuille de la passe 1. */
    .constellation-v2-e023[data-v2e023-level="renforce"] .const-moon {
      border-width: 2px; box-shadow: 0 0 0 1px #000;
    }
    .constellation-v2-e023[data-v2e023-level="maximal"] .const-moon {
      border-width: 3px; background: #000;
      box-shadow: 0 0 0 2px #000, 0 0 0 4px #fff;
    }
    .constellation-v2-e023[data-v2e023-level="maximal"] .const-moon.is-active {
      background: #fff; border-color: #000;
    }
    .constellation-v2-e023[data-v2e023-level="maximal"] .v2e023-quotient {
      border-color: #fff; color: #fff; background: #000;
    }
    .constellation-v2-e023[data-v2e023-reduced="1"] .v2e023-quotient { transition: none; }
    @media (prefers-reduced-motion: reduce) {
      .constellation-layout .v2e023-quotient { transition: none !important; }
    }
    @media (prefers-contrast: less) {
      .constellation-layout .const-moon { border-color: var(--ink-soft, #d9dee8); }
      .constellation-layout .v2e023-texture { opacity: .5; }
    }
    @media (forced-colors: active) {
      .constellation-layout .const-moon { border: 2px solid CanvasText; background: Canvas; }
      .constellation-layout .const-moon.is-active { border: 3px solid Highlight; background: Canvas; }
      .constellation-layout .v2e023-quotient { border-color: CanvasText; color: CanvasText; background: Canvas; }
      .constellation-layout .v2e023-level[aria-checked="true"] { outline: 2px solid Highlight; }
    }
  `);

  /*helpers — lecture deterministic des couleurs et calcul WCAG, sans aléa. */
  const byId = id => (typeof document.getElementById === 'function'
    ? document.getElementById(id) : null);
  const setData = (node, key, value) => {
    if (!node || !node.dataset) return;
    node.dataset[key] = value;
  };
  const cssVar = (name, fallback) => {
    try {
      if (typeof getComputedStyle !== 'function' || !document.documentElement) return fallback;
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    } catch { return fallback; }
  };
  const parseColor = (value, fallback) => {
    const raw = String(value || '').trim();
    let m = /^#([0-9a-f]{3})$/i.exec(raw);
    if (m) return [0, 1, 2].map(i => parseInt(m[1][i] + m[1][i], 16));
    m = /^#([0-9a-f]{6})$/i.exec(raw);
    if (m) return [0, 1, 2].map(i => parseInt(m[1].slice(i * 2, i * 2 + 2), 16));
    m = /^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i.exec(raw);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
    return fallback;
  };
  const luminance = rgb => {
    const c = rgb.map(channel => {
      const s = Math.max(0, Math.min(255, channel)) / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a, b) => {
    const la = luminance(a);
    const lb = luminance(b);
    const high = Math.max(la, lb);
    const low = Math.min(la, lb);
    return Math.round(((high + 0.05) / (low + 0.05)) * 10) / 10;
  };
  const french = number => String(number).replace('.', ',');
  const isActive = node => !!(node && node.classList && node.classList.contains('is-active'));
  const confidenceOf = moon => {
    const text = ((moon && (moon.getAttribute('title') || moon.getAttribute('aria-label'))) || '').toLowerCase();
    if (/disput|non document|incertain/.test(text)) return 'faible';
    if (/probable|mitig/.test(text)) return 'mitige';
    return 'fort';
  };
  const CONFIANCE = { fort: 'forte', mitige: 'mitigée', faible: 'faible' };
  const appendChild = (parent, node) => {
    if (parent && typeof parent.appendChild === 'function') parent.appendChild(node);
  };
  const make = (tag, className, text) => {
    if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* Éléments de la vue : la lune peut manquer, la légende aussi — on dégrade. */
  const moonLayer = layout.querySelector ? layout.querySelector('.const-layer-moons') : null;
  const moons = moonLayer && moonLayer.querySelectorAll
    ? Array.from(moonLayer.querySelectorAll('button.const-moon')) : [];
  const edges = layout.querySelector ? layout.querySelector('.constellation-edges') : null;
  const caption = layout.querySelector ? layout.querySelector('.constellation-caption') : null;

  /* E023-01 — Ratio WCAG mesuré depuis les variables, gravé sur chaque lune. */
  layout.classList.add('constellation-v2-e023');
  const fondChamp = parseColor(cssVar('--surface', '#0b0f16'), [11, 15, 22]);
  const fondLune = parseColor(cssVar('--surface-2', '#18202c'), [24, 32, 44]);
  const fondActif = parseColor(cssVar('--violet', '#b28bdd'), [178, 139, 221]);
  const ratios = moons.map(moon => contrast(isActive(moon) ? fondActif : fondLune, fondChamp));
  moons.forEach((moon, index) => setData(moon, 'v2e023Ratio', french(ratios[index])));

  /* E023-02 — Badge de quotient : enfant dédié, aria-hidden pour éviter la
     double lecture avec la région live du chantier 07. */
  moons.forEach((moon, index) => {
    if (typeof moon.querySelector === 'function' && moon.querySelector('.v2e023-quotient')) return;
    const badge = make('span', 'v2e023-quotient', `${french(ratios[index])}:1`);
    badge.setAttribute('aria-hidden', 'true');
    appendChild(moon, badge);
  });

  /* E023-03 — Texture de confiance : hachures 45° ou croisées, jamais la teinte. */
  moons.forEach(moon => {
    setData(moon, 'v2e023Texture', confidenceOf(moon));
    if (typeof moon.querySelector === 'function' && moon.querySelector('.v2e023-texture')) return;
    const texture = make('span', 'v2e023-texture');
    texture.setAttribute('aria-hidden', 'true');
    appendChild(moon, texture);
  });

  /* E023-04 — Cible tactile élargie à 30 px sans croître le disque visible. */
  moons.forEach(moon => {
    if (typeof moon.querySelector === 'function' && moon.querySelector('.v2e023-hit')) return;
    const hit = make('span', 'v2e023-hit');
    hit.setAttribute('aria-hidden', 'true');
    appendChild(moon, hit);
  });
  setData(moonLayer, 'v2e023Hit', moons.length ? '1' : '0');

  /* E023-05 — Contour du libellé renforcé (règle CSS additive ci-dessus). */
  setData(moonLayer, 'v2e023LabelShadow', moons.length ? '1' : '0');

  /* E023-06 — Arêtes lunaires codées par motif de tirets selon la confiance. */
  const moonLines = edges && edges.querySelectorAll
    ? Array.from(edges.querySelectorAll('line.is-moon')) : [];
  moonLines.forEach((line, index) => {
    const moon = moons[index];
    line.setAttribute('data-v2e023-dash', moon ? confidenceOf(moon) : 'plain');
  });
  setData(edges, 'v2e023Dash', String(moonLines.length));

  /* E023-07 — Région live : le contraste mesuré est annoncé à l'entrée. */
  let live = byId('v2e023-live');
  if (!live) {
    live = make('p', 'v2e023-sr', '');
    live.id = 'v2e023-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    appendChild(layout, live);
  }
  if (moonLayer && setData(moonLayer, 'v2e023FocusBound', '1')
      && typeof moonLayer.addEventListener === 'function') {
    moonLayer.addEventListener('focusin', event => {
      const target = event && event.target;
      const moon = target && target.nodeType === 1 && typeof target.closest === 'function'
        ? target.closest('button.const-moon') : null;
      if (!moon || !moonLayer.contains(moon)) return;
      const index = moons.indexOf(moon);
      const ratio = moon.getAttribute('data-v2e023-ratio') || '';
      const level = CONFIANCE[confidenceOf(moon)] || 'forte';
      const zone = byId('v2e023-live');
      if (zone) zone.textContent = `Point ${index + 1} : contraste ${french(ratio)} sur 1, confiance ${level}.`;
    });
  }

  /* E023-08 — Palier de contraste : radiogroupe à trois niveaux, flèches incluses. */
  let group = null;
  const setLevel = (value, name) => {
    setData(layout, 'v2e023Level', value);
    const radios = group && group.querySelectorAll
      ? Array.from(group.querySelectorAll('button[role="radio"]')) : [];
    radios.forEach(button => {
      const on = button.getAttribute('data-v2e023-level') === value;
      button.setAttribute('aria-checked', on ? 'true' : 'false');
      button.tabIndex = on ? 0 : -1;
    });
    const zone = byId('v2e023-live');
    if (zone) zone.textContent = `Palier de contraste : ${name}.`;
  };
  if (caption && typeof caption.querySelector === 'function'
      && !caption.querySelector('#v2e023-levels')) {
    const wrap = make('div', 'v2e023-levels-wrap');
    const label = make('p', 'v2e023-levels-label', 'Palier de contraste des lunes');
    label.id = 'v2e023-levels-label';
    group = make('div', 'v2e023-levels');
    group.id = 'v2e023-levels';
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-labelledby', label.id);
    const choices = [['standard', 'Standard'], ['renforce', 'Renforcé'], ['maximal', 'Maximal']];
    choices.forEach((pair, index) => {
      const value = pair[0];
      const name = pair[1];
      const button = make('button', 'v2e023-level', name);
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', index === 0 ? 'true' : 'false');
      button.tabIndex = index === 0 ? 0 : -1;
      button.setAttribute('data-v2e023-level', value);
      button.addEventListener('click', () => setLevel(value, name));
      appendChild(group, button);
    });
    group.addEventListener('keydown', event => {
      if (!event || !event.key) return;
      const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
      if (keys.indexOf(event.key) < 0) return;
      event.preventDefault();
      event.stopPropagation();
      const radios = Array.from(group.querySelectorAll('button[role="radio"]'));
      const current = radios.findIndex(button => button.getAttribute('aria-checked') === 'true');
      let next = current;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % radios.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + radios.length) % radios.length;
      else if (event.key === 'Home') next = 0;
      else next = radios.length - 1;
      const radio = radios[next];
      if (!radio) return;
      radio.focus({ preventScroll: true });
      radio.click();
    });
    appendChild(wrap, label);
    appendChild(wrap, group);
    appendChild(caption, wrap);
  }
  if (!layout.dataset || layout.dataset.v2e023Level === undefined) {
    setData(layout, 'v2e023Level', 'standard');
  }

  /* E023-09 — Tableau de bord : minimum, maximum et points sous le seuil 4,5. */
  if (caption && typeof caption.querySelector === 'function' && !caption.querySelector('#v2e023-audit')) {
    const minimum = ratios.length ? Math.min.apply(null, ratios) : 0;
    const maximum = ratios.length ? Math.max.apply(null, ratios) : 0;
    const sousSeuil = ratios.filter(value => value < 4.5).length;
    const audit = make('p', 'v2e023-audit',
      `Contraste des lunes — minimum ${french(minimum)}:1 · maximum ${french(maximum)}:1 · ${sousSeuil} point${sousSeuil > 1 ? 's' : ''} sous 4,5:1.`);
    audit.id = 'v2e023-audit';
    appendChild(caption, audit);
  }

  /* E023-10 — Mouvement réduit, contraste atténué et modes forcés du système. */
  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); } catch { reduced = false; }
  }
  if (reduced) setData(layout, 'v2e023Reduced', '1');
  else if (layout.dataset) delete layout.dataset.v2e023Reduced;
});
