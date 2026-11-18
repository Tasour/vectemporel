import { register } from './registry.js';

/* Lentille E086 — Mobile et reflow responsive (10 chantiers E086-01 … E086-10).
 *
 * Les dix chantiers sont décrits dans UNIFIED_AUDIT/RECIT/views/E086.md.
 * Tout est local : aucun appel réseau, aucune graine aléatoire, aucune console,
 * aucune modification de styles.css, de recit.js ou d'un autre module. La
 * barre est insérée au début de .recit-body ; l'état survit aux reconstructions
 * du DOM opérées par la coque (shell.js) grâce à un état module. Sans cette
 * lentille, le récit reste lisible : on n'ajoute jamais de contenu en retirant.
 */

/* Identifiants DOM — tous préfixés « e086- » et uniques. */
const BAR_ID = 'e086-bar';
const BAR_TITLE_ID = 'e086-bar-title';
const SIM_GROUP_ID = 'e086-sim-group';
const SIM_AUTO_ID = 'e086-sim-auto';
const SIM_320_ID = 'e086-sim-320';
const SIM_375_ID = 'e086-sim-375';
const SIM_768_ID = 'e086-sim-768';
const SIM_1024_ID = 'e086-sim-1024';
const REGIME_ID = 'e086-regime';
const MEDIA_ID = 'e086-media';
const THREAD_ID = 'e086-thread';
const SWIPE_ID = 'e086-swipe';
const STICKY_ID = 'e086-sticky';
const DETAIL_ID = 'e086-detail';
const SUMMARY_ID = 'e086-summary';
const RESET_ID = 'e086-reset';
const HINT_ID = 'e086-swipe-hint';

/* Largeurs de simulation : valeurs fixes, déterministes, sans aléa. */
const SIM = [
  { value: 'auto', id: SIM_AUTO_ID, label: 'Réel', width: 0 },
  { value: '320', id: SIM_320_ID, label: '320 px', width: 320 },
  { value: '375', id: SIM_375_ID, label: '375 px', width: 375 },
  { value: '768', id: SIM_768_ID, label: '768 px', width: 768 },
  { value: '1024', id: SIM_1024_ID, label: '1024 px', width: 1024 },
];

const REGIME_LABEL = {
  compact: 'compact (≤ 380 px)',
  mobile: 'mobile (381–620 px)',
  tablette: 'tablette (621–1000 px)',
  bureau: 'bureau (> 1000 px)',
  inconnu: 'largeur inconnue',
};

/* Une seule feuille de style, injectée via ctx.css (garde d'id). Les réglages
   sont pilotés par des attributs sur <html> : JS et CSS partagent la même
   source de vérité, sans style en ligne sur le contenu. */
