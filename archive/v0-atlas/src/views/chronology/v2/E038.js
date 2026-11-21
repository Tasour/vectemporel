import { register } from './registry.js';

/* Lentille E038 — passe V2, domaine D (navigation & clavier) : commande
 * « Aller au repère », c'est-à-dire un saut direct à un repère de la frise.
 *
 * Fichier possédé : src/views/chronology/v2/E038.js uniquement. Lectures
 * seules : src/views/chronology.js, src/views/chronology/v2/registry.js,
 * src/views/chronology/v2/index.js, src/platform/keyboard.js, styles.css,
 * et les modèles de qualité E049 (passe 1, JS et rapport).
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } ; helpers
 * ctx.css(id, rules), ctx.el(tag, className, text), ctx.reducedMotion().
 * Une seule feuille CSS 'chronology-v2-e038', un seul register('E038', …).
 * Les dix chantiers E038-01 à E038-10 sont implémentés ici, chacun avec un
 * effet DOM/CSS observable, sans toucher à la passe 1 ni aux fichiers partagés.
 *
 * Invariants : zéro journalisation, zéro appel réseau ni import distant, zéro
 * aléa, zéro HTML brut (ctx.el / createElement / textContent / replaceChildren),
 * zéro timer, zéro rAF, zéro région live supplémentaire, zéro vol de focus,
 * zéro touche interceptée.
 */

const CSS_ID = 'chronology-v2-e038';
const PANEL_ID = 'chronology-v2-e038-jump';
const TITLE_ID = 'chronology-v2-e038-title';
const LEDE_ID = 'chronology-v2-e038-lede';
const LABEL_ID = 'chronology-v2-e038-label';
const SELECT_ID = 'chronology-v2-e038-select';
const HINT_ID = 'chronology-v2-e038-hint';
const STATUS_ID = 'chronology-v2-e038-status';
const METRIC_ID = 'chronology-v2-e038-metric';
const EVENTS_ID = 'atlas-chrono-events';
const MAIN_ID = 'atlas-chrono-main';

/* E038-01, E038-08, E038-09 : une seule feuille injectée une fois par ctx.css.
   Le panneau est un bloc en flux normal, placé juste avant la liste des
   repères : ni modale, ni superposition, ni arrêt Tab supplémentaire. */
const CSS = `
  #${PANEL_ID} {
    margin: 0 0 12px; padding: 10px 12px 11px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e038-title {
    margin: 0 0 5px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
  }
  #${PANEL_ID} .e038-lede,
  #${PANEL_ID} .e038-hint { margin: 0 0 7px; color: var(--muted); }
  #${PANEL_ID} .e038-field {
    display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: flex-end;
  }
  #${PANEL_ID} .e038-label {
    flex: 0 0 auto; min-height: 24px; color: var(--ink-soft); font-size: 10px;
  }
  #${PANEL_ID} .e038-select {
    flex: 1 1 220px; min-width: 0; min-height: 44px; padding: 8px 10px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: var(--surface-2); color: var(--ink); font: inherit; font-size: 11px;
  }
  #${PANEL_ID} .e038-select:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  #${PANEL_ID} .e038-select:disabled { opacity: .55; cursor: not-allowed; }
  #${PANEL_ID} .e038-hint { color: var(--muted-2); font-size: 9px; }
  #${PANEL_ID} .e038-status { margin: 6px 0 0; color: var(--gold-bright); font-size: 10px; }
  #${PANEL_ID} .e038-metric {
    margin: 5px 0 0; color: var(--muted-2); font-size: 9px;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .e038-field { flex-direction: column; align-items: stretch; }
    #${PANEL_ID} .e038-select { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e038-title,
    #${PANEL_ID} .e038-status,
    #${PANEL_ID} .e038-select { border-color: CanvasText; color: CanvasText; background: Canvas; }
  }
`;

/* E038-04, E038-05 : état volatile conservé hors du DOM. La coque reconstruisant
   #app à chaque rendu (chronology.js:540-542), le compteur et le dernier saut
   doivent survivre au remplacement du panneau pour être réaffichés ensuite. */
const session = { installs: 0, jumps: 0, lastId: '', lastLabel: '' };

/* E038-08 : garde d'existence de toute ID préfixée chronology-v2-e038-. Un
   nœud déjà présent est réutilisé et déplacé dans le parent courant ; un nœud
   de la rendu précédent est détaché et n'est donc pas retrouvé. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E038-05 : écriture dédupliquée, sans région live ni attribut de statut ARIA : la
   commande n'ajoute aucune annonce concurrente aux régions existantes. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E038-02 : source unique des options = les cartes réellement présentes dans
   #atlas-chrono-events. Aucune date, aucun titre, aucun effectif codé en dur. */
function readCards() {
  const list = document.getElementById(EVENTS_ID);
  if (!list) return [];
  return Array.prototype.slice.call(list.querySelectorAll('.event-card[data-event-id]'));
}

function cardLabel(card) {
  const yearNode = card.querySelector('.event-year');
  const titleNode = card.querySelector('strong');
  const year = yearNode ? (yearNode.textContent || '').trim() : '';
  const title = titleNode ? (titleNode.textContent || '').trim() : '';
  if (year && title) return `${year} — ${title}`;
  return title || year || card.dataset.eventId;
}

