import { register } from './registry.js';

/* Lentille E099 — journal des interactions auditable via attributs data-*,
   sans console. Aucun fichier partagé n'est modifié ; aucun réseau, aucun
   Math.random, aucune boucle requestAnimationFrame, aucun timer.

   Le journal vit dans un état de module (comme `local` et `focusIntent` dans
   chronology.js:16-17) : il survit aux reconstructions complètes du DOM.
   Un seul auditeur de document, en phase capture, enregistre l'intention
   avant que les gestionnaires de la vue ne déclenchent un re-render via
   `set({}, 'chrono-filter')` (chronology.js:323, 339, 453). */

const JOURNAL_ID = 'e099-journal';
const CSS_ID = 'chronology-e099';
const MAX_ENTRIES = 12;

const LABELS = {
  ere: 'Ère sélectionnée',
  recherche: 'Recherche',
  theme: 'Thème',
  reposere: 'Repère',
  retour: 'Retour au monde',
  navigation: 'Navigation entre repères',
  filtre: 'Filtre réinitialisé',
  clavier: 'Commande clavier',
};

const KEY_LABELS = {
  ArrowRight: 'repère suivant',
  ArrowLeft: 'repère précédent',
  ArrowUp: 'ère précédente',
  ArrowDown: 'ère suivante',
  Enter: 'détail du repère',
  Escape: 'retour au monde',
  '?': 'aide',
};

/* Tampon circulaire : au plus MAX_ENTRIES entrées, comme le filtre local
   de la vue reste borné à deux champs (chronology.js:16). La séquence est
   un compteur logique déterministe — jamais une horloge ni un tirage. */
const entries = [];
let sequence = 0;
let listenersBound = false;
let currentCtx = null;

function cssRules() {
  return `
.e099-journal{margin:22px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.e099-journal-title{margin:0 0 6px;color:var(--gold);font-family:var(--serif);font-size:11px;font-weight:450}
.e099-journal-list{margin:0;padding:0;list-style:none;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.e099-journal-item,.e099-journal-empty{padding:2px 0;border-top:1px solid var(--line)}
.e099-journal-empty{color:var(--muted-2)}
@media (max-width:620px){.e099-journal{padding:8px}}
@media (prefers-reduced-motion:reduce){.e099-journal *{transition:none!important;animation:none!important}}`;
}

/* Garde d'existence et déplacement, calqués sur `ensureNavLive()`
   (chronology.js:121-133) : le host est réutilisé, la main est recréée.
   Le panneau est placé en fin de colonne défilante plutôt que comme
   troisième enfant de la grille à deux colonnes (styles.css:194). */
function ensureJournal(ctx) {
  let node = document.getElementById(JOURNAL_ID);
  if (!node) {
    node = ctx.el('section', 'e099-journal');
    node.id = JOURNAL_ID;
    node.setAttribute('aria-label', 'Journal des interactions');
    const title = ctx.el('h2', 'e099-journal-title', 'Journal des interactions');
    const list = ctx.el('ol', 'e099-journal-list');
    list.setAttribute('aria-label', 'Dernières interactions enregistrées');
    node.append(title, list);
  }
  const host = ctx.layout.querySelector('.chronology-main') || ctx.layout;
  if (node.parentNode !== host) host.appendChild(node);
  return node;
}

/* Miroir intégral : texte réel lisible + attributs data-* pour un audit E2E.
   Ce n'est pas une région live : la vue réserve déjà ce rôle à
   #nav-c2a-live (chronology.js:119-138, 244-255) et le journal ne doit pas
   bavarder à chaque frappe. */
function paint(ctx) {
  const node = ensureJournal(ctx);
  const list = node.querySelector('.e099-journal-list');
  if (!list) return;
  list.textContent = '';
  if (!entries.length) {
    const empty = ctx.el('li', 'e099-journal-empty', 'Aucune interaction enregistrée pour l’instant.');
    empty.dataset.e099Kind = 'aucune';
    list.appendChild(empty);
  }
  entries.forEach((entry) => {
    const label = LABELS[entry.kind] || entry.kind;
    const line = ctx.el('li', 'e099-journal-item',
      `${String(entry.n).padStart(2, '0')} · ${label} : ${entry.detail || '—'}`);
    line.dataset.e099Seq = String(entry.n);
    line.dataset.e099Kind = entry.kind;
    line.dataset.e099Detail = entry.detail || '';
    list.appendChild(line);
  });
  const lastKind = entries.length ? entries[entries.length - 1].kind : 'aucune';
  const reduced = ctx.reducedMotion() ? '1' : '0';
  node.dataset.e099Count = String(entries.length);
  node.dataset.e099Last = lastKind;
  node.dataset.e099Reduced = reduced;
  ctx.layout.dataset.e099Count = String(entries.length);
  ctx.layout.dataset.e099Last = lastKind;
  ctx.layout.dataset.e099Reduced = reduced;
}

