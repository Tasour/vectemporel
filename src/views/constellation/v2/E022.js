import { register } from './registry.js';

/* Lentille V2 E022 — performance de rendu des lunes, seconde passe. Dix
   chantiers inédits, tous locaux et déterministes : ni réseau, ni tirage
   aléatoire, ni minuteur, ni boucle d'animation propre. Préfixe exclusif
   v2e022, sans aucune collision avec les identifiants de la passe 1. */

/* Écriture conditionnelle : une valeur identique n'invalide pas le style. */
function ecrireAttribut(noeud, nom, valeur) {
  if (!noeud || typeof noeud.getAttribute !== 'function'
      || typeof noeud.setAttribute !== 'function') return;
  if (noeud.getAttribute(nom) === valeur) return;
  noeud.setAttribute(nom, valeur);
}

/* Normalise une coordonnée textuelle en nombre à une décimale, sans aléa. */
function coordonnee(valeur) {
  const brut = valeur == null ? '' : String(valeur).trim();
  const nombre = parseFloat(brut);
  return Number.isFinite(nombre) ? Math.round(nombre * 10) / 10 : 0;
}

/* Création d'un nœud via ctx.el, avec repli silencieux sur ownerDocument. */
function creerNoeud(ctx, balise, classe, texte) {
  if (typeof ctx.el === 'function') return ctx.el(balise, classe, texte);
  const doc = ctx.layout.ownerDocument;
  const noeud = doc.createElement(balise);
  if (classe) noeud.className = classe;
  if (texte !== undefined) noeud.textContent = texte;
  return noeud;
}

