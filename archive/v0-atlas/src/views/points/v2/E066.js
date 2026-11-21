import { register } from './registry.js';

/* Lentille E066 — passe 2 (module POINTS/V2 E066).
 *
 * Domaine G : performance & rendu — signature anti-écriture redondante.
 * Les dix chantiers E066-V2-01 à E066-V2-10 sont décrits dans
 * UNIFIED_AUDIT/POINTS/V2/views/E066.md.
 *
 * La passe 1 (src/views/points/E066.js) porte son propre relevé
 * `#points-e066-panel` et son `MutationObserver`. Ce module est INDÉPENDANT :
 * il ne touche ni à ce panneau, ni à la vue `points.js`, ni au registre, ni à
 * `styles.css`. `points.js:128` appelle `runEnhancementsV2({ viewId:
 * 'pointsv2', stage, layout })` en plus de la passe 1 (`:127`) : le greffon
 * V2 ajoute un banc de mesure LOCAL, en flux normal, qui rend auditable la
 * règle « n'écrire que ce qui a changé » sur cinq canaux DOM distincts.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Espace de noms exclusif : `points-v2-e066` (feuille, classe de portée, ids,
 * classes internes et attributs `data-points-v2-e066-*`), jamais
 * `points-e066` (passe 1) ni `points-v2-e027` (bulletin de lisibilité).
 *
 * Invariants : un seul register, une seule feuille, un seul panneau ; tout DOM
 * statique bâti par ctx.el (jamais innerHTML) ; zéro console, zéro réseau,
 * zéro Math.random, zéro date, zéro timer, zéro rAF, zéro écouteur global.
 * Toute écriture mesurée passe par cinq fonctions qui comparent avant d'écrire ;
 * la télémétrie est publiée dans un canal séparé, non compté, pour ne pas
 * s'auto-alimenter.
 */

const CSS_ID = 'points-v2-e066';
const SCOPE = 'points-v2-e066';
const PANEL_ID = 'points-v2-e066-panel';
const TITLE_ID = 'points-v2-e066-title';
const LEDE_ID = 'points-v2-e066-lede';
const SAMPLE_ID = 'points-v2-e066-sample';
const SIGNATURE_ID = 'points-v2-e066-signature';
const LEDGER_ID = 'points-v2-e066-ledger';
const PHASE_ID = 'points-v2-e066-phase';
const COUNTERS_ID = 'points-v2-e066-counters';
const SAVINGS_ID = 'points-v2-e066-savings';
const BAR_ID = 'points-v2-e066-bar';
const VIEW_IDS = ['pointsv2', 'points'];

const STABLE_CLASS = 'points-v2-e066-stable';
const DIRTY_CLASS = 'points-v2-e066-dirty';
const DATA_PREFIX = 'data-points-v2-e066-';
const RATIO_VAR = '--points-v2-e066-ratio';

/* E066-V2-01, E066-V2-10 : une seule feuille, entièrement préfixée par
 * `.points-v2-e066`, classe posée sur le conteneur de la vue. Aucun sélecteur
 * brut ne vise body, html ou une structure d'origine. La barre d'économie a
 * une largeur égale au ratio publié via la variable CSS dédiée ; l'état
 * stable/dirty change le style de bordure ET le mot porté par le texte. */
