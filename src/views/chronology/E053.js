import { register } from './registry.js';

/* Lentille E053 — colonne latérale « Fiche du repère », état vide et
   sélection de repère (10 chantiers E053-01 à E053-10).

   Un seul register, un seul ctx.css('chronology-e053', …), aucun fichier
   partagé modifié. Zéro réseau, zéro Math.random, zéro console.*, aucune
   boucle requestAnimationFrame, aucun timer, aucun IntersectionObserver.
   Tous les identifiants sont préfixés « e053 » et protégés par une garde
   d'existence (re-render safe). Tout le texte visible est en français. */

const PREFIX = 'e053';

/* État module (une seule instance de lentille, réappliquée à chaque rendu). */
let lastContext = null;
let motionBound = false;
let currentLayout = null;
let currentEventId = '';
let lastEventId = null;
let selectionCount = 0;
let emptyCount = 0;
let wasEmpty = null;

const boundButtons = new WeakSet();

const CSS = `
.chronology-aside .e053-rail{margin:0 0 14px;padding:9px 10px;border:1px solid var(--line-strong);border-radius:9px;background:rgba(230,185,111,.05)}
.chronology-aside .e053-rail-head{margin:0 0 5px;color:var(--gold);font-size:8px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.chronology-aside .e053-trail{margin:0;color:var(--muted);font-size:10px;line-height:1.5;overflow-wrap:anywhere}
.chronology-aside .e053-badge{margin:6px 0 0;color:var(--gold-bright);font-size:11px;font-variant-numeric:tabular-nums}
.chronology-aside .e053-progress{position:relative;height:18px;margin:8px 0 0;border:1px solid var(--line);border-radius:999px;overflow:hidden;background:rgba(255,255,255,.03)}
.chronology-aside .e053-progress-fill{position:absolute;inset:0 auto 0 0;width:var(--e053-pct,0%);background:rgba(230,185,111,.18);transition:width .18s ease}
.chronology-aside .e053-progress-text{position:relative;display:block;padding:2px 8px;color:var(--ink-soft);font-size:9px;line-height:14px;font-variant-numeric:tabular-nums}
.chronology-aside .e053-readout{margin:7px 0 0;color:var(--muted);font-size:9px;line-height:1.45}
.chronology-aside .e053-jump{min-height:36px;margin:8px 0 0;padding:5px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font-size:10px;cursor:pointer}
.chronology-aside .e053-jump:hover{border-color:var(--gold)}
.chronology-aside .e053-jump:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-aside .e053-empty{margin:10px 0 0;padding:9px 10px;border:1px dashed var(--line);border-radius:8px}
.chronology-aside .e053-empty-note{margin:0;color:var(--muted);font-size:9px;line-height:1.5}
.chronology-aside .e053-empty-search{min-height:36px;margin:7px 0 0;padding:4px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font-size:10px;cursor:pointer}
.chronology-aside .e053-empty-search:hover{border-color:var(--gold)}
.chronology-aside .e053-empty-search:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-aside[data-e053-state="empty"] .e053-badge,
.chronology-aside[data-e053-state="empty"] .e053-progress{display:none}
.chronology-aside[data-e053-state="selected"] .e053-empty{display:none}
@media (max-width:620px){
  .chronology-aside .e053-trail{font-size:9px}
  .chronology-aside .e053-jump,
  .chronology-aside .e053-empty-search{width:100%}
}
@media (prefers-reduced-motion:reduce){
  .chronology-aside .e053-progress-fill{transition:none}
}`;

/* E053-08 : réutilise un nœud existant plutôt que d'en créer un doublon.
   Le nœud est déplacé dans le parent courant si le DOM a été reconstruit. */
