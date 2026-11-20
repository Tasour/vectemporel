import { register } from './registry.js';

/* Lentille E054 — vue CHRONOLOGIE : navigation entre événements,
   précédent/suivant et parcours séquentiel.

   La lentille n'importe que `register` : elle n'a accès ni au store ni au
   moteur. Tout est dérivé du DOM réel produit par chronology.js : la liste
   `#atlas-chrono-events` (375-412), les cartes `button.event-card` (385-390),
   la bande de statut (247-256), le fil de situation (263-268) et les boutons
   précédent/suivant de l'aside (506-526). Aucune donnée n'est inventée.

   Une seule feuille de style (`ctx.css('chronology-e054', …)`), des identifiants
   tous préfixés `e054` et gardés contre une seconde injection, une seule région
   live hors de #app (comme chronology.js:119-133), zéro sortie console, zéro
   réseau, zéro aléa, zéro boucle d'animation, zéro timer. Français partout. */

const CSS_ID = 'chronology-e054';
const BAR_ID = 'e054-seqbar';
const RAIL_ID = 'e054-seq-rail';
const LIVE_ID = 'e054-seq-live';

let liveNode = null;
let lastAnnouncedId = null;
let lastCommand = 'initial';

function node(id) {
  return document.getElementById(id);
}

function textOf(id) {
  const target = node(id);
  return target ? (target.textContent || '') : '';
}

/* E054-07 : région live unique, créée dans <body> pour survivre au innerHTML
   de la coque (chronology.js:119-133 applique le même motif pour C2). */
function ensureLive(make) {
  if (liveNode && liveNode.isConnected) return liveNode;
  liveNode = node(LIVE_ID);
  if (!liveNode) {
    liveNode = make('p', 'e054-sr-only');
    liveNode.id = LIVE_ID;
    liveNode.setAttribute('role', 'status');
    liveNode.setAttribute('aria-live', 'polite');
    liveNode.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveNode);
  }
  return liveNode;
}

function announce(message, make) {
  const live = ensureLive(make);
  if (live) live.textContent = message;
}

/* E054-03 : la position est lue dans les textes déjà affichés par la vue.
   Les deux sources sont celles de chronology.js:254-255 et 266. */
