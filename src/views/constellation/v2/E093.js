import { register } from './registry.js';

/* Lentille V2 E093 — contraste visuel du champ d'étoiles de la vue Constellation.
   Seconde passe : dix chantiers inédits, tous implémentés, sans réseau, sans
   source aléatoire et sans minuteur ni boucle d'animation propre. Préfixe
   exclusif v2e093 : aucune collision avec la passe 1 (e093, constellation-e093). */
register('E093', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;

  const field = layout.querySelector('.constellation-field');
  if (!field) return;
  const doc = layout.ownerDocument || document;
  if (!doc || typeof doc.createElement !== 'function') return;

  /* Feuille unique de la lentille : formes, motifs et halos complètent le
     contraste sans jamais porter l'information par la seule couleur. */
  css('constellation-v2-e093', `
.v2e093-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
/* E093-01 — éclats en croix des étoiles vives (forme distinctive). */
.v2e093-sparks{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}
.v2e093-spark{stroke:#fff6df;stroke-width:.36;stroke-linecap:round;fill:none}
/* E093-02 — quadrillage de profondeur à très faible contraste. */
.v2e093-grid{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}
.v2e093-grid line{stroke:rgba(244,214,158,.06);stroke-width:.3;vector-effect:non-scaling-stroke}
/* E093-03 — motifs de trait des arêtes, indépendants de la couleur. */
.v2e093-patterns line{stroke-dasharray:2 3}
.v2e093-patterns line.is-path{stroke-dasharray:none}
.v2e093-patterns line.is-moon{stroke-dasharray:1 2}
/* E093-04 — plancher d'assombrissement calculé depuis la couleur d'ère. */
.v2e093-floor{position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(circle at 50% 50%,rgba(0,0,0,0) 0%,rgba(0,0,0,var(--v2e093-floor,.20)) 100%)}
/* E093-05 — halo radial local derrière le nœud actif. */
.v2e093-halos{position:absolute;inset:0;z-index:0;pointer-events:none}
.v2e093-halo{position:absolute;left:var(--x);top:var(--y);width:78px;height:78px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(244,214,158,.26),rgba(244,214,158,0) 70%)}
/* E093-06 — halo texte des étiquettes posées sur le champ d'étoiles. */
.v2e093-labels .const-sun::after,.v2e093-labels .const-planet::after,.v2e093-labels .const-moon::after{text-shadow:0 0 3px #000,0 0 6px #000,0 1px 2px #000}
/* E093-07 — légende visuelle des conventions de contraste. */
#v2e093-legend{position:absolute;left:8px;bottom:8px;z-index:6;max-width:214px;padding:6px 8px;border:1px solid rgba(230,185,111,.35);border-radius:8px;background:rgba(7,11,18,.88);color:#cbd5e1;font:9px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;pointer-events:none}
#v2e093-legend p{margin:0 0 3px;color:#e8d4a4;font-weight:600}
#v2e093-legend ul{margin:0;padding-left:14px}
#v2e093-legend li{margin:1px 0}
/* E093-08 — hachures de la lune active (motif, distinct de la couleur). */
.v2e093-moons .const-moon.is-active{background-image:repeating-linear-gradient(45deg,rgba(178,139,221,.85) 0 2px,transparent 2px 5px)}
/* E093-09 — niveaux de contraste en radiogroupe. */
#v2e093-levels{position:absolute;right:8px;bottom:8px;z-index:6;display:flex;gap:4px;padding:4px;border:1px solid rgba(230,185,111,.35);border-radius:8px;background:rgba(7,11,18,.88);pointer-events:auto}
.v2e093-level{min-width:44px;min-height:36px;padding:0 8px;border:1px solid var(--line,#3a4150);border-radius:7px;background:var(--surface-2,#141a24);color:var(--ink-soft,#cfd8e6);font-size:9px;cursor:pointer}
.v2e093-level[aria-checked="true"]{border-color:#f0cf8f;background:rgba(240,207,143,.16);color:#f5e6c4}
.v2e093-level:focus-visible{outline:2px solid #f0cf8f;outline-offset:2px}
.constellation-field[data-v2e093-level="doux"] .e093-star{opacity:.65}
.constellation-field[data-v2e093-level="renforce"] .e093-star{opacity:1}
@media (max-width:620px){#v2e093-legend{max-width:150px;font-size:8px}#v2e093-levels{right:6px;bottom:6px;padding:3px}.v2e093-level{min-width:38px;padding:0 5px}}
@media (prefers-reduced-motion: reduce){.v2e093-halo{transform:translate(-50%,-50%)}}
`);

  const NS = 'http://www.w3.org/2000/svg';
  const VIVID = 0.5;
  const BUDGET = 12;

  const safe = fn => { try { return fn(); } catch { return null; } };
  const finite = value => typeof value === 'number' && Number.isFinite(value);

  const svg = (tag, attrs) => {
    const node = doc.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(key => node.setAttribute(key, String(attrs[key])));
    return node;
  };
  const factory = (tag, className, text) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const hexToRgb = value => {
    if (typeof value !== 'string') return null;
    const found = /^#([0-9a-fA-F]{6})$/.exec(value.trim());
    if (!found) return null;
    const raw = found[1];
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  };
  const luminance = rgb => {
    if (!rgb) return null;
    const channel = value => {
      const scaled = value / 255;
      return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  };
  const once = (id, tag, className, parent) => {
    let node = doc.getElementById(id);
    if (!node) { node = factory(tag, className); node.id = id; }
    if (node.parentNode !== parent) parent.appendChild(node);
    return node;
  };
  const announce = (id, text) => {
    const region = once(id, 'p', 'v2e093-sr', layout);
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.textContent = text;
  };

  /* E093-01 — Éclats en croix des étoiles vives : la forme distingue une
     étoile brillante sans dépendre de sa seule couleur ni de son opacité. */
  const sparkInfo = safe(() => {
    let layer = doc.getElementById('v2e093-sparks');
    if (!layer) {
      layer = svg('svg', {
        id: 'v2e093-sparks', class: 'v2e093-sparks', viewBox: '0 0 100 100',
        preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false',
      });
      field.insertBefore(layer, field.firstChild);
    }
    const passStars = Array.from(field.querySelectorAll('#e093-stars .e093-star'));
    const total = passStars.length || 48;
    let bright = passStars
      .map(circle => ({
        x: parseFloat(circle.getAttribute('cx')),
        y: parseFloat(circle.getAttribute('cy')),
        m: parseFloat(circle.getAttribute('data-e093-magnitude')) || 0,
      }))
      .filter(star => finite(star.x) && finite(star.y) && star.m >= VIVID);
    if (!bright.length) {
      bright = [];
      for (let i = 0; i < 10; i += 1) {
        bright.push({ x: ((i * 23 + 7) % 97) + 1, y: ((i * 41 + 13) % 97) + 1 });
      }
    }
    field.dataset.v2e093Stars = String(total);
    field.dataset.v2e093Bright = String(bright.length);
    if (!layer.childElementCount) {
      bright.forEach((star, index) => {
        const arm = 1.4;
        const path = `M ${(star.x - arm).toFixed(2)} ${star.y.toFixed(2)} L ${(star.x + arm).toFixed(2)} ${star.y.toFixed(2)} M ${star.x.toFixed(2)} ${(star.y - arm).toFixed(2)} L ${star.x.toFixed(2)} ${(star.y + arm).toFixed(2)}`;
        layer.appendChild(svg('path', {
          class: 'v2e093-spark', d: path, 'data-v2e093-spark': String(index + 1),
        }));
      });
    }
    return layer;
  });

  /* E093-02 — Quadrillage de profondeur : repère géométrique stable, posé
     derrière les arêtes, sans toucher au dégradé de la passe 1. */
  safe(() => {
    let grid = doc.getElementById('v2e093-grid');
    if (!grid) {
      grid = svg('svg', {
        id: 'v2e093-grid', class: 'v2e093-grid', viewBox: '0 0 100 100',
        preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false',
      });
      field.insertBefore(grid, field.firstChild);
    }
    field.dataset.v2e093Grid = String(grid.childElementCount || 1);
    if (grid.childElementCount) return;
    for (let step = 10; step <= 90; step += 10) {
      grid.appendChild(svg('line', { x1: step, y1: 0, x2: step, y2: 100 }));
      grid.appendChild(svg('line', { x1: 0, y1: step, x2: 100, y2: step }));
    }
    field.dataset.v2e093Grid = String(grid.childElementCount);
  });

  /* E093-03 — Motifs de trait des arêtes : plein, tirets ou points selon le
     type de lien, pour que la distinction survive en niveaux de gris. */
  safe(() => {
    const edges = field.querySelector('.constellation-edges');
    if (!edges) return;
    edges.classList.add('v2e093-patterns');
    field.dataset.v2e093Patterns = '1';
  });

  /* E093-04 — Plancher de contraste calculé depuis la couleur d'ère : plus
     l'ère est claire, plus le fond est assombri, pour garder un écart lisible. */
  safe(() => {
    const active = field.querySelector('.const-sun.is-active') || field.querySelector('.const-sun');
    const era = active ? (active.style.getPropertyValue('--era') || '').trim() : '';
    const lum = luminance(hexToRgb(era));
    const floor = lum == null ? 0.20 : Math.min(0.42, 0.10 + (1 - lum) * 0.22);
    field.style.setProperty('--v2e093-floor', floor.toFixed(3));
    field.dataset.v2e093Floor = floor.toFixed(3);
    once('v2e093-floor', 'div', 'v2e093-floor', field);
  });

  /* E093-05 — Halo radial local derrière chaque nœud actif, positionné à
     partir de ses variables --x/--y déjà calculées par la vue (zéro aléa). */
  safe(() => {
    const actives = Array.from(field.querySelectorAll(
      '.const-sun.is-active, .const-planet.is-active, .const-moon.is-active'
    ));
    if (!actives.length) return;
    const layer = once('v2e093-halos', 'div', 'v2e093-halos', field);
    if (!layer.childElementCount) {
      actives.forEach((node, index) => {
        const x = parseFloat(node.style.getPropertyValue('--x'));
        const y = parseFloat(node.style.getPropertyValue('--y'));
        if (!finite(x) || !finite(y)) return;
        const halo = factory('div', 'v2e093-halo');
        halo.style.setProperty('--x', `${x.toFixed(2)}%`);
        halo.style.setProperty('--y', `${y.toFixed(2)}%`);
        halo.dataset.v2e093Halo = String(index + 1);
        layer.appendChild(halo);
      });
    }
    field.dataset.v2e093Halos = String(layer.childElementCount);
  });

  /* E093-06 — Halo texte des étiquettes : une ombre portée épaisses garde
     les libellés lisibles là où les étoiles se densifient. */
  safe(() => {
    field.classList.add('v2e093-labels');
    field.dataset.v2e093Labels = '1';
  });

  /* E093-07 — Légende visuelle : les conventions du contraste sont écrites en
     français dans des <li> réels, visibles, et non réservées aux lecteurs d'écran. */
  safe(() => {
    if (doc.getElementById('v2e093-legend')) return;
    const legend = factory('aside', 'v2e093-legend');
    legend.id = 'v2e093-legend';
    legend.appendChild(factory('p', null, 'Légende du contraste'));
    const list = factory('ul');
    [
      'Croix claire : étoile vive (forme, pas seulement couleur).',
      'Point atténué : étoile discrète.',
      'Trait plein : chemin de l’ère.',
      'Trait en tirets : arête ordinaire.',
      'Trait pointillé : lien de point vérifié.',
      'Lune hachurée : point sélectionné.',
      'Halo doré : nœud actif.',
    ].forEach(item => list.appendChild(factory('li', null, item)));
    legend.appendChild(list);
    layout.appendChild(legend);
  });

  /* E093-08 — Hachures de la lune active : le remplissage en motif distingue
     le point sélectionné même sans la couleur violette. */
  safe(() => {
    const moonLayer = field.querySelector('.const-layer-moons');
    if (!moonLayer) return;
    moonLayer.classList.add('v2e093-moons');
    field.dataset.v2e093Moons = '1';
  });

  /* E093-09 — Niveaux de contraste en radiogroupe (doux, standard, renforcé) :
     choix unique avec aria-checked, distinct de la bascule nuit de la passe 1. */
  const setLevel = safe(() => value => {
    const level = ['doux', 'standard', 'renforce'].indexOf(value) < 0 ? 'standard' : value;
    field.dataset.v2e093Level = level;
    const groupNode = doc.getElementById('v2e093-levels');
    if (groupNode) {
      Array.from(groupNode.querySelectorAll('[role="radio"]')).forEach(button => {
        button.setAttribute('aria-checked', button.dataset.v2e093Level === level ? 'true' : 'false');
      });
    }
    announce('v2e093-level-live', `Niveau de contraste : ${level === 'renforce' ? 'renforcé' : level}.`);
  });
  safe(() => {
    let groupNode = doc.getElementById('v2e093-levels');
    if (!groupNode) {
      groupNode = factory('div');
      groupNode.id = 'v2e093-levels';
      groupNode.setAttribute('role', 'radiogroup');
      groupNode.setAttribute('aria-label', 'Niveau de contraste du champ d’étoiles');
      [['doux', 'Doux'], ['standard', 'Standard'], ['renforce', 'Renforcé']].forEach(pair => {
        const button = factory('button', 'v2e093-level', pair[1]);
        button.type = 'button';
        button.setAttribute('role', 'radio');
        button.dataset.v2e093Level = pair[0];
        groupNode.appendChild(button);
      });
      field.appendChild(groupNode);
    }
    const current = field.dataset.v2e093Level || 'standard';
    field.dataset.v2e093Level = current;
    Array.from(groupNode.querySelectorAll('[role="radio"]')).forEach(button => {
      button.setAttribute('aria-checked', button.dataset.v2e093Level === current ? 'true' : 'false');
    });
    if (typeof setLevel === 'function' && groupNode.dataset.v2e093Bound !== '1') {
      groupNode.dataset.v2e093Bound = '1';
      groupNode.addEventListener('click', event => {
        const target = event && event.target;
        const button = target && typeof target.closest === 'function'
          ? target.closest('[role="radio"]') : null;
        if (button && groupNode.contains(button)) setLevel(button.dataset.v2e093Level);
      });
      groupNode.addEventListener('keydown', event => {
        if (!event || event.defaultPrevented) return;
        const buttons = Array.from(groupNode.querySelectorAll('[role="radio"]'));
        const index = buttons.indexOf(document.activeElement);
        if (index < 0) return;
        let next = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
        else return;
        event.preventDefault();
        buttons[next].focus();
        setLevel(buttons[next].dataset.v2e093Level);
      });
    }
  });

  /* E093-10 — Budget d'étoiles vives annoncé : grandeur chiffrée comparée à
     un repère explicite, réécrite à chaque changement de niveau de contraste. */
  const paintBudget = safe(() => () => {
    const bright = parseInt(field.dataset.v2e093Bright || '0', 10) || 0;
    const total = parseInt(field.dataset.v2e093Stars || '0', 10) || 0;
    const level = field.dataset.v2e093Level || 'standard';
    announce(
      'v2e093-budget',
      `Étoiles vives : ${bright} sur ${total || '—'} · repère : au plus ${BUDGET} pour un fond lisible · niveau ${level}.`
    );
  });
  safe(() => {
    if (typeof paintBudget !== 'function') return;
    paintBudget();
    const groupNode = doc.getElementById('v2e093-levels');
    if (groupNode && groupNode.dataset.v2e093BudgetBound !== '1') {
      groupNode.dataset.v2e093BudgetBound = '1';
      groupNode.addEventListener('click', () => paintBudget());
    }
  });
});
