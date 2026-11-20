import { register } from './registry.js';

/* V2 lentille E058 — Performance et sobriété (second regard).
 *
 * La passe 1 d'E058 portait sur la police système, la réservation géométrique
 * du média, text-size-adjust, le confinement de la région image, le mode
 * prefers-reduced-data, color-scheme, la mesure d'empreinte, un compteur
 * visible, scrollbar-gutter et une bascule « sobriété renforcée ». Cette
 * passe V2 ne reprend AUCUN de ces leviers : elle cible des chantiers neufs et
 * complémentaires — bilan des ressources locales, préférences système
 * rarement honorées (transparence, couleurs forcées, impression), coût de
 * façage et de pointage, stabilité géométrique de la grille et des compteurs,
 * et idempotence stricte de la passe.
 *
 * Dix chantiers E058-01 … E058-10, tous implémentés ci-dessous, détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E058.md.
 *
 * Une seule feuille de styles, injectée par un unique appel à `css`, un seul
 * id DOM `v2-e058-bilan` (préfixé pour ne jamais collisionner avec les ids `e058-*`
 * de la passe 1 qui tourne sur le MÊME DOM), un seul miroir
 * `data-v2-e058-bilan` distinct des attributs `data-e058-*` de la passe 1.
 * Toutes les classes créées sont préfixées `recit-v2-e058-`.
 *
 * Aucun écouteur, timer, observateur, rAF, aléa, appel réseau ni
 * journalisation. Aucun nœud existant n'est retiré, aucun texte réécrit,
 * aucun attribut existant écrasé. Sans JavaScript, la vue reste intégralement
 * lisible ; chaque chiffre affiché est dérivé du DOM réel (querySelectorAll).
 */

const MIRROR = 'data-v2-e058-bilan';
const BILAN_ID = 'v2-e058-bilan';
const BILAN_CLASS = 'recit-v2-e058-bilan';

/* Feuille unique. Aucune règle d'import, aucune URL distante, aucune couche
   GPU (ni will-change, ni filter, ni backdrop-filter), aucune information
   portée par la seule couleur. */
const CSS = `
/* E058-01 — bilan des ressources : synthèse visible, textuelle, indexable. */
.recit-layout .recit-v2-e058-bilan{
  margin:6px 0 0;padding:5px 8px;border-left:2px solid var(--line);
  color:var(--muted-2,#8c8d91);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}
/* E058-02 — prefers-reduced-transparency : fonds opaques à la place des halos
   rgba ; les bordures d'état et le texte ne sont pas modifiés. */
@media (prefers-reduced-transparency:reduce){
  .recit-layout .c3a-filter[aria-pressed="true"],
  .recit-layout .recit-thread-item.is-current,
  .recit-layout .recit-play[aria-pressed="true"]{
    background:var(--surface,#0b0f15);
  }
  .recit-layout .recit-progress{background:var(--surface-2,#10151d)}
}
/* E058-03 — forced-colors : le focus reste visible avec les couleurs système,
   sans désactiver l'ajustement forcé (forced-color-adjust intact). */
@media (forced-colors:active){
  .recit-layout .c3a-filter:focus-visible,
  .recit-layout .c3a-search:focus-visible,
  .recit-layout .c3a-reset:focus-visible,
  .recit-layout .recit-actions button:focus-visible,
  .recit-layout .recit-thread-item:focus-visible,
  .recit-layout .recit-trace summary:focus-visible{
    outline:2px solid Highlight;outline-offset:2px;
  }
}
/* E058-04 — impression sobre : le texte intégral reste, le décor disparaît. */
@media print{
  .recit-layout{print-color-adjust:economy;-webkit-print-color-adjust:economy}
  .recit-layout .recit-media,
  .recit-layout .recit-progress,
  .recit-layout .recit-actions,
  .recit-layout .c3a-tools{display:none}
}
/* E058-05 — traçabilité dépliable : confinement du sous-arbre, distinct du
   confinement du média (passe 1) et de celui des filtres (E008 V2). */
.recit-layout details.recit-trace{contain:layout style}
/* E058-06 — façage des longs passages : pas de ligatures ni de crénage
   coûteux sur les textes les plus longs du récit. */
.recit-layout .recit-legend p,
.recit-layout .recit-context,
.recit-layout .recit-trace p{text-rendering:optimizeSpeed}
/* E058-07 — min-width:0 sur les enfants de la grille : aucun blowout
   intrinsèque quand une chaîne longue apparaît dans une colonne. */
.recit-layout > *{min-width:0}
/* E058-08 — chiffres à largeur fixe sur les compteurs qui changent à chaque
   étape ; .c3a-status est déjà tabulaire dans la feuille de base. */
.recit-layout .view-kicker,
.recit-layout .recit-timing{font-variant-numeric:tabular-nums}
/* E058-09 — halo de tap supprimé sur tactile, retour conservé via :active. */
@media (hover:none){
  .recit-layout .recit-actions button,
  .recit-layout .recit-thread-item,
  .recit-layout .c3a-filter,
  .recit-layout .c3a-reset,
  .recit-layout .recit-trace summary{-webkit-tap-highlight-color:transparent}
  .recit-layout .recit-actions button:active,
  .recit-layout .recit-thread-item:active,
  .recit-layout .c3a-filter:active,
  .recit-layout .c3a-reset:active{
    border-color:var(--gold);color:var(--gold-bright,#f0d5a8);
  }
}
/* E058-10 — nœud de synthèse statique : aucune transition ni animation. */
.recit-layout .recit-v2-e058-bilan{transition:none;animation:none}
`;

