import { register } from './registry.js';

/* Lentille E047 — Passe V2 CHRONOLOGIE (domaine E : accessibilité & ARIA).
 * Thème : « contraste des badges de confiance ≥ 4,5:1 ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E047.md
 * Chantiers : E047-01 à E047-10 (dix angles non chevauchants d'un même thème).
 *
 * Fichier possédé : src/views/chronology/v2/E047.js uniquement.
 * Lectures seules autorisées : les modèles de qualité de la passe 1
 *   (src/views/chronology/E049.js, UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md).
 * Aucun fichier partagé n'est modifié (ni registry.js, ni index.js, ni
 * styles.css, ni src/views/chronology.js, ni une autre lentille, ni la passe 1).
 *
 * Contrat exploité : viewId ('chronologyv2'), stage, layout, css, el,
 * reducedMotion. Le registre V2 ne fournit pas de say() : la lentille n'ajoute
 * AUCUNE région live, elle affiche son état en texte visible ordinaire.
 *
 * Invariants :
 * - un seul register('E047', install) ;
 * - une seule feuille CSS via ctx.css('chronology-v2-e047', …) ;
 * - IDs tous préfixés 'chronology-v2-e047-' avec garde d'existence ;
 * - zéro console.*, fetch/XHR, Math.random, innerHTML, timer, rAF, écouteur ;
 * - français partout (commentaires, libellés, valeurs de dataset).
 *
 * Note d'autonomie : le code de la vue V2 n'étant pas possédé ni consultable,
 * la détection est multi-critères (attributs data-*, classes, aria-label) et un
 * jeu de badges de référence est toujours rendu dans le panneau. Ainsi chaque
 * chantier a un effet observable même si la vue n'expose aucun badge au
 * moment du rendu.
 */

const CSS_ID = 'chronology-v2-e047';

/* E047-10 : tous les IDs sont préfixés, stables et réutilisés. */
const IDS = {
  panel: 'chronology-v2-e047-panel',
  title: 'chronology-v2-e047-title',
  lede: 'chronology-v2-e047-lede',
  legend: 'chronology-v2-e047-legend',
  audit: 'chronology-v2-e047-audit',
  metric: 'chronology-v2-e047-metric',
  notes: 'chronology-v2-e047-notes',
};

const CORRECTION_CLASS = 'chronology-v2-e047-plancher';
const CORRECTION_DARK = 'chronology-v2-e047-sur-fonce';
const SAMPLE_CLASS = 'chronology-v2-e047-exemple';

/* E047-01 : critères de détection larges, recoupés et dédupliqués. */
const BADGE_SELECTORS = [
  '[data-confidence]',
  '[data-confiance]',
  '[data-confidence-level]',
  '[data-e047-badge]',
  '.confidence-badge',
  '.badge-confidence',
  '.confidence',
  '.confiance',
  '[class*="confidence"]',
  '[class*="confiance"]',
  '[aria-label*="onfiance"]',
  '[aria-label*="onfidence"]',
];

/* E047-06, E047-08 : palette de référence. Deux variantes d'incertitude
   (« Disputé », « Omission justifiée ») figurent explicitement, ainsi qu'un
   exemple volontairement sous le seuil pour rendre la correction observable. */
const REFERENCE_PALETTE = [
  { label: 'Établi', bg: '#1b4332', fg: '#ffffff' },
  { label: 'Probable', bg: '#1d3557', fg: '#ffffff' },
  { label: 'Disputé', bg: '#5c3a00', fg: '#ffffff' },
  { label: 'Omission justifiée', bg: '#4a1d96', fg: '#ffffff' },
  { label: 'Exemple sous le seuil', bg: '#eeeeee', fg: '#bdbdbd', demonstration: true },
];

/* E047-02, E047-03, E047-06 : arithmétique WCAG 2.1 (luminance relative,
   ratio (Lclair + 0,05) / (Lsombre + 0,05)). Seuil : 4,5:1 pour un texte
   normal, 3:1 toléré pour un grand texte — mais la lentille applique 4,5:1
   partout, y compris aux grands textes, par sécurité. */
