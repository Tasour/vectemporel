import { register } from './registry.js';

/* Lentille E028 — Accessibilité ARIA de la chronologie (vague CHRONOLOGIE).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/views/E28.md — chantiers E28-01 à E28-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité :
 * ni src/views/chronology.js, ni styles.css, ni shell.js, ni keyboard.js.
 *
 * La lentille ne remplace aucun contrôle : elle répare et complète les attributs
 * ARIA du DOM déjà rendu par chronology.js (rôles de liste, noms accessibles,
 * aria-current, aria-pressed, landmarks, description de la recherche, indice
 * clavier, sources des points) et expose un signal auditable sur le layout.
 *
 * Contrat exploité : ctx.viewId, ctx.stage, ctx.layout, ctx.css, ctx.el.
 * Aucune dépendance vers le store, ctx.say, un MutationObserver, un timer ou
 * une animation. Zéro réseau, zéro aléa, zéro console.*, zéro innerHTML.
 *
 * Contrainte d'ID : les panneaux de lentilles E dont l'id contient « -e28 »
 * seraient collectés par _diagnostics.js:72 (/.*-e\d\d/) puis masqués. Les
 * nœuds créés ici portent donc le préfixe « chrono-a11y- » ; seul l'identifiant
 * de feuille de style est chronology-e28 (injecté dans <head> par cssOnce).
 */

const CSS_ID = 'chronology-e28';
const LIVE_ID = 'chrono-a11y-live';
const SEARCH_HELP_ID = 'chrono-a11y-search-help';
const KEYS_ID = 'chrono-a11y-keys';

const CSS = `
  .chrono-a11y-sr {
    position: absolute !important; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
  .chronology-layout :is(button, input, [tabindex="0"]):focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .chronology-layout :is(button, input, [tabindex="0"]) { transition: none !important; }
  }
`;

/* Listes dont le style `list-style:none` supprime la sémantique sous WebKit. */
const LIST_SELECTORS = [
  '.nav-c2-trail-list',
  '.atlas-chrono-era-list',
  '#atlas-chrono-events',
  '.points.atlas-chrono-points',
  '.point-sources',
];

let lastSignature = '';

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function addToken(node, attribute, token) {
  if (!node) return false;
  const values = String(node.getAttribute(attribute) || '').split(/\s+/).filter(Boolean);
  if (values.includes(token)) return false;
  values.push(token);
  node.setAttribute(attribute, values.join(' '));
  return true;
}

/* --- E28-01 : rôles de liste explicites --------------------------------- */
function restoreListRoles(ctx) {
  let changes = 0;
  const seen = new Set();
  LIST_SELECTORS.forEach((selector) => {
    qa(ctx.stage, selector).forEach((list) => {
      if (seen.has(list)) return;
      seen.add(list);
      if (list.getAttribute('role') !== 'list') {
        list.setAttribute('role', 'list');
        changes += 1;
      }
      Array.from(list.children).forEach((child) => {
        if (child.tagName === 'LI' && child.getAttribute('role') !== 'listitem') {
          child.setAttribute('role', 'listitem');
          changes += 1;
        }
      });
    });
  });
  return changes;
}

/* --- E28-02 : description de la recherche ------------------------------ */
function describeSearch(ctx) {
  const search = q(ctx.stage, '#atlas-chrono-search');
  if (!search) return 0;
  let help = document.getElementById(SEARCH_HELP_ID);
  if (!help) {
    help = ctx.el('p', 'chrono-a11y-sr',
      'Recherche locale : la requête porte sur le titre, l’année, le sous-titre, '
      + 'les thèmes et le texte des points du pays courant. Elle filtre la liste '
      + 'des repères ; le filtre par thème se cumule. Aucune donnée n’est envoyée.');
    help.id = SEARCH_HELP_ID;
    const tools = q(ctx.stage, '#atlas-chrono-tools');
    (tools || ctx.stage).appendChild(help);
  }
  return addToken(search, 'aria-describedby', SEARCH_HELP_ID) ? 1 : 0;
}