const CSS = `
:root{
  --e086-body-max:100%;
}
/* E086-01 : simulation de largeur — on reproduit les mêmes règles de reflow
   que les media queries réelles, mais pilotées par data-e086-sim. */
html[data-e086-sim="320"] .recit-layout{max-width:320px;margin-inline:auto;}
html[data-e086-sim="375"] .recit-layout{max-width:375px;margin-inline:auto;}
html[data-e086-sim="768"] .recit-layout{max-width:768px;margin-inline:auto;}
html[data-e086-sim="1024"] .recit-layout{max-width:1024px;margin-inline:auto;}
html[data-e086-sim="320"] .recit-layout,
html[data-e086-sim="375"] .recit-layout,
html[data-e086-sim="768"] .recit-layout{
  grid-template-columns:minmax(0,1fr);
  grid-template-rows:minmax(96px,22%) minmax(0,1fr);
}
html[data-e086-sim="320"] .recit-layout .recit-body,
html[data-e086-sim="375"] .recit-layout .recit-body,
html[data-e086-sim="768"] .recit-layout .recit-body{max-width:100%;}

/* E086-02 : colonne fluide, mesure bornée, aucun débordement horizontal. */
.recit-layout .recit-e086-reflow{
  min-width:0;max-width:var(--e086-body-max,100%);
  overflow-wrap:break-word;
}
.recit-layout .recit-e086-reflow .recit-title,
.recit-layout .recit-e086-reflow .recit-context{
  overflow-wrap:break-word;
  text-wrap:pretty;
  hyphens:auto;
  -webkit-hyphens:auto;
}

/* E086-03 : cibles tactiles élargies sous 620 px (objectif 44 px). */
@media (max-width:620px){
  .recit-layout .recit-actions button,
  .recit-layout .recit-thread-item,
  .recit-layout .recit-trace summary,
  .recit-layout .c3a-filter,
  .recit-layout .c3a-search{min-height:44px;}
  .recit-layout .recit-actions button,
  .recit-layout .recit-thread-item,
  .recit-layout .recit-trace summary,
  .recit-layout .c3a-filter{
    touch-action:manipulation;
    -webkit-tap-highlight-color:transparent;
  }
  .recit-layout .recit-actions{gap:8px;}
}

/* E086-04 : visuel — hauteur adaptative, ratio, mode compact réversible. */
@media (max-width:620px){
  .recit-layout .recit-media{
    min-height:96px;max-height:26vh;aspect-ratio:16/7;
  }
  .recit-layout .recit-media img{height:100%;object-fit:cover;}
}
html[data-e086-media="compact"] .recit-layout .recit-media{
  min-height:72px !important;max-height:18vh !important;
}
html[data-e086-media="compact"] .recit-layout .recit-media img{object-position:center 38%;}

/* E086-05 : barre d'actions prioritaire, collante et sûre (encoches). */
html[data-e086-sticky="1"] .recit-layout .recit-actions{
  position:sticky;bottom:0;z-index:3;
  margin:12px -12px 0;
  padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));
  border-top:1px solid var(--line);
  background:rgba(8,11,16,.96);
  backdrop-filter:blur(6px);
}
html[data-e086-sticky="1"] .recit-layout .recit-actions button{flex:1 1 44%;}

/* E086-06 : fil en bandeau horizontal à défilement et aimantation. */
html[data-e086-thread="bandeau"] .recit-layout .recit-e086-thread-strip{
  display:flex;flex-wrap:nowrap;gap:6px;
  overflow-x:auto;overflow-y:hidden;
  scroll-snap-type:x proximity;
  overscroll-behavior-inline:contain;
  -webkit-overflow-scrolling:touch;
  padding-bottom:6px;
}
html[data-e086-thread="bandeau"] .recit-layout .recit-e086-thread-strip>li{
  flex:0 0 auto;scroll-snap-align:center;
}
html[data-e086-thread="bandeau"] .recit-layout .recit-e086-thread-strip .recit-thread-item{
  max-width:min(78vw,260px);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}

/* E086-07 : indice de balayage — uniquement sur pointeur tactile. */
.recit-e086-swipe-hint{
  margin:6px 0 0;padding:5px 8px;
  border:1px dashed var(--line-strong);border-radius:7px;
  color:var(--muted-2);font-size:10px;line-height:1.4;
}
html[data-e086-swipe="0"] .recit-e086-swipe-hint{display:none;}
@media (hover:hover) and (pointer:fine){
  .recit-e086-swipe-hint{display:none;}
}

/* E086-08 : orientation, paysage court et zones sûres. */
@media (max-width:620px){
  .recit-layout .recit-body{
    padding-left:max(16px,env(safe-area-inset-left,0px));
    padding-right:max(16px,env(safe-area-inset-right,0px));
    padding-bottom:calc(28px + env(safe-area-inset-bottom,0px));
  }
}
@media (max-height:480px) and (orientation:landscape){
  .recit-layout .recit-media{min-height:0;max-height:34vh;aspect-ratio:auto;}
  .recit-layout .recit-body{padding-top:10px;padding-bottom:calc(10px + env(safe-area-inset-bottom,0px));}
  .recit-layout .recit-title{font-size:clamp(22px,4vw,32px);}
  .recit-layout .recit-context{font-size:12px;}
}

/* E086-09 : champs ≥ 16 px sur pointeur grossier (anti-zoom iOS). */
@media (pointer:coarse){
  .recit-layout .c3a-search{font-size:16px;}
  .recit-layout input,
  .recit-layout button{-webkit-tap-highlight-color:transparent;}
}

/* Filet de sécurité : mouvement réduit, quel que soit l'état du JS. */
html[data-e086-motion="reduced"] .recit-layout *,
html[data-e086-motion="reduced"] .recit-e086-bar *{
  scroll-behavior:auto !important;transition:none !important;
}
@media (prefers-reduced-motion:reduce){
  .recit-e086-bar *{transition:none !important;}
}

/* Barre compacte de la lentille — ancrée en tête de .recit-body. */
.recit-e086-bar{
  margin:0 0 14px;padding:9px 11px;
  border:1px solid rgba(255,255,255,.28);border-radius:10px;
  background:rgba(8,11,16,.94);
  color:var(--ink-soft,#d7d1c6);
  font-size:10px;line-height:1.5;
}
.recit-e086-bar .recit-e086-heading{
  margin:0 0 2px;color:var(--gold-bright,#f4d69e);
  font-size:12px;font-weight:700;
}
.recit-e086-bar .recit-e086-intro{margin:0 0 7px;color:var(--muted,#a8a198);font-size:9px;}
.recit-e086-bar .recit-e086-row{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 7px;}
.recit-e086-bar fieldset{
  margin:0 0 7px;padding:5px 9px 7px;
  border:1px solid rgba(255,255,255,.2);border-radius:8px;
}
.recit-e086-bar legend{padding:0 5px;color:var(--gold,#e6b96f);font-size:9px;}
.recit-e086-bar .recit-e086-choice{
  display:inline-flex;align-items:center;gap:4px;
  min-height:36px;margin-right:10px;font-size:10px;
}
.recit-e086-bar .recit-e086-choice input{
  width:16px;height:16px;accent-color:var(--gold,#e6b96f);
}
.recit-e086-bar .recit-e086-btn{
  flex:1 1 auto;min-width:104px;min-height:36px;
  padding:6px 9px;border:1px solid rgba(255,255,255,.28);border-radius:7px;
  background:var(--surface-2,#10151d);color:inherit;
  font:inherit;font-size:10px;cursor:pointer;touch-action:manipulation;
}
.recit-e086-bar .recit-e086-btn[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);
  background:rgba(230,185,111,.16);
  color:var(--gold-bright,#f4d69e);
}
.recit-e086-bar .recit-e086-btn:focus-visible,
.recit-e086-bar input:focus-visible{
  outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.recit-e086-bar .recit-e086-readout,
.recit-e086-bar .recit-e086-detail,
.recit-e086-bar .recit-e086-summary{
  margin:0 0 5px;font-size:10px;line-height:1.55;
}
.recit-e086-bar strong{color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums;}
@media (max-width:620px){
  .recit-e086-bar{padding:8px 9px;}
  .recit-e086-bar .recit-e086-btn{min-width:0;width:100%;}
}
`;