function currentCardId(cards) {
  for (let index = 0; index < cards.length; index += 1) {
    if (cards[index].getAttribute('aria-current') === 'true') return cards[index].dataset.eventId;
  }
  return '';
}

/* E038-02, E038-04 : reconstruction des options à partir du DOM ; le repère
   courant est présélectionné et signalé en texte, jamais par la seule couleur. */
function rebuildOptions(select, cards, current, make) {
  const options = [make('option', '', 'Choisir un repère…')];
  options[0].value = '';
  cards.forEach((card) => {
    const id = card.dataset.eventId;
    const isCurrent = id === current;
    const option = make('option', '', `${cardLabel(card)}${isCurrent ? ' · repère courant' : ''}`);
    option.value = id;
    option.dataset.e038EventId = id;
    if (isCurrent) {
      option.dataset.e038Current = '1';
      option.selected = true;
    }
    options.push(option);
  });
  select.replaceChildren(...options);
  select.value = current || '';
}

/* E038-03 : le saut délègue au bouton de carte existant (chronology.js:407-410),
   qui pose focusIntent puis appelle selectEvent. Aucun import du store, aucune
   logique de sélection dupliquée, aucun déplacement de focus direct, aucune
   annulation d'événement. */
function onJump(event) {
  const select = event.currentTarget;
  const id = select.value;
  if (!id) return;
  const card = document.getElementById(`event-btn-${id}`);
  if (!card || typeof card.click !== 'function') {
    session.lastId = '';
    session.lastLabel = `Repère « ${id} » introuvable dans la frise.`;
    return;
  }
  session.jumps += 1;
  session.lastId = id;
  session.lastLabel = cardLabel(card);
  card.click();
}

/* E038-04, E038-05, E038-07, E038-10 : rafraîchissement de l'état visible et
   des attributs auditable. Tout est déduit du DOM courant et de session. */
function refresh(refs, reduced, make) {
  const { panel, select, hint, status, metric } = refs;
  if (!panel || !panel.isConnected) return;

  const cards = readCards();
  const current = currentCardId(cards);
  const disabled = cards.length === 0;

  if (select.disabled !== disabled) select.disabled = disabled;
  rebuildOptions(select, cards, current, make);

  write(hint, 'Clavier : Tab jusqu’au sélecteur, puis ↓ / ↑ pour choisir et Entrée pour sauter. Aucun raccourci global ajouté.');
  if (disabled) {
    write(status, 'Aucun repère affiché : la commande est désactivée. Modifiez le filtre pour retrouver des repères.');
  } else if (session.lastId) {
    write(status, `Dernier saut : ${session.lastLabel}. Le repère est désormais affiché dans la fiche.`);
  } else {
    write(status, 'Aucun saut pour l’instant. Choisissez un repère puis validez.');
  }
  write(metric, `Commande : ${cards.length} repère(s) proposé(s) · source : DOM · sauts directs : ${session.jumps} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  panel.dataset.e038Source = 'dom';
  panel.dataset.e038Options = String(cards.length);
  panel.dataset.e038Current = current;
  panel.dataset.e038Jumps = String(session.jumps);
  panel.dataset.e038Last = session.lastId;
  panel.dataset.e038Disabled = disabled ? '1' : '0';
  panel.dataset.e038Reduced = reduced ? '1' : '0';
  panel.dataset.e038Installs = String(session.installs);
}

/* E038-01, E038-06, E038-08 : greffon idempotent. Un seul écouteur 'change'
   par sélecteur (garde data-e038-bound), aucune région live, aucun timer. */
function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  session.installs += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e038-jump', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const list = document.getElementById(EVENTS_ID);
  if (list && list.parentElement === panel.parentElement && panel.nextElementSibling !== list) {
    panel.parentElement.insertBefore(panel, list);
  }

  const title = ensureNode(make, TITLE_ID, 'h2', 'e038-title', panel);
  write(title, 'Aller au repère');
  const lede = ensureNode(make, LEDE_ID, 'p', 'e038-lede', panel);
  write(lede, 'Saut direct : choisissez un repère pour ouvrir sa fiche sans parcourir la frise.');

  let field = panel.querySelector('.e038-field');
  if (!field) {
    field = make('div', 'e038-field');
    panel.appendChild(field);
  }
  const label = ensureNode(make, LABEL_ID, 'label', 'e038-label', field);
  write(label, 'Repère à atteindre');
  label.setAttribute('for', SELECT_ID);

  const select = ensureNode(make, SELECT_ID, 'select', 'e038-select', field);
  select.setAttribute('aria-describedby', HINT_ID);
  if (select.dataset.e038Bound !== '1') {
    select.addEventListener('change', onJump);
    select.dataset.e038Bound = '1';
  }

  const hint = ensureNode(make, HINT_ID, 'p', 'e038-hint', panel);
  const status = ensureNode(make, STATUS_ID, 'p', 'e038-status', panel);
  const metric = ensureNode(make, METRIC_ID, 'p', 'e038-metric', panel);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const refs = { panel, select, hint, status, metric };
  refresh(refs, reduced, make);
}

register('E038', (ctx) => {
  install(ctx);
});
