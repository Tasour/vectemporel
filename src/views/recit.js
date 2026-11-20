/* Récit guidé : un point à la fois, construit uniquement depuis les audits.
   Audit pédagogique ATLAS-RECIT : 10 chantiers — voir UNIFIED_AUDIT/views/atlas-recit.md.
   Refonte navigation c3-recherche-atlas : C3-01, C3-02, C3-03, C3-04, C3-08, C3-10.
   Aucune donnée historique ajoutée : seuls des libellés d'interface sont calculés. */
import { state, currentCountry, currentEvent, goView, set, stepEvent } from '../domain/store.js';
import { kicker, badge } from '../ui/components.js';
import { runLenses } from './lenses.js';


const CONFIDENCE = {
  'vérifié': { label: 'Vérifié', mark: '✓', gloss: 'mention « vérifié » reprise de l’audit' },
  'certain': { label: 'Certain', mark: '■', gloss: 'mention « certain » reprise de l’audit' },
  'probable': { label: 'Probable', mark: '◐', gloss: 'mention « probable » reprise de l’audit' },
  'disputed': { label: 'Contesté', mark: '≈', gloss: 'mention « disputed » de l’audit, traduite par « contesté »' },
};

const KIND = {
  'récit': 'phrase de la synthèse vérifiée',
  'figure': 'affirmation sur un acteur',
  'lieu': 'repère géographique documenté',
  'audit': 'affirmation issue de l’audit',
};

const ACTIVATION_KEYS = [' ', 'Enter'];
const LIST_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
let cssInjected = false;
let navCssInjected = false;
let liveRegion = null;
let keyGuardInstalled = false;

/* C3-01 / C3-02 : filtres locaux de la vue. lls survivent aux reconstructions
   completes du DOM operees par la coque (shell.js:327). */
const c3aLocal = { query: '', kind: null, conf: null };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function confidenceOf(value) {
  return CONFIDENCE[value] || { label: value || '—', mark: '•', gloss: 'mention telle quelle' };
}

function kindGloss(kind) {
  return KIND[kind] || kind || 'point';
}