/* État module : survit au `innerHTML = ''` de la coque. */
const S = {
  sim: 'auto',
  media: 'normal',
  thread: 'grille',
  swipe: true,
  sticky: false,
  regime: '',
  orientation: '',
  vw: 0,
  vh: 0,
  dpr: 1,
  reduced: false,
  ctx: null,
  nodes: {},
  fresh: false,
  listenersInstalled: false,
  scrollPending: false,
  touch: null,
};

function safeReduced(ctx) {
  try { return typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false; }
  catch { return false; }
}

function scopeOf(ctx) {
  if (!ctx) return null;
  return ctx.layout || ctx.stage || null;
}

function fr(value) {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded).replace('.', ',');
}

/* Largeur effective : la simulation remplace la largeur réelle. */
function effectiveWidth() {
  if (S.sim !== 'auto') {
    const found = SIM.find((s) => s.value === S.sim);
    if (found && found.width) return found.width;
  }
  try { return Math.round(window.innerWidth || 0); }
  catch { return 0; }
}

function regimeFor(width) {
  if (!width || width <= 0) return 'inconnu';
  if (width <= 380) return 'compact';
  if (width <= 620) return 'mobile';
  if (width <= 1000) return 'tablette';
  return 'bureau';
}

function columnsFor(regime) {
  return regime === 'bureau' ? 2 : (regime === 'inconnu' ? 0 : 1);
}

