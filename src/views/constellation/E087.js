import { register } from './registry.js';

/* Lentille E087 — Diagnostic textuel appliqué au chemin de connexion de la vue
   Constellation. Le chemin de connexion est la chaîne « soleil de l'ère active
   → repère actif → points vérifiés », dessinée par les traits SVG
   .const-edge.is-path et .const-edge.is-moon. Ces traits étant aria-hidden,
   la lentille en livre un diagnostic textuel, chiffré et annoncé.
   Dix chantiers locaux : zéro réseau, zéro aléa, zéro journal, aucun minuteur
   ni boucle d'animation propre. Le greffon reste tolérant. */

register('E087', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function' || typeof layout.appendChild !== 'function') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;

  /* Fabrique tolérante : ctx.el si disponible, repli local sinon. */
  const make = (tag, cls, text) => {
    if (typeof ctx.el === 'function') {
      const node = ctx.el(tag, cls, text);
      if (node) return node;
    }
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };

  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.setAttribute !== 'function' || typeof field.querySelector !== 'function') return;
  const edges = layout.querySelector('svg.constellation-edges');
  const allEdges = edges && typeof edges.querySelectorAll === 'function'
    ? Array.from(edges.querySelectorAll('line.const-edge')) : [];
  const hasClass = (node, name) => !!(node && node.classList && typeof node.classList.contains === 'function'
    && node.classList.contains(name));
  const moonEdges = allEdges.filter(line => hasClass(line, 'is-moon'));
  const pathEdges = allEdges.filter(line => hasClass(line, 'is-path'));
  const pathOnly = pathEdges.filter(line => !hasClass(line, 'is-moon'));
  const neutralEdges = allEdges.length - moonEdges.length - pathOnly.length;

  const activeSun = field.querySelector('.const-layer-suns .const-sun.is-active');
  const activePlanet = field.querySelector('.const-layer-planets .const-planet.is-active');
  const activeMoon = field.querySelector('.const-layer-moons .const-moon.is-active');
  const labelOf = (node) => {
    if (!node) return '—';
    if (node.dataset && node.dataset.label) return node.dataset.label;
    if (typeof node.getAttribute === 'function') {
      const aria = node.getAttribute('aria-label');
      if (aria) return aria;
    }
    return '—';
  };

  /* Longueur euclidienne d'un segment dans le viewBox 0–100 du SVG. */
  const segment = (line) => {
    if (!line || typeof line.getAttribute !== 'function') return 0;
    const x1 = parseFloat(line.getAttribute('x1'));
    const y1 = parseFloat(line.getAttribute('y1'));
    const x2 = parseFloat(line.getAttribute('x2'));
    const y2 = parseFloat(line.getAttribute('y2'));
    if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) return 0;
    return Math.hypot(x2 - x1, y2 - y1);
  };
  const lengthOf = (list) => list.reduce((sum, line) => sum + segment(line), 0);
  const pathLength = lengthOf(pathEdges);
  const moonLength = lengthOf(moonEdges);
  const diagonale = Math.hypot(100, 100); /* 141,4 unités : repère du champ. */

  const chaine = () => [
    `Ère : ${labelOf(activeSun)}`,
    `Repère : ${labelOf(activePlanet)}`,
    `Point : ${labelOf(activeMoon)}`,
  ].join(' → ');

  const calm = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() === true;
  let etat = 'absent';

  /* Feuille unique de la lentille, injectée par le seul appel autorisé. */
  css('constellation-e087', `
.e087-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.e087-field{--e087-path:#e6b96f;--e087-moon:#b28bdd}
.e087-field line[data-e087-kind="path"]{stroke:var(--e087-path)!important;stroke-width:2.4!important}
.e087-field line[data-e087-kind="moon"]{stroke:var(--e087-moon)!important;stroke-width:2!important}
.e087-field line[data-e087-kind="neutre"]{stroke:rgba(244,214,158,.12)!important;stroke-width:.8!important}
.e087-chaine{margin:8px 0 0;font-size:10px;line-height:1.5;color:var(--gold-bright);border-left:2px solid var(--e087-path);padding-left:8px}
.e087-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin:8px 0 0;font-size:9px;color:var(--text-muted,#c9c2b4)}
.e087-legend>span{display:inline-flex;align-items:center;gap:5px}
.e087-swatch{display:inline-block;width:14px;height:0;border-top:2px solid var(--e087-path)}
.e087-swatch-moon{border-top-color:var(--e087-moon);border-top-style:dashed}
.e087-swatch-neutre{border-top-color:rgba(244,214,158,.3);border-top-style:dotted}
.e087-panel{margin-top:10px;padding:8px 10px;border:1px solid var(--gold,#b98b46);border-radius:8px;background:rgba(7,11,18,.55);font-size:10px}
.e087-panel-title{margin:0 0 6px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-bright)}
.e087-panel dl{display:grid;grid-template-columns:max-content 1fr;gap:2px 12px;margin:0}
.e087-panel dt{color:var(--text-muted,#c9c2b4)}
.e087-panel dd{margin:0;color:var(--gold-bright);font-variant-numeric:tabular-nums}
.e087-detail{display:none}
.e087-panel[data-e087-verbose="1"] .e087-detail{display:block}
.e087-field[data-e087-state="rompu"]{box-shadow:inset 0 0 0 2px rgba(214,111,111,.55)}
.e087-node[data-e087-role]{outline:1px dashed var(--e087-path);outline-offset:2px}
.e087-toggle{margin-top:8px;min-height:36px;padding:0 12px;border:1px solid var(--gold,#b98b46);border-radius:8px;background:var(--surface-2,#1b2028);color:var(--gold-bright);font-size:10px;cursor:pointer}
.e087-toggle:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px}
.e087-calm *{transition:none!important}
@media (prefers-reduced-motion: reduce){.e087-field *,.e087-panel *,.e087-toggle{transition:none!important}}
`);

  /* E087-01 — Inventaire chiffré : total, segments actifs, lunaires, neutres. */
  field.setAttribute('data-e087-total', String(allEdges.length));
  field.setAttribute('data-e087-path', String(pathEdges.length));
  field.setAttribute('data-e087-moon', String(moonEdges.length));
  field.setAttribute('data-e087-neutral', String(neutralEdges));

  /* E087-02 — Chaîne textuelle du chemin actif, issue des étiquettes des nœuds. */
  if (!layout.querySelector('#e087-chaine')) {
    const chaineNode = make('p', 'e087-chaine', `Chemin : ${chaine()}`);
    chaineNode.id = 'e087-chaine';
    field.appendChild(chaineNode);
  }

  /* E087-03 — Mesure des segments, rapportée à la diagonale du viewBox. */
  field.setAttribute('data-e087-length', pathLength.toFixed(1));
  field.setAttribute('data-e087-moonlength', moonLength.toFixed(1));
  field.setAttribute('data-e087-ref', diagonale.toFixed(1));

  /* E087-04 — Codage textuel des traits : attribut de nature + classe de champ. */
  if (typeof field.classList === 'object' && field.classList) {
    field.classList.add('e087-field');
    if (calm) field.classList.add('e087-calm');
  }
  allEdges.forEach((line) => {
    if (!line || typeof line.setAttribute !== 'function') return;
    const nature = hasClass(line, 'is-moon') ? 'moon' : hasClass(line, 'is-path') ? 'path' : 'neutre';
    line.setAttribute('data-e087-kind', nature);
    line.setAttribute('data-e087-label', nature === 'moon'
      ? 'liaison repère → point' : nature === 'path'
        ? 'liaison ère → repère' : 'liaison secondaire');
  });

  /* E087-05 — Rôles textuels des nœuds : source, relais, feuille. */
  [[activeSun, 'source'], [activePlanet, 'relais'], [activeMoon, 'feuille']].forEach(([node, role]) => {
    if (!node || typeof node.setAttribute !== 'function') return;
    node.setAttribute('data-e087-role', role);
    if (node.classList && typeof node.classList.add === 'function') node.classList.add('e087-node');
    const titre = typeof node.getAttribute === 'function' ? (node.getAttribute('title') || '') : '';
    if (titre.indexOf('rôle :') < 0) node.setAttribute('title', `${titre} · rôle : ${role}`.trim());
  });

  /* E087-06 — Panneau de diagnostic textuel, structural et non coloriel. */
  let panel = layout.querySelector('#e087-panel');
  if (!panel) {
    panel = make('section', 'e087-panel');
    panel.id = 'e087-panel';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Diagnostic du chemin de connexion');
    panel.setAttribute('data-e087-verbose', '0');
    const title = make('p', 'e087-panel-title', 'Diagnostic du chemin');
    const dl = make('dl');
    const add = (label, value, detail, key) => {
      const dt = make('dt', null, label);
      const dd = make('dd', detail ? 'e087-detail' : null, value);
      if (key) dd.setAttribute('data-e087-field', key);
      dl.appendChild(dt);
      dl.appendChild(dd);
    };
    add('Traits dessinés', String(allEdges.length), false, 'total');
    add('Segments du chemin', String(pathEdges.length), false, 'path');
    add('Liaisons vers les points', String(moonEdges.length), true, 'moon');
    add('Longueur cumulée', `${pathLength.toFixed(1)} u. / ${diagonale.toFixed(1)} u. (diagonale du champ)`, true, 'length');
    add('État du chemin', etat, false, 'etat');
    panel.appendChild(title);
    panel.appendChild(dl);
    layout.appendChild(panel);
  }

  /* E087-07 — Région live : le diagnostic est annoncé après chaque choix. */
  let live = layout.querySelector('#e087-live');
  if (!live) {
    live = make('p', 'e087-sr', chaine());
    live.id = 'e087-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    layout.appendChild(live);
  }
  const annoncer = () => {
    live.textContent = `Diagnostic du chemin : ${chaine()}. ${allEdges.length} traits dont ${pathEdges.length} actifs ; longueur ${pathLength.toFixed(1)} unités sur ${diagonale.toFixed(1)} (diagonale du champ). État : ${etat}.`;
  };
  if (layout.dataset && !layout.dataset.e087Bound) {
    layout.dataset.e087Bound = '1';
    layout.addEventListener('click', annoncer, true);
  }

  /* E087-08 — Détection de chemin rompu : origine du trait vs soleil actif. */
  const coord = (node, prop) => (node && node.style && typeof node.style.getPropertyValue === 'function')
    ? parseFloat(node.style.getPropertyValue(prop)) : NaN;
  const premier = pathOnly[0] || pathEdges[0];
  if (!premier || typeof premier.getAttribute !== 'function') etat = 'absent';
  else {
    const x1 = parseFloat(premier.getAttribute('x1'));
    const y1 = parseFloat(premier.getAttribute('y1'));
    if (!Number.isFinite(x1) || !Number.isFinite(y1)) etat = 'illisible';
    else {
      const sx = coord(activeSun, '--x');
      const sy = coord(activeSun, '--y');
      etat = (Number.isFinite(sx) && Number.isFinite(sy) && Math.abs(sx - x1) + Math.abs(sy - y1) > 0.6)
        ? 'rompu' : 'intègre';
    }
  }
  field.setAttribute('data-e087-state', etat);
  const libelles = {
    intègre: 'intègre — soleil et origine du trait alignés',
    rompu: 'rompu — origine du trait décalée',
    absent: 'absent — aucun trait de chemin',
    illisible: 'illisible — coordonnées manquantes',
  };
  const libelleEtat = libelles[etat] || etat;
  const etatNode = layout.querySelector('#e087-panel [data-e087-field="etat"]');
  if (etatNode) etatNode.textContent = libelleEtat;
  annoncer();

  /* E087-09 — Légende textuelle des trois natures de trait. */
  if (!layout.querySelector('#e087-legend')) {
    const legend = make('p', 'e087-legend');
    legend.id = 'e087-legend';
    const item = (nature, texte) => {
      const span = make('span');
      const suffixe = nature === 'moon' ? ' e087-swatch-moon'
        : nature === 'neutre' ? ' e087-swatch-neutre' : '';
      const swatch = make('span', `e087-swatch${suffixe}`);
      swatch.setAttribute('aria-hidden', 'true');
      span.appendChild(swatch);
      span.appendChild(document.createTextNode(texte));
      return span;
    };
    legend.appendChild(item('path', 'ère → repère'));
    legend.appendChild(item('moon', 'repère → point'));
    legend.appendChild(item('neutre', 'liaison secondaire'));
    field.appendChild(legend);
  }

  /* E087-10 — Bascule de verbosité du diagnostic (commande indépendante). */
  let toggle = layout.querySelector('#e087-toggle');
  if (!toggle && panel) {
    toggle = make('button', 'e087-toggle', 'Détail du diagnostic');
    toggle.id = 'e087-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', panel.id);
    toggle.setAttribute('aria-pressed', 'false');
    toggle.addEventListener('click', () => {
      const on = panel.getAttribute('data-e087-verbose') === '1';
      const next = on ? '0' : '1';
      panel.setAttribute('data-e087-verbose', next);
      toggle.setAttribute('aria-pressed', next === '1' ? 'true' : 'false');
      toggle.textContent = next === '1' ? 'Réduire le diagnostic' : 'Détail du diagnostic';
    });
    panel.appendChild(toggle);
  }
});