const SEUIL_NORMAL = 4.5;
const SEUIL_GRAND = 3;
const SEUIL_APPLIQUE = SEUIL_NORMAL;

function composanteLineaire(valeur) {
  const v = valeur / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(couleur) {
  return 0.2126 * composanteLineaire(couleur.r)
    + 0.7152 * composanteLineaire(couleur.g)
    + 0.0722 * composanteLineaire(couleur.b);
}

function ratioContraste(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const clair = Math.max(l1, l2);
  const sombre = Math.min(l1, l2);
  return (clair + 0.05) / (sombre + 0.05);
}

function analyserCouleur(valeur) {
  if (!valeur) return null;
  const texte = String(valeur).trim();
  let résultat = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(texte);
  if (résultat) {
    let hex = résultat[1];
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  résultat = /^rgba?\(([^)]+)\)$/i.exec(texte);
  if (résultat) {
    const parties = résultat[1].split(/[\s,/]+/).filter(Boolean);
    if (parties.length < 3) return null;
    return {
      r: Math.max(0, Math.min(255, parseInt(parties[0], 10) || 0)),
      g: Math.max(0, Math.min(255, parseInt(parties[1], 10) || 0)),
      b: Math.max(0, Math.min(255, parseInt(parties[2], 10) || 0)),
      a: parties.length > 3 ? (parseFloat(parties[3]) || 0) : 1,
    };
  }
  return null;
}

/* E047-05 : fond effectif, obtenu en remontant les ancêtres jusqu'à une
   couleur opaque. Repli blanc, ce qui donne une mesure pessimiste et donc
   sûre sur les thèmes clairs comme sur les thèmes sombres. */
function fondEffectif(noeud) {
  let courant = noeud;
  while (courant && courant !== document.documentElement) {
    const couleur = analyserCouleur(getComputedStyle(courant).backgroundColor);
    if (couleur && couleur.a >= 0.5) return couleur;
    courant = courant.parentElement;
  }
  return { r: 255, g: 255, b: 255, a: 1 };
}

function mesurerBadge(noeud) {
  const style = getComputedStyle(noeud);
  const fg = analyserCouleur(style.color) || { r: 0, g: 0, b: 0, a: 1 };
  const bg = fondEffectif(noeud);
  const taille = parseFloat(style.fontSize) || 14;
  const gras = parseInt(style.fontWeight, 10) >= 700;
  const grand = taille >= 24 || (taille >= 18.66 && gras);
  const seuilTheorique = grand ? SEUIL_GRAND : SEUIL_NORMAL;
  const ratio = ratioContraste(fg, bg);
  return {
    ratio,
    seuilTheorique,
    seuil: SEUIL_APPLIQUE,
    conforme: ratio >= SEUIL_APPLIQUE,
    grand,
    fg,
    bg,
  };
}

function libellage(noeud) {
  const etiquette = noeud.getAttribute('aria-label')
    || noeud.getAttribute('data-confidence')
    || noeud.getAttribute('data-confiance')
    || (noeud.textContent || '').trim();
  return etiquette ? etiquette.slice(0, 48) : 'badge sans libellé';
}

/* E047-10 : garde d'existence. Un nœud retrouvé dans un ancien parent détaché
   est déplacé, jamais cloné : un seul panneau, quels que soient les re-rendus. */
function assurerNoeud(fabriquer, id, balise, classe, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = fabriquer(balise, classe);
    noeud.id = id;
  }
  if (noeud.parentElement !== parent) parent.appendChild(noeud);
  return noeud;
}

function ecrire(noeud, texte) {
  if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
}

/* E047-03, E047-05, E047-07 : plancher correctif. On choisit l'encre (claire
   ou sombre) qui maximise le contraste sur le fond mesuré, puis on neutralise
   opacité et filtres qui pourraient abaisser le ratio sous le seuil. */