const CSS = `
.points-v2-e066 .points-v2-e066-panel {
  box-sizing: border-box;
  margin: 10px 0 4px; padding: 11px 13px 12px;
  border: 1px solid var(--line-strong, #555);
  border-left: 3px solid var(--gold, #c9a227);
  border-radius: 10px; background: rgba(8, 11, 16, .45);
  color: var(--ink-soft, #ccc); font: inherit; font-size: 10px; line-height: 1.5;
  font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.points-v2-e066 .points-v2-e066-panel.points-v2-e066-stable { border-left-style: solid; }
.points-v2-e066 .points-v2-e066-panel.points-v2-e066-dirty { border-left-style: dashed; }
.points-v2-e066 .points-v2-e066-title {
  margin: 0 0 6px; color: var(--gold-bright, #f0d590);
  font-family: var(--serif, Georgia, serif); font-size: 14px;
  font-weight: 600; letter-spacing: 0; text-transform: none;
}
.points-v2-e066 .points-v2-e066-lede { margin: 0 0 8px; color: var(--muted-2, #7a7a7a); }
.points-v2-e066 .points-v2-e066-line { margin: 5px 0 0; }
.points-v2-e066 .points-v2-e066-signature {
  margin: 0; color: var(--gold-bright, #f0d590);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px;
}
.points-v2-e066 .points-v2-e066-ledger,
.points-v2-e066 .points-v2-e066-phase,
.points-v2-e066 .points-v2-e066-counters { color: var(--muted-2, #7a7a7a); font-size: 9px; }
.points-v2-e066 .points-v2-e066-savings {
  height: 5px; margin: 8px 0 0; border-radius: 3px;
  background: rgba(255, 255, 255, .06); overflow: hidden;
}
.points-v2-e066 .points-v2-e066-bar {
  height: 100%; width: calc(var(--points-v2-e066-ratio, 0) * 1%);
  background: var(--gold, #c9a227);
}
@media (max-width: 620px) {
  .points-v2-e066 .points-v2-e066-panel { font-size: 10px; padding: 10px 11px; }
  .points-v2-e066 .points-v2-e066-line { overflow-wrap: anywhere; }
}
@media (prefers-reduced-motion: reduce) {
  .points-v2-e066 .points-v2-e066-panel,
  .points-v2-e066 .points-v2-e066-bar { transition: none !important; }
}
@media (forced-colors: active) {
  .points-v2-e066 .points-v2-e066-panel,
  .points-v2-e066 .points-v2-e066-panel.points-v2-e066-stable,
  .points-v2-e066 .points-v2-e066-panel.points-v2-e066-dirty {
    border-color: CanvasText; background: Canvas; color: CanvasText;
  }
  .points-v2-e066 .points-v2-e066-title,
  .points-v2-e066 .points-v2-e066-signature { color: CanvasText; }
  .points-v2-e066 .points-v2-e066-bar { background: CanvasText; }
}
`;

/* E066-V2-06, E066-V2-08 : compteurs module, persistants entre rendus. Ils ne
 * créent aucun nœud et ne dépendent d'aucune autre lentille. */
let installCount = 0;
let collectPasses = 0;
let gateHits = 0;
let stats = newStats();

function newStats() {
  return {
    text: { w: 0, s: 0 },
    attr: { w: 0, s: 0 },
    data: { w: 0, s: 0 },
    cls: { w: 0, s: 0 },
    style: { w: 0, s: 0 },
  };
}

/* E066-V2-09 : garde d'existence pour toute id préfixée points-v2-e066-.
 * Un nœud déjà présent est réutilisé et déplacé dans le parent courant ; si la
 * coque a détruit le stage, getElementById ne retrouve rien et un nœuf est
 * créé par ctx.el. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E066-V2-09 : l'hôte est la matrice de la vue quand elle existe, sinon le
 * layout, sinon le stage. La classe de portée est posée sur la racine commune,
 * qui est toujours ancêtre du panneau. */
function anchors(ctx) {
  const layout = ctx && ctx.layout && typeof ctx.layout.appendChild === 'function' ? ctx.layout : null;
  const stage = ctx && ctx.stage && typeof ctx.stage.appendChild === 'function' ? ctx.stage : null;
  const root = layout || stage || document.body;
  const matrix = root && typeof root.querySelector === 'function'
    ? root.querySelector('.points-matrix') : null;
  return { root, host: matrix || root };
}

/* E066-V2-01 — écriture de texte conditionnelle : on ne touche textContent
 * que si la chaîne diffère. Chaque appel est compté (écriture ou évitement). */
function putText(node, value) {
  if (!node) return;
  if (node.textContent === value) { stats.text.s += 1; return; }
  node.textContent = value;
  stats.text.w += 1;
}

/* E066-V2-02 — attribut conditionnel : getAttribute avant setAttribute. Sert
 * aux attributs ARIA du panneau ; évite une invalidation de style à valeur
 * égale. */
function putAttr(node, name, value) {
  if (!node) return;
  if (node.getAttribute(name) === value) { stats.attr.s += 1; return; }
  node.setAttribute(name, value);
  stats.attr.w += 1;
}

/* E066-V2-03 — attribut de données conditionnel, entièrement préfixé. Les
 * métriques d'état passent toutes par ici ; aucune mutation parasite sur le
 * canal mesuré quand la valeur est identique. */
function putData(node, key, value) {
  if (!node) return;
  const name = DATA_PREFIX + key;
  if (node.getAttribute(name) === value) { stats.data.s += 1; return; }
  node.setAttribute(name, value);
  stats.data.w += 1;
}

/* E066-V2-04 — classe conditionnelle : contains avant add / remove. Le
 * panneau ne change d'état qu'au basculement réel de l'empreinte. */
