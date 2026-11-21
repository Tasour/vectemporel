import { register } from './registry.js';

/* Lentille CHRONOLOGIE E087 — contraste élevé, mode accessibilité et
 * surcharge de thème.
 *
 * Dix chantiers (E087-01 … E087-10) décrits dans
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E087.md. Tout est local : un seul
 * ctx.css('chronology-e087', …), des identifiants préfixés `e087-` protégés par
 * getElementById, aucun appel réseau, aucune graine aléatoire, aucune trace de
 * débogage, aucune boucle d'animation propre, aucun minuteur. Le module ne
 * touche ni styles.css ni chronology.js ni le registre.
 *
 * Lectures utilisées : src/views/chronology.js (:9-12, :30-93, :207-221,
 * :247-256, :278-307, :310-345, :537-541), src/views/chronology/registry.js
 * (:9-19, :28-44), styles.css (:2-20, :33-36, :193-236, :312-344).
 */

const CSS_ID = 'chronology-e087';

const PANEL_ID = 'e087-panel';
const TITLE_ID = 'e087-title';
const TOGGLE_ID = 'e087-access-toggle';
const GROUP_ID = 'e087-theme-group';
const RADIO_AUTO_ID = 'e087-theme-auto';
const RADIO_HC_ID = 'e087-theme-hc';
const RADIO_MONO_ID = 'e087-theme-mono';
const READOUT_ID = 'e087-readout';
const NOTE_ID = 'e087-note';

const MORE_CONTRAST_QUERY = '(prefers-contrast: more)';
const FORCED_COLORS_QUERY = '(forced-colors: active)';

/* État module : survit au `innerHTML = ''` de la coque (chronology.js:30-31).
 * `theme` est le choix explicite (auto / hc / mono) ; `access` est une bascule
 * indépendante qui force la palette « contraste élevé » sans écraser le choix. */
const S = {
  theme: 'auto',
  access: false,
  autoMore: false,
  autoForced: false,
  reduced: false,
  nodes: {},
  layout: null,
  mediaWatched: false,
};

/* La feuille est injectée une seule fois dans <head> par ctx.css (registry.js:13-19).
 * Les surcharges de jetons portent sur <html> (chronology.js:95-117 fait de même
 * pour la navigation) ; toutes les règles ciblant les composants sont en plus
 * scoped sous `.chronology-e087`, posée sur le layout courant (chronology.js:214). */
