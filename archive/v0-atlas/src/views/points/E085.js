import { register } from './registry.js';

/* Lentille E085 — domaine I : Qualité & validation.
 *
 * Thème : le CONTRAT D'ENREGISTREMENT EXACT, démontré par ce module lui-même.
 * Un seul appel à register(), une seule clé, une audience défensive qui échoue
 * fermée dès que le ctx ou la vue ne sont pas conformes.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E085.md — chantiers E085-01 à E085-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le
 * registre (src/views/points/registry.js), la coque et les feuilles partagées
 * ne sont ni édités ni doublés.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion() — exactement le ctx décrit par runEnhancements(). Aucune
 * dépendance vers le store, le routeur, ctx.say() ni une autre lentille.
 *
 * Invariants :
 * - une seule clé ('E085'), un seul register, un seul identifiant de feuille ;
 * - tous les identifiants dérivés de `points-e085`, aucun id générique ;
 * - greffage NON destructif (append + attributs additifs), jamais innerHTML ;
 * - idempotent : nœud réutilisé par id, relogé s'il est mal parenté ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.* ;
 * - la note affichée est dérivée du CONTRAT et du DOM réel, jamais codée en dur.
 */

/* E085-01 — l'unique clé du module. Tous les identifiants en sont dérivés :
 * il n'existe qu'une seule source de vérité pour le nom d'enregistrement. */
const KEY = 'E085';
const CSS_ID = `points-${KEY.toLowerCase()}`;

/* E085-02 — l'audience est décrite une fois, puis vérifiée avant tout effet. */
const CONTRACT = Object.freeze({
  key: KEY,
  view: 'points',
  required: Object.freeze(['css', 'el', 'layout']),
});

const ID = Object.freeze({
  root: `${CSS_ID}-contract`,
  title: `${CSS_ID}-title`,
  metrics: `${CSS_ID}-metrics`,
});

/* Feuille unique, injectée par ctx.css (cssOnce). Sélecteurs ancrés sur les
 * identifiants préfixés : aucune fuite hors de la vue Points. */
const CSS = `
  #${ID.root} {
    margin: 10px 0 4px; padding: 10px 12px;
    border: 1px solid var(--line-strong, #6b6b6b); border-radius: 8px;
    background: rgba(230, 185, 111, .05); color: var(--ink-soft, #d7d7d7);
    font-size: 11px; line-height: 1.5;
  }
  #${ID.root} h3 {
    margin: 0 0 6px; font-size: 12px; color: var(--gold-bright, #f0d49a);
  }
  #${ID.root} p { margin: 0 0 6px; }
  #${ID.root} ul { margin: 0 0 6px; padding-left: 16px; }
  #${ID.root} li { margin-bottom: 2px; }
  #${ID.metrics} {
    margin: 6px 0 0; color: var(--muted-2, #aaa);
    font-variant-numeric: tabular-nums;
  }
  #${ID.root}:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d49a); outline-offset: 3px;
  }
  @media (max-width: 620px) {
    #${ID.root} { padding: 8px; font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${ID.root} { transition: none; }
  }
  @media (forced-colors: active) {
    #${ID.root} { border-color: CanvasText; color: CanvasText; }
  }
`;

let root = null;
let metricsNode = null;
let graftCount = 0;
let renderedSignature = '';

/* E085-02 — contrôle d'audience : échec fermé, aucune exception, aucun effet
 * de bord quand la vue, l'API ou le conteneur ne sont pas conformes. */
function conforms(ctx) {
  if (!ctx || typeof ctx !== 'object') return false;
  if (ctx.viewId !== CONTRACT.view) return false;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return false;
  if (!ctx.layout || typeof ctx.layout.querySelector !== 'function') return false;
  return true;
}

/* E085-07 — toutes les grandeurs sont recomputées depuis le DOM rendu par
 * points.js ; la référence `expected` est le produit ères × domaines. */
function numbers(ctx) {
  const layout = ctx.layout;
  const rows = layout.querySelectorAll('.points-grid-row:not(.is-head)');
  const head = layout.querySelector('.points-grid-row.is-head');
  const headers = head && head.children ? head.children.length : 0;
  const eras = rows.length;
  const domains = Math.max(0, headers - 1); // 1re colonne = « Ère »
  const cells = layout.querySelectorAll('.points-cell').length;
  return { eras, domains, cells, expected: eras * domains };
}

