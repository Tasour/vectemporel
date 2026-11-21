import { register } from './registry.js';

/* Lentille E042 — Performance de rendu appliquée à la légende de la vue
   Constellation. Dix chantiers locaux, déterministes et tolérants : lectures
   regroupées, écritures conditionnelles, isolation CSS, assemblage en fragment,
   observation unique et instrumentation chiffrée. Aucun appel réseau, aucune
   source aléatoire, aucune sortie de journal, aucun minuteur ni boucle
   d'animation propre, aucune ressource distante, aucun fichier partagé modifié. */

/* État de module : conservé entre les rendus successifs du shell, qui recrée
   le DOM à chaque changement d'état. */
let e042Tentatives = 0;
let e042Ecritures = 0;
let e042Rendus = 0;
let e042Observer = null;
let e042Observed = null;
let e042LastWidth = -1;
let e042LastFingerprint = null;

const E042_SEUIL_LARGEUR = 4;
const E042_MARQUES = {
  'legend-sun': 'È',
  'legend-planet': 'R',
  'legend-moon': 'P',
};

/* Exécution défensive : un chantier défaillant ne neutralise jamais les autres. */
function e042Safe(fn) {
  try { fn(); } catch { /* Greffon neutralisé : le rendu reste intact. */ }
}

/* Écriture conditionnelle : on compare avant d'écrire pour éviter une
   invalidation de style inutile (chantier E042-07). */
function e042SetAttr(node, name, value) {
  e042Tentatives += 1;
  if (!node || typeof node.getAttribute !== 'function') return false;
  const cible = String(value);
  if (node.getAttribute(name) === cible) return false;
  node.setAttribute(name, cible);
  e042Ecritures += 1;
  return true;
}

function e042SetVar(node, name, value) {
  e042Tentatives += 1;
  if (!node || !node.style || typeof node.style.getPropertyValue !== 'function') return false;
  const cible = String(value);
  if (node.style.getPropertyValue(name) === cible) return false;
  node.style.setProperty(name, cible);
  e042Ecritures += 1;
  return true;
}

/* Lecture unique de la légende : une seule passe de sélection, avant toute
   mutation du DOM (chantiers E042-01 et E042-04). */
function e042ReadLegend(legend) {
  const noeuds = legend.querySelectorAll('span');
  return Array.prototype.map.call(noeuds, (node, index) => {
    const classes = typeof node.className === 'string' ? node.className.split(/\s+/) : [];
    const cle = classes.find((name) => Object.prototype.hasOwnProperty.call(E042_MARQUES, name));
    return {
      node,
      index,
      marque: cle ? E042_MARQUES[cle] : String(index + 1),
      classe: cle || 'autre',
      texte: node.textContent || '',
    };
  });
}

/* Empreinte FNV-1a 32 bits, sans aléa ni horloge (chantier E042-10). */
function e042Fingerprint(source) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

