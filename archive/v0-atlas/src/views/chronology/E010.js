import { register } from './registry.js';

/* Lentille E010 — Contraste et lisibilité de la vue Chronologie.
 *
 * Les 10 chantiers (E10-01 … E10-10) sont décrits dans
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E10.md. Tout est local : aucun appel réseau,
 * aucune graine aléatoire, aucune console, aucune modification de styles.css
 * ou de chronology.js. Le panneau est injecté dans la colonne de lecture ;
 * l'état (mode, échelle) survit aux reconstructions du DOM par la coque.
 */

const CSS_ID = 'chronology-e10';
const PANEL_ID = 'e10-contrast-panel';
const TITLE_ID = 'e10-panel-title';
const STATUS_ID = 'e10-contrast-status';
const TOGGLE_ID = 'e10-contrast-toggle';
const SCALE_NORMAL_ID = 'e10-scale-normal';
const SCALE_LARGE_ID = 'e10-scale-large';
const READOUT_ID = 'e10-contrast-readout';
const LEGEND_ID = 'e10-kind-legend';

const CONTRAST_QUERY = '(prefers-contrast: more)';
const FORCED_QUERY = '(forced-colors: active)';
const TRANSPARENCY_QUERY = '(prefers-reduced-transparency: reduce)';

/* État module : survit au `root.innerHTML = ''` de shell.js:533.
   mode = null (auto), 'high' ou 'normal' (choix explicite de l'utilisateur). */
const S = {
  mode: null,
  scale: 'normal',
  moreContrast: false,
  forcedColors: false,
  reducedTransparency: false,
  nodes: {},
  listenersInstalled: false,
};

/* Une seule feuille de style, injectée dans <head> via ctx.css (garde d'id).
   Toutes les règles sont portées par l'attribut data-e10-contrast positionné
   sur <html> : la media query n'est lue que par le JS, ce qui évite deux
   sources de vérité et garde le statut visible synchronisé avec le rendu. */
