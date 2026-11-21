import { register } from './registry.js';

/* Lentille E033 — contraste visuel appliqué aux arêtes du graphe de la vue
   Constellation. Dix chantiers locaux et déterministes : rehaussement des
   traits faibles, épaisseur du chemin, mesure de contraste, halo SVG, double
   codage par tirets, mise en évidence au focus clavier, légende, bascule de
   contraste renforcé, classification par paliers et activation atomique.
   Zéro réseau, zéro aléa, zéro horloge, zéro journalisation. Greffon tolérant. */

const CSS_ID = 'constellation-e033';
const SELECT_FIELD = '.constellation-field';
const SELECT_HEAD = '.constellation-head';
const SELECT_SVG = '.constellation-edges';
const SELECT_EDGES = '.constellation-edges line';
const SELECT_PLANETS = '.const-layer-planets';

/* Constantes de couleur : miroir exact des déclarations CSS de cette feuille. */
const BG = [15, 17, 22];            /* fond sombre de référence de l'atlas. */
const GOLD = [244, 214, 158];       /* teinte des arêtes secondaires. */
const ALPHA_BASE = 0.16;            /* valeur d'origine dans constellation.js. */
const ALPHA_REHAUSSE = 0.44;        /* E033-01. */
const ALPHA_RENFORCE = 0.64;        /* E033-08. */
const REF_NON_TEXTE = 3;            /* repère WCAG 1.4.11 : objet graphique. */

/* Luminance relative WCAG d'une couleur RGB opaque. */
function luminance(rgb) {
  const parts = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
}

/* Composition d'une couleur translucide sur le fond de référence. */
function compose(alpha) {
  return GOLD.map((value, index) => Math.round(alpha * value + (1 - alpha) * BG[index]));
}

/* Ratio de contraste, arrondi au centième, entre l'arête et le fond. */
function contrast(alpha) {
  const foreground = luminance(compose(alpha));
  const background = luminance(BG);
  const high = Math.max(foreground, background);
  const low = Math.min(foreground, background);
  return Math.round(((high + 0.05) / (low + 0.05)) * 100) / 100;
}

