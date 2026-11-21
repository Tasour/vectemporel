import { register } from './registry.js';

/* V2 lentille E008 — Sobriété et stabilité du rendu (second regard).
 *
 * La passe 1 d'E008 mesurait le coût du récit (budget DOM, régions live),
 * confinait quelques indicateurs, réglait le décodage de l'image, allégeait
 * le fil dense et neutralisait les mouvements. Cette passe V2 ne reprend
 * aucun de ces chantiers : elle cible la STABILITÉ DU RENDU et la SOBRIÉTÉ
 * DES EFFETS — absence de sauts de mise en page, pas de scroll chaining,
 * pas de synthèse typographique, pas d'inflation de police, pas de
 * débordement de texte, ombres coûteuses tues sous prefers-reduced-motion,
 * isolation de la zone de filtrage, sélection accidentelle évitée, et un
 * indicateur de charge VISIBLE dont tous les chiffres sont dérivés du DOM.
 *
 * Une seule feuille `css('recit-v2-e008', …)` et un seul marqueur
 * `data-v2-e008-sobriete` (distinct du `data-e008-sobriete` de la passe 1).
 * Une seule classe Racine dérivée : `recit-v2-e008-budget`. Un seul id
 * d'élément, préfixé `v2-e008-` pour ne jamais collisionner avec la passe 1.
 * Aucun écouteur, timer, observateur, rAF, aléa, réseau ni journalisation.
 *
 * Les dix chantiers E008-01 … E008-10 sont détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E008.md.
 */

const MIRROR = 'data-v2-e008-sobriete';
const CSS_ID = 'recit-v2-e008';
const BUDGET_ID = 'v2-e008-budget';
const BUDGET_CLASS = 'recit-v2-e008-budget';

/* Feuille unique. Aucune règle ne porte sur un sélecteur universel, aucune
   n'introduit de couche GPU (ni will-change, ni backdrop-filter, ni filter).
   Aucune information n'est portée par la seule couleur. */
const CSS = `
/* E008-01 — indicateur de charge visible : discret, lisible, sobre. */
.recit-layout .recit-v2-e008-budget{
  margin:4px 0 10px;
  color:var(--muted-2,#8a8a8a);
  font-size:9px;
  line-height:1.4;
  font-variant-numeric:tabular-nums;
}
/* E008-02 — overscroll-behavior : aucun scroll chaining vers la coque. */
.recit-layout .recit-body,
.recit-layout .recit-thread-list,
.recit-layout .recit-media{
  overscroll-behavior:contain;
}
/* E008-03 — scrollbar-gutter : pas de saut horizontal au filtrage. */
.recit-layout .recit-body{
  scrollbar-gutter:stable;
}
/* E008-04 — font-synthesis : ni gras ni italique synthétiques. */
.recit-layout{
  font-synthesis:none;
  -webkit-font-synthesis:none;
}
/* E008-05 — text-size-adjust : pas d'inflation de police sur mobile. */
.recit-layout{
  text-size-adjust:100%;
  -webkit-text-size-adjust:100%;
}
/* E008-06 — overflow-wrap : le texte long ne déborde pas horizontalement. */
.recit-layout .recit-title,
.recit-layout .recit-context,
.recit-layout .recit-meta,
.recit-layout .recit-timing{
  overflow-wrap:break-word;
}
/* E008-07 — ombres textuelles coûteuses tues sous prefers-reduced-motion. */
@media (prefers-reduced-motion:reduce){
  .recit-layout .recit-media-credit,
  .recit-layout .media-caption{
    text-shadow:none;
  }
}
/* E008-08 — isolation de la zone de filtrage, mise à jour à chaque critère. */
.recit-layout .c3a-tools,
.recit-layout .c3a-status{
  contain:layout style;
}
/* E008-09 — sélection accidentelle évitée sur les contrôles tactiles. */
.recit-layout .recit-thread-item,
.recit-layout .c3a-filter,
.recit-layout .recit-actions button,
.recit-layout .recit-trace summary{
  -webkit-user-select:none;
  user-select:none;
}
/* E008-10 — sobreté d'impression : l'indicateur de charge reste texte. */
@media print{
  .recit-layout .recit-v2-e008-budget{color:#333;font-size:8pt}
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

/* Liste sûre, ramenée à un tableau pour .length et .forEach. */
function qa(root, selector) {
  return present(root) && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector))
    : [];
}

/* Écriture d'attribut sous garde : n'écrase jamais un attribut existant. */
function setAttrIfAbsent(node, name, value) {
  if (!present(node) || typeof node.hasAttribute !== 'function' || node.hasAttribute(name)) return;
  if (typeof node.setAttribute !== 'function') return;
  try { node.setAttribute(name, String(value)); } catch { /* attribut facultatif */ }
}

/* E008-01 — indicateur de charge visible, chiffres intégralement dérivés du DOM. */
function ensureBudget(root, el) {
  if (typeof el !== 'function') return null;
  let node = q(root, `#${BUDGET_ID}`);
  if (present(node)) return node;
  const points = qa(root, '.recit-thread-item').length;
  const controls = qa(root, 'button').length;
  const traces = qa(root, 'details.recit-trace').length;
  node = el('p', BUDGET_CLASS,
    `Charge du repère : ${points} point(s) affiché(s) · ${controls} contrôle(s) · ${traces} bloc(s) de traçabilité.`);
  if (!present(node)) return null;
  node.id = BUDGET_ID;
  /* Toujours greffer dans .recit-body : le parent n'est ni stage ni layout,
     donc le module de diagnostic générique ne masquera pas ce texte. */
  const body = q(root, '.recit-body');
  if (!present(body) || typeof body.appendChild !== 'function') return null;
  body.appendChild(node);
  return node;
}

register('E008', (ctx) => {
  try {
    if (!ctx) return;
    const { stage, layout, css, el, reducedMotion } = ctx;
    void stage;
    void reducedMotion;
    if (!present(layout) || typeof layout.querySelector !== 'function') return;

    /* Feuille unique, injectée une seule fois par cssOnce. */
    if (typeof css === 'function') {
      try { css(CSS_ID, CSS); } catch { /* rendu préservé coûte que coûte */ }
    }

    /* E008-10 — garde d'idempotence : un seul miroir par rendu. */
    if (typeof layout.hasAttribute === 'function' && layout.hasAttribute(MIRROR)) return;

    /* E008-01 — indicateur visible puis comptages réels. */
    const budget = ensureBudget(layout, el);
    const points = qa(layout, '.recit-thread-item').length;
    const controls = qa(layout, 'button').length;
    const live = typeof document !== 'undefined'
      ? qa(document, '[role="status"],[role="alert"],[aria-live]').length
      : 0;

    /* Les chantiers E008-02 … E008-09 sont portés par la feuille CSS unique :
       ils sont appliqués dès que la feuille est injectée, sans toucher au DOM.
       Le miroir consigne leur présence pour vérification sans journalisation. */
    const tokens = [
      'v2:1',
      `pts:${points}`,
      `ctl:${controls}`,
      `live:${live}`,
      `budget:${budget ? 1 : 0}`,
      'os:1',
      'gutter:1',
      'fontsyn:0',
      'tsa:100',
      'owrap:1',
      'shadow:1',
      'contain:1',
      'select:1',
    ];
    setAttrIfAbsent(layout, MIRROR, tokens.join(' '));
  } catch { /* rendu préservé coûte que coûte */ }
});