function viewportInfo() {
  try {
    S.vw = Math.round(window.innerWidth || 0);
    S.vh = Math.round(window.innerHeight || 0);
    S.dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100;
    S.orientation = typeof window.matchMedia === 'function'
      && window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'paysage';
  } catch {
    S.vw = 0; S.vh = 0; S.dpr = 1; S.orientation = 'inconnue';
  }
}

/* Part du visuel dans la hauteur d'écran, mesurée sur le DOM réel. */
function mediaShare() {
  const scope = scopeOf(S.ctx);
  if (!scope || typeof scope.querySelector !== 'function' || !S.vh) return 0;
  const media = scope.querySelector('.recit-media');
  if (!media || typeof media.getBoundingClientRect !== 'function') return 0;
  const height = media.getBoundingClientRect().height;
  if (!isFinite(height) || height <= 0) return 0;
  return Math.min(100, Math.round((height / S.vh) * 1000) / 10);
}

/* Écrit l'état sur <html> et dans le panneau, sans toucher au contenu source. */
function applyState(ctx) {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  viewportInfo();
  const width = effectiveWidth();
  const regime = regimeFor(width);
  const changed = regime !== S.regime;
  S.regime = regime;

  if (root && root.dataset) {
    root.dataset.e086Sim = S.sim;
    root.dataset.e086Regime = regime;
    root.dataset.e086Media = S.media;
    root.dataset.e086Thread = S.thread;
    root.dataset.e086Swipe = S.swipe ? '1' : '0';
    root.dataset.e086Sticky = S.sticky ? '1' : '0';
    root.dataset.e086Orientation = S.orientation;
    root.dataset.e086Motion = S.reduced ? 'reduced' : 'full';
  }

  const n = S.nodes;
  if (n.sim) {
    SIM.forEach((entry) => {
      const input = n.sim[entry.value];
      if (input && input.checked !== undefined) input.checked = S.sim === entry.value;
    });
  }
  if (n.media) {
    n.media.textContent = S.media === 'compact' ? 'Visuel : compact' : 'Visuel : normal';
    n.media.setAttribute('aria-pressed', S.media === 'compact' ? 'true' : 'false');
  }
  if (n.thread) {
    n.thread.textContent = S.thread === 'bandeau' ? 'Fil : bandeau' : 'Fil : grille';
    n.thread.setAttribute('aria-pressed', S.thread === 'bandeau' ? 'true' : 'false');
  }
  if (n.swipe) {
    n.swipe.textContent = S.swipe ? 'Balayage : actif' : 'Balayage : inactif';
    n.swipe.setAttribute('aria-pressed', S.swipe ? 'true' : 'false');
  }
  if (n.sticky) {
    n.sticky.textContent = S.sticky ? 'Actions : fixes' : 'Actions : en place';
    n.sticky.setAttribute('aria-pressed', S.sticky ? 'true' : 'false');
  }

  const cols = columnsFor(regime);
  const share = mediaShare();
  const source = S.sim === 'auto' ? 'largeur réelle' : 'largeur simulée';
  if (n.regime) {
    n.regime.textContent = `Régime : ${REGIME_LABEL[regime] || regime} · ${source} `
      + `${width || '?'} px · ${cols || '—'} colonne(s) · ${S.orientation}.`;
  }
  if (n.detail) {
    n.detail.textContent = `Mesures : écran ${S.vw || '?'} × ${S.vh || '?'} px · `
      + `part du visuel ${share ? fr(share) : '?'} % de la hauteur · `
      + `densité ${S.dpr || '?'}× · cibles tactiles ${width && width <= 620 ? '44 px' : '38 px'} `
      + '(référence : 44 px recommandés).';
  }
  if (n.summary) {
    n.summary.textContent = 'Fiche de reflow · '
      + `${REGIME_LABEL[regime] || regime} · simulation ${S.sim} · `
      + `visuel ${S.media} · fil ${S.thread} · balayage ${S.swipe ? 'actif' : 'inactif'} · `
      + `actions ${S.sticky ? 'fixes' : 'en place'}.`;
  }

  if (n.hint) n.hint.hidden = !S.swipe;

  if (S.thread === 'bandeau') {
    applyStripClass(ctx);
    if ((S.scrollPending || changed) && n.list) centerCurrent(n.list);
  } else {
    removeStripClass();
  }
  S.scrollPending = false;
}

