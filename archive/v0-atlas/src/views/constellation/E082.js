import { register } from './registry.js';

/* Lentille E082 — performance de rendu appliquée au chemin de connexion de la
   vue Constellation. Le « chemin de connexion » est l'ensemble des traits SVG
   .constellation-edges qui relient le soleil de l'ère active au repère actif,
   puis à ses points vérifiés (classes is-path et is-moon). Dix chantiers
   déterministes et locaux : confinement, cache géométrique, fusion des traits
   secondaires, qualité de tracé, élagage, ordre de peinture, niveau de détail,
   bascule économie, budget chiffré et activation atomique. Aucun appel réseau,
   aucune source d'aléa, aucune horloge ni boucle d'animation propre, aucun
   appel de débogage. Aucun fichier partagé n'est modifié. */

const BUDGET_ID = 'e082-budget';
const ECO_ID = 'e082-eco';
const REF_COST = 40; /* référence : 40 unités de coût de rendu du chemin. */
const MIN_LEN = 1.2; /* longueur minimale, en unités du viewBox 0 0 100 100. */
const LOD_LIMIT = 24; /* au-delà, le chemin bascule en niveau de détail réduit. */

const CSS = `
/* E082-01 — confinement de la couche du chemin : toute invalidation de paint
   ou de layout reste dans le SVG au lieu de traverser tout le champ. */
.constellation-field[data-e082-ready="1"] .constellation-edges[data-e082-contain="1"] {
  contain: layout paint style;
  isolation: isolate;
}
/* E082-03 — les traits secondaires fusionnés deviennent un seul tracé par
   famille (_traits vers les repères_ et _rayons vers les lunes_). */
.constellation-field[data-e082-ready="1"] .constellation-edges path.e082-merged {
  fill: none;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.constellation-field[data-e082-ready="1"] .constellation-edges path.e082-merged-planet {
  stroke: rgba(244, 214, 158, .16);
}
.constellation-field[data-e082-ready="1"] .constellation-edges path.e082-merged-moon {
  stroke: rgba(178, 139, 221, .35);
}
/* E082-03 — les traits d'origine ne sont plus peints individuellement. */
.constellation-field[data-e082-ready="1"] .constellation-edges line[data-e082-merged="1"],
.constellation-field[data-e082-ready="1"] .constellation-edges line[data-e082-skip="1"] {
  display: none;
}
/* E082-04 — repli CSS de la qualité de tracé : précision sur le chemin actif. */
.constellation-field[data-e082-ready="1"] .constellation-edges line[data-e082-shape="precise"] {
  shape-rendering: geometricPrecision;
}
/* E082-07 — niveau de détail dense : le fond fusionné cesse d'être peint,
   seuls le chemin actif et les rayons lunaires subsistent. */
.constellation-field[data-e082-ready="1"][data-e082-lod="dense"] .constellation-edges path.e082-merged {
  display: none;
}
/* E082-08 — mode économie : la même économie, déclenchée cette fois par
   l'utilisateur, avec retrait des rayons lunaires secondaires. */
.constellation-field[data-e082-ready="1"][data-e082-eco="1"] .constellation-edges path.e082-merged,
.constellation-field[data-e082-ready="1"][data-e082-eco="1"] .constellation-edges line.is-moon:not(.is-path) {
  display: none;
}
/* E082-08 — bouton de bascule : cible minimale et focus visible. */
#e082-eco {
  min-height: 36px; min-width: 36px; padding: 0 10px;
  border: 1px solid var(--line, #3a4150); border-radius: 8px;
  background: var(--surface-2, #141a24); color: var(--ink-soft, #cfd8e6);
  font-size: 9px; cursor: pointer;
}
#e082-eco[aria-pressed="true"] {
  border-color: var(--gold, #e6b96f); color: var(--gold-bright, #f5e6c4);
}
#e082-eco:focus-visible { outline: 2px solid var(--gold, #e6b96f); outline-offset: 2px; }
/* E082-09 — badge de budget, frappe de chiffres alignée. */
#e082-budget {
  display: inline-flex; align-items: center; margin-left: auto;
  padding: 2px 7px; border: 1px solid rgba(230, 185, 111, .32); border-radius: 6px;
  color: var(--muted-2, #93a0b4); font-size: 8px;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
@media (max-width: 620px) {
  #e082-eco { font-size: 8px; }
  #e082-budget { font-size: 7px; }
}
@media (prefers-reduced-motion: reduce) {
  #e082-eco { transition: none; }
}
`;