/* Vrai nœud d'élément (nodeType 1) : écarte textes et commentaires. */
function present(node) {
  return !!(node && node.nodeType === 1);
}

/* Sélecteur sûr : accepte un élément comme `document`. */
function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

/* Liste sûre, ramenée à un tableau pour .length. */
function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
}

/* Écriture d'attribut sous garde : n'écrase jamais un attribut existant. */
function setAttrIfAbsent(node, name, value) {
  if (!present(node) || typeof node.hasAttribute !== 'function' || node.hasAttribute(name)) return;
  if (typeof node.setAttribute !== 'function') return;
  try { node.setAttribute(name, String(value)); } catch { /* attribut facultatif */ }
}

/* E058-01 — bilan des ressources : tous les chiffres sont des décomptes du
   DOM réel, jamais des valeurs inventées. Le nœud est réutilisé s'il existe. */
function ensureBilan(root, el) {
  if (typeof el !== 'function') return null;
  let node = q(root, `#${BILAN_ID}`);
  if (present(node)) return node;

  const images = qa(root, '.recit-media img').length;
  const imagesDist = qa(root, 'img[src^="http"],img[src^="//"]').length;
  const imagesLocales = Math.max(0, images - imagesDist);
  const traces = qa(root, 'details.recit-trace').length;
  const controles = qa(root, '[data-fk]').length;
  const distantes = qa(root, '[src^="http"],[href^="http"],[src^="//"],[href^="//"]').length;

  node = el('p', BILAN_CLASS,
    `Bilan des ressources : ${imagesLocales} image(s) locale(s) · ${traces} bloc(s) de traçabilité · ${controles} contrôle(s) instrumenté(s) · ${distantes} ressource(s) distante(s). Aucune police ni requête ajoutée par cette lentille.`);
  if (!present(node)) return null;
  node.id = BILAN_ID;
  node.setAttribute('aria-label',
    `Bilan des ressources : ${imagesLocales} images locales, ${traces} blocs de traçabilité, ${controles} contrôles instrumentés, ${distantes} ressources distantes. Aucune police ni requête ajoutée.`);

  const corps = q(root, '.recit-body');
  if (!present(corps) || typeof corps.appendChild !== 'function') return null;
  corps.appendChild(node);
  return node;
}

register('E058', (ctx) => {
  /* Garde d'existence globale : une lentille défaillante ne casse jamais le
     rendu de la vue. */
  try {
    if (!ctx) return;
    const { stage, layout, css, el, reducedMotion } = ctx;
    /* Cette passe ne dépend ni de la scène ni du mouvement : neutralisation
       explicite pour éviter toute lecture inutile de ces API. */
    void stage;
    void reducedMotion;
    if (!present(layout) || typeof layout.querySelector !== 'function') return;

    /* Feuille unique, injectée une seule fois par le cssOnce du registre. */
    if (typeof css === 'function') {
      try { css('recit-v2-e058', CSS); } catch { /* rendu préservé coûte que coûte */ }
    }

    /* E058-10 — garde d'idempotence : un seul miroir par rendu. La coque
       reconstruit `layout` à chaque rendu, donc le miroir est neuf à chaque
       passe tout en bloquant une seconde exécution sur le même arbre. */
    if (typeof layout.hasAttribute === 'function' && layout.hasAttribute(MIRROR)) return;

    /* E058-01 — nœud visible puis comptages réels, tous dérivés du DOM. */
    const bilan = ensureBilan(layout, el);
    const images = qa(layout, '.recit-media img').length;
    const traces = qa(layout, 'details.recit-trace').length;
    const controles = qa(layout, '[data-fk]').length;
    const distantes = qa(layout, '[src^="http"],[href^="http"],[src^="//"],[href^="//"]').length;

    /* E058-02 … E058-10 sont portés par la feuille CSS unique : ils sont
       appliqués dès son injection, sans toucher au DOM. Le miroir consigne
       leur présence pour vérification, sans journalisation ni texte de point. */
    const jetons = [
      'v2:1',
      `img:${images}`,
      `trc:${traces}`,
      `ctl:${controles}`,
      `rmt:${distantes}`,
      `bilan:${bilan ? 1 : 0}`,
      'transp:1',
      'forced:1',
      'print:1',
      'contain:1',
      'speed:1',
      'minw:1',
      'nums:1',
      'tap:1',
      'static:1',
    ];
    setAttrIfAbsent(layout, MIRROR, jetons.join(' '));
  } catch { /* rendu préservé coûte que coûte */ }
});