function clip(text, max = 72) {
  const value = String(text || '').trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function readingSeconds(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(4, Math.min(12, Math.ceil(words / 3)));
}

/* Bloc CSS propre a la vue : ajoute en fin de <head>, il ne modifie aucun autre fichier. */
function injectCss() {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const style = el('style');
  style.id = 'atlas-recit-css';
  style.textContent = `
.recit-progress{height:3px;width:100%;margin:0 0 14px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden}
.recit-progress>span{display:block;height:100%;background:var(--gold)}
.recit-timing{margin:6px 0 0;color:var(--muted-2);font-size:9px}
.recit-conf{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border:1px solid var(--line-strong);border-radius:999px;color:var(--gold-bright);font-size:9px;white-space:nowrap}
.recit-play[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.12)}
.recit-actions button[disabled]{opacity:.35;cursor:not-allowed}
.recit-actions button:focus-visible,.recit-thread-item:focus-visible,.recit-trace summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-thread{margin:0 0 18px}
.recit-thread-title{margin:0 0 7px;color:var(--muted);font-size:9px;letter-spacing:.12em;text-transform:uppercase}
.recit-thread-list{display:flex;flex-wrap:wrap;gap:5px;margin:0;padding:0;list-style:none}
.recit-thread-item{max-width:100%;min-height:44px;padding:5px 8px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--muted);font-size:9px;text-align:left;cursor:pointer}
.recit-thread-item:hover{border-color:var(--gold);color:var(--ink)}
.recit-thread-item.is-current{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.1)}
.recit-thread-item[disabled]{opacity:.4;cursor:not-allowed}
.thread-kind{margin-right:4px;color:var(--muted-2);font-size:8px;text-transform:uppercase}
.recit-legend{margin-top:16px;padding-top:12px;border-top:1px solid var(--line);color:var(--muted-2);font-size:8px;line-height:1.6}
.recit-legend p{margin:3px 0}
.recit-trace{margin-top:12px;color:var(--muted-2);font-size:9px}
.recit-trace summary{min-height:44px;display:flex;align-items:center;cursor:pointer}
.recit-trace p{margin:6px 0 0;line-height:1.5}
.recit-media-credit{position:absolute;left:16px;bottom:30px;margin:0;color:rgba(255,255,255,.58);font-size:8px;text-shadow:0 1px 4px #000}
.sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media (max-width:1000px){
  .recit-layout{grid-template-columns:1fr;grid-template-rows:minmax(110px,26%) minmax(0,1fr)}
  .recit-body{max-width:80ch}
}
@media (max-width:620px){
  .recit-media{min-height:96px;max-height:20vh}
  .recit-body{padding:16px 16px 28px;max-width:none}
  .recit-title{font-size:clamp(24px,7vw,34px)}
  .recit-context{font-size:14px;line-height:1.65}
  .recit-actions{gap:8px}
  .recit-actions button{min-height:44px}
  .recit-thread-item{min-height:44px}
  .recit-media-credit{display:none}
  .media-caption{right:10px;bottom:8px;left:10px;font-size:8px}
}
@media (prefers-reduced-motion:reduce){.recit-progress>span{transition:none}}
`;
  document.head.appendChild(style);
}

/* C3-10 : bloc CSS isole pour la navigation fine, injecte une seule fois. */
function injectNavCss() {
  if (navCssInjected || typeof document === 'undefined') return;
  navCssInjected = true;
  const style = el('style');
  style.id = 'nav-c3a';
  style.textContent = `
.c3a-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0 6px}
.c3a-search{flex:1 1 200px;min-width:160px;min-height:44px;padding:6px 9px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink);font:inherit;font-size:10px}
.c3a-search::placeholder{color:var(--muted-2)}
.c3a-group{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.c3a-group-label{color:var(--muted-2);font-size:9px;margin-right:2px}
.c3a-filter{min-height:44px;padding:3px 8px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--muted);font-size:9px;cursor:pointer}
.c3a-filter[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.1)}
.c3a-filter:focus-visible,.c3a-search:focus-visible,.c3a-reset:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.c3a-status{min-height:12px;margin:0 0 8px;color:var(--muted);font-size:9px;line-height:1.4;font-variant-numeric:tabular-nums}
.c3a-empty{padding:12px;border:1px dashed var(--line);border-radius:8px;color:var(--muted);font-size:10px;line-height:1.5}
.c3a-empty p{margin:0}
.c3a-reset{min-height:44px;margin-top:6px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font-size:9px;cursor:pointer}
.c3a-thread-item[aria-current="step"]{border-color:var(--gold)}
@media (max-width:620px){
  .c3a-tools{flex-direction:column;align-items:stretch}
  .c3a-search{width:100%}
  .c3a-filter{min-height:44px}
}`;
  document.head.appendChild(style);
}

/* Region d'annonce persistante : survit au innerHTML de la coque et rend
   le changement de point audible pour les lecteurs d'ecran. */
function ensureLive() {
  if (typeof document === 'undefined') return null;
  if (!liveRegion || !liveRegion.isConnected) {
    liveRegion = document.getElementById('atlas-recit-live');
    if (!liveRegion) {
      liveRegion = el('p', 'sr-only');
      liveRegion.id = 'atlas-recit-live';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      document.body.appendChild(liveRegion);
    }
  }
  return liveRegion;
}

function announce(text) {
  const node = ensureLive();
  if (node) node.textContent = text;
}

/* Le routeur clavier global (atlas-coque-navigation) intercepte Entree et Espace
   en phase de capture sur document. Ce garde-fou, installe une seule fois sur
   window en capture, evite l'activation double quand un bouton du recit a le
   focus. C3-04 : il traite aussi la navigation dans le fil avant le routeur. */
function installKeyGuard() {
  if (keyGuardInstalled || typeof window === 'undefined') return;
  keyGuardInstalled = true;
  window.addEventListener('keydown', (event) => {
    if (state.view !== 'recit' || !(event.target instanceof Element)) return;
    const target = event.target;
    if (ACTIVATION_KEYS.includes(event.key)
      && target.closest('.recit-actions button, .recit-thread-item, .recit-trace summary, .c3a-filter, .c3a-reset')) {
      event.stopPropagation();
      return;
    }
    if (LIST_KEYS.includes(event.key) && target.closest('#c3a-thread')) {
      const buttons = Array.from(document.querySelectorAll('#c3a-thread .c3a-thread-item'));
      if (!buttons.length) return;
      event.preventDefault();
      event.stopPropagation();
      const pos = buttons.indexOf(document.activeElement);
      let next = pos;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else if (event.key === 'ArrowDown') next = pos < 0 ? 0 : Math.min(pos + 1, buttons.length - 1);
      else next = pos < 0 ? buttons.length - 1 : Math.max(pos - 1, 0);
      buttons.forEach((button) => { button.tabIndex = -1; });
      buttons[next].tabIndex = 0;
      buttons[next].focus();
    }
  }, true);
}

function makeButton(className, label, handler, options = {}) {
  const button = el('button', className, label);
  button.type = 'button';
  if (options.fk) button.dataset.fk = options.fk;
  if (options.pressed !== undefined) button.setAttribute('aria-pressed', String(options.pressed));
  if (options.keys) button.setAttribute('aria-keyshortcuts', options.keys);
  if (options.disabled) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
  }
  button.addEventListener('click', handler);
  return button;
}

