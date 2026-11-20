import { register } from './registry.js';

/* V2 lentille E018 — « Performance et sobriété » (complément de la passe 1).
 *
 * La passe 1 isolait le rendu, compositait la progression, portait un « Mode
 * sobre », mesurait la cadence et posait les garde-fous. La V2 propose dix
 * chantiers NEUFS et distincts : rendre le coût lisible et compléter la
 * sobriété par des mesures dérivées du DOM réel, plus deux refinements CSS
 * ciblés. Aucun chiffre n'est inventé : tout est lu dans le document courant.
 *
 * Préfixes : classes `recit-v2-e018-`, ids DOM `v2-e018-`. La passe 1 et la V2
 * tournant sur le MÊME DOM, aucun id `e018-` de la passe 1 n'est réutilisé.
 * Aucun fichier partagé modifié, aucun réseau, aucun aléa, aucune journalisation.
 * Sans ce module, la vue reste intégralement lisible et utilisable.
 */

/* ------------------------------------------------------------------------- *
 * Feuille unique : toutes les règles des chantiers CSS sont regroupées ici.
 * ------------------------------------------------------------------------- */
const CSS = `
/* E018-07 — Containment des sections secondaires : la légende et le message
   « sans source » sont du texte pur, sans élément focusable. content-visibility
   évite de les peindre hors écran et la réserve de taille stabilise le
   défilement. Périmètre strict : le marqueur posé sur .recit-layout au rendu. */
.recit-layout[data-v2-e018="on"] .recit-legend,
.recit-layout[data-v2-e018="on"] .recit-sources {
  content-visibility: auto;
  contain-intrinsic-size: auto 80px;
}

/* E018-08 — Chiffres tabulaires : les mesures du panneau gardent une largeur
   stable quand elles changent, évitant un recalcul de mise en page du
   voisinage à chaque avancée du récit. */
.recit-v2-e018-readout { font-variant-numeric: tabular-nums; }

/* E018-09 — Panneau « Budget » de synthèse : texte visible, chiffres alignés. */
.recit-v2-e018-budget {
  margin: 14px 0 0; padding: 8px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255,255,255,.02);
}
.recit-v2-e018-budget h2 { margin: 0 0 6px; color: var(--gold); font-size: 11px; }
.recit-v2-e018-budget p { margin: 3px 0; color: var(--muted); font-size: 9px; line-height: 1.5; }

/* E018-08 / E018-10 — transition douce des mesures, neutralisée dès que le
   système demande un mouvement réduit (marqueur posé en JS à chaque rendu). */
.recit-v2-e018-readout { transition: opacity .18s linear; }
.recit-layout[data-v2-e018-motion="reduce"] .recit-v2-e018-readout { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .recit-v2-e018-readout { transition: none; animation: none; }
}
`;

/* Six champs de synthèse, tous écrits depuis des mesures du DOM courant. */
const CHAMPS = ['structure', 'images', 'styles', 'ids', 'texte', 'commandes'];

/* ------------------------------------------------------------------------- *
 * E018-10 — profondeur maximale de l'arbre, parcourue itérativement (aucune
 * mesure de géométrie, aucun appel à getBoundingClientRect).
 * ------------------------------------------------------------------------- */
function profondeurMax(racine) {
  let max = 0;
  const pile = [[racine, 0]];
  while (pile.length) {
    const [noeud, niveau] = pile.pop();
    if (niveau > max) max = niveau;
    const enfants = noeud.children;
    for (let i = 0; i < enfants.length; i += 1) pile.push([enfants[i], niveau + 1]);
  }
  return max;
}

function ecrire(champs, cle, texte) {
  const noeud = champs[cle];
  if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
}

/* ------------------------------------------------------------------------- *
 * E018-09 — panneau de synthèse « Budget » : créé une seule fois, réutilisé
 * s'il existe déjà, replacé dans le .recit-body courant à chaque rendu. Ses
 * identifiants sont tous préfixés v2-e018- (unicité garantie face à la passe 1).
 * ------------------------------------------------------------------------- */
function assurerBudget(ctx, corps) {
  let panneau = null;
  try { panneau = document.getElementById('v2-e018-budget'); } catch { /* absent */ }
  if (panneau && (!panneau.classList || !panneau.classList.contains('recit-v2-e018-budget'))) {
    if (panneau.parentNode) panneau.parentNode.removeChild(panneau);
    panneau = null;
  }
  if (!panneau) {
    panneau = ctx.el('section', 'recit-v2-e018-budget');
    panneau.id = 'v2-e018-budget';
    panneau.setAttribute('aria-label', 'Budget de sobriété de la vue récit');
    panneau.appendChild(ctx.el('h2', '', 'Budget et sobriété — E018'));
    CHAMPS.forEach((cle) => {
      const ligne = ctx.el('p', 'recit-v2-e018-readout');
      ligne.id = `v2-e018-${cle}`;
      ligne.setAttribute('data-v2-e018-field', cle);
      panneau.appendChild(ligne);
    });
  }
  if (corps && panneau.parentNode !== corps) corps.appendChild(panneau);

  const champs = {};
  try {
    panneau.querySelectorAll('[data-v2-e018-field]').forEach((noeud) => {
      champs[noeud.getAttribute('data-v2-e018-field')] = noeud;
    });
  } catch { /* panneau vide : les gardes d'écriture suffisent */ }
  return { panneau, champs };
}

