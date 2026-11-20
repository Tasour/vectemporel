import { register } from './registry.js';

/* Lentille E066 — signature anti-écriture redondante (domaine G : performance
 * et rendu). Dix chantiers E066-01 à E066-10, tous centrés sur une seule idée :
 * n'écrire dans le DOM que lorsqu'une valeur a réellement changé.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E066.md.
 * Fichier possédé : src/views/chronology/v2/E066.js uniquement. Aucun fichier
 * partagé (registry.js, index.js, styles.css, src/views/chronology.js) n'est
 * modifié ; aucune autre lentille n'est touchée.
 *
 * Contrat exploité : ctx = { viewId, stage, layout } ; ctx.css(id, règles),
 * ctx.el(balise, classe, texte), ctx.reducedMotion(). Une seule feuille CSS,
 * un seul register('E066', install), un seul panneau greffé sous garde.
 *
 * Invariants : zéro console, zéro réseau, zéro Math.random, zéro innerHTML,
 * zéro timer, zéro boucle rAF. Toute écriture passe par cinq fonctions qui
 * comparent avant d'écrire ; la télémétrie est publiée à part, sans polluer
 * les compteurs de charge mesurée.
 */

const CSS_ID = 'chronology-v2-e066';
const PANEL_ID = 'chronology-v2-e066-panel';
const TITLE_ID = 'chronology-v2-e066-title';
const LEDE_ID = 'chronology-v2-e066-lede';
const SAMPLE_ID = 'chronology-v2-e066-sample';
const SIGNATURE_ID = 'chronology-v2-e066-signature';
const LEDGER_ID = 'chronology-v2-e066-ledger';
const PHASE_ID = 'chronology-v2-e066-phase';
const COUNTERS_ID = 'chronology-v2-e066-counters';
const SAVINGS_ID = 'chronology-v2-e066-savings';
const BAR_ID = 'chronology-v2-e066-bar';