function appliquerPlancher(noeud, mesure) {
  const contrasteSombre = ratioContraste({ r: 10, g: 10, b: 10 }, mesure.bg);
  const contrasteClair = ratioContraste({ r: 255, g: 255, b: 255 }, mesure.bg);
  noeud.classList.add(CORRECTION_CLASS);
  if (contrasteClair > contrasteSombre) noeud.classList.add(CORRECTION_DARK);
  noeud.dataset.e047Etat = 'corrige';
  noeud.dataset.e047RatioAvant = mesure.ratio.toFixed(2);
  noeud.dataset.e047Seuil = String(SEUIL_APPLIQUE);
  noeud.dataset.e047Fond = `${mesure.bg.r},${mesure.bg.g},${mesure.bg.b}`;
}

function marquerConforme(noeud, mesure) {
  noeud.dataset.e047Etat = 'conforme';
  noeud.dataset.e047RatioAvant = mesure.ratio.toFixed(2);
  noeud.dataset.e047Seuil = String(SEUIL_APPLIQUE);
  noeud.dataset.e047Fond = `${mesure.bg.r},${mesure.bg.g},${mesure.bg.b}`;
}

/* E047-01, E047-04, E047-08 : badges de référence. Ils sont rendus en DOM
   réel (pas en image, pas en CSS généré) et portent un libellé textuel, donc
   indexables et mesurables. Le dernier est volontairement sous le seuil. */
function construireLegende(fabriquer, palette) {
  const liste = fabriquer('ul', 'e047-legende-liste');
  palette.forEach((entree) => {
    const item = fabriquer('li', 'e047-legende-item');
    const badge = fabriquer('span', `e047-exemple ${SAMPLE_CLASS}`, entree.label);
    badge.dataset.e047Reference = entree.label;
    badge.dataset.e047FondReference = entree.bg;
    badge.dataset.e047EncreReference = entree.fg;
    if (entree.demonstration) {
      badge.dataset.e047Demonstration = '1';
      badge.setAttribute('tabindex', '0');
      badge.setAttribute('aria-label', `${entree.label} : exemple interactif, Tab pour tester le contraste au focus`);
    }
    const mesure = {
      ratio: ratioContraste(analyserCouleur(entree.fg), analyserCouleur(entree.bg)),
      seuil: SEUIL_APPLIQUE,
      conforme: ratioContraste(analyserCouleur(entree.fg), analyserCouleur(entree.bg)) >= SEUIL_APPLIQUE,
    };
    const resultat = fabriquer('span', 'e047-resultat',
      `${entree.label} — ${mesure.ratio.toFixed(2)}:1 · ${mesure.conforme ? 'conforme' : 'sous le seuil'}`);
    item.append(badge, resultat);
    liste.appendChild(item);
  });
  return liste;
}

/* E047-01 : détection dédupliquée, limitée au stage courant pour ne pas
   remonter jusqu'aux panneaux d'autres lentilles. */
function detecterBadges(racine) {
  const trouvés = new Set();
  BADGE_SELECTORS.forEach((selecteur) => {
    let noeuds = [];
    try { noeuds = racine.querySelectorAll(selecteur); } catch { noeuds = []; }
    noeuds.forEach((noeud) => trouvés.add(noeud));
  });
  return Array.from(trouvés).filter((noeud) => noeud !== racine);
}

/* E047-02, E047-09 : audit complet, avec écritures dédupliquées via ecrire(). */
function auditer(noeuds, listeAudit) {
  let conformes = 0;
  let corriges = 0;
  noeuds.forEach((noeud) => {
    const mesure = mesurerBadge(noeud);
    if (mesure.conforme) {
      conformes += 1;
      marquerConforme(noeud, mesure);
    } else {
      corriges += 1;
      appliquerPlancher(noeud, mesure);
    }
    const ligne = fabriquerLigneAudit(noeud, mesure);
    listeAudit.appendChild(ligne);
  });
  return { total: noeuds.length, conformes, corriges };
}

/* Fabrique isolée pour ne pas dépendre de ctx.el à l'intérieur de auditer(). */
let fabriqueur = (balise, classe, texte) => {
  const noeud = document.createElement(balise);
  if (classe) noeud.className = classe;
  if (texte !== undefined) noeud.textContent = texte;
  return noeud;
};

