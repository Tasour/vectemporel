import { register } from './registry.js';

/* Lentille E017 — B. Filtres & périmètre : signal de filtre conservé entre rendus.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E017.md — chantiers E017-01 à E017-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le
 * magasin (src/domain/store.js), la coque (src/ui/shell.js) et styles.css ne
 * sont ni édités ni doublés : E017 ajoute une mémoire LOCALE du signal de
 * filtre, survit au remplacement intégral du stage par la coque (shell.js:533)
 * et réimprime ce signal sur le DOM neuf produit par renderPoints().
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucun import de store, aucune écriture dans state, aucun
 * appel à set()/selectEra(), aucune dépendance vers une autre lentille.
 *
 * Invariants :
 * - un seul register, un seul CSS ('points-e017'), une seule note par rendu ;
 * - le signal est conservé dans la mémoire du module, jamais réinitialisé par
 *   un rendu neuf : c'est la différence avec les lentilles qui repartent à zéro ;
 * - écouteurs LOCAUX en phase capture, non destructifs : aucun preventDefault,
 *   aucun stopPropagation, aucun retrait d'un gestionnaire natif ;
 * - aucun select.value n'est réécrit, aucun événement synthétique n'est émis,
 *   aucun état n'est modifié : la conservation est OBSERVABLE, pas imposée ;
 * - zéro réseau, zéro aléa, zéro minuteur, zéro animation, aucun appel à la
 *   console, aucune réinterprétation de balisage : seulement des nœuds ctx.el.
 */

const CSS_ID = 'points-e017';
const SCOPE = 'points-e017';
const NOTE_ID = 'points-e017-note';

/* Feuille unique. Tout est préfixé `.points-e017` ou `#points-e017-*` : aucune
 * fuite hors de la vue Points. Aucune animation propre : le mouvement réduit
 * est respecté par construction, avec un couplage JS explicite en complément. */
const CSS = `
  .points-e017 .points-filters { gap: 8px; }
  #${NOTE_ID} {
    flex: 1 1 100%;
    margin: 2px 0 0; padding: 6px 9px; min-height: 24px;
    border: 1px solid var(--line-strong, #6b6b6b);
    border-left: 3px solid var(--gold, #e6b96f);
    border-radius: 6px;
    background: rgba(255, 255, 255, .02); color: var(--ink-soft, #d7d7d7);
    font: inherit; font-size: 11px; line-height: 1.45;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .points-e017 .points-filters[data-points-e017-divergence="1"] #${NOTE_ID} {
    border-left-style: dashed;
  }
  .points-e017 .points-filters select,
  .points-e017 .points-filters button { min-height: 38px; }
  .points-e017 .points-filters select:focus-visible,
  .points-e017 .points-filters button:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d49a); outline-offset: 2px;
  }
  @media (max-width: 700px) {
    .points-e017 .points-filters select,
    .points-e017 .points-filters button { min-height: 44px; }
    #${NOTE_ID} { font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-e017 .points-filters select,
    .points-e017 .points-filters button,
    #${NOTE_ID} { transition: none; }
  }
  .points-e017[data-points-e017-motion="reduced"] .points-filters select,
  .points-e017[data-points-e017-motion="reduced"] .points-filters button { transition: none; }
  @media (forced-colors: active) {
    #${NOTE_ID} {
      border-color: CanvasText; color: CanvasText; background: Canvas;
    }
    .points-e017 .points-filters[data-points-e017-divergence="1"] #${NOTE_ID} {
      border-left-color: Highlight;
    }
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

/* La valeur « tout » est la sentinelle du contrat (store.js:48, points.js:63) :
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
 * leur ordre réel dans .points-filters (points.js:61-84 : domaine puis famille). */
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

/* Le titre d'une cellule est `Ère · domaine · N point(s)` (points.js:48).
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
 * set() (import() dynamique, points.js:52/71/83/90). Un signal identique ne
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

function bindOnce(element, type, handler) {
  if (!element || typeof element.addEventListener !== 'function') return;
  if (element.dataset && element.dataset.pointsE017Bound === '1') return;
  element.addEventListener(type, handler, true);
  if (element.dataset) element.dataset.pointsE017Bound = '1';
}

/* E017-06 : une seule note visible et indexable par rendu ; les doublons
 * éventuellement laissés par une passe antérieure sur le même DOM sont retirés. */
function ensureNote(ctx, filters) {
  const found = qa(filters, `#${NOTE_ID}`);
  found.slice(1).forEach((node) => node.remove());
  let note = found[0] || null;
  if (!note) {
    note = ctx.el('p', 'points-e017-note', '');
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
    return `Signal de filtre : aucun signal conservé ; périmètre courant — ${current}.`;
  }
  const origin = SOURCE_LABELS[mem.source] || mem.source;
  const kept = `domaine « ${mem.domainLabel} », famille « ${mem.familyLabel} »`;
  const head = `Signal de filtre conservé (${origin}) : ${kept} · ${survived} rendu(s) traversé(s).`;
  return divergence
    ? `${head} Le rendu courant affiche ${current} : divergence détectée, le signal conservé n’a pas été réécrit.`
    : `${head} Rendu courant : ${current} — cohérent.`;
}

function writeSignals(filters, layout, signal, mem, survived, divergence) {
  if (filters.dataset) {
    filters.dataset.pointsE017Signal = signalKind(signal);
    filters.dataset.pointsE017Domain = signal.known ? signal.domain : '';
    filters.dataset.pointsE017Family = signal.known ? signal.family : '';
    filters.dataset.pointsE017Source = mem ? mem.source : 'aucun';
    filters.dataset.pointsE017Renders = String(renderCount);
    filters.dataset.pointsE017Survived = mem ? String(survived) : '0';
    filters.dataset.pointsE017Divergence = divergence ? '1' : '0';
    filters.dataset.pointsE017Restorations = String(restorations);
  }
  if (layout.dataset) {
    layout.dataset.pointsE017 = 'ready';
    layout.dataset.pointsE017Signal = filters.dataset
      ? filters.dataset.pointsE017Signal : signalKind(signal);
  }
}

function renderNote(note, text) {
  if (!note || (noteSignature === text && note.textContent === text)) return;
  noteSignature = text;
  writes += 1;
  note.textContent = text;
}

function install(ctx) {
  if (!ctx || ctx.viewId !== 'points' || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout && ctx.layout.isConnected
    ? ctx.layout : q(ctx.stage, '.points-layout');
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

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (layout.dataset) layout.dataset.pointsE017Motion = reduced ? 'reduced' : 'full';
  if (trackedLayout && trackedLayout !== layout && !trackedLayout.isConnected) trackedLayout = layout;
  if (filters.dataset) filters.dataset.pointsE017Writes = String(writes);
}

register('E017', install);
