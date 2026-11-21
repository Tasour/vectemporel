import { register } from './registry.js';

/* Lentille E022 — performance de rendu appliquée aux lunes de la vue Constellation.
   Dix chantiers déterministes et locaux : aucun appel réseau, aucune horloge,
   aucun tirage aléatoire. Le rendu de base reste intact ; la lentille se
   contente d'attributs, d'une feuille unique et de calculs faits une seule fois.
   Greffon tolérant : tout nœud attendu manquant entraîne un retour silencieux. */

const CSS_ID = 'constellation-e022';
const SELECT_FIELD = '.constellation-field';
const SELECT_LAYER = '.const-layer-moons';
const SELECT_MOON = '.const-moon';
const SELECT_EDGES = '.constellation-edges line.is-moon';
const BUDGET_REF = 24; /* référence : 8 lunes × 2 u + 8 arêtes × 1 u. */

/* Parse une valeur en pourcentage déposée par la vue (ex. "42.31%"). */
function percent(value) {
  const raw = value == null ? '' : String(value).trim();
  const number = parseFloat(raw);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

/* Création du nœud via le contrat ctx.el, avec repli silencieux. */
function makeNode(ctx, tag, className, text) {
  if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const doc = ctx.layout.ownerDocument;
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

register('E022', (ctx) => {
  /* Contrat : sans layout exploitable, aucun ajout DOM n'est tenté. */
  const layout = ctx && ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;

  let field;
  let layer;
  let moons;
  let moonEdges;
  try {
    field = layout.querySelector(SELECT_FIELD);
    layer = field ? field.querySelector(SELECT_LAYER) : null;
    moons = layer ? Array.from(layer.querySelectorAll(SELECT_MOON)) : [];
    moonEdges = field ? Array.from(field.querySelectorAll(SELECT_EDGES)) : [];
  } catch {
    return;
  }

  /* Une seule feuille de style pour les dix chantiers, injectée avant tout DOM. */
  try {
    if (typeof ctx.css === 'function') {
      ctx.css(CSS_ID, `
/* E022-01 — la zone de repeinture des lunes est confinée à son calque. */
.constellation-field[data-e022-ready="1"] .const-layer-moons[data-e022-contain="paint"] {
  contain: layout paint style;
}
/* E022-02 — la promotion matérielle est réservée à la seule lune active. */
.constellation-field[data-e022-ready="1"] .const-moon[data-e022-gpu="1"] {
  will-change: transform, box-shadow;
}
/* E022-04 — tracé des arêtes lunaires avec un anti-crénelage moins coûteux. */
.constellation-field[data-e022-ready="1"] .constellation-edges line.is-moon[data-e022-batch="1"] {
  shape-rendering: crispEdges;
}
/* E022-05 — l'étiquette des lunes inactives n'est pas générée du tout. */
.constellation-field[data-e022-ready="1"] .const-moon[data-e022-label="off"]:not(:focus-visible)::after {
  content: none;
}
/* E022-06 — boîte figée : le libellé ne relance aucun calcul de dimension. */
.constellation-field[data-e022-ready="1"] .const-moon[data-e022-size="fixed"] {
  contain: size;
  width: 14px;
  height: 14px;
}
/* E022-07 — retour visuel piloté par l'attribut posé par la délégation. */
.constellation-field[data-e022-ready="1"] .const-moon[data-e022-hover="1"] {
  border-color: var(--gold);
}
/* E022-09 — anneau plat à la place du flou, quand le contexte l'exige. */
.constellation-field[data-e022-ready="1"] .const-moon[data-e022-shadow="ring"].is-active {
  box-shadow: 0 0 0 2px var(--violet);
}
/* E022-08 — badge de budget, frappe de chiffres alignée. */
#e022-budget {
  display: inline-flex; align-items: center;
  margin-left: auto; padding: 2px 7px;
  border: 1px solid rgba(178, 139, 221, .35); border-radius: 6px;
  color: var(--muted-2); font-size: 8px; font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
/* E022-10 — activation globale : rien ne s'applique avant le dernier attribut. */
.constellation-field[data-e022-ready="1"] {
  contain: style;
}
`);
    }
  } catch {
    return;
  }

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  /* E022-01 — confinement de la zone de repeinture du calque lunaire. */
  if (layer) layer.setAttribute('data-e022-contain', 'paint');

  /* E022-03 — cache de position : chaque --x/--y n'est lu qu'une seule fois. */
  moons.forEach((moon) => {
    const x = percent(moon.style.getPropertyValue('--x'));
    const y = percent(moon.style.getPropertyValue('--y'));
    const radius = Math.round(Math.sqrt((x - 50) * (x - 50) + (y - 50) * (y - 50)) * 10) / 10;
    moon.setAttribute('data-e022-pos', x + ',' + y);
    moon.setAttribute('data-e022-ring', String(radius));
  });

  /* E022-02 — promotion matérielle ciblée ; désactivée si mouvement réduit. */
  moons.forEach((moon) => {
    const active = moon.classList.contains('is-active');
    moon.setAttribute('data-e022-gpu', active && !reduced ? '1' : '0');
  });

  /* E022-04 — les arêtes lunaires sont regroupées en un seul fragment SVG. */
  const svg = field ? field.querySelector('.constellation-edges') : null;
  if (svg) {
    const doc = svg.ownerDocument;
    const fragment = doc.createDocumentFragment();
    moonEdges.forEach((line) => {
      line.setAttribute('data-e022-batch', '1');
      fragment.appendChild(line);
    });
    if (moonEdges.length) svg.appendChild(fragment);
    svg.setAttribute('data-e022-batched', String(moonEdges.length));
  }

  /* E022-05 — les étiquettes des lunes inactives sont supprimées du rendu. */
  moons.forEach((moon) => {
    moon.setAttribute('data-e022-label', moon.classList.contains('is-active') ? 'on' : 'off');
  });

  /* E022-06 — dimension figée, indépendante du contenu du libellé. */
  moons.forEach((moon) => {
    moon.setAttribute('data-e022-size', 'fixed');
  });

  /* E022-07 — un seul écouteur délégué remplace les effets de survol par lune. */
  if (layer && !layer.hasAttribute('data-e022-delegated')) {
    layer.setAttribute('data-e022-delegated', '1');
    layer.addEventListener('pointerover', (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== 'function') return;
      const moon = target.closest(SELECT_MOON);
      if (moon && layer.contains(moon)) moon.setAttribute('data-e022-hover', '1');
    });
    layer.addEventListener('pointerout', (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== 'function') return;
      const moon = target.closest(SELECT_MOON);
      if (moon && layer.contains(moon)) moon.removeAttribute('data-e022-hover');
    });
  }

  /* E022-09 — on remplace le flou par un anneau si le rayon de lunes est élevé
     ou si l'utilisateur demande une animation réduite. */
  const cheapShadow = reduced || moons.length > 8;
  moons.forEach((moon) => {
    if (moon.classList.contains('is-active')) {
      moon.setAttribute('data-e022-shadow', cheapShadow ? 'ring' : 'soft');
    }
  });

  /* E022-08 — budget de rendu calculé une fois, comparé à une référence fixe. */
  const cost = moons.length * 2 + moonEdges.length;
  try {
    const host = layout.querySelector('.constellation-head') || layout;
    if (!layout.querySelector('#e022-budget')) {
      const badge = makeNode(ctx, 'span', 'e022-budget',
        'Lunes ' + moons.length + ' · coût ' + cost + '/' + BUDGET_REF + ' u');
      badge.id = 'e022-budget';
      badge.title = 'Estimation de coût de rendu des lunes : ' + cost +
        ' unités pour ' + moons.length + ' lunes et ' + moonEdges.length +
        ' arêtes ; référence ' + BUDGET_REF + ' unités.';
      badge.setAttribute('aria-label', badge.title);
      host.appendChild(badge);
    }
  } catch {
    /* Le badge est facultatif : son échec ne doit pas annuler les autres chantiers. */
  }

  /* E022-10 — activation atomique : une seule écriture rend toutes les règles
     actives en même temps, après la fin des mutations du DOM. */
  if (field) {
    field.setAttribute('data-e022-count', String(moons.length));
    field.setAttribute('data-e022-ready', '1');
  }
});
