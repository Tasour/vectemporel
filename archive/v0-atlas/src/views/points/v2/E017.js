import { register } from './registry.js';

/* Lentille POINTS V2 E017 — B. Filtres & périmètre : signal de filtre conservé
 * entre rendus (seconde passe).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E017.md — chantiers E017-01 à E017-10.
 * Fichier possédé : ce module uniquement. Aucun fichier de la passe 1
 * (src/views/points/E017.js) ni aucun fichier partagé (vue points.js, coque
 * shell.js, styles.css, registry.js, index.js) n'est modifié.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }). La lentille filtre
 * donc prioritairement sur 'pointsv2' (les valeurs 'points' et l'absence de
 * viewId sont tolérées par robustesse, cf. E005/E006 V2). Toutes les ancres,
 * classes, feuilles et signaux sont préfixés `points-v2-e017` afin de ne pas
 * écraser ceux de la passe 1 (`points-e017`) sur le DOM partagé.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucun import de store, aucune écriture dans state, aucun
 * appel à set()/selectEra(), aucune dépendance vers une autre lentille.
 *
 * Invariants :
 * - un seul register, un seul CSS ('points-v2-e017'), une seule note par rendu ;
 * - le signal est conservé dans la mémoire du module, jamais réinitialisé par
 *   un rendu neuf : c'est la différence avec les lentilles qui repartent à zéro ;
 * - écouteurs LOCAUX en phase capture, non destructifs : aucune annulation
 *   d'événement, aucune interruption de propagation, aucun retrait d'un
 *   gestionnaire natif ;
 * - aucun select.value n'est réécrit, aucun événement synthétique n'est émis,
 *   aucun état n'est modifié : la conservation est OBSERVABLE, pas imposée ;
 * - zéro réseau, zéro aléa, zéro minuteur, zéro animation, aucun appel à la
 *   console, aucune réinterprétation de balisage : seulement des nœuds ctx.el.
 */

const CSS_ID = 'points-v2-e017';
const SCOPE = 'points-v2-e017';
const NOTE_ID = 'points-v2-e017-note';
const NOTE_CLASS = 'points-v2-e017-note';
const VIEW_IDS = ['pointsv2', 'points'];

/* Feuille unique. Tout sélecteur COMMENCE par `.points-v2-e017`, y compris à
 * l'intérieur des @media : aucune règle ne peut fuir hors de la vue Points V2.
 * Les attributs de donnée sont distincts de ceux de la passe 1
 * (data-points-e017-*) pour ne pas écraser ses marqueurs. Aucune animation
 * propre : le mouvement réduit est respecté par construction, avec un couplage
 * JS explicite en complément. */
const CSS = `
  .points-v2-e017 .points-filters { gap: 8px; flex-wrap: wrap; }
  .points-v2-e017 #${NOTE_ID} {
    flex: 1 1 100%;
    margin: 2px 0 0; padding: 6px 9px; min-height: 24px;
    border: 1px solid var(--line-strong, #6b6b6b);
    border-left: 3px solid var(--gold, #e6b96f);
    border-radius: 6px;
    background: rgba(255, 255, 255, .02); color: var(--ink-soft, #d7d7d7);
    font: inherit; font-size: 11px; line-height: 1.45;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .points-v2-e017 .points-filters[data-points-v2-e017-divergence="1"] #${NOTE_ID} {
    border-left-style: dashed;
  }
  .points-v2-e017 .points-filters select,
  .points-v2-e017 .points-filters button { min-height: 38px; }
  .points-v2-e017 .points-filters select:focus-visible,
  .points-v2-e017 .points-filters button:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d49a); outline-offset: 2px;
  }
  @media (max-width: 700px) {
    .points-v2-e017 .points-filters select,
    .points-v2-e017 .points-filters button { min-height: 44px; }
    .points-v2-e017 #${NOTE_ID} { font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e017 .points-filters select,
    .points-v2-e017 .points-filters button,
    .points-v2-e017 #${NOTE_ID} { transition: none; }
  }
  .points-v2-e017[data-points-v2-e017-motion="reduced"] .points-filters select,
  .points-v2-e017[data-points-v2-e017-motion="reduced"] .points-filters button { transition: none; }
  @media (forced-colors: active) {
    .points-v2-e017 #${NOTE_ID} {
      border-color: CanvasText; color: CanvasText; background: Canvas;
    }
    .points-v2-e017 .points-filters[data-points-v2-e017-divergence="1"] #${NOTE_ID} {
      border-left-color: Highlight;
    }
  }
  @media print {
    .points-v2-e017 .points-filters { flex-wrap: wrap; }
    .points-v2-e017 #${NOTE_ID} { border-left-width: 2px; }
  }
`;

