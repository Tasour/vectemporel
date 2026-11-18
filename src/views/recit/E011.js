import { register } from './registry.js';

/* Lentille E011 — Lisibilité et mesure de lecture de la vue Récit.
 *
 * Les 10 chantiers (E011-01 … E011-10) sont décrits dans
 * UNIFIED_AUDIT/RECIT/views/E011.md. Tout est local : aucun appel réseau,
 * aucune graine aléatoire, aucune console, aucune modification de styles.css
 * ou de recit.js. Le panneau est injecté dans la colonne de lecture ; l'état
 * (mesure, échelle, interlignage, contrastes, points lus) survit aux
 * reconstructions du DOM opérées par la coque (shell.js).
 */

/* Identifiants DOM — tous préfixés « e011- » et uniques. */
const PANEL_ID = 'e011-panel';
const PANEL_TITLE_ID = 'e011-panel-title';
const MEASURE_GROUP_ID = 'e011-measure-group';
const SCALE_GROUP_ID = 'e011-scale-group';
const READOUT_ID = 'e011-readout';
const DENSITY_ID = 'e011-density';
const PROGRESS_ID = 'e011-progress';
const METER_ID = 'e011-progress-meter';
const RESET_ID = 'e011-reset';
const SUMMARY_ID = 'e011-summary';
const LEADING_ID = 'e011-leading';
const FOCUS_ID = 'e011-focus';
const INK_ID = 'e011-ink';

const MEASURE_LABEL = {
  narrow: 'étroite (45 car.)',
  comfortable: 'confortable (65 car.)',
  wide: 'large (80 car.)',
};
const SCALE_LABEL = { normal: 'normale', large: 'grande', xlarge: 'très grande' };

/* État module : survit au `innerHTML = ''` de la coque. */
const S = {
  measure: 'comfortable',
  scale: 'normal',
  leading: false,
  focus: false,
  ink: false,
  read: new Set(),
  lastText: '',
  reduced: false,
  ctx: null,
  nodes: {},
};

/* Une seule feuille de style, injectée dans <head> via ctx.css (garde d'id).
   Les réglages sont pilotés par des attributs sur <html> : le JS et le CSS
   partagent la même source de vérité, sans style en ligne sur le contenu. */
