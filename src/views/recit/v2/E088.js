import { register } from './registry.js';

/* V2 lentille E088 — Sobriété et économie de travail navigateur (second regard).
 *
 * La passe 1 d'E088 confinait la colonne média, réservait la gouttière de
 * défilement, contenait le chaînage de scroll, différait le fil très long,
 * simplifiait la typographie, bloquait l'inflation de police, tabulait les
 * chiffres, affichait un budget, effectuait une traversée universelle unique
 * et bouclait en un seul marqueur. Cette passe V2 ne reprend aucun de ces
 * chantiers : elle cible des leviers laissés libres — confinement de la barre
 * de progression, isolation de la barre d'actions, rendu différé des seules
 * traçabilités denses, confinement du panneau vide de filtrage, suppression
 * des couches GPU permanentes, stablette de la colonne de texte, équilibre du
 * titre, sonde de densité d'interaction, mesures ciblées sans parcours
 * universel, stabilité de la colonne de texte et préservation stricte des
 * attributs existants.
 *
 * Une seule feuille `css('recit-v2-e088', …)`, un seul marqueur
 * `data-v2-e088-sobriete` (distinct du `data-e088-sobriete` de la passe 1),
 * un seul id d'élément préfixé `v2-e088-densite` (jamais `e088-budget`),
 * toutes les classes préfixées `recit-v2-e088-`. Passe 1 et V2 tournant sur
 * le MÊME DOM, aucun id de la passe 1 n'est réutilisé.
 *
 * Aucun écouteur, timer, observateur, rAF, aléa, réseau, appel à la console,
 * ni mesure géométrique. Tous les chiffres affichés sont dérivés du DOM réel.
 * Sans ce module, la vue reste intégralement lisible et utilisable.
 *
 * Les dix chantiers E088-01 … E088-10 sont détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E088.md.
 */

const MARKER = 'data-v2-e088-sobriete';
const CSS_ID = 'recit-v2-e088';
const PROBE_ID = 'v2-e088-densite';
const PROBE_CLASS = 'recit-v2-e088-readout';
const SEUIL_TRACE_DIFFERE = 8;

/* Feuille unique. Aucune règle universelle, aucun '*', aucune couche GPU
   ajoutée, aucune information portée par la seule couleur, aucun !important. */
const CSS = `
/* E088-01 — confinement de la barre de progression : la transition de
   largeur du remplissage ne propage pas son invalidation au récit. */
.recit-layout .recit-v2-e088-progress{
  contain:layout paint;
}
/* E088-02 — isolation de la barre d'actions : les changements d'état
   disabled/aria-pressed restent locaux aux commandes. */
.recit-layout .recit-v2-e088-actions{
  contain:layout style;
}
/* E088-03 — traçabilités denses : seul le paragraphe de traçabilité est
   différé, et uniquement au-delà du seuil calculé depuis le DOM. */
.recit-layout .recit-v2-e088-trace-differe .recit-trace p{
  content-visibility:auto;
  contain-intrinsic-size:auto 40px;
}
/* E088-04 — confinement du panneau vide de filtrage, qui apparaît et
   disparaît au gré des critères sans toucher au texte environnant. */
.recit-layout .recit-v2-e088-empty{
  contain:layout style paint;
}
/* E088-05 — aucune couche GPU permanente : neutralisation de will-change
   sur les deux zones animables ou susceptibles de l'être. */
.recit-layout .recit-v2-e088-progress>span,
.recit-layout .recit-v2-e088-media img{
  will-change:auto;
}
/* E088-06 — stabilité de la colonne de texte : min-width:0 évite le
   débordement de grille provoqué par un contenu non sécable. */
.recit-layout .recit-v2-e088-colonne{
  min-width:0;
}
/* E088-07 — équilibre des lignes du titre, sans retirer ni tronquer de texte. */
.recit-layout .recit-v2-e088-titre{
  text-wrap:balance;
}
/* E088-08 — sonde de densité : bloc de lecture sobre, texte indexable,
   aucune région live supplémentaire, chiffres à largeur fixe. */
.recit-layout .recit-v2-e088-readout{
  margin:8px 0 0;
  padding-top:6px;
  border-top:1px solid var(--line);
  color:var(--muted-2,#8a8a8a);
  font-size:9px;
  line-height:1.5;
  font-variant-numeric:tabular-nums;
}
/* E088-09 — aucune règle universelle : la feuille ne vise que des classes
   préfixées et des descendants explicites, jamais le sélecteur '*'. */
/* E088-10 — impression : la sonde reste du texte lisible, sans couleur
   dépendante du thème ; aucun attribut ARIA ni style de focus n'est touché. */
@media print{
  .recit-layout .recit-v2-e088-readout{color:#333}
}
`;

/* Vrai nœud d'élément (nodeType 1) : écarte textes et commentaires. */
function present(node) {
  return !!(node && node.nodeType === 1);
}

/* Sélecteur sûr : jamais appelé sur un hôte dépourvu de querySelector. */
function q(root, selector) {
  return present(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

/* Liste sûre, ramenée à un tableau pour .length. */
function qa(root, selector) {
  return present(root) && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector))
    : [];
}

/* Ajout de classe non destructif, avec garde d'existence et d'idempotence. */
function classe(node, nom) {
  if (!present(node) || !node.classList || typeof node.classList.add !== 'function') return;
  if (typeof node.classList.contains === 'function' && node.classList.contains(nom)) return;
  node.classList.add(nom);
}