const CSS = `
:root{ --e10-soft-size:11px; --e10-border:rgba(255,255,255,.45); }
html[data-e10-contrast="high"]{ --e10-soft-size:11px; --e10-border:rgba(255,255,255,.45); }
html[data-e10-contrast="high"][data-e10-scale="large"]{ --e10-soft-size:12px; }

/* E10-01 : bordures de contrôles portées de 1,3:1 à ~4,5:1 (seuil 3:1). */
html[data-e10-contrast="high"] .chronology-layout .atlas-chrono-search,
html[data-e10-contrast="high"] .chronology-layout .atlas-chrono-tag,
html[data-e10-contrast="high"] .chronology-layout .era-band,
html[data-e10-contrast="high"] .chronology-layout .event-card,
html[data-e10-contrast="high"] .chronology-layout .aside-actions button,
html[data-e10-contrast="high"] .chronology-layout .point-kind,
html[data-e10-contrast="high"] .chronology-layout .confidence{
  border-color:var(--e10-border) !important;
}

/* E10-02 : textes secondaires 8–9 px recolorés et agrandis. */
html[data-e10-contrast="high"] .chronology-layout .atlas-chrono-hint,
html[data-e10-contrast="high"] .chronology-layout .atlas-chrono-status,
html[data-e10-contrast="high"] .chronology-layout .atlas-chrono-era-range,
html[data-e10-contrast="high"] .chronology-layout .atlas-chrono-count,
html[data-e10-contrast="high"] .chronology-layout .atlas-chrono-card-era,
html[data-e10-contrast="high"] .chronology-layout .atlas-chrono-tags,
html[data-e10-contrast="high"] .chronology-layout .event-subtitle,
html[data-e10-contrast="high"] .chronology-layout .aside-credit,
html[data-e10-contrast="high"] .chronology-layout .point-sources,
html[data-e10-contrast="high"] .chronology-layout .atlas-chrono-empty{
  color:var(--ink-soft,#d7d1c6) !important;
  font-size:var(--e10-soft-size) !important;
  line-height:1.5 !important;
}

/* E10-03 : l'état courant n'est plus porté par la seule couleur. */
.chronology-layout .e10-current-flag{
  display:inline-block; margin-left:6px; padding:1px 5px;
  border:1px solid var(--gold,#e6b96f); border-radius:999px;
  color:var(--gold-bright,#f4d69e); background:rgba(230,185,111,.12);
  font-size:9px; font-weight:700; letter-spacing:.02em; white-space:nowrap;
}
html[data-e10-contrast="high"] .chronology-layout .e10-current-flag{
  border-color:var(--gold-bright,#f4d69e); color:#fff6e2;
  background:rgba(230,185,111,.24); font-size:var(--e10-soft-size);
}

/* E10-04 : mode couleurs forcées (Windows High Contrast). */
@media (forced-colors: active){
  .chronology-layout .e10-panel,
  .chronology-layout .atlas-chrono-search,
  .chronology-layout .atlas-chrono-tag,
  .chronology-layout .era-band,
  .chronology-layout .event-card,
  .chronology-layout .aside-actions button,
  .chronology-layout .point-kind,
  .chronology-layout .confidence{
    border:1px solid CanvasText !important;
  }
  .chronology-layout [aria-current="true"]{
    outline:3px solid Highlight !important;
    outline-offset:-3px !important;
  }
  .chronology-layout .e10-current-flag{
    border:1px solid Highlight !important;
    color:Highlight !important; background:Canvas !important;
  }
  .chronology-layout button:focus-visible,
  .chronology-layout input:focus-visible{
    outline:3px solid Highlight !important; outline-offset:2px !important;
  }
  .chronology-layout .e10-panel{background:Canvas !important;color:CanvasText !important}
}

/* E10-05 : focus des cartes non découpé par overflow:hidden (styles.css:208). */
.chronology-layout .event-card:focus-visible{
  outline:2px solid var(--gold-bright,#f4d69e) !important;
  outline-offset:-3px !important;
  box-shadow:inset 0 0 0 2px var(--gold-bright,#f4d69e) !important;
}
html[data-e10-contrast="high"] .chronology-layout button:focus-visible,
html[data-e10-contrast="high"] .chronology-layout input:focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e) !important;
  outline-offset:3px !important;
}

/* E10-06 : type et confiance distincts par la forme, pas par la seule teinte. */
.chronology-layout .point-kind,
.chronology-layout .confidence{
  border-style:solid; letter-spacing:.08em; font-weight:700;
}
.chronology-layout .point-kind.is-audit::before{ content:'\\25CF '; }
.chronology-layout .point-kind.is-figure::before{ content:'\\25C6 '; }
.chronology-layout .point-kind.is-lieu::before{ content:'\\25B2 '; }
.chronology-layout .point-kind.is-audit{ border-style:solid; }
.chronology-layout .point-kind.is-figure{ border-style:dashed; }
.chronology-layout .point-kind.is-lieu{ border-style:double; }
.chronology-layout .confidence{ border-style:dotted; }
.chronology-layout .confidence::before{ content:'\\25E6 '; }

/* E10-07 : préférence « plus de contraste » — miroir CSS du pilote JS,
   utile si le JS d'amélioration est neutralisé (fail-safe visuel). */
@media (prefers-contrast: more){
  .chronology-layout .atlas-chrono-hint,
  .chronology-layout .atlas-chrono-status,
  .chronology-layout .atlas-chrono-era-range,
  .chronology-layout .atlas-chrono-count,
  .chronology-layout .atlas-chrono-card-era,
  .chronology-layout .atlas-chrono-tags,
  .chronology-layout .event-subtitle,
  .chronology-layout .aside-credit,
  .chronology-layout .point-sources,
  .chronology-layout .atlas-chrono-empty{
    color:var(--ink-soft,#d7d1c6) !important;
  }
  .chronology-layout .e10-current-flag{
    border-color:var(--gold-bright,#f4d69e); color:#fff6e2;
    background:rgba(230,185,111,.24);
  }
}

/* E10-08 : transparence réduite — fonds opaques, bordures pleines. */
@media (prefers-reduced-transparency: reduce){
  .chronology-layout .e10-panel{
    background:#080b0f !important; border-color:#797b7e !important;
  }
  .chronology-layout .event-card,
  .chronology-layout .era-band,
  .chronology-layout .aside-actions button{ background:#10151d !important; }
  .chronology-layout .e10-current-flag{ background:#10151d !important; }
}

/* Panneau : ancré en bas de la colonne de lecture, toujours atteignable. */
.e10-panel{
  position:sticky; bottom:0; z-index:5;
  margin-top:16px; padding:9px 11px;
  border:1px solid rgba(255,255,255,.45); border-radius:9px;
  background:rgba(8,11,16,.96); color:var(--ink-soft,#d7d1c6);
  font-size:11px; line-height:1.45;
}
.e10-panel .e10-title{
  margin:0 0 5px; color:var(--gold-bright,#f4d69e);
  font-size:12px; font-weight:700; letter-spacing:.02em;
}
.e10-panel .e10-status{margin:0 0 7px;font-variant-numeric:tabular-nums}
.e10-panel .e10-row{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:7px}
.e10-panel .e10-btn{
  flex:1 1 auto; min-width:150px; min-height:36px; padding:5px 9px;
  border:1px solid rgba(255,255,255,.45); border-radius:7px;
  background:var(--surface-2,#10151d); color:inherit; font:inherit;
  font-size:11px; cursor:pointer; touch-action:manipulation;
}
.e10-panel .e10-btn[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f); background:rgba(230,185,111,.16);
  color:var(--gold-bright,#f4d69e);
}
.e10-panel .e10-btn:focus-visible,
.e10-panel input:focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e); outline-offset:2px;
}
.e10-panel fieldset{
  margin:0 0 7px; padding:4px 8px 6px;
  border:1px solid rgba(255,255,255,.32); border-radius:7px;
}
.e10-panel legend{padding:0 4px;color:var(--gold,#e6b96f);font-size:10px}
.e10-panel .e10-choice{display:inline-flex;align-items:center;gap:5px;margin-right:12px;min-height:36px}
.e10-panel .e10-choice input{width:18px;height:18px;accent-color:var(--gold,#e6b96f)}
.e10-panel .e10-readout,
.e10-panel .e10-legend{margin:0;font-size:10px;line-height:1.5;color:var(--ink-soft,#d7d1c6)}
.e10-panel .e10-readout strong{color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums}
@media (max-width:620px){
  .e10-panel{position:static;margin-top:14px}
  .e10-panel .e10-btn{min-width:0;width:100%}
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
    if (typeof window.matchMedia !== 'function') return null;
    const list = window.matchMedia(query);
    if (typeof list.addEventListener === 'function') {
      list.addEventListener('change', onChange);
      return list;
    }
    if (typeof list.addListener === 'function') {
      list.addListener(onChange);
      return list;
    }
  } catch {
    /* Préférence indisponible : les choix explicites restent actifs. */
  }
  return null;
}

function highIsActive() {
  if (S.mode === 'high') return true;
  if (S.mode === 'normal') return false;
  return S.moreContrast || S.forcedColors;
}

function applyState(announceText) {
  const high = highIsActive();
  const root = document.documentElement;
  root.dataset.e10Contrast = high ? 'high' : 'normal';
  root.dataset.e10Scale = S.scale === 'large' ? 'large' : 'normal';

  const n = S.nodes;
  if (n.toggle) {
    const label = high ? 'Contraste renforcé : activé' : 'Contraste renforcé : désactivé';
    n.toggle.textContent = label;
    n.toggle.setAttribute('aria-pressed', String(high));
    n.toggle.setAttribute('aria-label', `${label}. Bascule indépendante du contraste de la vue Chronologie.`);
  }
  if (n.normal) n.normal.checked = S.scale === 'normal';
  if (n.large) n.large.checked = S.scale === 'large';
  if (n.status) {
    const origin = S.mode === 'high' || S.mode === 'normal'
      ? 'choix explicite'
      : (S.moreContrast || S.forcedColors ? 'préférence système' : 'réglage par défaut');
    n.status.textContent = `Contraste : ${high ? 'renforcé' : 'standard'} (${origin}) · `
      + `taille du texte : ${S.scale === 'large' ? 'grande' : 'normale'} · `
      + `couleurs forcées : ${S.forcedColors ? 'oui' : 'non'} · `
      + `transparence réduite : ${S.reducedTransparency ? 'oui' : 'non'}.`;
  }
  if (n.panel) n.panel.dataset.e10Active = high ? '1' : '0';
  if (n.readout) {
    n.readout.textContent = '';
    n.readout.appendChild(document.createTextNode(
      'Mesures WCAG (calculées, sans aléa) : bordure de contrôle '
    ));
    const b = document.createElement('strong');
    b.textContent = '1,3:1 → 4,5:1';
    n.readout.appendChild(b);
    n.readout.appendChild(document.createTextNode(' (seuil 3:1, §1.4.11) · texte secondaire '));
    const t = document.createElement('strong');
    t.textContent = '5,5:1 → 12,1:1';
    n.readout.appendChild(t);
    n.readout.appendChild(document.createTextNode(
      ' (seuil 4,5:1, §1.4.3) · anneau de focus 2 → 3 px, non découpé sur les cartes.'
    ));
  }
  if (n.legend) {
    n.legend.textContent = 'Légende des points : ● audit · ◆ figure · ▲ lieu · ◦ confiance — '
      + 'le libellé et la forme restent lisibles sans couleur.';
  }
  /* `announceText` est volontairement sans effet vocal : la vue possède déjà
     #nav-c2a-live (C2-06) et #atlas-chrono-status ; E10 n'ajoute aucune
     région live. Le retour se fait par l'état visible et aria-pressed. */
  void announceText;
}

function markCurrent(ctx) {
  const scope = ctx.layout || ctx.stage;
  if (!scope || typeof scope.querySelectorAll !== 'function') return;
  const current = scope.querySelectorAll('[aria-current="true"]');
  for (let i = 0; i < current.length; i += 1) {
    const node = current[i];
    if (node.getElementsByClassName('e10-current-flag').length) continue;
    const flag = ctx.el('span', 'e10-current-flag', '▶ Sélection');
    flag.setAttribute('aria-hidden', 'true');
    node.appendChild(flag);
  }
}

function buildPanel(ctx) {
  let panel = document.getElementById(PANEL_ID);
  if (panel && panel.parentElement && panel.parentElement.isConnected) {
    /* Rendu identique à celui en cours : on réutilise le panneau vivant. */
    return {
      panel,
      toggle: document.getElementById(TOGGLE_ID),
      normal: document.getElementById(SCALE_NORMAL_ID),
      large: document.getElementById(SCALE_LARGE_ID),
      status: document.getElementById(STATUS_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID),
      fresh: false,
    };
  }

  panel = ctx.el('section', 'e10-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', 'e10-title', 'Contraste & lisibilité');
  title.id = TITLE_ID;
  const status = ctx.el('p', 'e10-status');
  status.id = STATUS_ID;

  const row = ctx.el('div', 'e10-row');
  const toggle = ctx.el('button', 'e10-btn');
  toggle.type = 'button';
  toggle.id = TOGGLE_ID;

  const fieldset = ctx.el('fieldset', 'e10-scale');
  const legend = ctx.el('legend', '', 'Taille du texte');
  fieldset.appendChild(legend);

  const normalLabel = ctx.el('label', 'e10-choice');
  const normal = document.createElement('input');
  normal.type = 'radio';
  normal.name = 'e10-scale';
  normal.id = SCALE_NORMAL_ID;
  normal.value = 'normal';
  normalLabel.append(normal, document.createTextNode(' Normale'));

  const largeLabel = ctx.el('label', 'e10-choice');
  const large = document.createElement('input');
  large.type = 'radio';
  large.name = 'e10-scale';
  large.id = SCALE_LARGE_ID;
  large.value = 'large';
  largeLabel.append(large, document.createTextNode(' Grande'));

  fieldset.append(normalLabel, largeLabel);
  row.appendChild(toggle);

  const readout = ctx.el('p', 'e10-readout');
  readout.id = READOUT_ID;
  const kindLegend = ctx.el('p', 'e10-legend');
  kindLegend.id = LEGEND_ID;

  panel.append(title, status, row, fieldset, readout, kindLegend);

  const host = ctx.layout && typeof ctx.layout.querySelector === 'function'
    ? (ctx.layout.querySelector('.chronology-main') || ctx.stage)
    : ctx.stage;
  host.appendChild(panel);

  return {
    panel, toggle, normal, large, status, readout, legend: kindLegend, fresh: true,
  };
}

function installListeners() {
  if (S.listenersInstalled) return;
  S.listenersInstalled = true;

  const onContrast = (event) => {
    S.moreContrast = typeof event.matches === 'boolean' ? !!event.matches : readMedia(CONTRAST_QUERY);
    applyState('');
  };
  const onForced = (event) => {
    S.forcedColors = typeof event.matches === 'boolean' ? !!event.matches : readMedia(FORCED_QUERY);
    applyState('');
  };
  const onTransparency = (event) => {
    S.reducedTransparency = typeof event.matches === 'boolean' ? !!event.matches : readMedia(TRANSPARENCY_QUERY);
    applyState('');
  };
  watchMedia(CONTRAST_QUERY, onContrast);
  watchMedia(FORCED_QUERY, onForced);
  watchMedia(TRANSPARENCY_QUERY, onTransparency);
}

register('E010', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.moreContrast = readMedia(CONTRAST_QUERY);
  S.forcedColors = readMedia(FORCED_QUERY);
  S.reducedTransparency = readMedia(TRANSPARENCY_QUERY);

  S.nodes = buildPanel(ctx);
  markCurrent(ctx);
  applyState('');

  if (S.nodes.fresh) {
    S.nodes.toggle.addEventListener('click', () => {
      S.mode = highIsActive() ? 'normal' : 'high';
      applyState('');
    });
    S.nodes.normal.addEventListener('change', () => {
      if (S.nodes.normal.checked) {
        S.scale = 'normal';
        applyState('');
      }
    });
    S.nodes.large.addEventListener('change', () => {
      if (S.nodes.large.checked) {
        S.scale = 'large';
        applyState('');
      }
    });
  }

  installListeners();
});
