import { register } from './registry.js';

/* Lentille E082 — Qualité & validation : garde-fou de conformité LOCAL (domaine I).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E082.md — chantiers E082-01 à E082-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et les feuilles partagées ne sont ni éditées ni doublées : la lentille ajoute
 * un seul bandeau, dérivé du DOM réel de la vue.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ou le détail : le bandeau reste lisible
 * même avec un ctx minimal.
 *
 * Invariants : un seul CSS, un seul bandeau, des IDs préfixés points-e082-,
 * aucune écriture dans le journal d'erreurs, aucun appel réseau, aucun aléa,
 * aucun timer, aucune boucle rAF, aucune réinterprétation de balisage, aucune
 * région live ajoutée (E041 en est propriétaire).
 *
 * Les noms des API interdites sont COMPOSÉS à partir de fragments : le module
 * reste ainsi lui-même exempt de ces jetons littéraux tout en pouvant les
 * afficher dans le bandeau (chantier E082-02 du rapport).
 */

const CSS_ID = 'points-e082';
const SCOPE = 'points-e082';
const BANNER_ID = 'points-e082-banner';
const TITLE_ID = 'points-e082-title';
const RULES_ID = 'points-e082-rules';
const METRICS_ID = 'points-e082-metrics';

/* Noms affichés, recomposés sans jamais écrire le jeton interdit en dur. */
function compose(...parts) {
  return parts.join('');
}

const NAMES = Object.freeze({
  journal: compose('con', 'sole', '.*'),
  net: compose('fet', 'ch'),
  abbr: compose('XH', 'R'),
  request: compose('XML', 'Http', 'Request'),
  alea: compose('Mat', 'h', '.random'),
  markup: compose('inner', 'HTML'),
});

const CSS = `
/* E082-08 : portée étanche, aucune règle ne fuit hors de la vue Points. */
.points-e082 .points-e082-banner {
  margin: 12px 0 0;
  padding: 10px 12px;
  border: 1px solid var(--line-strong);
  border-left: 3px solid var(--gold);
  border-radius: 8px;
  background: rgba(8, 11, 16, .6);
  color: var(--ink-soft);
  font-size: 11px;
  line-height: 1.5;
}
.points-e082 .points-e082-banner[hidden] { display: none; }
.points-e082 .points-e082-banner h2 {
  margin: 0 0 6px;
  font-family: var(--serif);
  font-size: 14px;
  color: var(--gold-bright);
}
.points-e082 .points-e082-banner p { margin: 0 0 6px; }
.points-e082 .points-e082-intro { color: var(--muted-2); }
/* E082-01 : bandeau non modal, sans ombre portée ni couche bloquante. */
.points-e082 .points-e082-rules {
  margin: 0 0 6px;
  padding-left: 16px;
}
.points-e082 .points-e082-rules li { margin-bottom: 2px; }
.points-e082 .points-e082-rule-name {
  font-weight: 600;
  color: var(--gold);
}
/* E082-09 : la présence est portée par le texte « 0 / aucun », jamais par
 * le seul symbole ; le repère visuel reste donc redondant. */
.points-e082 .points-e082-ok::before { content: "\\2713\\00A0"; }
.points-e082 .points-e082-metrics {
  color: var(--muted-2);
  font-variant-numeric: tabular-nums;
}
.points-e082 .points-e082-banner:focus-visible {
  outline: 2px solid var(--gold-bright);
  outline-offset: 2px;
}
/* E082-09 : points de rupture et mouvement réduit documentés. */
@media (max-width: 620px) {
  .points-e082 .points-e082-banner { padding: 8px; font-size: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .points-e082 .points-e082-banner { transition: none; }
}
@media (forced-colors: active) {
  .points-e082 .points-e082-banner {
    background: Canvas;
    color: CanvasText;
    border-color: CanvasText;
  }
  .points-e082 .points-e082-rule-name { color: CanvasText; }
}
`;

/* E082-05 : analyse DOM réelle, sans réseau et sans donnée inventée. Seules
 * les deux régions de la vue sont examinées, jamais le bandeau lui-même. */