const CSS = `
/* E087-01 : panneau compact, ancré après la bande de statut (chronology.js:247-256). */
.chronology-e087 #${PANEL_ID}{
  margin:0 0 12px;padding:8px 10px;
  border:2px solid var(--line-strong);border-radius:8px;
  background:var(--surface);color:var(--ink-soft);
  font-size:10px;line-height:1.5;
}
#${PANEL_ID} h2{
  margin:0 0 4px;color:var(--gold-bright);
  font-family:var(--serif);font-size:12px;font-weight:600;
}
#${PANEL_ID} p{margin:3px 0 0}
#${PANEL_ID} .e087-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px}
#${PANEL_ID} .e087-btn{
  min-height:36px;padding:5px 10px;
  border:2px solid var(--line-strong);border-radius:7px;
  background:var(--surface-2);color:var(--ink-soft);font:inherit;font-size:11px;
  cursor:pointer;touch-action:manipulation;
}
#${PANEL_ID} .e087-btn[aria-pressed="true"]{
  border-color:var(--gold-bright);background:var(--gold);color:var(--bg);font-weight:700;
}
#${PANEL_ID} fieldset{margin:6px 0 0;padding:4px 8px 6px;border:1px solid var(--line);border-radius:7px}
#${PANEL_ID} legend{padding:0 4px;color:var(--gold);font-size:10px;font-weight:600}
#${PANEL_ID} .e087-choice{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:10px;font-size:11px;
}
#${PANEL_ID} .e087-choice input{width:18px;height:18px;accent-color:var(--gold)}
#${PANEL_ID} .e087-readout{font-variant-numeric:tabular-nums}
#${PANEL_ID} .e087-readout strong{color:var(--gold-bright)}
#${PANEL_ID} .e087-note{color:var(--muted)}

/* E087-04 : palette « contraste élevé » — redéfinition des jetons de styles.css:2-20.
   Le sélecteur d'attribut (0,1,1) l'emporte sur :root (0,1,0) sans !important. */
html[data-e087-theme="hc"]{
  --bg:#000000; --surface:#000000; --surface-2:#0a0c10;
  --line:#ffffff; --line-strong:#ffd54a;
  --ink:#ffffff; --ink-soft:#ffffff;
  --muted:#f2f2f2; --muted-2:#e6e6e6;
  --gold:#ffd54a; --gold-bright:#fff3b0;
  --blue:#cfe0ff; --violet:#ecdcff; --red:#ffb0a6;
}

/* E087-05 : palette « monochrome » — aucune teinte, le sens passe par la forme. */
html[data-e087-theme="mono"]{
  --bg:#000000; --surface:#000000; --surface-2:#0c0c0c;
  --line:#ffffff; --line-strong:#ffffff;
  --ink:#ffffff; --ink-soft:#ffffff;
  --muted:#efefef; --muted-2:#e2e2e2;
  --gold:#ffffff; --gold-bright:#ffffff;
  --blue:#ffffff; --violet:#ffffff; --red:#ffffff;
}
html[data-e087-theme="mono"] .chronology-e087 .era-band,
html[data-e087-theme="mono"] .chronology-e087 .event-card{
  border-left-color:#ffffff !important;
}
html[data-e087-theme="mono"] .chronology-e087 .event-card strong{font-weight:700 !important}
html[data-e087-theme="mono"] .chronology-e087 .era-band[aria-current="true"],
html[data-e087-theme="mono"] .chronology-e087 .event-card[aria-current="true"]{
  outline:3px double #ffffff;outline-offset:-6px;
}

/* E087-06 : miroir CSS des préférences système, utile si le JS est neutralisé
   (registry.js:39-42). Le pilote JS reste la source de vérité du statut. */
@media (prefers-contrast: more){
  .chronology-e087 #${PANEL_ID}{border-left-width:6px}
}
@media (forced-colors: active){
  .chronology-e087 #${PANEL_ID},
  .chronology-e087 .era-band,
  .chronology-e087 .event-card{border:2px solid CanvasText !important}
  .chronology-e087 [aria-current="true"]{outline:3px solid Highlight !important;outline-offset:-4px !important}
}

/* E087-07 : neutralisation des décorations à faible contraste (color-mix et
   ombres de styles.css:201, :204, :213) en surcharge de thème. */
html[data-e087-theme="hc"] .chronology-e087 .era-band,
html[data-e087-theme="mono"] .chronology-e087 .era-band{
  background:var(--surface-2) !important;
  border:2px solid var(--line) !important;
  border-left:4px solid var(--gold) !important;
  box-shadow:none !important;
}
html[data-e087-theme="hc"] .chronology-e087 .era-band[aria-current="true"],
html[data-e087-theme="mono"] .chronology-e087 .era-band[aria-current="true"]{
  background:var(--surface) !important;
  border-color:var(--gold-bright) !important;
  box-shadow:inset 0 0 0 2px var(--gold-bright) !important;
}
html[data-e087-theme="hc"] .chronology-e087 .event-card,
html[data-e087-theme="mono"] .chronology-e087 .event-card{
  background:var(--surface-2) !important;
  border:2px solid var(--line) !important;
  box-shadow:none !important;
}
html[data-e087-theme="hc"] .chronology-e087 .event-card[aria-current="true"],
html[data-e087-theme="mono"] .chronology-e087 .event-card[aria-current="true"]{
  border-color:var(--gold-bright) !important;
  box-shadow:inset 0 0 0 2px var(--gold-bright) !important;
}
html[data-e087-theme="hc"] .chronology-e087 .nav-c2-orientation,
html[data-e087-theme="mono"] .chronology-e087 .nav-c2-orientation{
  background:var(--surface-2) !important;border:2px solid var(--line) !important;
}

/* E087-08 : hiérarchie typographique — les 8–9 px de chronology.js:38, :44,
   :58, :63, :64, :215, :217, :223 passent à 11 px et poids renforcé. Le style
   de la vue étant réinjecté dans le stage à chaque rendu (chronology.js:32-93),
   le !important est nécessaire et assumé. */
html[data-e087-theme="hc"] .chronology-e087 .atlas-chrono-hint,
html[data-e087-theme="hc"] .chronology-e087 .atlas-chrono-status,
html[data-e087-theme="hc"] .chronology-e087 .atlas-chrono-era-range,
html[data-e087-theme="hc"] .chronology-e087 .atlas-chrono-count,
html[data-e087-theme="hc"] .chronology-e087 .atlas-chrono-card-era,
html[data-e087-theme="hc"] .chronology-e087 .atlas-chrono-tags,
html[data-e087-theme="hc"] .chronology-e087 .event-subtitle,
html[data-e087-theme="hc"] .chronology-e087 .aside-credit,
html[data-e087-theme="hc"] .chronology-e087 .aside-kicker,
html[data-e087-theme="hc"] .chronology-e087 .point-sources,
html[data-e087-theme="hc"] .chronology-e087 .point-kind,
html[data-e087-theme="hc"] .chronology-e087 .confidence,
html[data-e087-theme="mono"] .chronology-e087 .atlas-chrono-hint,
html[data-e087-theme="mono"] .chronology-e087 .atlas-chrono-status,
html[data-e087-theme="mono"] .chronology-e087 .atlas-chrono-era-range,
html[data-e087-theme="mono"] .chronology-e087 .atlas-chrono-count,
html[data-e087-theme="mono"] .chronology-e087 .atlas-chrono-card-era,
html[data-e087-theme="mono"] .chronology-e087 .atlas-chrono-tags,
html[data-e087-theme="mono"] .chronology-e087 .event-subtitle,
html[data-e087-theme="mono"] .chronology-e087 .aside-credit,
html[data-e087-theme="mono"] .chronology-e087 .aside-kicker,
html[data-e087-theme="mono"] .chronology-e087 .point-sources,
html[data-e087-theme="mono"] .chronology-e087 .point-kind,
html[data-e087-theme="mono"] .chronology-e087 .confidence{
  color:var(--ink) !important;font-size:11px !important;
  font-weight:600 !important;line-height:1.5 !important;
}

/* E087-09 : focus non découpé par overflow:hidden (styles.css:208) et cibles
   portées à 44 px ; l'anneau reste visible sous palette surchargée. */
.chronology-e087 .event-card:focus-visible,
.chronology-e087 .era-band:focus-visible,
.chronology-e087 .e087-btn:focus-visible,
.chronology-e087 input:focus-visible{
  outline:3px solid var(--gold-bright) !important;
  outline-offset:2px !important;
  box-shadow:inset 0 0 0 2px var(--gold-bright) !important;
}
html[data-e087-theme="hc"] .chronology-e087 .atlas-chrono-empty button,
html[data-e087-theme="hc"] .chronology-e087 .nav-c2-back,
html[data-e087-theme="hc"] .chronology-e087 .atlas-chrono-tag,
html[data-e087-theme="mono"] .chronology-e087 .atlas-chrono-empty button,
html[data-e087-theme="mono"] .chronology-e087 .nav-c2-back,
html[data-e087-theme="mono"] .chronology-e087 .atlas-chrono-tag{
  min-height:44px !important;
}
@media (forced-colors: active){
  .chronology-e087 :focus-visible{outline:3px solid Highlight !important}
}

/* E087-10 : aucune animation à neutraliser, mais cohérence explicite avec la
   préférence lue via ctx.reducedMotion() (registry.js:33-36). */
html[data-e087-reduced="1"] .chronology-e087 *{transition:none !important;animation:none !important}
@media (prefers-reduced-motion: reduce){
  .chronology-e087 *{transition:none !important;animation:none !important}
}
@media (max-width:620px){
  .chronology-e087 #${PANEL_ID}{padding:7px 8px}
  .chronology-e087 #${PANEL_ID} .e087-btn{width:100%}
  .chronology-e087 #${PANEL_ID} .e087-choice{min-height:44px}
}
`;