function applyStripClass(ctx) {
  const scope = scopeOf(ctx || S.ctx);
  if (!scope || typeof scope.querySelector !== 'function') return;
  const list = scope.querySelector('.recit-thread-list');
  if (!list || !list.classList) return;
  if (!list.classList.contains('recit-e086-thread-strip')) {
    list.classList.add('recit-e086-thread-strip');
  }
  if (S.nodes.list !== list) S.nodes.list = list;
}

function removeStripClass() {
  const list = S.nodes.list;
  if (list && list.classList) list.classList.remove('recit-e086-thread-strip');
}

function centerCurrent(list) {
  if (!list || typeof list.querySelector !== 'function') return;
  const current = list.querySelector('.is-current, [aria-current="step"]');
  if (!current || typeof current.scrollIntoView !== 'function') return;
  try {
    current.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: S.reduced ? 'auto' : 'smooth',
    });
  } catch {
    try { current.scrollIntoView(); } catch { /* garde finale */ }
  }
}

function makeToggle(ctx, id, label, pressed) {
  const button = ctx.el('button', 'recit-e086-btn', label);
  button.type = 'button';
  button.id = id;
  button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  return button;
}

function makeRadio(ctx, id, label, checked) {
  const wrap = ctx.el('label', 'recit-e086-choice');
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'e086-sim';
  input.id = id;
  input.value = label.value;
  input.checked = !!checked;
  wrap.appendChild(input);
  wrap.appendChild(document.createTextNode(' ' + label.label));
  return { wrap, input };
}