function record(kind, detail, coalesce) {
  const last = entries.length ? entries[entries.length - 1] : null;
  if (coalesce && last && last.kind === kind) {
    last.detail = detail;
  } else {
    entries.push({ n: ++sequence, kind, detail: detail || '' });
    if (entries.length > MAX_ENTRIES) entries.shift();
  }
  if (currentCtx && currentCtx.layout && currentCtx.layout.isConnected) paint(currentCtx);
}

/* Lecture centralisée d'une interaction, factorisée comme `eventHaystack()`
   et `filterEvents()` (chronology.js:171-188). Chaque commande de la vue
   reçoit une étiquette française et un détail textuel, jamais un code opaque. */
function readInteraction(target) {
  if (!target || typeof target.closest !== 'function') return null;
  const era = target.closest('.era-band');
  if (era) {
    const name = era.querySelector('span');
    return { kind: 'ere', detail: (name ? name.textContent : era.dataset.eraId || '').trim() };
  }
  const tag = target.closest('.atlas-chrono-tag');
  if (tag) {
    const state = tag.getAttribute('aria-pressed') === 'true' ? 'activé' : 'désactivé';
    return { kind: 'theme', detail: `${(tag.textContent || '').trim()} (${state})` };
  }
  const card = target.closest('.event-card');
  if (card) {
    const strong = card.querySelector('strong');
    return { kind: 'reposere', detail: (strong ? strong.textContent : card.dataset.eventId || '').trim() };
  }
  if (target.closest('#nav-c2a-back')) return { kind: 'retour', detail: 'monde' };
  if (target.closest('#nav-c2a-empty-filter')) return { kind: 'filtre', detail: '' };
  const navButton = target.closest('.aside-actions button');
  if (navButton) return { kind: 'navigation', detail: (navButton.textContent || '').trim() };
  return null;
}

function readSearch(target) {
  if (!target || typeof target.closest !== 'function') return null;
  if (!target.closest('#atlas-chrono-search')) return null;
  return { kind: 'recherche', detail: target.value || '', coalesce: true };
}

/* Les raccourcis annoncés dans l'aide de la vue (chronology.js:231) sont
   tracés sans modifier le focus : aucun preventDefault, aucune annonce live
   supplémentaire. Les champs de saisie sont exclus pour ne pas confondre
   les flèches de texte avec les flèches de navigation. */
function readKey(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  const target = event.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return null;
  const label = KEY_LABELS[event.key];
  return label ? { kind: 'clavier', detail: label } : null;
}

function inChronology(target) {
  return Boolean(target && typeof target.closest === 'function'
    && target.closest('[data-view="chronology"]'));
}

function onClickCapture(event) {
  if (!inChronology(event.target)) return;
  if (event.target.closest && event.target.closest('#atlas-chrono-search')) return;
  const found = readInteraction(event.target);
  if (found) record(found.kind, found.detail, found.coalesce);
}

function onInputCapture(event) {
  if (!inChronology(event.target)) return;
  const found = readSearch(event.target);
  if (found) record(found.kind, found.detail, found.coalesce);
}

function onKeyDownCapture(event) {
  if (!document.querySelector('[data-view="chronology"]')) return;
  const found = readKey(event);
  if (found) record(found.kind, found.detail, found.coalesce);
}

/* Un seul jeu d'auditeurs pour toute la session. La phase capture garantit
   que l'intention est lue avant que `set({}, …)` ne reconstruise le stage. */
function bindListeners() {
  if (listenersBound) return;
  listenersBound = true;
  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('input', onInputCapture, true);
  document.addEventListener('keydown', onKeyDownCapture, true);
}

register('E099', (ctx) => {
  ctx.css(CSS_ID, cssRules());
  currentCtx = ctx;
  bindListeners();
  paint(ctx);
});