function fabriquerLigneAudit(noeud, mesure) {
  const ligne = fabriqueur('li', 'e047-audit-item');
  ligne.append(
    fabriqueur('span', 'e047-audit-nom', libellage(noeud)),
    fabriqueur('span', 'e047-audit-valeur',
      `${mesure.ratio.toFixed(2)}:1 · seuil ${mesure.seuil.toFixed(1)}:1 · ${mesure.conforme ? 'conforme' : 'corrigé'}`)
  );
  return ligne;
}

/* E047-04, E047-05, E047-07 : feuille unique. Aucune animation propre,
   repli mouvement réduit et forced-colors, états interactifs maintenus. */
const CSS = `
  #chronology-v2-e047-panel {
    margin: 18px 0 0; padding: 12px 14px 13px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #chronology-v2-e047-panel .e047-titre {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
  }
  #chronology-v2-e047-panel .e047-lede { margin: 0 0 10px; color: var(--muted); }
  #chronology-v2-e047-panel .e047-sous-titre {
    margin: 10px 0 5px; color: var(--gold-bright); font-weight: 600;
  }
  #chronology-v2-e047-panel ul { margin: 0; padding: 0; list-style: none; }
  #chronology-v2-e047-panel .e047-legende-item,
  #chronology-v2-e047-panel .e047-audit-item {
    display: flex; flex-wrap: wrap; align-items: center;
    gap: 4px 10px; margin: 0 0 5px;
  }
  .e047-exemple {
    display: inline-block; padding: 2px 8px; border-radius: 999px;
    border: 1px solid currentColor; font: inherit; font-size: 11px;
    font-weight: 700; letter-spacing: .01em; white-space: nowrap;
  }
  #chronology-v2-e047-panel .e047-resultat,
  #chronology-v2-e047-panel .e047-audit-valeur { color: var(--muted-2); font-size: 10px; }
  #chronology-v2-e047-panel .e047-audit-nom { color: var(--ink-soft); }
  #chronology-v2-e047-panel .e047-metrique { margin: 10px 0 0; color: var(--gold-bright); }
  #chronology-v2-e047-panel .e047-note { margin: 5px 0 0; color: var(--muted); font-size: 10px; }

  /* E047-03 : plancher appliqué uniquement aux badges sous le seuil. */
  .${CORRECTION_CLASS} {
    color: #0a0a0a !important;
    background-color: #f4f4f4 !important;
    border: 1px solid #0a0a0a !important;
    opacity: 1 !important;
    filter: none !important;
    text-shadow: none !important;
  }
  .${CORRECTION_CLASS}.${CORRECTION_DARK} {
    color: #ffffff !important;
    background-color: #101010 !important;
    border-color: #ffffff !important;
  }
  /* E047-04 : contraste conservé au survol et au focus clavier. */
  .${CORRECTION_CLASS}:hover,
  .${CORRECTION_CLASS}:focus-visible {
    color: #0a0a0a !important; background-color: #ffffff !important;
    border-color: #0a0a0a !important;
  }
  .${CORRECTION_CLASS}.${CORRECTION_DARK}:hover,
  .${CORRECTION_CLASS}.${CORRECTION_DARK}:focus-visible {
    color: #ffffff !important; background-color: #000000 !important;
    border-color: #ffffff !important;
  }
  .e047-exemple:focus-visible { outline: 3px solid var(--gold-bright); outline-offset: 2px; }

  /* E047-05 : lisibilité en modes contraste forcé. */
  @media (forced-colors: active) {
    #chronology-v2-e047-panel { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #chronology-v2-e047-panel .e047-titre,
    #chronology-v2-e047-panel .e047-sous-titre,
    #chronology-v2-e047-panel .e047-metrique { color: CanvasText; }
    .e047-exemple, .${CORRECTION_CLASS} { border: 1px solid CanvasText; color: CanvasText; }
  }
  /* E047-09 : aucun mouvement propre (cohérent avec le modèle E049). */
  @media (prefers-reduced-motion: reduce) {
    #chronology-v2-e047-panel, #chronology-v2-e047-panel * {
      transition: none !important; animation: none !important;
    }
  }
  @media (max-width: 620px) {
    #chronology-v2-e047-panel .e047-legende-item,
    #chronology-v2-e047-panel .e047-audit-item { flex-direction: column; align-items: flex-start; }
  }
`;