const CSS = `
:root{
  --e011-measure:65ch;
  --e011-title-scale:1;
  --e011-title-leading:1.12;
  --e011-body-leading:1.6;
}
html[data-e011-measure="narrow"]{ --e011-measure:45ch; }
html[data-e011-measure="comfortable"]{ --e011-measure:65ch; }
html[data-e011-measure="wide"]{ --e011-measure:80ch; }
html[data-e011-scale="normal"]{ --e011-title-scale:1; }
html[data-e011-scale="large"]{ --e011-title-scale:1.18; }
html[data-e011-scale="xlarge"]{ --e011-title-scale:1.38; }
html[data-e011-leading="1"]{ --e011-title-leading:1.28; --e011-body-leading:1.8; }

/* E011-01 / E011-03 / E011-04 / E011-08 : mesure, échelle, interlignage,
   césure et chiffres alignés sur la colonne de lecture uniquement. */
.recit-layout .recit-e011-measured{
  max-width:var(--e011-measure,65ch);
  overflow-wrap:break-word;
  hyphens:auto;
  -webkit-hyphens:auto;
  text-wrap:pretty;
  font-variant-numeric:tabular-nums;
}
.recit-layout .recit-title.recit-e011-measured{
  font-size:calc(clamp(30px,4vw,52px) * var(--e011-title-scale,1));
  line-height:var(--e011-title-leading,1.12);
}
.recit-layout .recit-context.recit-e011-measured{
  line-height:var(--e011-body-leading,1.6);
}

/* E011-05 : mode concentration — le texte reste net, le pourtour s'efface. */
.recit-layout .recit-thread,
.recit-layout .recit-legend,
.recit-layout .recit-media{
  transition:opacity .2s ease,filter .2s ease;
}
html[data-e011-focus="1"] .recit-layout .recit-thread,
html[data-e011-focus="1"] .recit-layout .recit-legend,
html[data-e011-focus="1"] .recit-layout .recit-media{
  opacity:.32;
  filter:grayscale(.6);
}

/* E011-09 : texte net — contraste et graisse renforcés du point lu. */
html[data-e011-ink="1"] .recit-layout .recit-e011-measured{
  color:#f4eee2 !important;
}
html[data-e011-ink="1"] .recit-layout .recit-title.recit-e011-measured{
  font-weight:600 !important;
}
html[data-e011-ink="1"] .recit-layout .recit-e011-btn:focus-visible{
  outline-width:3px;
}
/* Filet de sécurité visuel : préférence système « plus de contraste ». */
@media (prefers-contrast: more){
  .recit-layout .recit-e011-measured{ color:#f4eee2 !important; }
}

/* Gardien de mouvement : aucune transition si l'utilisateur préfère moins de mouvement. */
html[data-e011-motion="reduced"] .recit-layout *,
html[data-e011-motion="reduced"] .recit-e011-panel *{
  transition:none !important;
}

/* Panneau de lecture — ancré en fin de colonne, non destructif. */
.recit-e011-panel{
  margin-top:18px;
  padding:12px 13px;
  border:1px solid rgba(255,255,255,.28);
  border-radius:10px;
  background:rgba(8,11,16,.94);
  color:var(--ink-soft,#d7d1c6);
  font-size:11px;
  line-height:1.5;
}
.recit-e011-panel .recit-e011-heading{
  margin:0 0 3px;
  color:var(--gold-bright,#f4d69e);
  font-size:13px;
  font-weight:700;
}
.recit-e011-panel .recit-e011-intro{
  margin:0 0 9px;
  color:var(--muted,#a8a198);
  font-size:10px;
}
.recit-e011-panel .recit-e011-row{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin:0 0 8px;
}
.recit-e011-panel .recit-e011-btn{
  flex:1 1 auto;
  min-width:118px;
  min-height:36px;
  padding:6px 9px;
  border:1px solid rgba(255,255,255,.28);
  border-radius:7px;
  background:var(--surface-2,#10151d);
  color:inherit;
  font:inherit;
  font-size:10px;
  cursor:pointer;
  touch-action:manipulation;
}
.recit-e011-panel .recit-e011-btn[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);
  background:rgba(230,185,111,.16);
  color:var(--gold-bright,#f4d69e);
}
.recit-e011-panel .recit-e011-btn:focus-visible,
.recit-e011-panel input:focus-visible{
  outline:2px solid var(--gold-bright,#f4d69e);
  outline-offset:2px;
}
.recit-e011-panel .recit-e011-group{
  margin:0 0 8px;
  padding:5px 9px 7px;
  border:1px solid rgba(255,255,255,.2);
  border-radius:8px;
}
.recit-e011-panel .recit-e011-group legend{
  padding:0 5px;
  color:var(--gold,#e6b96f);
  font-size:10px;
}
.recit-e011-panel .recit-e011-choice{
  display:inline-flex;
  align-items:center;
  gap:5px;
  min-height:36px;
  margin-right:12px;
  font-size:10px;
}
.recit-e011-panel .recit-e011-choice input{
  width:18px;
  height:18px;
  accent-color:var(--gold,#e6b96f);
}
.recit-e011-panel .recit-e011-readout,
.recit-e011-panel .recit-e011-detail,
.recit-e011-panel .recit-e011-summary{
  margin:0 0 6px;
  font-size:10px;
  line-height:1.55;
}
.recit-e011-panel strong{
  color:var(--gold-bright,#f4d69e);
  font-variant-numeric:tabular-nums;
}
.recit-e011-panel .recit-e011-meter{
  height:4px;
  margin:4px 0 8px;
  border-radius:999px;
  background:rgba(255,255,255,.1);
  overflow:hidden;
}
.recit-e011-panel .recit-e011-meter span{
  display:block;
  height:100%;
  background:var(--gold,#e6b96f);
  transition:width .2s ease;
}
@media (max-width:620px){
  .recit-e011-panel .recit-e011-btn{ min-width:0; width:100%; }
}
`;

function safeReduced(ctx) {
  try { return typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false; }
  catch { return false; }
}

function scopeOf(ctx) {
  return (ctx && ctx.layout) || (ctx && ctx.stage) || null;
}

/* E011-01 : on marque le titre et le résumé comme « à mesurer ». La classe
   est ajoutée, jamais remplacée : le rendu sans JS reste intact. */