register('E042', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM tant que ctx.layout n'est pas exploitable. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (typeof document === 'undefined') return;

  const layout = ctx.layout;
  const legende = layout.querySelector('.constellation-legend');
  if (!legende) return;

  const avantTentatives = e042Tentatives;
  const avantEcritures = e042Ecritures;

  /* E042-01 — Instantané unique de la légende : une seule sélection, puis une
     mesure géométrique groupée, avant la première écriture du greffon. */
  const entrees = e042ReadLegend(legende);
  const mesures = {
    largeur: legende.clientWidth || 0,
    hauteur: legende.clientHeight || 0,
  };
  e042SetAttr(legende, 'data-e042-items', String(entrees.length));
  e042SetAttr(legende, 'data-e042-labels', entrees.map((entree) => entree.texte).join('|'));

  /* E042-02 — Feuille unique et isolation : un seul appel de stylesheet, posé
     avant toute mutation, avec `contain` pour circonscrire le calcul de mise
     en page à la légende. */
  e042Safe(() => ctx.css('constellation-e042', `
    /* E042-02 — La légende devient un îlot de mise en page. */
    .constellation-layout .constellation-legend {
      contain: layout style paint;
    }

    /* E042-03 — Marqueurs pseudo-élémentaux : content: attr() réutilise un
       attribut déjà posé, sans créer le moindre nœud par entrée. */
    .constellation-layout .constellation-legend span[data-e042-mark]::before {
      content: attr(data-e042-mark);
      display: inline-grid;
      place-items: center;
      width: 10px;
      height: 10px;
      margin-right: 5px;
      border-radius: 2px;
      color: var(--ink);
      font-size: 7px;
      font-weight: 700;
      line-height: 1;
      background: var(--gold);
    }
    .constellation-layout .constellation-legend .legend-planet[data-e042-mark]::before {
      background: var(--blue);
    }
    .constellation-layout .constellation-legend .legend-moon[data-e042-mark]::before {
      background: var(--violet);
    }

    /* E042-04 — Largeur centralisée dans une seule variable : aucun style
       inline par entrée, une seule invalidation pour toute la légende. */
    .constellation-layout .constellation-legend span[data-e042-mark] {
      display: inline-block;
      max-width: var(--e042-cell, 96px);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      vertical-align: middle;
    }

    /* E042-08 — Deux propriétés seulement, et suppression complète dès que
       le mouvement réduit est demandé (attribut ou média). */
    .constellation-layout .constellation-legend span[data-e042-mark] {
      transition: color .16s ease, background-color .16s ease;
    }
    .constellation-layout .constellation-legend[data-e042-motion="reduce"] span[data-e042-mark] {
      transition: none !important;
    }
    @media (prefers-reduced-motion: reduce) {
      .constellation-layout .constellation-legend span[data-e042-mark] {
        transition: none !important;
      }
    }

    /* E042-05 / E042-06 / E042-10 — Panneau d'instrumentation assemblé
       hors du document, puis greffé en une seule opération. */
    .constellation-layout #e042-panel {
      margin: 8px 0 0;
      padding: 6px 9px;
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--muted-2);
      font-size: 9px;
      line-height: 1.5;
      font-variant-numeric: tabular-nums;
    }
    .constellation-layout #e042-title {
      margin: 0 0 4px;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 11px;
      font-weight: 450;
    }
    .constellation-layout #e042-note { margin: 0 0 4px; }
    .constellation-layout #e042-readout { margin: 0; color: var(--ink-soft); }
    @media (max-width: 620px) {
      .constellation-layout #e042-panel { padding: 5px 7px; }
    }
  `));
  e042SetAttr(legende, 'data-e042-contained', '1');

  /* E042-03 — Pastilles issues de l'attribut : aucun span, aucun svg, aucun
     élément décoratif ajouté à la légende existante. */
  e042Safe(() => {
    entrees.forEach((entree) => {
      entree.node.setAttribute('data-e042-mark', entree.marque);
    });
  });

  /* E042-04 — Écriture groupée depuis le cache de mesures : la géométrie a
     été lue en E042-01, aucune lecture n'est interleavée avec ces écritures. */
  const parEntree = Math.round(mesures.largeur / Math.max(1, entrees.length));
  const cellule = Math.max(64, Math.min(150, parEntree - 8));
  e042SetAttr(legende, 'data-e042-box',
    `${Math.round(mesures.largeur)}x${Math.round(mesures.hauteur)}`);
  e042Safe(() => e042SetVar(legende, '--e042-cell', `${cellule}px`));

  /* E042-05 — Assemblage en fragment : le panneau complet est construit hors
     du document, puis inséré en une seule opération (un seul reflow). */
  let panneau = null;
  let lecture = null;
  e042Safe(() => {
    panneau = layout.querySelector('#e042-panel');
    if (panneau) {
      lecture = panneau.querySelector('#e042-readout');
      return;
    }
    const fragment = document.createDocumentFragment();
    panneau = ctx.el('section', 'e042-panel');
    panneau.id = 'e042-panel';
    panneau.setAttribute('aria-labelledby', 'e042-title');
    panneau.setAttribute('aria-describedby', 'e042-note');

    const titre = ctx.el('h2', 'e042-title', 'Laboratoire E042 — performance de la légende');
    titre.id = 'e042-title';
    const note = ctx.el('p', 'e042-note',
      'La légende est mesurée une seule fois, puis pilotée par des attributs et une variable CSS partagée. Les écritures redondantes sont évitées, le panneau est assemblé hors du document et l\'empreinte ci-dessous témoigne de la stabilité entre deux rendus.');
    note.id = 'e042-note';
    lecture = ctx.el('p', 'e042-readout', 'Mesures en attente de rendu.');
    lecture.id = 'e042-readout';
    lecture.setAttribute('role', 'status');
    lecture.setAttribute('aria-live', 'polite');
    lecture.setAttribute('aria-atomic', 'true');

    fragment.appendChild(panneau);
    panneau.appendChild(titre);
    panneau.appendChild(note);
    panneau.appendChild(lecture);
    layout.appendChild(fragment);
  });

  /* E042-06 — Idempotence entre rendus : un seul panneau par layout, numéro
     de génération consigné sur le panneau et sur la vue. */
  e042Rendus += 1;
  e042SetAttr(layout, 'data-e042-renders', String(e042Rendus));
  e042SetAttr(panneau, 'data-e042-gen', String(e042Rendus));

  /* E042-07 — Écritures conditionnelles : la densité et la largeur par entrée
     passent par les auxiliaires qui comparent avant d'écrire. */
  e042SetAttr(legende, 'data-e042-density', entrees.length > 3 ? 'dense' : 'normal');
  e042SetAttr(legende, 'data-e042-par-entree', String(parEntree));

  /* E042-08 — Budget de mouvement : la préférence est lue au rendu, puis
     publiée sur la légende pour que la feuille coupe les transitions. */
  let reduit = false;
  e042Safe(() => { reduit = !!(ctx.reducedMotion && ctx.reducedMotion()); });
  e042SetAttr(legende, 'data-e042-motion', reduit ? 'reduce' : 'full');

  /* E042-09 — Observateur unique et seuillé : un seul ResizeObserver au
     niveau du module, reconnecté sur la légende courante, qui ignore les
     variations de largeur inférieures au seuil. */
  e042Safe(() => {
    if (typeof ResizeObserver === 'undefined') {
      e042SetAttr(legende, 'data-e042-observer', 'absent');
      return;
    }
    if (!e042Observer) {
      e042Observer = new ResizeObserver((liste) => {
        liste.forEach((entree) => {
          const cible = entree.target;
          if (!cible || !cible.isConnected) return;
          const rect = entree.contentRect;
          const largeur = Math.round((rect && rect.width) || cible.clientWidth || 0);
          if (Math.abs(largeur - e042LastWidth) < E042_SEUIL_LARGEUR) return;
          e042LastWidth = largeur;
          const compte = Math.max(1, cible.querySelectorAll('span').length);
          const largeurCellule = Math.max(64, Math.min(150, Math.round(largeur / compte) - 8));
          cible.setAttribute('data-e042-width', String(largeur));
          cible.style.setProperty('--e042-cell', `${largeurCellule}px`);
        });
      });
    }
    if (e042Observed && e042Observed !== legende && typeof e042Observer.unobserve === 'function') {
      try { e042Observer.unobserve(e042Observed); } catch { /* Ancien nœud déjà détaché. */ }
    }
    e042Observer.observe(legende);
    e042Observed = legende;
    e042SetAttr(legende, 'data-e042-observer', 'actif');
  });

  /* E042-10 — Empreinte et instrumentation : FNV-1a du contenu observable,
     stabilité entre rendus, compte d'écritures évitées et lecture vocale. */
  e042Safe(() => {
    const source = entrees.map((entree) =>
      `${entree.classe}:${entree.marque}:${entree.texte}`).join('|')
      + `#${Math.round(mesures.largeur)}x${Math.round(mesures.hauteur)}`
      + `#${cellule}#${reduit ? 'r' : 'f'}#${e042Rendus}`;
    const empreinte = e042Fingerprint(source);
    const stable = e042LastFingerprint === null || e042LastFingerprint === empreinte;
    const tentatives = e042Tentatives - avantTentatives;
    const ecrites = e042Ecritures - avantEcritures;
    e042SetAttr(layout, 'data-e042-fingerprint', empreinte);
    e042SetAttr(layout, 'data-e042-stable', stable ? '1' : '0');
    e042SetAttr(legende, 'data-e042-writes', String(ecrites));
    e042SetAttr(legende, 'data-e042-skipped', String(Math.max(0, tentatives - ecrites)));
    e042LastFingerprint = empreinte;

    if (lecture && lecture.isConnected) {
      lecture.textContent = `E042 · légende ${entrees.length} entrée${entrees.length > 1 ? 's' : ''}`
        + ` · boîte ${Math.round(mesures.largeur)}×${Math.round(mesures.hauteur)} px`
        + ` · densité ${legende.getAttribute('data-e042-density') || '—'}`
        + ` · cellule ${cellule} px`
        + ` · écritures ${ecrites}, évitées ${Math.max(0, tentatives - ecrites)}`
        + ` · mouvement ${reduit ? 'réduit' : 'complet'}`
        + ` · version ${empreinte} · stable ${stable ? 'oui' : 'non'}`
        + ` · rendu ${e042Rendus}.`;
    }
  });
});