function focusTitle() {
  const title = stageTitle();
  if (title) title.focus({ preventScroll: true });
}

function stageTitle() {
  return document.querySelector('.recit-body .recit-title');
}

/* C3-08 : l'activation depuis le fil garde le focus sur l'item d'origine ;
   la coque le restaure via data-fk apres la reconstruction du DOM. */
function goPoint(index, options = {}) {
  set({ pointIndex: index }, 'point');
  if (!options.keepFocus) focusTitle();
}

export function renderRecit(stage) {
  injectCss();
  injectNavCss();
  installKeyGuard();
  const country = currentCountry();
  const event = currentEvent();
  if (!country || !event) return;

  const points = event.points || [];
  const total = points.length;
  const index = Math.min(Math.max(state.pointIndex, 0), Math.max(0, total - 1));
  const point = points[index] || null;
  const conf = confidenceOf(point?.confidence);
  const kind = point?.kind || 'point';
  const isFirst = index <= 0;
  const isLast = total === 0 || index >= total - 1;
  const isLastEvent = state.eventIndex >= country.events.length - 1;

  /* C3-01 / C3-02 : filtres locaux, cumules (ET), calcules depuis les champs reels. */
  const query = c3aLocal.query.trim().toLowerCase();
  const matches = points.map((item, i) => ({ item, i })).filter(({ item }) => {
    if (c3aLocal.kind && (item.kind || 'point') !== c3aLocal.kind) return false;
    if (c3aLocal.conf && item.confidence !== c3aLocal.conf) return false;
    if (!query) return true;
    return [item.text, item.kind, item.confidence, formatYear(event.year)]
      .filter(Boolean).join(' ').toLowerCase().includes(query);
  });
  const focusIndex = matches.some((match) => match.i === index)
    ? index : (matches.length ? matches[0].i : -1);

  const layout = el('div', 'recit-layout');
  const media = el('div', 'recit-media');
  if (event.image) {
    const img = el('img');
    img.src = event.image.src;
    img.alt = event.image.alt || event.title;
    media.appendChild(img);
    if (event.image.caption) media.appendChild(el('p', 'media-caption', event.image.caption));
    const credit = [event.image.credit && `Crédit : ${event.image.credit}`, event.image.license && `Licence : ${event.image.license}`].filter(Boolean).join(' · ');
    if (credit) media.appendChild(el('p', 'recit-media-credit', credit));
  } else {
    media.appendChild(el('div', 'media-empty', 'Aucune image vérifiée pour ce repère.'));
  }

  const body = el('div', 'recit-body');

  /* Repere de progression et etape courante. */
  const progress = el('div', 'recit-progress');
  const fill = el('span');
  fill.style.width = `${total ? Math.round(((index + 1) / total) * 100) : 0}%`;
  progress.appendChild(fill);
  body.appendChild(progress);
  body.appendChild(kicker(`Étape ${index + 1} / ${total} · ${kind}`));

  /* Titre = point unique, avec ancrage pour le fil et la region d'annonce. */
  const title = el('h1', 'recit-title', point?.text || event.title);
  title.id = 'recit-point-title';
  title.tabIndex = -1;
  title.dataset.fk = 'c3a-title';
  body.appendChild(title);

  const meta = el('p', 'recit-meta');
  meta.append(document.createTextNode(`${event.title} · ${formatYear(event.year)} · `));
  const confChip = badge(`${conf.mark} ${conf.label}`);
  confChip.classList.add('recit-conf');
  confChip.title = conf.gloss;
  meta.appendChild(confChip);
  body.appendChild(meta);
  body.appendChild(el('p', 'recit-timing', `Lecture estimée : ≈ ${readingSeconds(point?.text)} s · ${conf.gloss}`));

  /* C3-01 / C3-02 : barre d'outils a emplacement fixe, identique a chaque rendu. */
  const tools = el('div', 'c3a-tools');
  tools.id = 'c3a-tools';
  const search = document.createElement('input');
  search.type = 'search';
  search.id = 'c3a-search';
  search.className = 'c3a-search';
  search.placeholder = 'Rechercher un point du repère…';
  search.setAttribute('aria-label', `Rechercher parmi les ${total} points de ce repère`);
  search.setAttribute('aria-controls', 'c3a-thread');
  search.dataset.fk = 'c3a-search';
  search.value = c3aLocal.query;
  search.addEventListener('input', () => {
    c3aLocal.query = search.value;
    set({}, 'c3a-filter');
  });
  tools.appendChild(search);

  const addGroup = (legend, prefix, allLabel, entries, active, key) => {
    const group = el('div', 'c3a-group');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', legend);
    group.appendChild(el('span', 'c3a-group-label', legend));
    const choose = (value) => {
      c3aLocal[key] = value;
      set({}, 'c3a-filter');
    };
    const all = makeButton('c3a-filter', allLabel, () => choose(null), {
      fk: `c3a-${prefix}-all`, pressed: active === null,
    });
    all.setAttribute('aria-controls', 'c3a-thread');
    group.appendChild(all);
    entries.forEach(([value, label, hint]) => {
      const button = makeButton('c3a-filter', label, () => choose(value), {
        fk: `c3a-${prefix}-${value}`, pressed: active === value,
      });
      button.setAttribute('aria-controls', 'c3a-thread');
      if (hint) button.title = hint;
      group.appendChild(button);
    });
    tools.appendChild(group);
  };
  addGroup('Type', 'kind', 'Tous les types',
    Object.entries(KIND).map(([value, gloss]) => [value, value, gloss]), c3aLocal.kind, 'kind');
  addGroup('Certitude', 'conf', 'Toutes',
    Object.entries(CONFIDENCE).map(([value, entry]) => [value, entry.label, entry.gloss]), c3aLocal.conf, 'conf');
  body.appendChild(tools);

  /* C3-03 : statut compte et annonce, distinct de #atlas-recit-live. */
  const status = el('div', 'c3a-status');
  status.id = 'c3a-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const parts = [`${matches.length} point(s) affiché(s) sur ${total}`];
  if (query) parts.push(`recherche : « ${c3aLocal.query.trim()} »`);
  if (c3aLocal.kind) parts.push(`type : ${c3aLocal.kind}`);
  if (c3aLocal.conf) parts.push(`certitude : ${confidenceOf(c3aLocal.conf).label}`);
  status.textContent = `${parts.join(' · ')} · critères cumulés.`;
  body.appendChild(status);

  /* Le resume du repere n'est affiche qu'au premier point : pas de relecture redondante. */
  if (isFirst) {
    const context = el('p', 'recit-context', event.summary);
    context.id = 'recit-context';
    body.appendChild(context);
    title.setAttribute('aria-describedby', 'recit-context');
  }

  /* C3-01 / C3-04 : le fil est desormais permanent et filtrable. */
  const thread = el('nav', 'recit-thread');
  thread.setAttribute('aria-label', 'Fil du repère');
  thread.appendChild(el('p', 'recit-thread-title', `Fil du repère · ${event.title}`));
  const list = el('ol', 'recit-thread-list c3a-thread');
  list.id = 'c3a-thread';
  list.setAttribute('aria-label', `Points du repère · ${event.title}`);
  matches.forEach(({ item, i }) => {
    const li = el('li');
    const isCurrent = i === index;
    const itemButton = makeButton(
      `recit-thread-item c3a-thread-item${isCurrent ? ' is-current' : ''}`,
      `${i + 1}. ${clip(item.text)}`,
      () => goPoint(i, { keepFocus: true }),
      { fk: `c3a-point-${i}` }
    );
    itemButton.dataset.kind = item.kind || 'point';
    itemButton.dataset.confidence = item.confidence || '';
    itemButton.tabIndex = i === focusIndex ? 0 : -1;
    const tag = el('span', 'thread-kind', item.kind || 'point');
    itemButton.prepend(tag);
    itemButton.setAttribute('aria-label', `Point ${i + 1} sur ${total}, ${item.kind || 'point'} : ${item.text}`);
    if (isCurrent) itemButton.setAttribute('aria-current', 'step');
    li.appendChild(itemButton);
    list.appendChild(li);
  });
  thread.appendChild(list);

  if (!matches.length) {
    const empty = el('div', 'c3a-empty');
    empty.id = 'c3a-empty';
    empty.setAttribute('role', 'status');
    empty.appendChild(el('p', '', 'Aucun point de ce repère ne correspond à ces critères.'));
    empty.appendChild(makeButton('c3a-reset', 'Réinitialiser les filtres', () => {
      c3aLocal.query = '';
      c3aLocal.kind = null;
      c3aLocal.conf = null;
      set({}, 'c3a-filter');
    }, { fk: 'c3a-reset' }));
    thread.appendChild(empty);
  }
  body.appendChild(thread);

  /* Tracabilite repliee : les identifiants restent dans le DOM, hors de la vue. */
  if (point?.sources?.length) {
    const details = el('details', 'recit-trace');
    details.appendChild(el('summary', '', `Traçabilité · ${point.sources.length} référence(s) locale(s)`));
    details.appendChild(el('p', '', `Identifiants : ${point.sources.join(', ')}. Titres affichés dans le registre local, sans lien externe.`));
    body.appendChild(details);
  } else {
    body.appendChild(el('p', 'recit-sources', 'Aucun identifiant de source attaché à ce point dans le jeu de données.'));
  }

  /* Commandes : toutes bornees et coherentes avec l'etat partage. */
  const actions = el('div', 'recit-actions');
  const back = makeButton('', '← Point précédent', () => goPoint(index - 1), {
    disabled: isFirst, keys: 'ArrowLeft', fk: 'c3a-prev',
  });
  const next = makeButton('', 'Point suivant →', () => goPoint(index + 1), {
    disabled: isLast, keys: 'ArrowRight', fk: 'c3a-next',
  });
  const play = makeButton('recit-play', 'Lecture automatique', () => {
    set({ playing: !state.playing }, 'play');
  }, { pressed: state.playing, keys: 'Space', fk: 'c3a-play' });
  const playIcon = el('span', '', state.playing ? '❚❚' : '▶');
  playIcon.setAttribute('aria-hidden', 'true');
  play.prepend(playIcon, document.createTextNode(' '));
  play.title = state.playing ? 'Mettre la lecture en pause' : 'Lancer la lecture automatique';
  const restart = makeButton('', '↺ Recommencer', () => goPoint(0), {
    disabled: isFirst, fk: 'c3a-restart',
  });
  const nextEvent = makeButton('', 'Repère suivant ↗', () => {
    stepEvent(1);
    focusTitle();
  }, { disabled: isLastEvent, fk: 'c3a-next-event' });
  const chrono = makeButton('', 'Chronologie', () => goView('chronology'), { keys: 'Digit4', fk: 'c3a-chrono' });
  actions.append(back, next, play, restart, nextEvent, chrono);
  body.appendChild(actions);

  /* Legendes : degrees de certitude et types de points, encodees en texte + symbole. */
  const legend = el('div', 'recit-legend');
  legend.appendChild(el('p', '', 'Degrés de certitude : ✓ Vérifié · ■ Certain · ◐ Probable · ≈ Contesté (terme source « disputed »). Mentions reprises des audits, sans réécriture.'));
  legend.appendChild(el('p', '', 'Types de points : récit = phrase de la synthèse vérifiée · figure = affirmation sur un acteur · lieu = repère géographique documenté · audit = affirmation issue de l’audit.'));
  legend.appendChild(el('p', '', 'Lecture guidée : Espace met en pause ou reprend ; ← → changent de point ; Entrée ouvre le détail.'));
  legend.appendChild(el('p', '', 'Fil : recherche et filtres ci-dessus ; ↑ ↓ parcourent les points affichés, Début/Fin vont aux extrémités, Entrée sélectionne.'));
  body.appendChild(legend);

  layout.append(media, body);
  stage.appendChild(layout);
  runLenses('recit', { stage, layout });

  /* C3-05 (annonce du point) : conserve le texte reel du point courant. */
  announce(`Point ${index + 1} sur ${total}, ${kind}, ${conf.label}. ${point?.text || event.title}`);
}