function markMeasured(ctx) {
  const scope = scopeOf(ctx);
  if (!scope || typeof scope.querySelectorAll !== 'function') return;
  const nodes = scope.querySelectorAll('.recit-title, .recit-context');
  for (let i = 0; i < nodes.length; i += 1) {
    if (!nodes[i].classList.contains('recit-e011-measured')) {
      nodes[i].classList.add('recit-e011-measured');
    }
  }
}

function currentText(ctx) {
  const scope = scopeOf(ctx);
  if (!scope || typeof scope.querySelector !== 'function') return '';
  const title = scope.querySelector('#recit-point-title') || scope.querySelector('.recit-title');
  return title ? String(title.textContent || '').trim() : '';
}

/* Mesures déterministes : aucune graine aléatoire, référence de lecture
   silencieuse adulte fixée à 220 mots/minute. */
function metrics(text) {
  const value = String(text || '');
  const words = (value.match(/\S+/g) || []).length;
  const chars = value.length;
  const charsNoSpace = value.replace(/\s+/g, '').length;
  const seconds = words ? Math.max(1, Math.round((words / 220) * 60)) : 0;
  const marks = (value.match(/[.!?…]+/g) || []).length;
  const sentences = marks || (words ? 1 : 0);
  const perWord = words ? charsNoSpace / words : 0;
  const perSentence = sentences ? words / sentences : 0;
  let density = 'indéterminé';
  if (words) {
    if (perWord <= 5.3 && perSentence <= 18) density = 'fluide';
    else if (perWord <= 6.4 && perSentence <= 26) density = 'moyen';
    else density = 'dense';
  }
  return { words, chars, seconds, perWord, perSentence, density };
}

function fr(value) {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded).replace('.', ',');
}

/* E011-07 : relève la position courante dans le fil et l'ajoute aux points lus. */
function collectProgress(ctx) {
  const scope = scopeOf(ctx);
  let total = 0;
  let index = -1;
  if (scope && typeof scope.querySelectorAll === 'function') {
    const items = scope.querySelectorAll('.recit-thread-item');
    total = items.length;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.getAttribute('aria-current') === 'step' || item.classList.contains('is-current')) {
        const match = /^c3a-point-(\d+)$/.exec(item.getAttribute('data-fk') || '');
        if (match) index = Number(match[1]);
        break;
      }
    }
  }
  if (index >= 0) S.read.add(index);
  const seen = Array.from(S.read).filter((i) => i < total).length;
  const pct = total ? Math.round((seen / total) * 100) : 0;
  return { total, seen, pct };
}

function makeToggle(ctx, id, label, pressed) {
  const button = ctx.el('button', 'recit-e011-btn', label);
  button.type = 'button';
  button.id = id;
  button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  return button;
}

function makeRadio(ctx, id, name, value, label, checked) {
  const wrap = ctx.el('label', 'recit-e011-choice');
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = name;
  input.id = id;
  input.value = value;
  input.checked = !!checked;
  wrap.appendChild(input);
  wrap.appendChild(document.createTextNode(' ' + label));
  return { wrap, input };
}