const SOURCE_LABELS = {
  domaine: 'choix du domaine',
  famille: 'choix de la famille',
  reset: 'réinitialisation',
  matrice: 'clic dans la matrice',
  rendu: 'lecture du rendu',
};

/* Mémoire du module : survit au remplacement intégral du stage par la coque.
 * Un rendu neuf ne la remet PAS à zéro : c'est le chantier E017-03. */
let trackedFilters = null;
let trackedLayout = null;
let remembered = null;       // { domain, family, domainLabel, familyLabel, source, bornRender }
let renderCount = 0;         // nombre de rendus neufs observés
let restorations = 0;        // rendus où le signal conservé a été réimprimé
let divergences = 0;         // rendus où signal conservé et DOM diffèrent
let noteNode = null;
let noteSignature = '';
let writes = 0;              // compteur auditable d'écritures réelles de la note

function q(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function txt(node) {
  return node ? String(node.textContent || '').trim() : '';
}

function valueOf(select) {
  return select && typeof select.value === 'string' ? select.value : '';
}

/* La valeur « tout » est la sentinelle du contrat (store.js:48, points.js:64/76) :
 * on la LIT dans la première option plutôt que de la coder en dur. */
function resetValue(select) {
  const options = select && select.options ? select.options : null;
  return options && options.length ? String(options[0].value || '') : '';
}

function labelOf(select, value) {
  const options = select && select.options ? Array.from(select.options) : [];
  const match = options.find((option) => String(option.value) === value);
  return match ? txt(match) : value;
}

/* E017-02 : les deux <select> sont reconnus par aria-label, avec repli sur
 * leur ordre réel dans .points-filters (points.js:61-93 : domaine puis famille). */
function selectsOf(filters) {
  const list = qa(filters, 'select');
  const result = { domain: list[0] || null, family: list[1] || null };
  list.forEach((select) => {
    const label = (select.getAttribute('aria-label') || '').toLowerCase();
    if (label.indexOf('domaine') !== -1) result.domain = select;
    else if (label.indexOf('famille') !== -1) result.family = select;
  });
  return result;
}

function resetOf(filters) {
  if (!filters) return null;
  const buttons = qa(filters, 'button');
  return buttons.find((button) => /r[ée]initialiser/i.test(txt(button))) || buttons[0] || null;
}

function readSignal(filters) {
  const { domain: domainSelect, family: familySelect } = selectsOf(filters);
  const domain = valueOf(domainSelect);
  const family = valueOf(familySelect);
  return {
    domain, family,
    domainSelect, familySelect,
    known: !!(domainSelect && familySelect),
  };
}

/* Le titre d'une cellule est `Ère · domaine · N point(s)` (points.js:49).
 * Le domaine est l'avant-dernier segment : robuste si le nom d'ère contient '·'. */
function domainFromCell(cell) {
  const title = cell ? String(cell.getAttribute('title') || '') : '';
  const parts = title.split(' · ');
  return parts.length >= 2 ? parts[parts.length - 2].trim() : '';
}

function signalKind(signal) {
  if (!signal.known) return 'inconnu';
  const filtered = (signal.domain && signal.domain !== '*')
    || (signal.family && signal.family !== '*');
  return filtered ? 'filtre' : 'complet';
}

/* E017-04 : capture de l'intention AVANT le re-render asynchrone déclenché par
 * set() (import() dynamique, points.js:53/72/84/91). Un signal identique ne
 * change pas son ancienneté, mais peut préciser son origine. */
function capture(domain, family, source) {
  const nextDomain = domain || '*';
  const nextFamily = family || '*';
  if (remembered && remembered.domain === nextDomain && remembered.family === nextFamily) {
    remembered.source = source;
    noteSignature = '';
    return;
  }
  remembered = {
    domain: nextDomain,
    family: nextFamily,
    domainLabel: nextDomain === '*' ? 'tous les domaines' : nextDomain,
    familyLabel: nextFamily === '*' ? 'toutes les familles' : nextFamily,
    source,
    bornRender: renderCount,
  };
  noteSignature = '';
}

/* E017-08 : marqueur V2 distinct de la passe 1 (data-points-e017-bound). */
function bindOnce(element, type, handler) {
  if (!element || typeof element.addEventListener !== 'function') return;
  if (element.dataset && element.dataset.pointsV2E017Bound === '1') return;
  element.addEventListener(type, handler, true);
  if (element.dataset) element.dataset.pointsV2E017Bound = '1';
}

/* E017-06 : une seule note visible et indexable par rendu ; les doublons
 * éventuellement laissés par une passe antérieure sur le même DOM sont retirés,
 * y compris un nœud périmé détaché du stage mais portant le même identifiant. */
function ensureNote(ctx, filters) {
  const found = qa(filters, '#' + NOTE_ID);
  found.slice(1).forEach((node) => node.remove());
  let note = found[0] || null;
  if (!note) {
    const stage = ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null;
    const stale = q(stage, '#' + NOTE_ID);
    if (stale && !filters.contains(stale)) stale.remove();
    note = ctx.el('p', NOTE_CLASS, '');
    note.id = NOTE_ID;
    filters.appendChild(note);
    noteSignature = '';
  }
  noteNode = note;
  return note;
}

function noteText(signal, mem, survived, divergence) {
  const current = signal.known
    ? `domaine « ${labelOf(signal.domainSelect, signal.domain)} », famille « ${labelOf(signal.familySelect, signal.family)} »`
    : 'domaine et famille non lisibles dans cette vue';
  if (!mem) {
    return `Signal de filtre V2 : aucun signal conservé ; périmètre courant — ${current}.`;
  }
  const origin = SOURCE_LABELS[mem.source] || mem.source;
  const kept = `domaine « ${mem.domainLabel} », famille « ${mem.familyLabel} »`;
  const head = `Signal de filtre V2 conservé (${origin}) : ${kept} · ${survived} rendu(s) traversé(s).`;
  return divergence
    ? `${head} Le rendu courant affiche ${current} : divergence détectée, le signal conservé n’a pas été réécrit.`
    : `${head} Rendu courant : ${current} — cohérent.`;
}

/* E017-05 : signaux préfixés data-points-v2-e017-*, distincts de la passe 1. */
function writeSignals(filters, layout, signal, mem, survived, divergence) {
  if (filters.dataset) {
    filters.dataset.pointsV2E017Signal = signalKind(signal);
    filters.dataset.pointsV2E017Domain = signal.known ? signal.domain : '';
    filters.dataset.pointsV2E017Family = signal.known ? signal.family : '';
    filters.dataset.pointsV2E017Source = mem ? mem.source : 'aucun';
    filters.dataset.pointsV2E017Renders = String(renderCount);
    filters.dataset.pointsV2E017Survived = mem ? String(survived) : '0';
    filters.dataset.pointsV2E017Divergence = divergence ? '1' : '0';
    filters.dataset.pointsV2E017Restorations = String(restorations);
    filters.dataset.pointsV2E017Writes = String(writes);
    filters.dataset.pointsV2E017Ready = '1';
  }
  if (layout.dataset) {
    layout.dataset.pointsV2E017 = 'ready';
    layout.dataset.pointsV2E017Signal = filters.dataset
      ? filters.dataset.pointsV2E017Signal : signalKind(signal);
  }
}

function renderNote(note, text) {
  if (!note || (noteSignature === text && note.textContent === text)) return;
  noteSignature = text;
  writes += 1;
  note.textContent = text;
}

function install(ctx) {
  /* E017-01 / E017-10 : gardes de type sur un ctx minimal, filtre de vue et
   * récupération défensive de la racine (layout courant, sinon repli sur stage). */
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  const stage = ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null;
  let layout = ctx.layout && typeof ctx.layout.querySelector === 'function' ? ctx.layout : null;
  if ((!layout || layout.isConnected === false) && stage) {
    const fresh = q(stage, '.points-layout');
    if (fresh) layout = fresh;
  }
  if (!layout) return;
  const filters = q(layout, '.points-filters');
  if (!filters) return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  /* Un rendu neuf est détecté par le remplacement du noeud .points-filters.
   * La mémoire `remembered` est volontairement conservée : E017-03. */
  const fresh = filters !== trackedFilters;
  if (fresh) {
    trackedFilters = filters;
    trackedLayout = layout;
    renderCount += 1;
    noteNode = null;
    noteSignature = '';
  }

  const signal = readSignal(filters);
  let divergence = false;

  if (!remembered) {
    if (signal.known) {
      remembered = {
        domain: signal.domain,
        family: signal.family,
        domainLabel: labelOf(signal.domainSelect, signal.domain),
        familyLabel: labelOf(signal.familySelect, signal.family),
        source: 'rendu',
        bornRender: renderCount,
      };
    }
  } else if (signal.known
    && signal.domain === remembered.domain && signal.family === remembered.family) {
    /* Cohérent : le signal conservé colle au rendu, on garde son ancienneté. */
  } else if (signal.known && remembered.source === 'rendu') {
    /* Aucune intention utilisateur enregistrée (deep link, ère, autre lentille) :
     * suivre le DOM est la seule lecture véridique. */
    remembered = {
      domain: signal.domain,
      family: signal.family,
      domainLabel: labelOf(signal.domainSelect, signal.domain),
      familyLabel: labelOf(signal.familySelect, signal.family),
      source: 'rendu',
      bornRender: renderCount,
    };
  } else {
    /* Divergence franche : on ne réécrit ni le select ni le store, on le dit. */
    divergence = true;
    if (fresh) divergences += 1;
  }

  const survived = remembered ? Math.max(0, renderCount - remembered.bornRender) : 0;
  if (fresh && remembered && survived > 0 && !divergence) restorations += 1;

  const note = ensureNote(ctx, filters);
  writeSignals(filters, layout, signal, remembered, survived, divergence);
  renderNote(note, noteText(signal, remembered, survived, divergence));

  /* Écouteurs locaux et non destructifs. La phase capture garantit que le
   * signal est mémorisé avant le gestionnaire natif et son re-render. */
  const { domain: domainSelect, family: familySelect } = signal;
  const reset = resetOf(filters);
  bindOnce(domainSelect, 'change', () => capture(valueOf(domainSelect), valueOf(familySelect), 'domaine'));
  bindOnce(familySelect, 'change', () => capture(valueOf(domainSelect), valueOf(familySelect), 'famille'));
  bindOnce(reset, 'click', () => capture(resetValue(domainSelect), resetValue(familySelect), 'reset'));
  qa(layout, '.points-cell').forEach((cell) => {
    bindOnce(cell, 'click', () => {
      const domain = domainFromCell(cell);
      if (domain) capture(domain, valueOf(familySelect) || '*', 'matrice');
    });
  });

  /* E017-09 : mouvement réduit, couplage JS (attribut V2) ET media query. */
  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (layout.dataset) layout.dataset.pointsV2E017Motion = reduced ? 'reduced' : 'full';
  if (trackedLayout && trackedLayout !== layout && !trackedLayout.isConnected) trackedLayout = layout;
}

register('E017', (ctx) => {
  try {
    install(ctx);
  } catch {
    return;
  }
});