function readMedia(query) {
  try {
    return typeof window.matchMedia === 'function' && !!window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

function watchMedia(query, onChange) {
  try {
    if (typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    if (typeof list.addEventListener === 'function') list.addEventListener('change', onChange);
    else if (typeof list.addListener === 'function') list.addListener(onChange);
  } catch {
    /* Préférence indisponible : les choix explicites restent actifs. */
  }
}

/* Thème effectif : la bascule « accessibilité » force « hc », sinon le choix
   explicite est respecté, et « auto » suit les préférences système. */
function effectiveTheme() {
  if (S.access) return 'hc';
  if (S.theme === 'auto') return (S.autoMore || S.autoForced) ? 'hc' : 'standard';
  return S.theme;
}

/* Mesures réellement calculées depuis les jetons calculés du document, jamais
   saisies à la main. Aucune graine, aucun hasard. */
function parseColor(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return m[1].split('').map((c) => parseInt(c + c, 16));
  m = /^#([0-9a-f]{6})$/.exec(v);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(v);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])].map(Math.round);
  return null;
}

function channel(value) {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(rgb) {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function token(name) {
  try {
    return window.getComputedStyle(document.documentElement).getPropertyValue(name);
  } catch {
    return '';
  }
}

function tokenRatio(fgName, bgName) {
  const fg = parseColor(token(fgName));
  const bg = parseColor(token(bgName));
  if (!fg || !bg) return null;
  return contrast(fg, bg);
}

function fr(value) {
  return value === null || !isFinite(value) ? 'n. d.' : value.toFixed(1).replace('.', ',');
}

function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function applyState() {
  const eff = effectiveTheme();
  const root = document.documentElement;
  root.dataset.e087Theme = eff;
  root.dataset.e087Access = S.access ? '1' : '0';
  root.dataset.e087Source = S.access
    ? 'accessibilite'
    : (S.theme === 'auto'
      ? ((S.autoMore || S.autoForced) ? 'systeme' : 'defaut')
      : 'choix');
  root.dataset.e087MoreContrast = S.autoMore ? '1' : '0';
  root.dataset.e087Forced = S.autoForced ? '1' : '0';
  root.dataset.e087Reduced = S.reduced ? '1' : '0';

  if (S.layout && S.layout.isConnected) {
    S.layout.dataset.e087Theme = eff;
    S.layout.dataset.e087Access = S.access ? '1' : '0';
    S.layout.dataset.e087Reduced = S.reduced ? '1' : '0';
  }

  const n = S.nodes;
  if (n.toggle) {
    setText(n.toggle, S.access
      ? 'Mode accessibilité : activé'
      : 'Mode accessibilité : désactivé');
    n.toggle.setAttribute('aria-pressed', String(S.access));
  }
  if (n.radioAuto) n.radioAuto.checked = S.theme === 'auto';
  if (n.radioHc) n.radioHc.checked = S.theme === 'hc';
  if (n.radioMono) n.radioMono.checked = S.theme === 'mono';

  const mainRatio = tokenRatio('--gold', '--bg');
  const bodyRatio = tokenRatio('--ink', '--bg');
  const softRatio = tokenRatio('--muted-2', '--surface');
  const source = S.access
    ? 'bascule accessibilité'
    : (S.theme === 'auto'
      ? ((S.autoMore || S.autoForced) ? 'préférence système' : 'réglage par défaut')
      : 'choix explicite');
  setText(n.readout,
    `Thème effectif : ${eff} (${source}). Contraste calculé — accent/fond ${fr(mainRatio)} : 1 `
    + `(référence composants 3:1), texte/fond ${fr(bodyRatio)} : 1 (référence AA 4,5:1), `
    + `texte secondaire/surface ${fr(softRatio)} : 1 (référence AAA 7:1).`);
  setText(n.note,
    `Préférences : plus de contraste ${S.autoMore ? 'oui' : 'non'} · `
    + `couleurs forcées ${S.autoForced ? 'oui' : 'non'} · `
    + `mouvement réduit ${S.reduced ? 'oui' : 'non'}. `
    + `La bascule force la palette quel que soit le thème choisi, sans l'écraser.`);
}

/* Garde d'existence : un seul panneau `#e087-panel`, réutilisé s'il est encore
   connecté, sinon recréé et déplacé dans le `main` courant après re-render. */
function ensurePanel(ctx, main) {
  let panel = document.getElementById(PANEL_ID);
  const fresh = !panel || !panel.parentElement || !panel.parentElement.isConnected;
  if (fresh) {
    panel = ctx.el('section', 'e087-panel');
    panel.id = PANEL_ID;
    panel.setAttribute('aria-labelledby', TITLE_ID);

    const title = ctx.el('h2', 'e087-title', 'Accessibilité & surcharge de thème');
    title.id = TITLE_ID;

    const row = ctx.el('div', 'e087-row');
    const toggle = ctx.el('button', 'e087-btn');
    toggle.type = 'button';
    toggle.id = TOGGLE_ID;
    row.appendChild(toggle);

    const fieldset = ctx.el('fieldset', 'e087-themes');
    fieldset.id = GROUP_ID;
    fieldset.setAttribute('role', 'radiogroup');
    fieldset.setAttribute('aria-label', 'Thème de la vue Chronologie');
    fieldset.appendChild(ctx.el('legend', '', 'Thème'));

    const choices = [
      [RADIO_AUTO_ID, 'auto', ' Auto'],
      [RADIO_HC_ID, 'hc', ' Contraste élevé'],
      [RADIO_MONO_ID, 'mono', ' Monochrome'],
    ];
    choices.forEach(([id, value, label]) => {
      const wrap = ctx.el('label', 'e087-choice');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'e087-theme';
      input.id = id;
      input.value = value;
      wrap.append(input, document.createTextNode(label));
      fieldset.appendChild(wrap);
    });

    const readout = ctx.el('p', 'e087-readout');
    readout.id = READOUT_ID;
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
    const note = ctx.el('p', 'e087-note');
    note.id = NOTE_ID;

    panel.append(title, row, fieldset, readout, note);
  }

  const status = main.querySelector('#atlas-chrono-status');
  if (status && status.nextSibling) main.insertBefore(panel, status.nextSibling);
  else main.prepend(panel);

  S.nodes = {
    panel,
    toggle: document.getElementById(TOGGLE_ID),
    radioAuto: document.getElementById(RADIO_AUTO_ID),
    radioHc: document.getElementById(RADIO_HC_ID),
    radioMono: document.getElementById(RADIO_MONO_ID),
    readout: document.getElementById(READOUT_ID),
    note: document.getElementById(NOTE_ID),
  };
  return fresh;
}

/* Les deux écouteurs de préférences système sont module-level : un seul
   enregistrement, même si runEnhancements est rejoué à chaque rendu
   (chronology.js:539, registry.js:39-42). */
function installMediaWatchers() {
  if (S.mediaWatched) return;
  S.mediaWatched = true;

  const onMore = (event) => {
    S.autoMore = typeof event.matches === 'boolean'
      ? !!event.matches : readMedia(MORE_CONTRAST_QUERY);
    applyState();
  };
  const onForced = (event) => {
    S.autoForced = typeof event.matches === 'boolean'
      ? !!event.matches : readMedia(FORCED_COLORS_QUERY);
    applyState();
  };
  watchMedia(MORE_CONTRAST_QUERY, onMore);
  watchMedia(FORCED_COLORS_QUERY, onForced);
}

/* Les contrôles sont attachés à chaque rendu, mais avec une garde par nœud :
   un panneau réutilisé n'est pas doublement lié, un panneau recréé l'est. */
function bindControls() {
  const toggle = document.getElementById(TOGGLE_ID);
  if (toggle && toggle.dataset.e087Bound !== '1') {
    toggle.dataset.e087Bound = '1';
    toggle.addEventListener('click', () => {
      S.access = !S.access;
      applyState();
    });
  }
  [[RADIO_AUTO_ID, 'auto'], [RADIO_HC_ID, 'hc'], [RADIO_MONO_ID, 'mono']]
    .forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (!input || input.dataset.e087Bound === '1') return;
      input.dataset.e087Bound = '1';
      input.addEventListener('change', () => {
        if (!input.checked) return;
        S.theme = value;
        applyState();
      });
    });
}

register('E087', (ctx) => {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout
    || (ctx.stage && typeof ctx.stage.querySelector === 'function'
      ? ctx.stage.querySelector('.chronology-layout') : null);
  if (!layout || typeof layout.querySelector !== 'function') return;
  const main = layout.querySelector('#atlas-chrono-main');
  if (!main) return; /* la vue chronologie n'est pas rendue : lentille inactive */

  ctx.css(CSS_ID, CSS);
  layout.classList.add('chronology-e087');

  S.layout = layout;
  S.reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  S.autoMore = readMedia(MORE_CONTRAST_QUERY);
  S.autoForced = readMedia(FORCED_COLORS_QUERY);

  ensurePanel(ctx, main);
  bindControls();
  installMediaWatchers();
  applyState();
});