/* Lecture d'une coordonnée en pourcentage déposée par la vue. */
function percent(value) {
  const number = parseFloat(value == null ? '' : String(value));
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

/* Création de nœud par le contrat ctx.el, avec repli silencieux. */
function makeNode(ctx, tag, className, text) {
  if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = ctx.layout.ownerDocument.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* Libellé chiffré du badge, recalculé à chaque changement de mode. */
function badgeText(before, after, high, mode) {
  return 'Arêtes ' + before.toFixed(2) + ' → ' + after.toFixed(2) +
    ' → ' + (mode ? high.toFixed(2) : after.toFixed(2)) + ' : 1 · repère ' + REF_NON_TEXTE + ' : 1';
}

register('E033', (ctx) => {
  /* Contrat : sans layout exploitable, aucun ajout DOM n'est tenté. */
  const layout = ctx && ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;

  let field;
  let head;
  let svg;
  let edges;
  let planets;
  try {
    field = layout.querySelector(SELECT_FIELD);
    head = layout.querySelector(SELECT_HEAD);
    svg = field ? field.querySelector(SELECT_SVG) : null;
    edges = svg ? Array.from(svg.querySelectorAll(SELECT_EDGES)) : [];
    planets = field ? Array.from(field.querySelectorAll(SELECT_PLANETS)) : [];
  } catch {
    return;
  }
  if (!field) return;

  const before = contrast(ALPHA_BASE);
  const after = contrast(ALPHA_REHAUSSE);
  const high = contrast(ALPHA_RENFORCE);

  /* Une seule feuille partagée par les dix chantiers ; tout est neutralisé
     tant que l'attribut final data-e033-ready n'a pas été posé. */
  try {
    if (typeof ctx.css === 'function') {
      ctx.css(CSS_ID, `
/* E033-01 — plancher de contraste relevé sur les arêtes secondaires. */
.constellation-field[data-e033-ready="1"] .constellation-edges line[data-e033-min="1"] {
  stroke: rgba(244, 214, 158, .44);
  stroke-width: 1.2;
}
/* E033-02 — épaisseur renforcée sur les arêtes du chemin actif. */
.constellation-field[data-e033-ready="1"] .constellation-edges line[data-e033-weight="strong"] {
  stroke: rgba(245, 202, 130, .92);
  stroke-width: 2.2;
}
/* E033-03 — badge de mesure, chiffres à largeur fixe. */
.constellation-layout[data-e033-ui="1"] #e033-contrast {
  margin-left: auto; padding: 2px 7px;
  border: 1px solid rgba(230, 185, 111, .4); border-radius: 6px;
  color: var(--ink-soft); font-size: 8px; font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
/* E033-04 — halo large placé derrière les arêtes du chemin. */
.constellation-field[data-e033-ready="1"] .constellation-edges line[data-e033-halo-line="1"] {
  stroke: rgba(230, 185, 111, .22);
  stroke-width: 5;
}
/* E033-05 — double codage des arêtes lunaires par un motif de tirets. */
.constellation-field[data-e033-ready="1"] .constellation-edges line[data-e033-dash="moon"] {
  stroke: rgba(196, 159, 235, .82);
  stroke-dasharray: 2 1.6;
  stroke-linecap: round;
}
/* E033-06 — arête mise en évidence quand sa planète reçoit le focus. */
.constellation-field[data-e033-ready="1"] .constellation-edges line[data-e033-focus="1"] {
  stroke: var(--gold-bright);
  stroke-width: 2.8;
}
/* E033-08 — le focus reste visible même en mode renforcé. */
.constellation-field[data-e033-ready="1"][data-e033-boost="1"] .constellation-edges line[data-e033-focus="1"] {
  stroke: #fff3d6;
  stroke-width: 3.2;
}
/* E033-08 — contraste renforcé actionnable. */
.constellation-field[data-e033-ready="1"][data-e033-boost="1"] .constellation-edges line:not([data-e033-halo-line]) {
  stroke: rgba(248, 210, 146, .64);
  stroke-width: 1.8;
}
.constellation-layout[data-e033-ui="1"] #e033-boost {
  min-height: 36px; padding: 0 9px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255, 255, 255, .03); color: var(--ink-soft);
  font-size: 9px; cursor: pointer;
}
.constellation-layout[data-e033-ui="1"] #e033-boost[aria-pressed="true"] {
  border-color: var(--gold); color: var(--gold-bright);
}
/* E033-07 — légende des paliers, complément non coloriel. */
.constellation-layout[data-e033-ui="1"] #e033-legend {
  display: flex; flex-wrap: wrap; gap: 4px 12px;
  margin: 0; color: var(--muted-2); font-size: 8px;
}
.constellation-layout[data-e033-ui="1"] .e033-swatch {
  display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
}
.constellation-layout[data-e033-ui="1"] .e033-swatch::before {
  display: inline-block; width: 18px; height: 0; content: '';
  border-top: 1px solid rgba(244, 214, 158, .44);
}
.constellation-layout[data-e033-ui="1"] .e033-swatch--chemin::before {
  border-top: 3px solid rgba(245, 202, 130, .92);
}
.constellation-layout[data-e033-ui="1"] .e033-swatch--lune::before {
  border-top: 2px dashed rgba(196, 159, 235, .82);
}
.constellation-layout[data-e033-ui="1"] .e033-swatch--focus::before {
  border-top: 3px solid var(--gold-bright);
}
/* E033-10 — activation atomique de toute la feuille. */
.constellation-field[data-e033-ready="1"] {
  contain: style;
}
/* E033-08 — respect du réglage système de contraste renforcé. */
@media (prefers-contrast: more) {
  .constellation-field[data-e033-ready="1"] .constellation-edges line:not([data-e033-halo-line]) {
    stroke: rgba(248, 210, 146, .64);
    stroke-width: 1.8;
  }
}
`);
    }
  } catch {
    return;
  }

  /* E033-01 — les traits ni de chemin ni lunaires reçoivent le plancher. */
  edges.forEach((line) => {
    if (!line.classList.contains('is-path') && !line.classList.contains('is-moon')) {
      line.setAttribute('data-e033-min', '1');
    }
  });

  /* E033-02 — seules les arêtes du chemin actif sont épaissies. */
  const pathEdges = edges.filter((line) => line.classList.contains('is-path'));
  pathEdges.forEach((line) => line.setAttribute('data-e033-weight', 'strong'));

  /* E033-03 — mesure WCAG affichée dans un badge unique. */
  let badge = null;
  try {
    if (head && !layout.querySelector('#e033-contrast')) {
      badge = makeNode(ctx, 'span', 'e033-contrast', badgeText(before, after, high, false));
      badge.id = 'e033-contrast';
      badge.title = 'Contraste des arêtes : ' + before.toFixed(2) + ' pour 1 avant rehaussement, ' +
        after.toFixed(2) + ' pour 1 après, ' + high.toFixed(2) +
        ' pour 1 en mode renforcé ; repère des objets graphiques ' + REF_NON_TEXTE + ' pour 1.';
      badge.setAttribute('aria-label', badge.title);
      head.appendChild(badge);
    }
  } catch {
    /* Le badge est facultatif : son échec n'annule aucun autre chantier. */
  }

  /* E033-04 — doublement des arêtes de chemin par un halo placé derrière. */
  if (svg && edges.length) {
    try {
      pathEdges.forEach((line) => {
        const clone = line.cloneNode(true);
        ['data-e033-min', 'data-e033-weight', 'data-e033-dash', 'data-e033-focus',
          'data-e033-level', 'data-e033-score'].forEach((name) => clone.removeAttribute(name));
        clone.setAttribute('data-e033-halo-line', '1');
        clone.setAttribute('focusable', 'false');
        svg.insertBefore(clone, edges[0]);
      });
      svg.setAttribute('data-e033-halo-count', String(pathEdges.length));
    } catch {
      /* Le halo est décoratif : l'arête d'origine reste inchangée. */
    }
  }

  /* E033-05 — les arêtes lunaires sont codées par le motif, pas la couleur seule. */
  edges.forEach((line) => {
    if (line.classList.contains('is-moon')) line.setAttribute('data-e033-dash', 'moon');
  });

  /* E033-06 — délégation au focus clavier des planètes, sans écouteur par nœud. */
  const planetLayer = planets.length ? planets[0].parentNode : null;
  if (planetLayer && !planetLayer.hasAttribute('data-e033-focus-delegated')) {
    planetLayer.setAttribute('data-e033-focus-delegated', '1');
    const mark = (event, on) => {
      const target = event.target;
      if (!target || typeof target.closest !== 'function') return;
      const planet = target.closest('.const-planet');
      if (!planet || !planetLayer.contains(planet)) return;
      const x = percent(planet.style.getPropertyValue('--x'));
      const y = percent(planet.style.getPropertyValue('--y'));
      pathEdges.forEach((line) => {
        const dx = Math.abs(parseFloat(line.getAttribute('x2')) - x);
        const dy = Math.abs(parseFloat(line.getAttribute('y2')) - y);
        if (Number.isFinite(dx) && Number.isFinite(dy) && dx <= 0.6 && dy <= 0.6) {
          if (on) line.setAttribute('data-e033-focus', '1');
          else line.removeAttribute('data-e033-focus');
        }
      });
    };
    planetLayer.addEventListener('focusin', (event) => mark(event, true));
    planetLayer.addEventListener('focusout', (event) => mark(event, false));
  }

  /* E033-07 — légende des paliers insérée dans l'en-tête. */
  try {
    if (head && !layout.querySelector('#e033-legend')) {
      const legend = makeNode(ctx, 'p', 'e033-legend', '');
      legend.id = 'e033-legend';
      legend.setAttribute('aria-label',
        'Légende des arêtes : trait fin pour un lien secondaire, trait épais pour le chemin, ' +
        'tirets pour une lune, trait clair pour l’élément focalisé.');
      [['', 'Secondaire'], ['e033-swatch--chemin', 'Chemin'],
        ['e033-swatch--lune', 'Lune'], ['e033-swatch--focus', 'Focus']].forEach((pair) => {
        legend.appendChild(makeNode(ctx, 'span', 'e033-swatch ' + pair[0], pair[1]));
      });
      head.appendChild(legend);
    }
  } catch {
    /* La légende est facultative : le titre et l'aria du champ restent lisibles. */
  }

  /* E033-08 — bascule indépendante, exposée par aria-pressed. */
  try {
    if (head && !layout.querySelector('#e033-boost')) {
      const boost = makeNode(ctx, 'button', 'e033-boost', 'Contraste renforcé');
      boost.id = 'e033-boost';
      boost.type = 'button';
      boost.setAttribute('aria-pressed', 'false');
      boost.addEventListener('click', () => {
        try {
          const active = field.getAttribute('data-e033-boost') === '1';
          if (active) field.removeAttribute('data-e033-boost');
          else field.setAttribute('data-e033-boost', '1');
          boost.setAttribute('aria-pressed', active ? 'false' : 'true');
          if (badge) badge.textContent = badgeText(before, after, high, !active);
        } catch {
          /* Une bascule devenue orpheline ne doit pas propager d'exception. */
        }
      });
      head.appendChild(boost);
    }
  } catch {
    /* La bascule est facultative ; les seuils CSS restent actifs. */
  }

  /* E033-09 — score et palier calculés pour chaque arête d'origine. */
  const counts = { faible: 0, moyen: 0, eleve: 0 };
  edges.forEach((line) => {
    let score = 1;
    if (line.classList.contains('is-moon')) score += 1;
    if (line.classList.contains('is-path')) score += 2;
    const level = score >= 3 ? 'eleve' : score === 2 ? 'moyen' : 'faible';
    counts[level] += 1;
    line.setAttribute('data-e033-score', String(score));
    line.setAttribute('data-e033-level', level);
  });
  const legendNode = layout.querySelector('#e033-legend');
  if (legendNode) {
    legendNode.setAttribute('data-e033-levels',
      counts.faible + '/' + counts.moyen + '/' + counts.eleve);
  }
  if (svg) svg.setAttribute('data-e033-levels-text',
    'Faible ' + counts.faible + ' · moyen ' + counts.moyen + ' · élevé ' + counts.eleve);

  /* E033-10 — activation atomique : dernière écriture, après tous les ajouts. */
  field.setAttribute('data-e033-count', String(edges.length));
  layout.setAttribute('data-e033-ui', '1');
  field.setAttribute('data-e033-ready', '1');
});