/* Construit (ou réutilise) la barre unique de la lentille. */
function buildPanel(ctx) {
  let bar = typeof document !== 'undefined' ? document.getElementById(BAR_ID) : null;
  if (bar && bar.parentElement && bar.parentElement.isConnected) {
    return {
      bar,
      sim: {
        auto: document.getElementById(SIM_AUTO_ID),
        '320': document.getElementById(SIM_320_ID),
        '375': document.getElementById(SIM_375_ID),
        '768': document.getElementById(SIM_768_ID),
        '1024': document.getElementById(SIM_1024_ID),
      },
      media: document.getElementById(MEDIA_ID),
      thread: document.getElementById(THREAD_ID),
      swipe: document.getElementById(SWIPE_ID),
      sticky: document.getElementById(STICKY_ID),
      regime: document.getElementById(REGIME_ID),
      detail: document.getElementById(DETAIL_ID),
      summary: document.getElementById(SUMMARY_ID),
      reset: document.getElementById(RESET_ID),
      list: (ctx.layout && typeof ctx.layout.querySelector === 'function')
        ? ctx.layout.querySelector('.recit-thread-list') : null,
      fresh: false,
    };
  }

  bar = ctx.el('section', 'recit-e086-bar');
  bar.id = BAR_ID;
  bar.setAttribute('aria-labelledby', BAR_TITLE_ID);

  const heading = ctx.el('h2', 'recit-e086-heading', 'Mobile et reflow responsive');
  heading.id = BAR_TITLE_ID;
  const intro = ctx.el('p', 'recit-e086-intro',
    'Simulez une largeur ou réglez la mise en page, puis lisez les mesures du reflow.');

  const group = ctx.el('fieldset');
  group.id = SIM_GROUP_ID;
  group.appendChild(ctx.el('legend', '', 'Largeur de test'));
  const radios = {};
  SIM.forEach((entry) => {
    const made = makeRadio(ctx, entry.id, entry, S.sim === entry.value);
    radios[entry.value] = made.input;
    group.appendChild(made.wrap);
  });

  const toggles = ctx.el('div', 'recit-e086-row');
  const media = makeToggle(ctx, MEDIA_ID, '', S.media === 'compact');
  const thread = makeToggle(ctx, THREAD_ID, '', S.thread === 'bandeau');
  const swipe = makeToggle(ctx, SWIPE_ID, '', S.swipe);
  const sticky = makeToggle(ctx, STICKY_ID, '', S.sticky);
  toggles.append(media, thread, swipe, sticky);

  const regime = ctx.el('p', 'recit-e086-readout');
  regime.id = REGIME_ID;
  regime.setAttribute('role', 'status');
  regime.setAttribute('aria-live', 'polite');

  const detail = ctx.el('p', 'recit-e086-detail');
  detail.id = DETAIL_ID;
  const summary = ctx.el('p', 'recit-e086-summary');
  summary.id = SUMMARY_ID;
  const reset = makeToggle(ctx, RESET_ID, 'Réinitialiser le reflow', false);
  reset.removeAttribute('aria-pressed');

  bar.append(heading, intro, group, toggles, regime, detail, summary, reset);

  const host = (ctx.layout && typeof ctx.layout.querySelector === 'function'
    && ctx.layout.querySelector('.recit-body')) || ctx.stage;
  if (host && typeof host.insertBefore === 'function' && host.firstChild) {
    host.insertBefore(bar, host.firstChild);
  } else if (host && typeof host.appendChild === 'function') {
    host.appendChild(bar);
  }

  return {
    bar, sim: radios, media, thread, swipe, sticky,
    regime, detail, summary, reset,
    list: (ctx.layout && typeof ctx.layout.querySelector === 'function')
      ? ctx.layout.querySelector('.recit-thread-list') : null,
    fresh: true,
  };
}

/* E086-07 : indice de balayage, ajouté au visuel sans rien en retirer. */
function ensureHint(ctx) {
  const scope = scopeOf(ctx);
  if (!scope || typeof scope.querySelector !== 'function') return;
  const media = scope.querySelector('.recit-media');
  if (!media || typeof media.appendChild !== 'function') return;
  let hint = typeof document !== 'undefined' ? document.getElementById(HINT_ID) : null;
  if (hint && hint.parentElement && hint.parentElement.isConnected) return;
  hint = ctx.el('p', 'recit-e086-swipe-hint',
    'Balayez le visuel vers la gauche ou la droite pour changer de point, '
    + 'ou utilisez les boutons ci-dessous.');
  hint.id = HINT_ID;
  media.appendChild(hint);
  S.nodes.hint = hint;
}

/* E086-02 : on marque la colonne de lecture sans remplacer ses classes. */
function markReflow(ctx) {
  const scope = scopeOf(ctx);
  if (!scope || typeof scope.querySelector !== 'function') return;
  const body = scope.querySelector('.recit-body');
  if (body && body.classList && !body.classList.contains('recit-e086-reflow')) {
    body.classList.add('recit-e086-reflow');
  }
}