function metricsText(ctx) {
  const { eras, domains, cells, expected } = numbers(ctx);
  return `Clé ${CONTRACT.key} · vue ${CONTRACT.view} · greffage ${graftCount}. `
    + `Ères : ${eras} · domaines : ${domains} · cellules : ${cells} `
    + `(référence ${eras}×${domains} = ${expected}).`;
}

function paintMetrics(ctx) {
  if (!metricsNode) return;
  const text = metricsText(ctx);
  const signature = `${graftCount}|${text}`;
  if (signature === renderedSignature) return;
  renderedSignature = signature;
  metricsNode.textContent = text;
}

/* E085-04 / E085-08 — la note statique est construite une seule fois. Le
 * contenu est dérivé de CONTRACT (une seule clé, une seule audience), jamais
 * d'une chaîne historique codée en dur. */
function buildRoot(ctx, section) {
  section.replaceChildren();
  section.setAttribute('role', 'region');
  section.setAttribute('aria-labelledby', ID.title);
  section.tabIndex = -1;

  const title = ctx.el('h3', '', `Contrat d’enregistrement ${CONTRACT.key}`);
  title.id = ID.title;
  section.appendChild(title);

  section.appendChild(ctx.el('p', '',
    `Une seule clé (${CONTRACT.key}), un seul register, audience défensive : greffage uniquement sur la vue « ${CONTRACT.view} » et avec l’API ${CONTRACT.required.join(', ')}. Sans ces conditions, le module ne touche rien. Aucune dépendance au store, au routeur ni aux autres lentilles.`));

  const list = ctx.el('ul', 'points-e085-required');
  CONTRACT.required.forEach((name) => {
    list.appendChild(ctx.el('li', '', `API requise : ${name}`));
  });
  section.appendChild(list);

  metricsNode = ctx.el('p', 'points-e085-metrics', '');
  metricsNode.id = ID.metrics;
  metricsNode.setAttribute('role', 'status');
  metricsNode.setAttribute('aria-live', 'polite');
  section.appendChild(metricsNode);
}

/* E085-05 / E085-10 — un seul nœud par document. Un nœud déconnecté signale
 * un rendu neuf : on le remplace, on remet le compteur à zéro puis on compte
 * ce greffage. Un nœud mal parenté est relogé, jamais dupliqué. */
function install(ctx) {
  ctx.css(CSS_ID, CSS);

  const layout = ctx.layout;
  const matrix = layout.querySelector('.points-matrix') || layout;

  const found = document.getElementById(ID.root);
  if (found && found.parentElement !== matrix) found.remove();

  const fresh = !root || !root.isConnected;
  if (fresh) {
    graftCount = 0;
    renderedSignature = '';
  }

  root = document.getElementById(ID.root);
  if (!root) {
    root = ctx.el('section', 'points-e085-contract');
    root.id = ID.root;
    buildRoot(ctx, root);
  } else if (!root.querySelector(`#${ID.metrics}`)) {
    buildRoot(ctx, root);
  } else {
    metricsNode = root.querySelector(`#${ID.metrics}`);
  }
  if (root.parentElement !== matrix) matrix.appendChild(root);

  if (fresh) graftCount += 1;
  if (root.dataset) {
    root.dataset.pointsE085Key = CONTRACT.key;
    root.dataset.pointsE085View = CONTRACT.view;
    root.dataset.pointsE085Grafts = String(graftCount);
  }
  if (layout.dataset) layout.dataset.pointsE085 = 'ready';
  if (matrix.dataset) matrix.dataset.pointsE085 = 'grafted';

  paintMetrics(ctx);
}

/* E085-01 / E085-03 — l'unique enregistrement. L'audience est vérifiée avant
 * toute écriture, et toute erreur inattendue est neutralisée sans sortie. */
register(CONTRACT.key, (ctx) => {
  if (!conforms(ctx)) return;
  try {
    install(ctx);
  } catch {
    return;
  }
});