function ensureNode(id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node || node.tagName.toLowerCase() !== tagName.toLowerCase()) {
    node = document.createElement(tagName);
    node.id = id;
    node.className = className || '';
  } else if (className && node.className !== className) {
    node.className = className;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

function textOf(root, selector) {
  const node = root ? root.querySelector(selector) : null;
  return node ? (node.textContent || '').trim() : '';
}

/* « Repère 3 / 12 » → { rank: 3, total: 12 } ; retourne null si absent. */
function readPair(text) {
  const found = /(\d+)\s*\/\s*(\d+)/.exec(text);
  return found ? { rank: Number(found[1]), total: Number(found[2]) } : null;
}

/* E053-09 : un seul écouteur de préférence de mouvement, gardé au niveau
   module ; il relit le dernier contexte sans créer de boucle ni de timer. */
function bindMotion(ctx) {
  if (motionBound) return;
  let query;
  try { query = window.matchMedia('(prefers-reduced-motion: reduce)'); }
  catch { return; }
  const onChange = () => { if (lastContext) apply(lastContext); };
  if (typeof query.addEventListener === 'function') query.addEventListener('change', onChange);
  else if (typeof query.addListener === 'function') query.addListener(onChange);
  motionBound = true;
}

/* E053-05 : les boutons ajoutés ne pilotent que le focus ; ils ne touchent
   jamais au store et ne volent pas les flèches du routeur clavier. */
function focusTarget(node) {
  if (!node || typeof node.focus !== 'function') return;
  node.focus();
  if (typeof node.scrollIntoView === 'function') {
    node.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }
}

function apply(ctx) {
  if (!ctx || ctx.viewId !== 'chronology') return;
  const layout = ctx.layout;
  if (!layout || !layout.isConnected) return;
  const aside = layout.querySelector('#atlas-chrono-aside') || layout.querySelector('.chronology-aside');
  if (!aside || !aside.isConnected) return;

  lastContext = ctx;
  currentLayout = layout;
  ctx.css('chronology-e053', CSS);

  /* E053-02 : l'état de sélection est lu dans le DOM living, jamais déduit
     d'une copie de l'état global (chronology.js:385-390, 416-419, 527-535). */
  const titleNode = aside.querySelector('#atlas-chrono-event-title');
  const selected = Boolean(titleNode && (titleNode.textContent || '').trim());
  const card = layout.querySelector('button.event-card[aria-current="true"]');
  const eventId = selected && card ? (card.dataset.eventId || '') : '';
  const changed = eventId !== lastEventId;
  if (changed) { lastEventId = eventId; selectionCount += 1; }
  if (!selected && wasEmpty !== true) emptyCount += 1;
  wasEmpty = !selected;

  /* Libellés réels déjà présents : aucun texte n'est inventé. */
  const country = textOf(layout, '#atlas-chrono-title').replace(/^Chronologie\s*·\s*/, '') || 'Pays';
  const eraBand = layout.querySelector('.era-band[aria-current="true"]');
  const eraName = eraBand ? textOf(eraBand, 'span') : '';
  const kickers = Array.from(aside.querySelectorAll('.aside-kicker')).map((node) => (node.textContent || '').trim());
  const pair = readPair(kickers[0] || '');
  const rank = pair ? pair.rank : 0;
  const total = pair ? pair.total : 0;
  const titleText = selected ? (titleNode.textContent || '').trim() : 'Aucun repère sélectionné';
  const yearText = textOf(aside, '.aside-year');
  const trailText = `${country} › ${eraName || 'Ère non sélectionnée'} › ${titleText}`;

  /* E053-01 / E053-03 : rail inséré en tête de la fiche, avant les titres
     d'origine (chronology.js:420-430), sans remplacer aria-labelledby. */
  const rail = ensureNode(`${PREFIX}-aside-rail`, 'div', 'e053-rail', aside);
  if (aside.firstChild !== rail) aside.insertBefore(rail, aside.firstChild);

  const head = ensureNode(`${PREFIX}-rail-head`, 'p', 'e053-rail-head', rail);
  head.textContent = 'Fil du repère';

  const trail = ensureNode(`${PREFIX}-aside-trail`, 'p', 'e053-trail', rail);
  trail.textContent = trailText;

  const badge = ensureNode(`${PREFIX}-aside-badge`, 'p', 'e053-badge', rail);
  badge.textContent = selected
    ? `${total ? `Repère ${rank} / ${total} · ` : ''}${yearText || titleText}`
    : 'Aucun repère sélectionné';

  /* E053-04 : mesure chiffrée visible, jamais portée par la seule couleur. */
  const progress = ensureNode(`${PREFIX}-aside-progress`, 'div', 'e053-progress', rail);
  progress.setAttribute('role', 'img');
  progress.setAttribute('aria-label', total ? `Repère ${rank} sur ${total}` : 'Aucun repère sélectionné');
  progress.style.setProperty('--e053-pct', total ? `${(rank / total) * 100}%` : '0%');
  const fill = ensureNode(`${PREFIX}-aside-progress-fill`, 'span', 'e053-progress-fill', progress);
  fill.setAttribute('aria-hidden', 'true');
  const progressText = ensureNode(`${PREFIX}-aside-progress-text`, 'span', 'e053-progress-text', progress);
  progressText.textContent = total ? `${rank} / ${total} repères` : 'Sélection indisponible';

  /* E053-06 : annonce uniquement sur changement observable de sélection. */
  const readout = ensureNode(`${PREFIX}-aside-readout`, 'p', 'e053-readout', rail);
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  if (changed) {
    readout.textContent = selected
      ? `Repère sélectionné : ${titleText}.${total ? ` Rang ${rank} sur ${total}.` : ''}`
      : 'Aucun repère sélectionné. Choisissez un repère dans la liste.';
  }

  const jump = ensureNode(`${PREFIX}-aside-jump`, 'button', 'e053-jump', rail);
  jump.type = 'button';
  jump.textContent = selected ? 'Voir ce repère dans la liste' : 'Aller à la liste des repères';
  if (!boundButtons.has(jump)) {
    boundButtons.add(jump);
    jump.addEventListener('click', () => {
      const parent = currentLayout;
      const target = currentEventId && parent
        ? document.getElementById(`event-btn-${currentEventId}`)
        : null;
      focusTarget(target || (parent ? parent.querySelector('button.event-card') : null)
        || document.getElementById('atlas-chrono-search'));
    });
  }

  /* E053-07 : l'état vide reste une fiche utile : explication + accès
     direct à la recherche, sans toucher au paragraphe d'origine. */
  const emptyBox = ensureNode(`${PREFIX}-aside-empty`, 'div', 'e053-empty', aside);
  const emptyNote = ensureNode(`${PREFIX}-aside-empty-note`, 'p', 'e053-empty-note', emptyBox);
  emptyNote.textContent = 'La fiche reste lisible sans repère : la recherche et les filtres permettent de revenir à la liste.';
  const searchButton = ensureNode(`${PREFIX}-aside-empty-search`, 'button', 'e053-empty-search', emptyBox);
  searchButton.type = 'button';
  searchButton.textContent = 'Rechercher un repère';
  if (!boundButtons.has(searchButton)) {
    boundButtons.add(searchButton);
    searchButton.addEventListener('click', () => {
      focusTarget(document.getElementById('atlas-chrono-search'));
    });
  }

  /* E053-10 : miroir d'état auditable et couplage à la préférence de mouvement. */
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  aside.dataset.e053State = selected ? 'selected' : 'empty';
  aside.dataset.e053EventId = eventId;
  aside.dataset.e053Rank = String(rank);
  aside.dataset.e053Total = String(total);
  aside.dataset.e053Selections = String(selectionCount);
  aside.dataset.e053Empties = String(emptyCount);
  aside.dataset.e053Reduced = reduced ? '1' : '0';
  layout.dataset.e053State = aside.dataset.e053State;

  currentEventId = eventId;
  bindMotion(ctx);
}

register('E053', (ctx) => {
  apply(ctx);
});