/* Écriture d'attribut sous garde : n'écrase JAMAIS un attribut existant
   (lang, aria-*, role, id portés par la coque). */
function setAttrIfAbsent(node, name, value) {
  if (!present(node) || typeof node.hasAttribute !== 'function' || node.hasAttribute(name)) return;
  if (typeof node.setAttribute !== 'function') return;
  try { node.setAttribute(name, String(value)); } catch { /* attribut facultatif */ }
}

/* E088-01, E088-02, E088-04, E088-05, E088-06, E088-07 — pose des classes
   d'accroche. Chaque cible est optional : son absence ne bloque pas la passe. */
function poserAccroches(root) {
  classe(q(root, '.recit-progress'), 'recit-v2-e088-progress');
  classe(q(root, '.recit-actions'), 'recit-v2-e088-actions');
  classe(q(root, '.c3a-empty'), 'recit-v2-e088-empty');
  classe(q(root, '.recit-media'), 'recit-v2-e088-media');
  classe(q(root, '.recit-body'), 'recit-v2-e088-colonne');
  classe(q(root, '.recit-title'), 'recit-v2-e088-titre');
}

/* E088-09 — mesures ciblées : requêtes explicites et bornées, sans
   parcours universel de l'arbre ni sélecteur « tous les descendants ». */
function mesurer(root) {
  return {
    titres: qa(root, 'h1,h2,h3').length,
    commandes: qa(root, 'button,[role="button"]').length,
    blocs: qa(root, 'p,li').length,
    traces: qa(root, '.recit-trace p').length,
  };
}

/* E088-08 — sonde de densité d'interaction. Un seul paragraphe, réutilisé
   par id, greffé dans .recit-body (jamais dans stage/layout : le module de
   diagnostic générique ne masquerait pas ce texte). Aucun role/aria-live. */
function assurerSonde(root, el, mesures) {
  if (typeof el !== 'function') return null;
  let noeud = q(root, `#${PROBE_ID}`);
  if (!present(noeud) && typeof document !== 'undefined') {
    noeud = document.getElementById(PROBE_ID);
  }
  if (!present(noeud)) {
    const { commandes, blocs } = mesures;
    const texte = commandes > 0
      ? `Densité d'interaction : ${commandes} commande(s) pour ${blocs} bloc(s) de texte · 1 commande pour ${Math.max(1, Math.round(blocs / commandes))} bloc(s).`
      : `Densité d'interaction : aucune commande pour ${blocs} bloc(s) de texte.`;
    noeud = el('p', PROBE_CLASS, texte);
    if (!present(noeud)) return null;
    noeud.id = PROBE_ID;
  } else {
    /* Nœud repris d'un rendu précédent : on rafraîchit son texte, sans
       toucher à ses autres attributs ni à son id. */
    const { commandes, blocs } = mesures;
    noeud.textContent = commandes > 0
      ? `Densité d'interaction : ${commandes} commande(s) pour ${blocs} bloc(s) de texte · 1 commande pour ${Math.max(1, Math.round(blocs / commandes))} bloc(s).`
      : `Densité d'interaction : aucune commande pour ${blocs} bloc(s) de texte.`;
  }
  const corps = q(root, '.recit-body');
  if (!present(corps) || typeof corps.appendChild !== 'function') return null;
  if (noeud.parentNode !== corps) corps.appendChild(noeud);
  return noeud;
}

register('E088', (ctx) => {
  try {
    if (!ctx) return;
    const { stage, layout, css, el, reducedMotion } = ctx;
    /* Aucune animation n'est introduite : le prédicat est sans objet. */
    void stage;
    void reducedMotion;
    if (!present(layout) || typeof layout.querySelector !== 'function') return;

    /* Feuille unique, injectée une seule fois par cssOnce. */
    if (typeof css === 'function') {
      try { css(CSS_ID, CSS); } catch { /* rendu préservé coûte que coûte */ }
    }

    /* Idempotence : un seul marqueur par rendu, distinct de la passe 1. */
    if (typeof layout.hasAttribute === 'function' && layout.hasAttribute(MARKER)) return;

    poserAccroches(layout);
    const mesures = mesurer(layout);

    /* E088-03 — seuil strictement supérieur, dérivé du seul DOM réel. */
    const dense = mesures.traces > SEUIL_TRACE_DIFFERE;
    if (dense) classe(q(layout, '.recit-body'), 'recit-v2-e088-trace-differe');

    /* E088-08 — sonde visible, chiffres tous dérivés du DOM. */
    const sonde = assurerSonde(layout, el, mesures);

    /* E088-09, E088-10 — miroir informatif, écrit sous garde : jamais
       d'écrasement d'un attribut existant, aucune info portée par la couleur. */
    const jetons = [
      'v2:1',
      `titre:${mesures.titres}`,
      `cmd:${mesures.commandes}`,
      `bloc:${mesures.blocs}`,
      `trace:${mesures.traces}`,
      `dense:${dense ? 1 : 0}`,
      `sonde:${sonde ? 1 : 0}`,
      'gpu:0',
      'uni:0',
    ];
    setAttrIfAbsent(layout, MARKER, jetons.join(' '));
  } catch { /* rendu préservé coûte que coûte */ }
});