function safe(fn) { try { fn(); } catch { /* Greffon neutralisé : rendu intact. */ } }

function num(value, fallback) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value) { return Math.round(value * 100) / 100; }

function makeNode(ctx, tag, className, text) {
  if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const doc = ctx.layout.ownerDocument;
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

register('E082', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM sans layout exploitable. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  const layout = ctx.layout;
  let badge = null;

  /* E082-10 — une seule feuille de style, injectée avant toute mutation. */
  safe(() => { if (typeof ctx.css === 'function') ctx.css('constellation-e082', CSS); });

  let field, edges;
  try {
    field = layout.querySelector('.constellation-field');
    edges = field ? field.querySelector('.constellation-edges') : null;
  } catch { return; }
  if (!field || !edges) return;

  let lines;
  try {
    lines = Array.from(edges.querySelectorAll('line'))
      .filter((line) => line.classList && line.classList.contains('const-edge'));
  } catch { return; }
  if (!lines.length) {
    safe(() => field.setAttribute('data-e082-count', '0'));
    safe(() => field.setAttribute('data-e082-ready', '1'));
    return;
  }

  const NS = edges.namespaceURI;
  const doc = layout.ownerDocument;

  /* E082-01 — le confinement est armé par un seul attribut sur le SVG. */
  safe(() => edges.setAttribute('data-e082-contain', '1'));

  /* E082-02 — cache de géométrie : x1/y1/x2/y2 lus une seule fois par trait,
     longueur et clé de position calculées puis mémorisées en attributs. */
  const geo = [];
  safe(() => {
    lines.forEach((line, index) => {
      const x1 = num(line.getAttribute('x1'), 0);
      const y1 = num(line.getAttribute('y1'), 0);
      const x2 = num(line.getAttribute('x2'), 0);
      const y2 = num(line.getAttribute('y2'), 0);
      const len = round2(Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)));
      const key = [x1, y1, x2, y2].map(round2).join(',');
      line.setAttribute('data-e082-len', String(len));
      line.setAttribute('data-e082-key', key);
      geo.push({
        line, x1, y1, x2, y2, len, key, index,
        onPath: line.classList.contains('is-path'),
        isMoon: line.classList.contains('is-moon'),
      });
    });
  });
  if (!geo.length) return;

  /* E082-03 — fusion des traits secondaires : les segments non actifs sont
     assemblés en deux uniques éléments <path> (repères et rayons lunaires),
     puis les traits d'origine sont marqués comme non peints. */
  safe(() => {
    if (!NS || !doc) return;
    const build = (items, family) => {
      const usable = items.filter((g) => g.len >= MIN_LEN
        && g.line.getAttribute('data-e082-merged') !== '1');
      if (!usable.length) return;
      const d = usable.map((g) => `M${g.x1} ${g.y1}L${g.x2} ${g.y2}`).join(' ');
      const path = doc.createElementNS(NS, 'path');
      path.setAttribute('class', `e082-merged e082-merged-${family}`);
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      path.setAttribute('data-e082-shape', 'fast');
      edges.appendChild(path);
      usable.forEach((g) => g.line.setAttribute('data-e082-merged', '1'));
    };
    build(geo.filter((g) => !g.onPath && !g.isMoon), 'planet');
    build(geo.filter((g) => !g.onPath && g.isMoon), 'moon');
  });

  /* E082-04 — qualité de tracé différenciée : précision géométrique sur le
     chemin actif, rendu rapide (optimizeSpeed) sur les fondus fusionnés. */
  safe(() => {
    geo.forEach((g) => {
      if (!g.onPath) return;
      g.line.setAttribute('data-e082-shape', 'precise');
      g.line.setAttribute('shape-rendering', 'geometricPrecision');
    });
    Array.from(edges.querySelectorAll('path.e082-merged')).forEach((path) => {
      path.setAttribute('shape-rendering', 'optimizeSpeed');
    });
  });

  /* E082-05 — élagage des segments dégénérés (longueur sous le seuil) ou
     dupliqués (même clé de coordonnées) : aucun pixel perdu à les peindre. */
  safe(() => {
    const seen = Object.create(null);
    geo.forEach((g) => {
      const degenerate = g.len < MIN_LEN;
      const duplicate = Object.prototype.hasOwnProperty.call(seen, g.key);
      if (!duplicate) seen[g.key] = 1;
      if (degenerate || duplicate) g.line.setAttribute('data-e082-skip', '1');
    });
  });

  /* E082-06 — ordre de peinture : les traits du chemin actif sont déplacés en
     fin de SVG via un fragment, donc peints au-dessus du fond fusionné. */
  safe(() => {
    if (!NS || !doc) return;
    const active = geo.filter((g) => g.onPath
      && g.line.getAttribute('data-e082-merged') !== '1');
    if (!active.length) return;
    const fragment = doc.createDocumentFragment();
    active.forEach((g) => {
      g.line.setAttribute('data-e082-top', '1');
      fragment.appendChild(g.line);
    });
    edges.appendChild(fragment);
  });

  /* E082-07 — niveau de détail : la densité est calculée une fois et comparée
     au seuil de 24, puis consignée sur le champ pour piloter la règle CSS. */
  safe(() => {
    const paths = edges.querySelectorAll('path.e082-merged').length;
    const density = geo.length + paths;
    field.setAttribute('data-e082-density', String(density));
    field.setAttribute('data-e082-lod', density > LOD_LIMIT ? 'dense' : 'normal');
  });

  /* E082-09 — budget de rendu : coût = 1 (confinement) + 2 par trait actif
     + 1 par tracé fusionné visible ; comparé à la référence fixe de 40 unités. */
  function paintBudget() {
    if (!badge || !badge.isConnected) return;
    const eco = field.getAttribute('data-e082-eco') === '1';
    const dense = field.getAttribute('data-e082-lod') === 'dense';
    const activeCount = geo.filter((g) => g.onPath
      && g.line.getAttribute('data-e082-skip') !== '1').length;
    const pathCount = (eco || dense) ? 0 : edges.querySelectorAll('path.e082-merged').length;
    const cost = 1 + activeCount * 2 + pathCount;
    const text = `Chemin : ${cost}/${REF_COST} u · actifs ${activeCount} · tracés ${pathCount}`;
    badge.textContent = text;
    badge.setAttribute('aria-label', `${text} ; référence ${REF_COST} unités.`);
  }

  /* E082-08 — bascule « mode économie » : aria-pressed, état initial aligné sur
     la préférence de mouvement réduit, écouteur unique posé sous garde. */
  safe(() => {
    let reduced = false;
    try { reduced = !!(typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()); }
    catch { reduced = false; }
    if (field.getAttribute('data-e082-eco') === null) {
      field.setAttribute('data-e082-eco', reduced ? '1' : '0');
    }
    const host = layout.querySelector('.constellation-caption') || layout;
    let button = doc ? doc.getElementById(ECO_ID) : null;
    if (!button || !button.isConnected) {
      button = makeNode(ctx, 'button', null, 'Chemin économique');
      button.id = ECO_ID;
      button.type = 'button';
      host.appendChild(button);
    }
    button.setAttribute('aria-pressed', field.getAttribute('data-e082-eco') === '1' ? 'true' : 'false');
    if (button.getAttribute('data-e082-bound') !== '1') {
      button.setAttribute('data-e082-bound', '1');
      button.addEventListener('click', () => {
        const on = field.getAttribute('data-e082-eco') !== '1';
        field.setAttribute('data-e082-eco', on ? '1' : '0');
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
        paintBudget();
      });
    }
  });

  /* E082-09 (suite) — le badge est créé via ctx.el, une seule fois, puis
     rempli par paintBudget() (aussi appelé lors de la bascule 08). */
  safe(() => {
    const host = layout.querySelector('.constellation-head') || layout;
    badge = doc ? doc.getElementById(BUDGET_ID) : null;
    if (!badge || !badge.isConnected) {
      badge = makeNode(ctx, 'span', null, '');
      badge.id = BUDGET_ID;
      host.appendChild(badge);
    }
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    paintBudget();
  });

  /* E082-10 — activation atomique : une dernière écriture rend toutes les
     règles actives en même temps, une fois les mutations du DOM terminées. */
  safe(() => {
    field.setAttribute('data-e082-count', String(geo.length));
    field.setAttribute('data-e082-ready', '1');
  });
});