function attachListeners(ctx) {
  const n = S.nodes;
  if (!n.fresh) return;
  if (n.sim) {
    SIM.forEach((entry) => {
      const input = n.sim[entry.value];
      if (!input || typeof input.addEventListener !== 'function') return;
      input.addEventListener('change', () => {
        if (!input.checked) return;
        S.sim = entry.value;
        applyState(S.ctx || ctx);
      });
    });
  }
  if (n.media && typeof n.media.addEventListener === 'function') {
    n.media.addEventListener('click', () => {
      S.media = S.media === 'compact' ? 'normal' : 'compact';
      applyState(S.ctx || ctx);
    });
  }
  if (n.thread && typeof n.thread.addEventListener === 'function') {
    n.thread.addEventListener('click', () => {
      S.thread = S.thread === 'bandeau' ? 'grille' : 'bandeau';
      S.scrollPending = true;
      applyState(S.ctx || ctx);
    });
  }
  if (n.swipe && typeof n.swipe.addEventListener === 'function') {
    n.swipe.addEventListener('click', () => {
      S.swipe = !S.swipe;
      applyState(S.ctx || ctx);
    });
  }
  if (n.sticky && typeof n.sticky.addEventListener === 'function') {
    n.sticky.addEventListener('click', () => {
      S.sticky = !S.sticky;
      applyState(S.ctx || ctx);
    });
  }
  if (n.reset && typeof n.reset.addEventListener === 'function') {
    n.reset.addEventListener('click', () => {
      S.sim = 'auto';
      S.media = 'normal';
      S.thread = 'grille';
      S.swipe = true;
      S.sticky = false;
      removeStripClass();
      applyState(S.ctx || ctx);
    });
  }
}

/* Écouteurs globaux installés une seule fois pour toute la session. */
function installGlobalListeners() {
  if (S.listenersInstalled || typeof window === 'undefined') return;
  S.listenersInstalled = true;

  const refresh = () => {
    if (!S.ctx || typeof document === 'undefined') return;
    if (!document.querySelector('.recit-layout')) return;
    applyState(S.ctx);
  };
  try {
    window.addEventListener('resize', refresh, { passive: true });
    window.addEventListener('orientationchange', refresh, { passive: true });
  } catch {
    try { window.addEventListener('resize', refresh); } catch { /* ignoré */ }
  }

  /* E086-07 : balayage horizontal. On réutilise les boutons existants de
     recit.js (data-fk), donc aucune dépendance vers le store interne. */
  const start = (event) => {
    if (!S.swipe || !event.touches || !event.touches.length) return;
    if (typeof document === 'undefined' || !document.querySelector('.recit-layout')) return;
    const target = event.target;
    if (typeof Element === 'undefined' || !(target instanceof Element)) return;
    if (!target.closest('.recit-media, #recit-point-title')) return;
    if (target.closest('.recit-thread-list')) return;
    const touch = event.touches[0];
    S.touch = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  };
  const end = (event) => {
    const origin = S.touch;
    S.touch = null;
    if (!S.swipe || !origin || !event.changedTouches || !event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - origin.x;
    const dy = touch.clientY - origin.y;
    const dt = Date.now() - origin.t;
    if (dt > 900 || Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy) * 1.4) return;
    const key = dx < 0 ? 'c3a-next' : 'c3a-prev';
    const button = document.querySelector(`[data-fk="${key}"]`);
    if (button && typeof button.click === 'function' && !button.disabled) button.click();
  };
  try {
    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', () => { S.touch = null; }, { passive: true });
  } catch {
    /* Environnement sans tactile : le balayage reste inerte, sans erreur. */
  }
}

register('E086', (ctx) => {
  /* Garde d'existence : une lentille ne doit jamais faire échouer le rendu. */
  try {
    if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
    ctx.css('recit-e086', CSS);
    S.ctx = ctx;
    S.reduced = safeReduced(ctx);
    markReflow(ctx);
    S.nodes = buildPanel(ctx);
    ensureHint(ctx);
    applyState(ctx);
    attachListeners(ctx);
    installGlobalListeners();
  } catch {
    /* Enrichissement non destructif : le récit reste lisible sans cette lentille. */
  }
});