/* --- E28-03 : indice clavier rattaché au paysage ------------------------ */
function describeKeys(ctx) {
  const hint = q(ctx.stage, '.atlas-chrono-hint');
  const main = q(ctx.stage, '#atlas-chrono-main');
  if (!hint || !main) return 0;
  let changes = 0;
  if (hint.id !== KEYS_ID) {
    hint.id = KEYS_ID;
    changes += 1;
  }
  if (addToken(main, 'aria-describedby', KEYS_ID)) changes += 1;
  return changes;
}

/* --- E28-04 : nom accessible des cartes de repère ----------------------- */
function nameEventCards(ctx) {
  let changes = 0;
  qa(ctx.stage, '#atlas-chrono-events .event-card').forEach((card, index) => {
    const eventId = card.dataset.eventId || `rang-${index + 1}`;
    const year = q(card, '.event-year');
    const title = q(card, 'strong');
    const subtitle = q(card, '.event-subtitle');
    const era = q(card, '.atlas-chrono-card-era');
    if (!year || !title) return;

    if (!year.id) { year.id = `chrono-a11y-card-${eventId}-year`; changes += 1; }
    if (!title.id) { title.id = `chrono-a11y-card-${eventId}-title`; changes += 1; }
    const label = `${year.id} ${title.id}`;
    if (card.getAttribute('aria-labelledby') !== label) {
      card.setAttribute('aria-labelledby', label);
      changes += 1;
    }

    const description = [];
    if (subtitle) {
      if (!subtitle.id) { subtitle.id = `chrono-a11y-card-${eventId}-subtitle`; changes += 1; }
      description.push(subtitle.id);
    }
    if (era) {
      if (!era.id) { era.id = `chrono-a11y-card-${eventId}-era`; changes += 1; }
      description.push(era.id);
    }
    if (description.length && card.getAttribute('aria-describedby') !== description.join(' ')) {
      card.setAttribute('aria-describedby', description.join(' '));
      changes += 1;
    }
  });
  return changes;
}

/* --- E28-05 : unicité de aria-current par groupe ----------------------- */
function normalizeCurrent(ctx) {
  let changes = 0;
  const groups = [
    qa(ctx.stage, '.atlas-chrono-era-list .era-band'),
    qa(ctx.stage, '#atlas-chrono-events .event-card'),
  ];
  groups.forEach((items) => {
    const active = items.filter((item) => item.classList.contains('is-active'));
    const keep = active[0]
      || items.find((item) => item.getAttribute('aria-current') === 'true')
      || null;
    items.forEach((item) => {
      const current = item.getAttribute('aria-current');
      if (item === keep) {
        if (current !== 'true') { item.setAttribute('aria-current', 'true'); changes += 1; }
      } else if (current) {
        item.removeAttribute('aria-current');
        changes += 1;
      }
    });
  });
  return changes;
}

/* --- E28-06 : cohérence des bascules de thème -------------------------- */
function syncFilterButtons(ctx) {
  const buttons = qa(ctx.stage, '.atlas-chrono-tag[data-tag]');
  if (!buttons.length) return 0;
  let changes = 0;
  const votes = new Map();
  buttons.forEach((button) => {
    const tag = button.dataset.tag;
    votes.set(tag, (votes.get(tag) || 0) + (button.getAttribute('aria-pressed') === 'true' ? 1 : 0));
  });
  const pressed = Array.from(votes.entries()).filter(([, count]) => count > 0).map(([tag]) => tag);
  const keep = pressed[0] || '';
  buttons.forEach((button) => {
    const expected = button.dataset.tag === keep ? 'true' : 'false';
    if (button.getAttribute('aria-pressed') !== expected) {
      button.setAttribute('aria-pressed', expected);
      changes += 1;
    }
  });
  return changes;
}