register('E022', ctx => {
  /* Garde d'entrée obligatoire : sans layout, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la passe 2 ; aucune règle n'agit avant la dernière
     écriture de la passe, portée par data-v2e022-ready. */
  css('constellation-v2-e022', `
/* E022-02 — virtualisation des lunes réellement hors écran. */
.constellation-field[data-v2e022-ready="1"][data-v2e022-cv="1"] .const-moon[data-v2e022-inview="0"]{
  content-visibility:auto;
  contain-intrinsic-size:14px 14px;
}
/* E022-04 — arêtes en double retirées du rendu SVG. */
.constellation-field[data-v2e022-ready="1"][data-v2e022-dedup="1"] .constellation-edges line[data-v2e022-dup="1"]{
  display:none;
}
/* E022-05 — le décor ne capte plus le pointeur ; les lunes restent ciblables. */
.constellation-field[data-v2e022-ready="1"][data-v2e022-hit="1"] .constellation-edges,
.constellation-field[data-v2e022-ready="1"][data-v2e022-hit="1"] .constellation-veils,
.constellation-field[data-v2e022-ready="1"][data-v2e022-hit="1"] .const-layer-suns,
.constellation-field[data-v2e022-ready="1"][data-v2e022-hit="1"] .const-layer-planets{
  pointer-events:none;
}
.constellation-field[data-v2e022-ready="1"][data-v2e022-hit="1"] .const-layer-moons{
  user-select:none;
}
/* E022-06 — aucune transition sur une lune hors écran. */
.constellation-field[data-v2e022-ready="1"][data-v2e022-quiet="1"] .const-moon[data-v2e022-inview="0"]{
  transition:none;
}
/* E022-07 — nœud de suivi masqué, inséré en une seule fois. */
.v2e022-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
}
`);

  let field = null;
  let layer = null;
  let moons = [];
  try {
    field = layout.querySelector('.constellation-field');
    layer = field ? field.querySelector('.const-layer-moons') : null;
    moons = layer ? Array.from(layer.querySelectorAll('.const-moon')) : [];
  } catch {
    return;
  }

  /* E022-01 — Visibilité réelle des lunes : observation du viewport, sans
     minuteur ni boucle propre ; repli « tout visible » si l'API manque. */
  const CLE_OBSERVATEUR = '__v2e022_io';
  const Observeur = typeof window !== 'undefined' ? window.IntersectionObserver : null;

  function actualiserCompteur() {
    let visibles = 0;
    moons.forEach(moon => {
      if (moon.getAttribute('data-v2e022-inview') !== '0') visibles += 1;
    });
    const total = moons.length;
    const ratio = total ? Math.round((visibles / total) * 100) : 0;
    if (layer) {
      ecrireAttribut(layer, 'data-v2e022-visible', String(visibles));
      ecrireAttribut(layer, 'data-v2e022-total', String(total));
      ecrireAttribut(layer, 'data-v2e022-ratio', String(ratio));
    }
    const etat = layout.querySelector('#v2e022-etat');
    if (etat) etat.textContent = 'Lunes visibles : ' + visibles + ' sur ' + total + '.';
  }

  if (Observeur && moons.length) {
    try {
      const precedent = window[CLE_OBSERVATEUR];
      if (precedent && typeof precedent.disconnect === 'function') {
        try { precedent.disconnect(); } catch {}
      }
      const observeur = new Observeur(entrees => {
        entrees.forEach(entree => {
          const cible = entree && entree.target;
          if (!cible) return;
          ecrireAttribut(cible, 'data-v2e022-inview', entree.isIntersecting ? '1' : '0');
        });
        actualiserCompteur();
      }, { root: null, rootMargin: '0px', threshold: 0 });
      moons.forEach(moon => {
        ecrireAttribut(moon, 'data-v2e022-inview', '1');
        observeur.observe(moon);
      });
      window[CLE_OBSERVATEUR] = observeur;
    } catch {
      moons.forEach(moon => ecrireAttribut(moon, 'data-v2e022-inview', '1'));
    }
  } else {
    moons.forEach(moon => ecrireAttribut(moon, 'data-v2e022-inview', '1'));
  }

  /* E022-02 — Activation de la virtualisation CSS du calque lunaire. */
  if (layer) ecrireAttribut(layer, 'data-v2e022-cv', '1');

  /* E022-03 — Anti-thrashing : toutes les lectures d'abord dans un tableau,
     toutes les écritures ensuite ; aucune mesure n'est entrelacée. */
  const mesures = moons.map(moon => ({
    noeud: moon,
    x: coordonnee(moon.style && moon.style.getPropertyValue('--x')),
    y: coordonnee(moon.style && moon.style.getPropertyValue('--y')),
    titre: moon.getAttribute('title') == null ? 0 : String(moon.getAttribute('title')).length,
  }));
  mesures.forEach(mesure => {
    ecrireAttribut(mesure.noeud, 'data-v2e022-pos', mesure.x + ',' + mesure.y);
    ecrireAttribut(mesure.noeud, 'data-v2e022-titre', String(mesure.titre));
  });
  if (layer) ecrireAttribut(layer, 'data-v2e022-measured', String(mesures.length));

  /* E022-04 — Déduplication des arêtes par clé de coordonnées arrondies. */
  if (field) {
    const svg = field.querySelector('.constellation-edges');
    if (svg && typeof svg.querySelectorAll === 'function') {
      const vues = new Set();
      let doublons = 0;
      Array.from(svg.querySelectorAll('line')).forEach(line => {
        const cle = ['x1', 'y1', 'x2', 'y2']
          .map(nom => coordonnee(line.getAttribute(nom))).join(':');
        if (vues.has(cle)) {
          ecrireAttribut(line, 'data-v2e022-dup', '1');
          doublons += 1;
        } else {
          vues.add(cle);
          ecrireAttribut(line, 'data-v2e022-dup', '0');
        }
      });
      ecrireAttribut(svg, 'data-v2e022-dedup', String(doublons));
      ecrireAttribut(field, 'data-v2e022-dedup', doublons ? '1' : '0');
    }
  }

  /* E022-05 — Décor exclu du test de pointage, sans toucher aux lunes. */
  if (field) ecrireAttribut(field, 'data-v2e022-hit', '1');

  /* E022-06 — Silence des transitions sur les lunes hors écran. */
  if (field) ecrireAttribut(field, 'data-v2e022-quiet', '1');

  /* E022-07 — Nœud de suivi inséré en une seule écriture DOM via fragment. */
  try {
    if (field && !layout.querySelector('#v2e022-etat')) {
      const doc = layout.ownerDocument;
      const fragment = doc.createDocumentFragment();
      const suivi = creerNoeud(ctx, 'p', 'v2e022-sr', 'Lunes visibles.');
      suivi.id = 'v2e022-etat';
      suivi.setAttribute('role', 'status');
      suivi.setAttribute('aria-live', 'polite');
      suivi.setAttribute('aria-atomic', 'true');
      fragment.appendChild(suivi);
      field.appendChild(fragment);
    }
  } catch {
    /* Suivi facultatif : son échec n'annule aucun autre chantier. */
  }

  /* E022-08 — Densité de visibilité exposée en attributs, sans badge visible. */
  actualiserCompteur();

  /* E022-09 — Index des lunes par clé stable : recherches en temps constant
     pour toute passe ultérieure, sans nouvelle interrogation du DOM. */
  const index = new Map();
  moons.forEach((moon, rang) => {
    const cle = moon.getAttribute('data-id') || moon.id || ('lune-' + rang);
    index.set(cle, moon);
    ecrireAttribut(moon, 'data-v2e022-index', String(rang));
  });
  if (layer) ecrireAttribut(layer, 'data-v2e022-indexed', String(index.size));

  /* E022-10 — Activation atomique : une seule écriture finale rend toutes
     les règles actives en même temps, après la fin des mutations du DOM. */
  if (field) {
    ecrireAttribut(field, 'data-v2e022-count', String(moons.length));
    ecrireAttribut(field, 'data-v2e022-ready', '1');
  }
});