/* ------------------------------------------------------------------------- *
 * Greffon unique : un seul register, une seule feuille, chaque chantier isolé
 * dans son try/catch. Les gardes d'existence précèdent toute opération.
 * ------------------------------------------------------------------------- */
register('E018', (ctx) => {
  try {
    if (typeof document === 'undefined' || !ctx || !ctx.layout) return;
    const { layout, css, el, reducedMotion } = ctx;
    if (typeof css !== 'function' || typeof el !== 'function') return;
    if (typeof layout.querySelector !== 'function') return;

    /* Un seul appel CSS regroupant toutes les règles du module. */
    try { css('recit-v2-e018', CSS); } catch { /* feuille déjà injectée */ }

    /* E018-10 — ancrage de portée du CSS et du mouvement, posé à chaque rendu. */
    try { layout.dataset.v2E018 = 'on'; } catch { /* jeu de données figé */ }
    try {
      const reduit = typeof reducedMotion === 'function' && reducedMotion();
      layout.dataset.v2E018Motion = reduit ? 'reduce' : 'normal';
    } catch { /* préférence non lue : valeur par défaut 'normal' */ }

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const { champs } = assurerBudget(ctx, corps);

    /* E018-01 — boussole de complexité : nœuds, profondeur et ratio par point
       du fil. Tout est compté dans le DOM réel, aucune valeur de référence
       n'est fabriquée. */
    try {
      const noeuds = layout.querySelectorAll('*').length;
      const profondeur = profondeurMax(layout);
      const points = layout.querySelectorAll('.recit-thread-item').length;
      const parPoint = points ? Math.round(noeuds / points) : 0;
      const precision = points ? ` · ≈ ${parPoint} nœuds par point du fil` : '';
      ecrire(champs, 'structure',
        `Complexité : ${noeuds} nœuds · profondeur ${profondeur}${precision}.`);
    } catch { /* mesure facultative */ }

    /* E018-02 — recensement des images et du chargement différé, lus sur les
       <img> réellement présents dans la vue. */
    try {
      const images = layout.querySelectorAll('img').length;
      const differees = layout.querySelectorAll('img[loading="lazy"]').length;
      ecrire(champs, 'images',
        `Images : ${images} · ${differees} en chargement différé (loading="lazy").`);
    } catch { /* mesure facultative */ }

    /* E018-03 — empreinte de style inline, exprimée en proportion des nœuds
       comptés dans la vue. */
    try {
      const enLigne = layout.querySelectorAll('[style]').length;
      const noeuds = layout.querySelectorAll('*').length;
      const pourcent = noeuds ? Math.round((enLigne / noeuds) * 100) : 0;
      ecrire(champs, 'styles',
        `Styles inline : ${enLigne} éléments, soit ${pourcent} % des ${noeuds} nœuds.`);
    } catch { /* mesure facultative */ }

    /* E018-04 — contrôle d'unicité des identifiants : doublons détectés dans
       la vue, tous préfixes confondus, sans modifier aucun attribut. */
    try {
      const comptes = new Map();
      layout.querySelectorAll('[id]').forEach((noeud) => {
        const cle = noeud.id;
        comptes.set(cle, (comptes.get(cle) || 0) + 1);
      });
      let doublons = 0;
      comptes.forEach((nombre) => { if (nombre > 1) doublons += nombre - 1; });
      ecrire(champs, 'ids',
        `Identifiants : ${comptes.size} distincts · ${doublons} doublon(s) dans la vue.`);
    } catch { /* mesure facultative */ }

    /* E018-05 — volume textuel du point courant, lu sur le titre et le
       contexte réels (hors panneau, pour éviter une mesure auto-référente). */
    try {
      const titre = layout.querySelector('.recit-title');
      const contexte = layout.querySelector('.recit-context');
      const brut = [titre && titre.textContent, contexte && contexte.textContent]
        .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      const mots = brut ? brut.split(' ').filter(Boolean).length : 0;
      ecrire(champs, 'texte',
        `Texte du point : ${mots} mots · ${brut.length} caractères visibles.`);
    } catch { /* mesure facultative */ }

    /* E018-06 — dénombrement des éléments interactifs réellement présents. */
    try {
      const actifs = layout.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])').length;
      ecrire(champs, 'commandes',
        `Commandes : ${actifs} éléments interactifs dans la vue.`);
    } catch { /* mesure facultative */ }
  } catch {
    /* Une lentille défaillante ne doit jamais interrompre le rendu de la vue. */
  }
});