/* --- E28-07 : landmarks nommés sans doublon ---------------------------- */
function normalizeLandmarks(ctx) {
  let changes = 0;
  const main = q(ctx.stage, '#atlas-chrono-main');
  const h1 = q(ctx.stage, '#atlas-chrono-title');
  if (main && h1 && h1.id) {
    if (main.hasAttribute('aria-label')) { main.removeAttribute('aria-label'); changes += 1; }
    if (main.getAttribute('aria-labelledby') !== h1.id) {
      main.setAttribute('aria-labelledby', h1.id);
      changes += 1;
    }
  }
  const aside = q(ctx.stage, '#atlas-chrono-aside');
  if (aside) {
    const title = q(aside, '#atlas-chrono-event-title');
    if (title && title.id) {
      if (aside.hasAttribute('aria-label')) { aside.removeAttribute('aria-label'); changes += 1; }
      if (aside.getAttribute('aria-labelledby') !== title.id) {
        aside.setAttribute('aria-labelledby', title.id);
        changes += 1;
      }
      if (title.tabIndex !== -1) { title.tabIndex = -1; changes += 1; }
    } else if (!aside.hasAttribute('aria-label')) {
      if (aside.hasAttribute('aria-labelledby')) {
        aside.removeAttribute('aria-labelledby');
        changes += 1;
      }
      aside.setAttribute('aria-label', 'Fiche du repère');
      changes += 1;
    }
  }
  return changes;
}

/* --- E28-08 : sources des points étiquetées ---------------------------- */
function labelSources(ctx) {
  let changes = 0;
  qa(ctx.stage, '.point-sources').forEach((list) => {
    const point = list.closest('.point');
    const rank = point ? q(point, '.nav-c2-point-rank') : null;
    const rankText = rank ? String(rank.textContent || '').trim() : '';
    const label = rankText ? `Sources — ${rankText}` : 'Sources du point';
    if (list.getAttribute('aria-label') !== label) {
      list.setAttribute('aria-label', label);
      changes += 1;
    }
  });
  return changes;
}

/* --- E28-09 : région live locale, dédupliquée -------------------------- */
function announceAudit(ctx, counts, total) {
  let live = document.getElementById(LIVE_ID);
  if (!live || live.getAttribute('role') !== 'status') {
    if (live && live.parentNode) live.remove();
    live = ctx.el('p', 'chrono-a11y-sr');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    document.body.appendChild(live);
  }
  const detail = counts.map((count, index) => `${String(index + 1).padStart(2, '0')}:${count}`).join('|');
  const signature = `${total}/${detail}`;
  if (signature === lastSignature) return;
  const firstRun = !lastSignature;
  lastSignature = signature;
  /* Un rendu sans réparation ne dit rien : la région live reste muette pour
     ne pas bavarder à chaque frappe dans la recherche locale. */
  if (firstRun || !total) return;
  live.textContent = `Accessibilité ARIA : ${total} ajustement${total > 1 ? 's' : ''} appliqué${total > 1 ? 's' : ''} sur la chronologie.`;
}

/* --- E28-10 : signal auditable et idempotence -------------------------- */
function seal(ctx, counts, total) {
  if (ctx.layout && ctx.layout.dataset) {
    ctx.layout.dataset.chronoA11y = String(total);
    ctx.layout.dataset.chronoA11yChecks = counts
      .map((count, index) => `${String(index + 1).padStart(2, '0')}:${count}`).join(' ');
  }
}

const CHANTIERS = [
  restoreListRoles,     // E28-01
  describeSearch,       // E28-02
  describeKeys,         // E28-03
  nameEventCards,       // E28-04
  normalizeCurrent,     // E28-05
  syncFilterButtons,    // E28-06
  normalizeLandmarks,   // E28-07
  labelSources,         // E28-08
  () => 0,              // E28-09 : annonce (traitée après comptage)
  () => 0,              // E28-10 : scellement (traité après comptage)
];

register('E28', (ctx) => {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const stage = ctx.stage && ctx.stage.isConnected ? ctx.stage : null;
  if (!stage) return;

  ctx.css(CSS_ID, CSS);
  const counts = CHANTIERS.map((chantier) => {
    try { return chantier(ctx) | 0; }
    catch { return 0; }
  });
  const total = counts.reduce((sum, count) => sum + count, 0);
  announceAudit(ctx, counts, total); // E28-09
  seal(ctx, counts, total);          // E28-10
});