function readPosition(currentIndex, visibleCount) {
  const raw = [
    textOf('atlas-chrono-status'),
    textOf('nav-c2a-progress'),
    textOf('atlas-chrono-aside'),
  ].join(' ');
  const global = raw.match(/rang global\s+(\d+)\s*\/\s*(\d+)/i)
    || raw.match(/Repère\s+(\d+)\s*\/\s*(\d+)/i);
  const era = raw.match(/Repère\s+(\d+)\s*\/\s*(\d+)\s+dans l'ère/i);
  let rank = global ? Number(global[1]) : (currentIndex >= 0 ? currentIndex + 1 : 0);
  let total = global ? Number(global[2]) : visibleCount;
  const eraRank = era ? Number(era[1]) : 0;
  const eraTotal = era ? Number(era[2]) : 0;
  if (!Number.isFinite(rank) || rank < 0) rank = 0;
  if (!Number.isFinite(total) || total < 0) total = 0;
  return { rank, total, eraRank, eraTotal };
}

function visibleCards() {
  const list = node('atlas-chrono-events');
  return list ? Array.from(list.querySelectorAll('button.event-card')) : [];
}

register('E054', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;

  /* Une seule injection de style, idempotente (registry.js:13-19). */
  css(CSS_ID, `
.e054-seqbar{margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.e054-seqbar-title{margin:0 0 6px;color:var(--gold);font-size:8px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.e054-cmd-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.e054-cmd{min-height:36px;padding:6px 11px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer}
.e054-cmd:hover:not(:disabled),.e054-rail-step:hover{border-color:var(--gold)}
.e054-cmd:focus-visible,.e054-rail-step:focus-visible,.e054-seqbar:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e054-cmd:disabled{min-height:36px;opacity:.55;cursor:not-allowed;color:var(--muted)}
.e054-progress-row{display:flex;gap:8px;align-items:center;margin-top:7px}
.e054-progress{flex:1;min-width:80px;height:6px;accent-color:var(--gold)}
.e054-count{color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums;white-space:nowrap}
.e054-rail{margin-top:8px}
.e054-rail-list{display:flex;gap:5px;margin:0;padding:0;list-style:none;overflow-x:auto}
.e054-rail-item{flex:0 0 auto}
.e054-rail-step{min-height:32px;padding:4px 9px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--muted);font-size:9px;cursor:pointer;white-space:nowrap}
.e054-rail-step[aria-current="step"]{border-color:var(--gold);color:var(--gold-bright);font-weight:600}
.e054-explain{margin-top:7px;color:var(--muted-2);font-size:9px;line-height:1.5}
.e054-explain summary{min-height:24px;cursor:pointer;color:var(--muted)}
.e054-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media(max-width:620px){.e054-cmd{flex:1 1 44%}.e054-count{white-space:normal}}
.e054-no-motion,.e054-no-motion *{transition:none!important;scroll-behavior:auto!important}
@media(prefers-reduced-motion:reduce){.e054-seqbar *{transition:none!important;scroll-behavior:auto!important}}`);

  const main = node('atlas-chrono-main');
  const list = node('atlas-chrono-events');
  if (!main || !list) return;

  const cards = visibleCards();
  const items = Array.from(list.querySelectorAll('li[data-event-id]'));
  const currentCard = list.querySelector('button.event-card[aria-current="true"]') || null;
  const currentIndex = cards.indexOf(currentCard);
  const currentId = currentCard ? (currentCard.dataset.eventId || '') : '';
  const position = readPosition(currentIndex, cards.length);

  /* Boutons réels de l'aside (chronology.js:506-526) : ils franchissent les
     ères, contrairement à la liste qui est ère par ère (chronology.js:235). */
  const asideButtons = Array.from(document.querySelectorAll('.aside-actions button'));
  const asidePrev = asideButtons.find((button) => /précédent/i.test(button.textContent || '')) || null;
  const asideNext = asideButtons.find((button) => /suivant/i.test(button.textContent || '')) || null;

  /* E054-02 : enrichissement sans duplication ni changement de comportement. */
  if (asidePrev) {
    if (!asidePrev.id) asidePrev.id = 'e054-aside-prev';
    asidePrev.dataset.e054Nav = 'prev';
    asidePrev.setAttribute('aria-controls', 'atlas-chrono-aside');
    asidePrev.setAttribute('aria-label', `Repère précédent (rang ${Math.max(1, position.rank - 1)} sur ${position.total || '?'})`);
  }
  if (asideNext) {
    if (!asideNext.id) asideNext.id = 'e054-aside-next';
    asideNext.dataset.e054Nav = 'next';
    asideNext.setAttribute('aria-controls', 'atlas-chrono-aside');
    asideNext.setAttribute('aria-label', `Repère suivant (rang ${Math.min(position.total || 1, position.rank + 1)} sur ${position.total || '?'})`);
  }

  /* E054-07 : annonce seulement quand le repère courant change réellement. */
  if (currentId && currentId !== lastAnnouncedId) {
    lastAnnouncedId = currentId;
    const title = (node('atlas-chrono-event-title')?.textContent
      || currentCard?.querySelector('strong')?.textContent || '').trim();
    const year = (currentCard?.querySelector('.event-year')?.textContent || '').trim();
    announce(`Repère ${position.rank}/${position.total}${title ? ' : ' + title : ''}${year ? ' (' + year + ')' : ''}.`, el);
  }

  /* E054-04 : saut direct par les cartes déjà présentes dans la liste.
     Le clic passe par le gestionnaire réel (chronology.js:406-409), qui pose
     `focusIntent` : le focus suit le repère sans que la lentille le dérobe. */
  function goToIndex(index) {
    const now = visibleCards();
    if (!now.length) return;
    const safe = Math.max(0, Math.min(now.length - 1, index));
    lastCommand = 'saut-direct';
    now[safe].click();
  }

  /* E054-01 + E054-02 : pas de clic en cascade pour « suivant » — on
     délègue au bouton global de l'aside quand il existe, sinon à la liste. */
  function step(delta) {
    const button = delta < 0 ? asidePrev : asideNext;
    if (button && !button.disabled) {
      lastCommand = delta < 0 ? 'précédent-global' : 'suivant-global';
      button.click();
      return;
    }
    const now = visibleCards();
    const index = now.findIndex((card) => card.getAttribute('aria-current') === 'true');
    lastCommand = delta < 0 ? 'précédent-local' : 'suivant-local';
    goToIndex((index < 0 ? 0 : index) + delta);
  }

  function command(id, label, shortcut, onClick) {
    let button = node(id);
    if (!button) {
      button = el('button', 'e054-cmd', label);
      button.type = 'button';
      button.id = id;
      button.setAttribute('aria-keyshortcuts', shortcut);
      button.setAttribute('aria-controls', 'atlas-chrono-aside');
      button.addEventListener('click', onClick);
    }
    return button;
  }

  /* E054-01 : la barre est reconstruite avec le stage ; la garde d'id empêche
     une seconde injection si un autre passage de greffons retravaille le DOM. */
  let bar = node(BAR_ID);
  if (!bar) {
    bar = el('div', 'e054-seqbar');
    bar.id = BAR_ID;
    bar.tabIndex = 0;
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Parcours séquentiel des repères');

    bar.appendChild(el('p', 'e054-seqbar-title', 'Parcours séquentiel'));

    const row = el('div', 'e054-cmd-row');
    row.append(
      command('e054-seq-first', '« Premier', 'Home', () => goToIndex(0)),
      command('e054-seq-prev', '← Précédent', 'PageUp', () => step(-1)),
      command('e054-seq-next', 'Suivant →', 'PageDown', () => step(1)),
      command('e054-seq-last', 'Dernier »', 'End', () => goToIndex(visibleCards().length - 1))
    );
    bar.appendChild(row);

    const progressRow = el('div', 'e054-progress-row');
    const progress = el('progress', 'e054-progress');
    progress.id = 'e054-seq-progress';
    progress.setAttribute('aria-label', 'Progression dans le parcours des repères');
    const count = el('span', 'e054-count');
    count.id = 'e054-seq-count';
    progressRow.append(progress, count);
    bar.appendChild(progressRow);

    /* E054-08 : fil de jalons dérivé des seules cartes visibles. */
    const rail = el('nav', 'e054-rail');
    rail.id = RAIL_ID;
    rail.setAttribute('aria-label', 'Jalons du parcours séquentiel');
    const railList = el('ol', 'e054-rail-list');
    items.forEach((item, index) => {
      const card = item.querySelector('button.event-card');
      if (!card) return;
      const stepId = `e054-step-${index}`;
      if (node(stepId)) return;
      const label = (card.querySelector('strong')?.textContent || '').trim() || 'Repère';
      const year = (card.querySelector('.event-year')?.textContent || '').trim();
      const stepButton = el('button', 'e054-rail-step');
      stepButton.type = 'button';
      stepButton.id = stepId;
      stepButton.dataset.eventId = item.dataset.eventId || '';
      stepButton.textContent = `${index + 1}. ${label}${year ? ' — ' + year : ''}`;
      stepButton.setAttribute('aria-controls', 'atlas-chrono-aside');
      stepButton.addEventListener('click', () => goToIndex(index));
      const stepItem = el('li', 'e054-rail-item');
      stepItem.appendChild(stepButton);
      railList.appendChild(stepItem);
    });
    rail.appendChild(railList);
    bar.appendChild(rail);

    /* E054-10 : traçabilité lisible, sans instrumentation du store. */
    const explain = el('details', 'e054-explain');
    explain.id = 'e054-seq-explain';
    explain.appendChild(el('summary', '', 'Comment fonctionne ce parcours ?'));
    explain.appendChild(el('p', '',
      '« Précédent » et « suivant » actionnent les boutons réels de la fiche du repère ; « premier » et « dernier » cliquent les cartes de la liste affichée. La position est lue dans la bande de statut et le fil de situation : aucun chiffre n’est inventé. Aucun réseau, aucun aléa, aucune boucle d’animation.'));
    bar.appendChild(explain);

    /* E054-06 : clavier local — aucun écouteur documentaire, pour ne pas
       doubler les raccourcis → / ↑ / ↓ annoncés par chronology.js:231. */
    bar.addEventListener('keydown', (event) => {
      let action = null;
      if (event.key === 'Home') action = () => goToIndex(0);
      else if (event.key === 'End') action = () => goToIndex(visibleCards().length - 1);
      else if (event.key === 'PageUp') action = () => step(-1);
      else if (event.key === 'PageDown') action = () => step(1);
      if (!action) return;
      event.preventDefault();
      action();
    });

    list.parentNode.insertBefore(bar, list);
  }

  /* E054-05 : état courant, bornes et progression recalculés à chaque rendu. */
  const now = visibleCards();
  const index = now.findIndex((card) => card.getAttribute('aria-current') === 'true');
  const setDisabled = (id, disabled) => {
    const target = node(id);
    if (target) target.disabled = Boolean(disabled);
  };
  setDisabled('e054-seq-first', index <= 0);
  setDisabled('e054-seq-prev', asidePrev ? asidePrev.disabled : index <= 0);
  setDisabled('e054-seq-next', asideNext ? asideNext.disabled : index >= now.length - 1);
  setDisabled('e054-seq-last', index >= now.length - 1);

  const progress = node('e054-seq-progress');
  if (progress) {
    progress.max = String(position.total || 0);
    progress.value = String(Math.min(position.rank, position.total || 0));
  }
  const count = node('e054-seq-count');
  if (count) {
    count.textContent = position.total
      ? `Repère ${position.rank} / ${position.total}${position.eraRank ? ` · ${position.eraRank} / ${position.eraTotal} dans l’ère` : ''} · ${now.length} visible(s)`
      : 'Aucun repère documenté';
  }
  const rail = node(RAIL_ID);
  if (rail) {
    rail.querySelectorAll('button.e054-rail-step').forEach((button) => {
      if (button.dataset.eventId === currentId) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  bar.dataset.e054Rank = String(position.rank);
  bar.dataset.e054Total = String(position.total);
  bar.dataset.e054Visible = String(now.length);
  bar.dataset.e054Current = currentId;
  bar.dataset.e054Command = lastCommand;

  /* E054-09 : aucun vol de focus — applyFocusIntent() (chronology.js:199-205,
     appelé en 540) reste seul maître du focus après un clic. On se contente
     de respecter le mouvement réduit et d'exposer l'intention pour l'audit. */
  if (reducedMotion()) bar.classList.add('e054-no-motion');
  else bar.classList.remove('e054-no-motion');
});