/* E066-01 à E066-05, E066-10 : une seule feuille, injectée une fois par
   ctx.css. La barre d'économie a une largeur égale au ratio publié en
   variable CSS ; les classes e066-stable / e066-dirty changent de style de
   bordure ET de libellé (jamais la couleur seule). */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line, #555); border-left: 3px solid var(--gold, #c9a227);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft, #ccc); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
    transition: border-color 120ms linear;
  }
  #${PANEL_ID}.e066-stable { border-left-style: solid; }
  #${PANEL_ID}.e066-dirty { border-left-style: dashed; }
  #${PANEL_ID} .e066-title {
    margin: 0 0 6px; color: var(--gold-bright, #f0d590);
    font-family: var(--serif, Georgia, serif); font-size: 14px;
    font-weight: 600; letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e066-lede { margin: 0 0 8px; color: var(--muted, #9a9a9a); }
  #${PANEL_ID} .e066-line { margin: 5px 0 0; }
  #${PANEL_ID} .e066-signature {
    margin: 0; color: var(--gold-bright, #f0d590);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px;
  }
  #${PANEL_ID} .e066-ledger,
  #${PANEL_ID} .e066-phase,
  #${PANEL_ID} .e066-counters { color: var(--muted-2, #7a7a7a); font-size: 9px; }
  #${PANEL_ID} .e066-savings {
    height: 5px; margin: 8px 0 0; border-radius: 3px;
    background: rgba(255,255,255,.06); overflow: hidden;
  }
  #${PANEL_ID} .e066-bar {
    height: 100%; width: calc(var(--e066-ratio, 0) * 1%);
    background: var(--gold, #c9a227); transition: width 120ms linear;
  }
  #${PANEL_ID}[data-e066-state="stable"] .e066-signature::after {
    content: " — état stable"; color: var(--muted, #9a9a9a);
  }
  #${PANEL_ID}[data-e066-state="dirty"] .e066-signature::after {
    content: " — changement détecté"; color: var(--muted, #9a9a9a);
  }
  @media (max-width: 620px) {
    #${PANEL_ID} { font-size: 10px; padding: 10px 11px; }
    #${PANEL_ID} .e066-line { overflow-wrap: anywhere; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} .e066-bar { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${PANEL_ID}.e066-stable, #${PANEL_ID}.e066-dirty {
      border-color: CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e066-title, #${PANEL_ID} .e066-signature,
    #${PANEL_ID} .e066-bar { color: CanvasText; background: CanvasText; }
  }
`;

/* E066-06 à E066-08 : compteurs module, persistants entre rendus. Ils ne
   créent aucun nœud et ne dépendent d'aucun autre greffon. */
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

/* E066-09 : garde d'existence pour toute ID préfixée chronology-v2-e066-.
   Un nœud déjà présent est réutilisé et déplacé dans le parent courant ; la
   coque reconstruisant le stage, un nœud de la rendu précédent est détaché et
   n'est donc pas retrouvé par getElementById : un neuf est alors créé. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function hostOf(ctx) {
  for (const candidate of [ctx.stage, ctx.layout]) {
    if (candidate && typeof candidate.appendChild === 'function') return candidate;
  }
  return document.body;
}

/* E066-01 — écriture de texte conditionnelle : on ne touche textContent que
   si la chaîne diffère. Chaque appel est compté (écriture utile ou évitée). */
function putText(node, value) {
  if (!node) return;
  if (node.textContent === value) { stats.text.s += 1; return; }
  node.textContent = value;
  stats.text.w += 1;
}

/* E066-02 — attribut conditionnel : getAttribute avant setAttribute. Sert
   ici aux attributs ARIA du panneau ; évite une invalidation de style à chaque
   rendu alors que la valeur est identique. */
function putAttr(node, name, value) {
  if (!node) return;
  if (node.getAttribute(name) === value) { stats.attr.s += 1; return; }
  node.setAttribute(name, value);
  stats.attr.w += 1;
}

/* E066-03 — dataset conditionnel : compare la valeur courante avant pose.
   Les métriques (empreinte, phase, comptages) passent toutes par ici. */
function putData(node, key, value) {
  if (!node) return;
  if (node.dataset[key] === value) { stats.data.s += 1; return; }
  node.dataset[key] = value;
  stats.data.w += 1;
}

/* E066-04 — classe conditionnelle : contains avant add / remove.
   Le panneau ne change de classe que lorsque l'état d'empreinte bascule. */
function putClass(node, className, on) {
  if (!node) return;
  const present = node.classList.contains(className);
  if (present === Boolean(on)) { stats.cls.s += 1; return; }
  if (on) node.classList.add(className);
  else node.classList.remove(className);
  stats.cls.w += 1;
}

/* E066-05 — style inline conditionnel : getPropertyValue avant setProperty.
   La variable --e066-ratio pilote la largeur de la barre en CSS. */
function putStyle(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value) { stats.style.s += 1; return; }
  node.style.setProperty(property, value);
  stats.style.w += 1;
}

/* E066-08 — télémétrie publiée à part : compare avant écrire, mais ne compte
   pas dans la charge mesurée (sinon les compteurs s'auto-alimenteraient). */
function rawText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}
function rawData(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
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

/* E066-07 — phase de lecture, unique et groupée. Toutes les lectures utiles
   sont faites ici, une seule fois par cycle, avant toute écriture : on évite
   de relire le DOM entre deux écritures (allers-retours coûteux de mise en page). */
function collect(panel, ctx) {
  collectPasses += 1;
  const a = panel.getAttribute('data-e066-signal-a') || '0';
  const b = panel.getAttribute('data-e066-signal-b') || '0';
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  return { a, b, reduced, viewId: String(ctx.viewId || '') };
}

/* E066-06 — empreinte déterministe : hachage djb2 sur les seules
   entrées du cycle. Aucun aléa, aucune date : deux lectures identiques
   produisent toujours la même signature. */
function signatureOf(read) {
  const raw = [read.viewId, read.a, read.b, read.reduced ? 'r' : 'n'].join('|');
  let hash = 5381;
  for (let i = 0; i < raw.length; i += 1) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/* E066-06, E066-08 — valeurs dérivées, calculées une seule fois par changement
   d'empreinte puis mémorisées sur le nœud. Le libellé des compteurs décrit le
   dernier cycle d'écriture réel. */
function derive(read, sig) {
  const na = Number(read.a);
  const nb = Number(read.b);
  const sum = (Number.isFinite(na) ? na : 0) + (Number.isFinite(nb) ? nb : 0);
  const ratio = ratioOf();
  return {
    ratio,
    sample: `Signaux : A=${read.a} · B=${read.b} → somme ${sum} (${read.reduced ? 'mouvement réduit' : 'mouvement normal'}).`,
    signature: `Empreinte : ${sig}`,
    ledger: `Écritures utiles : ${totalWrites()} · évitées : ${totalSkips()} · économie : ${ratio} %.`,
    phase: `Cycle : lecture groupée puis écriture groupée (passe ${collectPasses}).`,
    counters: `Texte ${stats.text.w}/${stats.text.s} · attribut ${stats.attr.w}/${stats.attr.s} · dataset ${stats.data.w}/${stats.data.s} · classe ${stats.cls.w}/${stats.cls.s} · style ${stats.style.w}/${stats.style.s}.`,
  };
}

/* E066-07 — phase d'écriture groupée : toutes les comparaisons puis toutes les
   mutations, sans lecture intermédiaire. Si l'empreinte est inchangée, on
   réutilise les valeurs mémorisées : les cinq écritures ne trouvent rien à
   écrire et se contentent d'incrémenter leurs compteurs d'évitement. */
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
  putClass(panel, 'e066-stable', !changed);
  putClass(panel, 'e066-dirty', changed);
  putStyle(panel, '--e066-ratio', String(values.ratio));

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
  const changed = panel.__e066Signature !== sig;
  if (!changed) gateHits += 1;
  const values = changed ? derive(read, sig) : panel.__e066Derived;
  commit(panel, refs, values, changed);
  panel.__e066Signature = sig;
  panel.__e066Derived = values;
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = hostOf(ctx);
  const panel = ensureNode(make, PANEL_ID, 'section', 'e066-panel', host);
  if (!panel.hasAttribute('data-e066-signal-a')) panel.setAttribute('data-e066-signal-a', '3');
  if (!panel.hasAttribute('data-e066-signal-b')) panel.setAttribute('data-e066-signal-b', '5');

  const title = ensureNode(make, TITLE_ID, 'h2', 'e066-title', panel);
  rawText(title, 'Signature anti-écriture redondante');
  const lede = ensureNode(make, LEDE_ID, 'p', 'e066-lede', panel);
  rawText(lede, 'Panneau de mesure : il n’écrit qu’une valeur qui a changé. Les signaux A et B sont modifiables via data-e066-signal-a / -b, puis la méthode e066Refresh() rejoue un cycle sans recréer le panneau.');
  const sample = ensureNode(make, SAMPLE_ID, 'p', 'e066-line', panel);
  const signature = ensureNode(make, SIGNATURE_ID, 'p', 'e066-line e066-signature', panel);
  const ledger = ensureNode(make, LEDGER_ID, 'p', 'e066-line e066-ledger', panel);
  const phase = ensureNode(make, PHASE_ID, 'p', 'e066-line e066-phase', panel);
  const counters = ensureNode(make, COUNTERS_ID, 'p', 'e066-line e066-counters', panel);
  const savings = ensureNode(make, SAVINGS_ID, 'div', 'e066-savings', panel);
  const bar = ensureNode(make, BAR_ID, 'div', 'e066-bar', savings);

  panel.replaceChildren(title, lede, sample, signature, ledger, phase, counters, savings);
  if (bar.parentElement !== savings) savings.appendChild(bar);

  const refs = { sample, signature, ledger, phase, counters };
  panel.e066Refresh = () => refresh(panel, refs, ctx);
  refresh(panel, refs, ctx);
}

register('E066', install);