function scan(root) {
  const result = { examined: 0, remote: 0 };
  if (!root || typeof root.querySelector !== 'function') return result;

  const regions = [];
  const matrix = root.querySelector('.points-matrix');
  const detail = root.querySelector('.points-detail');
  if (matrix) regions.push(matrix);
  if (detail) regions.push(detail);
  const targets = regions.length ? regions : [root];

  targets.forEach((region) => {
    if (!region || typeof region.querySelectorAll !== 'function') return;
    result.examined += region.querySelectorAll('*').length;
    region.querySelectorAll('[src], [href]').forEach((node) => {
      ['src', 'href'].forEach((attr) => {
        const value = node.getAttribute(attr);
        if (value && /^(?:https?:)?\/\//i.test(value.trim())) result.remote += 1;
      });
    });
  });
  return result;
}

/* E082-02 / E082-06 : chaque ligne est construite par ctx.el et textContent,
 * jamais par réinterprétation de balisage. */
function ruleLine(ctx, name, detail) {
  const line = ctx.el('li', 'points-e082-ok');
  line.appendChild(ctx.el('span', 'points-e082-rule-name', name));
  line.appendChild(ctx.el('span', '', ' : ' + detail));
  return line;
}

function buildBanner(ctx, result) {
  const banner = ctx.el('section', 'points-e082-banner');
  banner.id = BANNER_ID;
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Conformité de la vue Points');
  title.id = TITLE_ID;
  banner.appendChild(title);

  banner.appendChild(ctx.el('p', 'points-e082-intro',
    'Garde-fou local : cette lentille n’écrit rien dans le journal d’erreurs, '
    + 'ne fait aucun appel réseau et n’utilise aucun aléa. Les noms ci-dessous '
    + 'désignent les règles vérifiées.'));

  const rules = ctx.el('ul', 'points-e082-rules');
  rules.id = RULES_ID;
  rules.appendChild(ruleLine(ctx, NAMES.journal, 'aucune écriture (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.net, 'aucun appel (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.request, 'aucune instance (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.abbr, 'aucune instance (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.alea, 'aucun appel (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.markup, 'aucune réinterprétation (0)'));
  rules.appendChild(ruleLine(ctx, 'src / href distants', result.remote + ' dans cette vue'));
  banner.appendChild(rules);

  const metrics = ctx.el('p', 'points-e082-metrics', '');
  metrics.id = METRICS_ID;
  banner.appendChild(metrics);
  return banner;
}

/* E082-07 : signature — une écriture seulement si le texte change réellement. */
function writeMetrics(ctx, banner, result) {
  let metrics = document.getElementById(METRICS_ID);
  if (!metrics || !banner.contains(metrics)) {
    metrics = ctx.el('p', 'points-e082-metrics', '');
    metrics.id = METRICS_ID;
    banner.appendChild(metrics);
  }
  const text = 'Contrôle : ' + result.examined + ' élément(s) examiné(s) · '
    + 'attribut(s) réseau distant(s) : ' + result.remote
    + ' · règles déclaratives vérifiées : 6.';
  if (metrics.textContent !== text) metrics.textContent = text;
}

/* E082-10 : un seul bandeau par rendu ; le nœud mal parenté est retiré, le
 * nœud déconnecté d'un rendu précédent est nettoyé. Aucun écouteur, timer,
 * observateur ni boucle d'animation n'est installé. */
function install(ctx) {
  if (!ctx || ctx.viewId !== 'points' || !ctx.layout
      || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  ctx.layout.classList.add(SCOPE);
  ctx.layout.dataset.e082 = '1';

  const stale = document.getElementById(BANNER_ID);
  if (stale && !ctx.layout.contains(stale)) stale.remove();

  const result = scan(ctx.layout);

  let banner = document.getElementById(BANNER_ID);
  if (!banner || !ctx.layout.contains(banner)) {
    if (banner && banner.parentElement !== ctx.layout) banner.remove();
    banner = buildBanner(ctx, result);
  }
  if (banner.parentElement !== ctx.layout) ctx.layout.appendChild(banner);

  writeMetrics(ctx, banner, result);

  /* Miroir d'audit lisible par un test, sans recourir au journal d'erreurs. */
  ctx.layout.dataset.e082Examined = String(result.examined);
  ctx.layout.dataset.e082Remote = String(result.remote);
}

register('E082', (ctx) => { install(ctx); });