function putClass(node, className, on) {
  if (!node) return;
  const present = node.classList.contains(className);
  if (present === Boolean(on)) { stats.cls.s += 1; return; }
  if (on) node.classList.add(className);
  else node.classList.remove(className);
  stats.cls.w += 1;
}

/* E066-V2-05 — style inline conditionnel : getPropertyValue avant
 * setProperty. La variable --points-v2-e066-ratio pilote la largeur de la
 * barre en CSS. */
function putStyle(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value) { stats.style.s += 1; return; }
  node.style.setProperty(property, value);
  stats.style.w += 1;
}

/* E066-V2-08 — télémétrie publiée à part : compare avant écrire, mais ne
 * compte pas dans la charge mesurée (sinon les compteurs s'auto-alimenteraient). */
function rawText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}
function rawData(node, key, value) {
  if (!node) return;
  const name = DATA_PREFIX + key;
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

function totalWrites() {
  return stats.text.w + stats.attr.w + stats.data.w + stats.cls.w + stats.style.w;
}
function totalSkips() {
  return stats.text.s + stats.attr.s + stats.data.s + stats.cls.s + stats.style.s;
}
function ratioOf() {
  const total = totalWrites() + totalSkips();
  return total === 0 ? 0 : Math.round((totalSkips() / total) * 100);
}

/* E066-V2-07 — phase de lecture, unique et groupée. Toutes les lectures
 * utiles sont faites ici, une seule fois par cycle, avant toute écriture.
 * Les deux signaux sont des entrées de mesure modifiables via
 * data-points-v2-e066-signal-a / -b : ils ne décrivent aucun point, aucune
 * ère et aucune certitude de la vue. */
function collect(panel, ctx) {
  collectPasses += 1;
  const a = panel.getAttribute(DATA_PREFIX + 'signal-a') || '0';
  const b = panel.getAttribute(DATA_PREFIX + 'signal-b') || '0';
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  return { a, b, reduced, viewId: String(ctx.viewId || '') };
}

/* E066-V2-06 — empreinte déterministe : hachage djb2 sur les seules entrées
 * du cycle. Aucun aléa, aucune date : deux lectures identiques produisent
 * toujours la même signature. */
function signatureOf(read) {
  const raw = [read.viewId, read.a, read.b, read.reduced ? 'r' : 'n'].join('|');
  let hash = 5381;
  for (let i = 0; i < raw.length; i += 1) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/* E066-V2-06, E066-V2-08 — valeurs dérivées, calculées une seule fois par
 * changement d'empreinte puis mémorisées sur le nœud. */
function derive(read, sig, changed) {
  const na = Number(read.a);
  const nb = Number(read.b);
  const sum = (Number.isFinite(na) ? na : 0) + (Number.isFinite(nb) ? nb : 0);
  const ratio = ratioOf();
  const state = changed ? 'changement détecté' : 'état stable';
  return {
    ratio,
    state,
    sample: `Signaux de mesure : A=${read.a} · B=${read.b} → somme ${sum} (${read.reduced ? 'mouvement réduit' : 'mouvement normal'}).`,
    signature: `Empreinte : ${sig} — ${state}.`,
    ledger: `Écritures utiles : ${totalWrites()} · évitées : ${totalSkips()} · économie : ${ratio} %.`,
    phase: `Cycle : lecture groupée puis écriture groupée (passe ${collectPasses}).`,
    counters: `Texte ${stats.text.w}/${stats.text.s} · attribut ${stats.attr.w}/${stats.attr.s} · données ${stats.data.w}/${stats.data.s} · classe ${stats.cls.w}/${stats.cls.s} · style ${stats.style.w}/${stats.style.s}.`,
  };
}

/* E066-V2-07 — phase d'écriture groupée : toutes les comparaisons puis toutes
 * les mutations, sans lecture intermédiaire. Si l'empreinte est inchangée, on
 * réutilise les valeurs mémorisées : les écritures ne trouvent rien à changer
 * et se contentent d'incrémenter leurs compteurs d'évitement. */
function commit(panel, refs, values, changed) {
  putAttr(panel, 'role', 'region');
  putAttr(panel, 'aria-labelledby', TITLE_ID);
  putAttr(panel, 'aria-describedby', LEDGER_ID);
  putData(panel, 'phase', 'commit');
  putData(panel, 'gated', String(gateHits));
  putData(panel, 'state', changed ? 'dirty' : 'stable');
  putText(refs.sample, values.sample);
  putText(refs.signature, values.signature);
  putText(refs.ledger, values.ledger);
  putText(refs.phase, values.phase);
  putClass(panel, STABLE_CLASS, !changed);
  putClass(panel, DIRTY_CLASS, changed);
  putStyle(panel, RATIO_VAR, String(values.ratio));

  /* Canal de télémétrie (E066-V2-08) : rawText / rawData, jamais comptés. */
  rawText(refs.counters, values.counters);
  rawData(panel, 'writes', String(totalWrites()));
  rawData(panel, 'skips', String(totalSkips()));
  rawData(panel, 'installs', String(installCount));
  rawData(panel, 'w-text', String(stats.text.w));
  rawData(panel, 's-text', String(stats.text.s));
  rawData(panel, 'w-attr', String(stats.attr.w));
  rawData(panel, 's-attr', String(stats.attr.s));
  rawData(panel, 'w-data', String(stats.data.w));
  rawData(panel, 's-data', String(stats.data.s));
  rawData(panel, 'w-cls', String(stats.cls.w));
  rawData(panel, 's-cls', String(stats.cls.s));
  rawData(panel, 'w-style', String(stats.style.w));
  rawData(panel, 's-style', String(stats.style.s));
}

function refresh(panel, refs, ctx) {
  const read = collect(panel, ctx);
  const sig = signatureOf(read);
  const changed = panel.__pointsV2E066Signature !== sig;
  if (!changed) gateHits += 1;
  const values = changed ? derive(read, sig, changed) : panel.__pointsV2E066Derived;
  commit(panel, refs, values, changed);
  panel.__pointsV2E066Signature = sig;
  panel.__pointsV2E066Derived = values;
}

/* E066-V2-09, E066-V2-10 : installation idempotente. Un seul CSS, un seul
 * panneau, un seul hook de mesure attaché au nœud (property, pas écouteur). */
function install(ctx) {
  if (!ctx || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;
  if (VIEW_IDS.indexOf(String(ctx.viewId || '')) === -1) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const { root, host } = anchors(ctx);
  if (!root || typeof root.appendChild !== 'function') return;
  root.classList.add(SCOPE);

  const make = ctx.el;
  const panel = ensureNode(make, PANEL_ID, 'section', 'points-v2-e066-panel', host);
  if (!panel.hasAttribute(DATA_PREFIX + 'signal-a')) panel.setAttribute(DATA_PREFIX + 'signal-a', '3');
  if (!panel.hasAttribute(DATA_PREFIX + 'signal-b')) panel.setAttribute(DATA_PREFIX + 'signal-b', '5');

  const title = ensureNode(make, TITLE_ID, 'h2', 'points-v2-e066-title', panel);
  rawText(title, 'Signature anti-écriture redondante');
  const lede = ensureNode(make, LEDE_ID, 'p', 'points-v2-e066-lede', panel);
  rawText(lede, 'Banc de mesure local : cinq canaux d’écriture (texte, attribut, données, classe, style) ne sont touchés que si leur valeur change. Les signaux A et B sont modifiables via data-points-v2-e066-signal-a / -b, puis le crochet pointsV2E066Refresh() rejoue un cycle sans recréer le panneau.');
  const sample = ensureNode(make, SAMPLE_ID, 'p', 'points-v2-e066-line', panel);
  const signature = ensureNode(make, SIGNATURE_ID, 'p', 'points-v2-e066-line points-v2-e066-signature', panel);
  const ledger = ensureNode(make, LEDGER_ID, 'p', 'points-v2-e066-line points-v2-e066-ledger', panel);
  const phase = ensureNode(make, PHASE_ID, 'p', 'points-v2-e066-line points-v2-e066-phase', panel);
  const counters = ensureNode(make, COUNTERS_ID, 'p', 'points-v2-e066-line points-v2-e066-counters', panel);
  const savings = ensureNode(make, SAVINGS_ID, 'div', 'points-v2-e066-savings', panel);
  const bar = ensureNode(make, BAR_ID, 'div', 'points-v2-e066-bar', savings);

  panel.replaceChildren(title, lede, sample, signature, ledger, phase, counters, savings);
  if (bar.parentElement !== savings) savings.appendChild(bar);

  const refs = { sample, signature, ledger, phase, counters };
  panel.pointsV2E066Refresh = () => refresh(panel, refs, ctx);
  refresh(panel, refs, ctx);
}

register('E066', (ctx) => { install(ctx); });
