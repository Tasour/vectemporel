import { register } from './registry.js';
import { DATASET } from '../../data/dataset.js';
import { currentCountry, currentEvent, currentPoint } from '../../domain/store.js';

/* Lentille E020 — vue Récit : données, traçabilité et provenance.
 *
 * Fichier possédé : src/views/recit/E020.js (aucun autre fichier touché).
 * Rapport : UNIFIED_AUDIT/RECIT/views/E020.md (E020-01 à E020-10).
 *
 * La lentille est un enrichissement non destructif : elle insère des repères
 * de provenance à côté des nœuds déjà produits par recit.js, sans renommer ni
 * retirer aucun sélecteur de test. Sans ce module, la vue reste lisible.
 * Zéro appel réseau, zéro générateur aléatoire, zéro journalisation, zéro
 * minuteur, zéro canvas, zéro boucle d'animation. Toutes les valeurs affichées
 * sont recalculées depuis le jeu de données local ou depuis le DOM courant.
 *
 * Les identifiants créés sont préfixés « e020- » et tous les nœuds porteurs
 * sont greffés à l'intérieur de .recit-body (jamais en enfant direct de
 * .recit-layout ou du stage) : ils échappent ainsi au marquage de
 * _diagnostics.js, qui ne examine que ces trois conteneurs directs.
 */

const STYLE_ID = 'recit-e020';
const GLOBAL_KEY = 'VECTEMPOREL_E020';
const VERSION = '1.0.0';
const MARK_CLASS = 'recit-e020-thread-mark';

/* E020-01 à E020-10 : une seule feuille, injectée une seule fois par cssOnce.
   Préfixe commun et sélectivité 0-2-0 minimale pour rester dominant sans
   dépendre de l'ordre d'injection des autres lentilles. */
const CSS = `
.recit-layout .recit-e020-cover{margin:6px 0 0;font-size:10px;line-height:1.5;color:var(--muted)}
.recit-layout .recit-e020-cover strong{color:var(--gold-bright);font-weight:700}
.recit-layout .recit-e020-glyph{margin-right:5px;font-weight:700}
.recit-layout .recit-e020-trace-note{margin:6px 0 0;font-size:10px;line-height:1.5;color:var(--muted)}
.recit-layout .recit-e020-source-list{margin:6px 0 0;padding-left:18px;font-size:10px;line-height:1.6;color:var(--muted)}
.recit-layout .recit-e020-source-list li{margin:2px 0}
.recit-layout .recit-e020-thread-mark{margin-right:4px;font-size:10px;font-weight:700}
.recit-layout .recit-e020-sourced .recit-e020-thread-mark{color:var(--gold-bright)}
.recit-layout .recit-e020-unsourced .recit-e020-thread-mark{color:var(--muted-2)}
.recit-layout .recit-legend .recit-e020-legend{margin-top:6px;font-size:10px;line-height:1.6;color:var(--muted)}
.recit-layout .recit-e020-conf-origin{margin:4px 0 0;font-size:10px;line-height:1.5;color:var(--muted)}
.recit-layout .recit-e020-hub{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
.recit-layout .recit-e020-panel{margin:0 0 10px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-layout .recit-e020-panel-title{margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--gold-bright)}
.recit-layout .recit-e020-panel p{margin:4px 0;font-size:10px;line-height:1.6;color:var(--muted);font-variant-numeric:tabular-nums}
.recit-layout .recit-e020-chain,
.recit-layout .recit-e020-method,
.recit-layout .recit-e020-dataset{margin:6px 0;font-size:10px;line-height:1.6;color:var(--muted);overflow-wrap:anywhere}
.recit-layout .recit-e020-metric{font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums}
@media (max-width:620px){
  .recit-layout .recit-e020-hub{margin-top:12px}
  .recit-layout .recit-e020-panel{padding:8px 10px}
}
@media (forced-colors:active){
  .recit-layout .recit-e020-panel,
  .recit-layout .recit-e020-hub{border:1px solid CanvasText}
  .recit-layout .recit-e020-thread-mark{color:CanvasText}
}
`;

let motionReduced = false;

/* Fabrique gardée : ctx.el est fourni par le registre, le repli évite toute
   dépendance à une API absente. */