let installCount = 0;

function install(ctx) {
  const fabriquer = typeof ctx.el === 'function' ? ctx.el : fabriqueur;
  fabriqueur = fabriquer;
  if (!ctx.layout && !ctx.stage) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const parent = ctx.layout || ctx.stage;
  const panneau = assurerNoeud(fabriquer, IDS.panel, 'section', 'e047-panel', parent);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', IDS.title);
  panneau.dataset.e047Passe = 'v2';

  const titre = fabriquer('h2', 'e047-titre', 'Contraste des badges de confiance');
  titre.id = IDS.title;

  const lede = fabriquer('p', 'e047-lede',
    'Audit local du contraste des badges de confiance : chaque niveau est mesuré selon WCAG 2.1. Le texte reste le vecteur principal de l’information ; la couleur ne doit jamais porter seule le sens.');

  const sousTitreLegende = fabriquer('p', 'e047-sous-titre', 'Échelle de référence (mesures réelles)');
  const legende = assurerNoeud(fabriquer, IDS.legend, 'div', 'e047-legende', panneau);
  legende.replaceChildren(construireLegende(fabriquer, REFERENCE_PALETTE));

  const sousTitreAudit = fabriquer('p', 'e047-sous-titre', 'Badges détectés dans la vue');
  const audit = assurerNoeud(fabriquer, IDS.audit, 'div', 'e047-audit', panneau);
  const listeAudit = fabriquer('ul', 'e047-audit-liste');

  const racine = ctx.stage || ctx.layout;
  const detectes = racine && typeof racine.querySelectorAll === 'function' ? detecterBadges(racine) : [];
  const bilan = auditer(detes, listeAudit);
  if (!detectes.length) {
    listeAudit.appendChild(fabriquer('li', 'e047-audit-item',
      'Aucun badge détecté dans la vue : l’échelle de référence ci-dessus reste mesurable et correctible.'));
  }
  audit.replaceChildren(listeAudit);

  const metrique = assurerNoeud(fabriquer, IDS.metric, 'p', 'e047-metrique', panneau);
  metrique.id = IDS.metric;
  ecrire(metrique, `Badges : ${bilan.total} · conformes : ${bilan.conformes} · corrigés : ${bilan.corriges} · seuil appliqué : ${SEUIL_APPLIQUE.toFixed(1)}:1.`);
  panneau.dataset.e047Total = String(bilan.total);
  panneau.dataset.e047Conformes = String(bilan.conformes);
  panneau.dataset.e047Corriges = String(bilan.corriges);
  panneau.dataset.e047Seuil = String(SEUIL_APPLIQUE);
  panneau.dataset.e047Installations = String(installCount);
  panneau.dataset.e047MouvementReduit = String(Boolean(typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false));

  const notes = assurerNoeud(fabriquer, IDS.notes, 'div', 'e047-notes', panneau);
  notes.replaceChildren(
    fabriquer('p', 'e047-note',
      'Règle de seuil : 4,5:1 pour un texte normal ; 3:1 pour un grand texte (≥ 24 px, ou ≥ 18,66 px gras). La lentille applique 4,5:1 dans tous les cas.'),
    fabriquer('p', 'e047-note',
      'États : le contraste est vérifié au repos et maintenu au survol, au focus clavier et en contraste forcé. Les exemples sous le seuil sont corrigés en place, sans retirer leur libellé.'),
    fabriquer('p', 'e047-note',
      'Opacité et filtres sont neutralisés sur les badges corrigés : un texte à 60 % d’opacité peut passer sous le seuil même avec de bonnes couleurs.'),
    fabriquer('p', 'e047-note',
      'Thèmes : le fond effectif est remonté dans les ancêtres ; le repli blanc donne une mesure pessimiste, valable en thème clair comme en thème sombre.')
  );

  panneau.replaceChildren(titre, lede, sousTitreLegende, legende, sousTitreAudit, audit, metrique, notes);
}

register('E047', install);