/* Construit (ou réutilise) le panneau unique de la lentille. */
function buildPanel(ctx) {
  let panel = document.getElementById(PANEL_ID);
  if (panel && panel.parentElement && panel.parentElement.isConnected) {
    return {
      panel,
      measure: {
        narrow: document.getElementById('e011-measure-narrow'),
        comfortable: document.getElementById('e011-measure-comfortable'),
        wide: document.getElementById('e011-measure-wide'),
      },
      scale: {
        normal: document.getElementById('e011-scale-normal'),
        large: document.getElementById('e011-scale-large'),
        xlarge: document.getElementById('e011-scale-xlarge'),
      },
      leading: document.getElementById(LEADING_ID),
      focus: document.getElementById(FOCUS_ID),
      ink: document.getElementById(INK_ID),
      readout: document.getElementById(READOUT_ID),
      density: document.getElementById(DENSITY_ID),
      progress: document.getElementById(PROGRESS_ID),
      meter: document.getElementById(METER_ID),
      reset: document.getElementById(RESET_ID),
      summary: document.getElementById(SUMMARY_ID),
      fresh: false,
    };
  }

  panel = ctx.el('section', 'recit-e011-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', PANEL_TITLE_ID);

  const heading = ctx.el('h2', 'recit-e011-heading', 'Lisibilité et mesure de lecture');
  heading.id = PANEL_TITLE_ID;
  const intro = ctx.el('p', 'recit-e011-intro',
    'Réglez la colonne et le texte, puis lisez les mesures calculées à partir du point affiché.');

  const measureGroup = ctx.el('fieldset', 'recit-e011-group');
  measureGroup.id = MEASURE_GROUP_ID;
  measureGroup.appendChild(ctx.el('legend', '', 'Largeur de lecture'));
  const mNarrow = makeRadio(ctx, 'e011-measure-narrow', 'e011-measure', 'narrow', 'Étroite', S.measure === 'narrow');
  const mComfort = makeRadio(ctx, 'e011-measure-comfortable', 'e011-measure', 'comfortable', 'Confortable', S.measure === 'comfortable');
  const mWide = makeRadio(ctx, 'e011-measure-wide', 'e011-measure', 'wide', 'Large', S.measure === 'wide');
  measureGroup.append(mNarrow.wrap, mComfort.wrap, mWide.wrap);

  const scaleGroup = ctx.el('fieldset', 'recit-e011-group');
  scaleGroup.id = SCALE_GROUP_ID;
  scaleGroup.appendChild(ctx.el('legend', '', 'Taille du point'));
  const sNormal = makeRadio(ctx, 'e011-scale-normal', 'e011-scale', 'normal', 'Normale', S.scale === 'normal');
  const sLarge = makeRadio(ctx, 'e011-scale-large', 'e011-scale', 'large', 'Grande', S.scale === 'large');
  const sXLarge = makeRadio(ctx, 'e011-scale-xlarge', 'e011-scale', 'xlarge', 'Très grande', S.scale === 'xlarge');
  scaleGroup.append(sNormal.wrap, sLarge.wrap, sXLarge.wrap);

  const toggles = ctx.el('div', 'recit-e011-row');
  const leading = makeToggle(ctx, LEADING_ID, 'Interlignage généreux', S.leading);
  const focus = makeToggle(ctx, FOCUS_ID, 'Mode concentration', S.focus);
  const ink = makeToggle(ctx, INK_ID, 'Texte net', S.ink);
  toggles.append(leading, focus, ink);

  const readout = ctx.el('p', 'recit-e011-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const density = ctx.el('p', 'recit-e011-detail');
  density.id = DENSITY_ID;

  const progress = ctx.el('p', 'recit-e011-detail');
  progress.id = PROGRESS_ID;
  const meter = ctx.el('div', 'recit-e011-meter');
  meter.id = METER_ID;
  const fill = ctx.el('span');
  meter.appendChild(fill);

  const reset = makeToggle(ctx, RESET_ID, 'Réinitialiser les points lus', false);
  reset.removeAttribute('aria-pressed');

  const summary = ctx.el('p', 'recit-e011-summary');
  summary.id = SUMMARY_ID;

  panel.append(heading, intro, measureGroup, scaleGroup, toggles, readout, density, progress, meter, reset, summary);

  const host = (ctx.layout && typeof ctx.layout.querySelector === 'function'
    && ctx.layout.querySelector('.recit-body')) || ctx.stage;
  if (host && typeof host.appendChild === 'function') host.appendChild(panel);

  return {
    panel,
    measure: { narrow: mNarrow.input, comfortable: mComfort.input, wide: mWide.input },
    scale: { normal: sNormal.input, large: sLarge.input, xlarge: sXLarge.input },
    leading, focus, ink, readout, density, progress, meter, fill, reset, summary,
    fresh: true,
  };
}

/* Met à jour l'affichage et les attributs sans toucher au contenu source. */
function applyState(ctx) {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  if (root && root.dataset) {
    root.dataset.e011Measure = S.measure;
    root.dataset.e011Scale = S.scale;
    root.dataset.e011Leading = S.leading ? '1' : '0';
    root.dataset.e011Focus = S.focus ? '1' : '0';
    root.dataset.e011Ink = S.ink ? '1' : '0';
    root.dataset.e011Motion = S.reduced ? 'reduced' : 'full';
  }

  const n = S.nodes;

  if (n.measure) {
    Object.keys(n.measure).forEach((key) => {
      const input = n.measure[key];
      if (input && input.checked !== undefined) input.checked = S.measure === key;
    });
  }
  if (n.scale) {
    Object.keys(n.scale).forEach((key) => {
      const input = n.scale[key];
      if (input && input.checked !== undefined) input.checked = S.scale === key;
    });
  }
  if (n.leading) {
    n.leading.textContent = S.leading ? 'Interlignage généreux : activé' : 'Interlignage généreux : désactivé';
    n.leading.setAttribute('aria-pressed', S.leading ? 'true' : 'false');
  }
  if (n.focus) {
    n.focus.textContent = S.focus ? 'Mode concentration : actif' : 'Mode concentration : inactif';
    n.focus.setAttribute('aria-pressed', S.focus ? 'true' : 'false');
  }
  if (n.ink) {
    n.ink.textContent = S.ink ? 'Texte net : activé' : 'Texte net : désactivé';
    n.ink.setAttribute('aria-pressed', S.ink ? 'true' : 'false');
  }

  const m = metrics(S.lastText);
  if (n.readout) {
    n.readout.textContent = `Mesure du point : ${m.words} mots · ${m.chars} caractères · `
      + `≈ ${m.seconds} s à 220 mots/min (référence : lecture silencieuse adulte).`;
  }
  if (n.density) {
    n.density.textContent = `Densité : ${fr(m.perWord)} caractères par mot · `
      + `${fr(m.perSentence)} mots par phrase · ${m.density} (repère : 5 à 6 car./mot).`;
  }

  const progress = collectProgress(ctx);
  if (n.progress) {
    n.progress.textContent = `Points lus dans ce repère : ${progress.seen} / ${progress.total} `
      + `· progression de lecture : ${progress.pct} %.`;
  }
  if (n.meter && n.meter.firstChild) n.meter.firstChild.style.width = `${progress.pct}%`;

  if (n.summary) {
    n.summary.textContent = 'Fiche de lecture · colonne '
      + `${MEASURE_LABEL[S.measure] || S.measure} · texte ${SCALE_LABEL[S.scale] || S.scale} · `
      + `interlignage ${S.leading ? 'généreux' : 'standard'} · contraste ${S.ink ? 'renforcé' : 'standard'} · `
      + `concentration ${S.focus ? 'active' : 'inactive'}.`;
  }
}

function attachListeners(ctx) {
  const n = S.nodes;
  if (!n.fresh) return;

  if (n.measure) {
    Object.keys(n.measure).forEach((key) => {
      const input = n.measure[key];
      if (!input || typeof input.addEventListener !== 'function') return;
      input.addEventListener('change', () => {
        if (input.checked) { S.measure = key; applyState(S.ctx || ctx); }
      });
    });
  }
  if (n.scale) {
    Object.keys(n.scale).forEach((key) => {
      const input = n.scale[key];
      if (!input || typeof input.addEventListener !== 'function') return;
      input.addEventListener('change', () => {
        if (input.checked) { S.scale = key; applyState(S.ctx || ctx); }
      });
    });
  }
  if (n.leading && typeof n.leading.addEventListener === 'function') {
    n.leading.addEventListener('click', () => { S.leading = !S.leading; applyState(S.ctx || ctx); });
  }
  if (n.focus && typeof n.focus.addEventListener === 'function') {
    n.focus.addEventListener('click', () => { S.focus = !S.focus; applyState(S.ctx || ctx); });
  }
  if (n.ink && typeof n.ink.addEventListener === 'function') {
    n.ink.addEventListener('click', () => { S.ink = !S.ink; applyState(S.ctx || ctx); });
  }
  if (n.reset && typeof n.reset.addEventListener === 'function') {
    n.reset.addEventListener('click', () => { S.read.clear(); applyState(S.ctx || ctx); });
  }
}

register('E011', (ctx) => {
  /* Garde d'existence : une lentille ne doit jamais faire échouer le rendu. */
  try {
    if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
    ctx.css('recit-e011', CSS);
    S.ctx = ctx;
    S.reduced = safeReduced(ctx);
    markMeasured(ctx);
    S.lastText = currentText(ctx);
    S.nodes = buildPanel(ctx);
    applyState(ctx);
    attachListeners(ctx);
  } catch {
    /* Enrichissement non destructif : le récit reste lisible sans cette lentille. */
  }
});