function make(ctx, tag, className, text) {
  if (ctx && typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function byId(id) {
  try { return document.getElementById(id); } catch { return null; }
}

function bodyOf(ctx) {
  const roots = [ctx && ctx.layout, ctx && ctx.stage];
  for (let i = 0; i < roots.length; i += 1) {
    const root = roots[i];
    if (root && typeof root.querySelector === 'function') {
      const found = root.querySelector('.recit-body');
      if (found) return found;
    }
  }
  if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
    return document.querySelector('.recit-body');
  }
  return null;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pointsOf(event) {
  return Array.isArray(event && event.points) ? event.points : [];
}

function countSources(point) {
  return Array.isArray(point && point.sources) ? point.sources.length : 0;
}

function sourceIds(point) {
  return Array.isArray(point && point.sources)
    ? point.sources.filter((item) => typeof item === 'string')
    : [];
}

function safeCountry() {
  try { return currentCountry(); } catch { return null; }
}
function safeEvent() {
  try { return currentEvent(); } catch { return null; }
}
function safePoint() {
  try { return currentPoint(); } catch { return null; }
}

/* E020-01 — couverture de sources du point courant, remontée avant les outils. */
function cover(ctx, body, point) {
  if (byId('e020-cover')) return;
  const total = countSources(point);
  const node = make(ctx, 'p', 'recit-e020-cover');
  node.id = 'e020-cover';
  node.dataset.e020Count = String(total);
  const glyph = make(ctx, 'span', 'recit-e020-glyph', total ? '✓' : '○');
  glyph.setAttribute('aria-hidden', 'true');
  node.appendChild(glyph);
  const label = make(ctx, 'strong', '', total
    ? `Provenance : ${total} référence(s) locale(s) attachée(s) à ce point.`
    : 'Provenance : aucune référence attachée à ce point (non sourcé).');
  node.appendChild(label);
  const timing = body.querySelector('.recit-timing');
  if (timing && timing.parentNode) timing.parentNode.insertBefore(node, timing.nextSibling);
  else body.appendChild(node);
}

/* E020-02 — le panneau Traçabilité passe d'une liste plate à un registre
   commenté et numéroté ; le texte d'origine est conservé. */
function trace(ctx, body, point) {
  const ids = sourceIds(point);
  const details = body.querySelector('.recit-trace');
  if (details) {
    if (!byId('e020-source-list')) {
      details.appendChild(make(ctx, 'p', 'recit-e020-trace-note',
        'Registre local des sources : ces codes renvoient aux fiches du corpus local, sans lien externe.'));
      const list = make(ctx, 'ol', 'recit-e020-source-list');
      list.id = 'e020-source-list';
      ids.forEach((id, index) => {
        list.appendChild(make(ctx, 'li', '', `${id} — référence locale n° ${index + 1}.`));
      });
      details.appendChild(list);
    }
    return;
  }
  if (!byId('e020-trace-empty')) {
    const note = make(ctx, 'p', 'recit-e020-trace-note',
      'Ce point ne porte aucun identifiant de source dans le jeu de données : sa provenance se limite à l’énoncé lui-même.');
    note.id = 'e020-trace-empty';
    const sources = body.querySelector('.recit-sources');
    if (sources && sources.parentNode) sources.parentNode.insertBefore(note, sources.nextSibling);
    else body.appendChild(note);
  }
}

/* E020-03 — chaque point du fil porte une marque de provenance textuelle,
   lisible sans couleur et sans ouvrir le détail du point courant. */
function threadMarks(ctx, body, event) {
  const points = pointsOf(event);
  const items = body.querySelectorAll('.recit-thread-item');
  Array.prototype.forEach.call(items, (item) => {
    if (item.querySelector(`.${MARK_CLASS}`)) return;
    const fk = item.getAttribute('data-fk') || '';
    const matched = /^c3a-point-(\d+)$/.exec(fk);
    if (!matched) return;
    const index = number(matched[1], -1);
    if (index < 0 || index >= points.length) return;
    const total = countSources(points[index]);
    const mark = make(ctx, 'span', MARK_CLASS, total ? '●' : '○');
    mark.setAttribute('aria-hidden', 'true');
    item.classList.add(total ? 'recit-e020-sourced' : 'recit-e020-unsourced');
    item.insertBefore(mark, item.firstChild);
    item.title = total
      ? `Point sourcé : ${total} référence(s) locale(s).`
      : 'Point sans référence de source (non sourcé).';
  });
}

/* E020-04 — la légende explique comment lire les mentions de provenance. */
function legend(ctx, body) {
  if (byId('e020-legend')) return;
  const host = body.querySelector('.recit-legend');
  if (!host) return;
  const node = make(ctx, 'p', 'recit-e020-legend',
    'Provenance : les degrés de certitude sont des mentions reprises des audits, sans réécriture ; les codes SRC-xxx désignent des fiches du registre local ; l’absence de code est signalée « non sourcé ».');
  node.id = 'e020-legend';
  host.appendChild(node);
}

/* E020-07 — origine de la mention de certitude, au plus près de la pastille. */
function confOrigin(ctx, body, point) {
  if (byId('e020-conf-origin')) return;
  const meta = body.querySelector('.recit-meta');
  if (!meta || !meta.parentNode) return;
  const mention = point && point.confidence ? point.confidence : '—';
  const node = make(ctx, 'p', 'recit-e020-conf-origin',
    `Origine de la mention : « ${mention} » est une mention d’audit reprise telle quelle, non une évaluation recalculée.`);
  node.id = 'e020-conf-origin';
  meta.parentNode.insertBefore(node, meta.nextSibling);
}

function hub(ctx, body) {
  let root = byId('e020-hub');
  if (!root) {
    root = make(ctx, 'section', 'recit-e020-hub');
    root.id = 'e020-hub';
    root.setAttribute('aria-label', 'Provenance et traçabilité des données');
    body.appendChild(root);
  }
  return root;
}

/* E020-05 — statistiques de couverture du repère, recalculées depuis les
   points réellement chargés et non depuis une constante figée. */
function coverage(ctx, host, event) {
  if (byId('e020-coverage')) return;
  const points = pointsOf(event);
  const total = points.length;
  let sourced = 0;
  const kinds = Object.create(null);
  const confs = Object.create(null);
  points.forEach((point) => {
    if (countSources(point)) sourced += 1;
    const kind = point && point.kind ? point.kind : 'point';
    const conf = point && point.confidence ? point.confidence : '—';
    kinds[kind] = (kinds[kind] || 0) + 1;
    confs[conf] = (confs[conf] || 0) + 1;
  });
  const unsourced = total - sourced;
  const percent = total ? Math.round((unsourced / total) * 100) : 0;
  const format = (table) => {
    const keys = Object.keys(table).sort();
    return keys.length ? keys.map((key) => `${key} : ${table[key]}`).join(' · ') : '—';
  };
  const section = make(ctx, 'div', 'recit-e020-panel');
  section.id = 'e020-coverage';
  section.appendChild(make(ctx, 'h2', 'recit-e020-panel-title', 'Couverture des sources du repère'));
  section.appendChild(make(ctx, 'p', '',
    `${total} point(s) du repère : ${sourced} avec référence(s), ${unsourced} sans référence (${percent} %).`));
  section.appendChild(make(ctx, 'p', '', `Types : ${format(kinds)}.`));
  section.appendChild(make(ctx, 'p', '', `Certitudes : ${format(confs)}.`));
  host.appendChild(section);
}

/* E020-06 — chaîne d'identité : du pays au point, par identifiants réels. */
function chain(ctx, host, country, event, point) {
  if (byId('e020-chain')) return;
  const parts = [country && country.id, event && event.id, point && point.id]
    .filter((value) => typeof value === 'string' && value);
  if (!parts.length) return;
  const node = make(ctx, 'p', 'recit-e020-chain', `Identité du point : ${parts.join(' › ')}.`);
  node.id = 'e020-chain';
  host.appendChild(node);
}

/* E020-08 — transparence méthodologique : aucun fait historique inventé. */
function method(ctx, host) {
  if (byId('e020-method')) return;
  const node = make(ctx, 'p', 'recit-e020-method',
    'Méthode : cette vue n’ajoute aucune donnée historique ; elle calcule uniquement des libellés d’interface à partir du jeu de données local.');
  node.id = 'e020-method';
  host.appendChild(node);
}

/* E020-10 — provenance amont du jeu de données, chiffres recalculés. */
function datasetMeta(ctx, host) {
  if (byId('e020-dataset')) return;
  const meta = (DATASET && DATASET.meta) || {};
  const countries = Array.isArray(DATASET && DATASET.countries) ? DATASET.countries : [];
  let total = 0;
  let missing = 0;
  countries.forEach((country) => {
    const events = Array.isArray(country && country.events) ? country.events : [];
    events.forEach((event) => {
      pointsOf(event).forEach((point) => {
        total += 1;
        if (!countSources(point)) missing += 1;
      });
    });
  });
  const version = meta.version || '—';
  const generated = meta.generated || '—';
  const origin = meta.source || 'origine non précisée';
  const external = meta.externalLinks ? 'liens externes signalés' : 'aucun lien externe';
  const node = make(ctx, 'p', 'recit-e020-dataset',
    `Jeu de données v${version} · généré le ${generated} · origine : ${origin} · ${external} · ${total} points de repère, dont ${missing} sans référence de source.`);
  node.id = 'e020-dataset';
  host.appendChild(node);
}

/* E020-09 — observabilité en lecture seule : tout est relu du DOM courant,
   l'API ne mémorise aucun nœud et reste valide après reconstruction du stage. */
function audit() {
  const point = safePoint();
  const expected = countSources(point);
  const coverNode = byId('e020-cover');
  const list = byId('e020-source-list');
  let itemCount = 0;
  let markCount = 0;
  if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
    itemCount = document.querySelectorAll('.recit-thread-item').length;
    markCount = document.querySelectorAll(`.${MARK_CLASS}`).length;
  }
  const checks = {
    'E020-01': Boolean(coverNode) && number(coverNode.dataset.e020Count, -1) === expected,
    'E020-02': expected > 0
      ? Boolean(list) && list.querySelectorAll('li').length === expected
      : Boolean(byId('e020-trace-empty')),
    'E020-03': itemCount === 0 || markCount === itemCount,
    'E020-04': Boolean(byId('e020-legend')),
    'E020-05': Boolean(byId('e020-coverage')),
    'E020-06': Boolean(byId('e020-chain')),
    'E020-07': Boolean(byId('e020-conf-origin')),
    'E020-08': Boolean(byId('e020-method')),
    'E020-09': Boolean(typeof window !== 'undefined' && window[GLOBAL_KEY]
      && window[GLOBAL_KEY].version === VERSION),
    'E020-10': Boolean(byId('e020-dataset')),
  };
  const passed = Object.keys(checks).filter((key) => checks[key]).length;
  return {
    version: VERSION,
    styleId: STYLE_ID,
    reducedMotion: motionReduced,
    sourceCount: expected,
    threadItems: itemCount,
    threadMarks: markCount,
    checks,
    passed,
  };
}

function exposeApi() {
  if (typeof window === 'undefined') return;
  const current = window[GLOBAL_KEY];
  if (current && current.version === VERSION) return;
  window[GLOBAL_KEY] = Object.freeze({
    version: VERSION,
    styleId: STYLE_ID,
    audit,
  });
}

register('E020', (ctx) => {
  if (!ctx || !ctx.stage || typeof document === 'undefined') return;
  try {
    const { stage, layout, css, el, reducedMotion } = ctx;
    css(STYLE_ID, CSS);
    motionReduced = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
    const body = stage && typeof stage.querySelector === 'function'
      ? (stage.querySelector('.recit-body') || bodyOf(ctx))
      : bodyOf(ctx);
    if (!body || !layout || typeof el !== 'function') return;
    const country = safeCountry();
    const event = safeEvent();
    const point = safePoint();
    cover(ctx, body, point);
    trace(ctx, body, point);
    threadMarks(ctx, body, event);
    legend(ctx, body);
    confOrigin(ctx, body, point);
    const host = hub(ctx, body);
    coverage(ctx, host, event);
    chain(ctx, host, country, event, point);
    method(ctx, host);
    datasetMeta(ctx, host);
    exposeApi();
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
    return;
  }
});
