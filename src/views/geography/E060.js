import { register } from './registry.js';

/* Lentille E060 — vue GEOGRAPHIE.
 * Thème : thème sombre / clair.
 *
 * Les dix chantiers E060-01 … E060-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E060.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le texte pédagogique est du texte sémantique réel (titre,
 * paragraphes, tableau, statut) présent dans le DOM : le panneau reste
 * lisible et compréhensible même si aucune animation ne démarre.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const PREFIX = 'geography-e060';
const CSS_ID = 'geography-e060';
const PANEL_ID = PREFIX + '-panel';
const TITLE_ID = PREFIX + '-title';
const INTRO_ID = PREFIX + '-intro';
const CHOICES_LABEL_ID = PREFIX + '-choices-label';
const GROUP_ID = PREFIX + '-choices';
const RADIO_IDS = {
  dark: PREFIX + '-theme-dark',
  light: PREFIX + '-theme-light',
  system: PREFIX + '-theme-system',
};
const CONTRAST_ID = PREFIX + '-contrast';
const TABLE_ID = PREFIX + '-table';
const PREVIEW_BTN_ID = PREFIX + '-preview-run';
const PREVIEW_ID = PREFIX + '-preview-readout';
const PREVIEW_BAR_ID = PREFIX + '-preview-bar';
const STATUS_ID = PREFIX + '-status';
const NOTE_ID = PREFIX + '-note';

/* Attribut posé sur <html> : les variables du design system sont redéfinies
 * pour le thème clair sans toucher à styles.css (fichier partagé). */
const THEME_ATTR = 'data-geography-e060-theme';
const STORE_KEY = 'geography-e060-theme';

/* Palettes réelles : ce sont les couleurs déjà utilisées par le projet,
 * recopiées ici comme référence de calcul — aucune valeur n'est inventée. */
const PALETTES = {
  dark: { label: 'Sombre', ink: '#f2ede3', bg: '#070a0e' },
  light: { label: 'Clair', ink: '#1b1a17', bg: '#f4f1ea' },
};

const MODES = [
  { key: 'dark', label: 'Sombre', desc: 'Texte clair sur fond sombre, réglage par défaut de l’atlas.' },
  { key: 'light', label: 'Clair', desc: 'Texte sombre sur fond pâle, pour les environnements très éclairés.' },
  { key: 'system', label: 'Système', desc: 'Suit la préférence du système d’exploitation, en direct.' },
];

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  choice: 'dark',
  effective: 'dark',
  reduced: false,
  lastMessage: 'Choix du thème prêt : sombre, clair ou système.',
  prefMq: null,
  prefReady: false,
  visibilityReady: false,
  preview: null,
};

/* ---------- E060-05 : contraste WCAG calculé, sans graine ni réseau ---------- */

function hexToRgb(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(hex));
  if (!match) return [0, 0, 0];
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const rgb = hexToRgb(hex);
  return 0.2126 * srgbToLinear(rgb[0])
    + 0.7152 * srgbToLinear(rgb[1])
    + 0.0722 * srgbToLinear(rgb[2]);
}

function contrastOf(palette) {
  const a = luminance(palette.ink);
  const b = luminance(palette.bg);
  const high = Math.max(a, b);
  const low = Math.min(a, b);
  return (high + 0.05) / (low + 0.05);
}

function frenchNumber(value) {
  return value.toFixed(1).replace('.', ',');
}

function verdict(ratio) {
  if (ratio >= 7) return 'conforme AAA (seuil 7 pour 1)';
  if (ratio >= 4.5) return 'conforme AA (seuil 4,5 pour 1)';
  return 'au-dessous des seuils AA et AAA';
}

/* ---------- E060-03 / E060-04 : résolution et application du thème ---------- */

function systemPrefersLight() {
  try {
    return !!(typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-color-scheme: light)').matches);
  } catch {
    return false;
  }
}

function effectiveFor(choice) {
  if (choice === 'system') return systemPrefersLight() ? 'light' : 'dark';
  return choice === 'light' ? 'light' : 'dark';
}

function applyTheme() {
  S.effective = effectiveFor(S.choice);
  try {
    const root = (typeof document !== 'undefined') ? document.documentElement : null;
    if (root && root.setAttribute) root.setAttribute(THEME_ATTR, S.effective);
  } catch {
    /* Sans document, le calcul et l'affichage chiffré restent disponibles. */
  }
  updateContrast();
  updatePreviewReadout();
}

function announce(message) {
  S.lastMessage = message;
  const status = document.getElementById(STATUS_ID);
  if (status) status.textContent = message;
}

/* ---------- E060-07 : persistance locale, avec repli mémoire ---------- */

function loadChoice() {
  try {
    const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem(STORE_KEY) : null;
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  } catch {
    /* Stockage indisponible : on garde le choix en mémoire de module. */
  }
  return 'dark';
}

function saveChoice(choice) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORE_KEY, choice);
  } catch {
    /* Aucune conséquence : l'état de module suffit pour la session. */
  }
}

/* ---------- E060-04 : suivi en direct de la préférence système ---------- */

function installPreferenceListener() {
  if (S.prefReady || typeof window === 'undefined' || !window.matchMedia) return;
  S.prefReady = true;
  try {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    S.prefMq = mq;
    const handler = () => {
      if (S.choice !== 'system') return;
      applyTheme();
      syncRadios();
      announce(`Préférence système modifiée : thème ${S.effective} appliqué.`);
    };
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
    else if (typeof mq.addListener === 'function') mq.addListener(handler);
  } catch {
    /* Navigation sans matchMedia : le mode manuel fonctionne quand même. */
  }
}

function installVisibility() {
  if (S.visibilityReady || typeof document === 'undefined') return;
  S.visibilityReady = true;
  document.addEventListener('visibilitychange', () => {
    /* E060-10 : l'aperçu reprend sans saut au retour de l'onglet. */
    if (S.preview && !document.hidden) S.preview.last = 0;
  });
}

/* ---------- E060-01 : feuille de style isolée, une seule injection ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 6px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--muted);font-size:10px;line-height:1.65;
}
.${PREFIX}-title{margin:0 0 6px;font-size:12px;color:var(--gold-bright);}
.${PREFIX}-intro,.${PREFIX}-note{margin:4px 0 8px;font-size:10px;line-height:1.65;color:var(--muted);}
.${PREFIX}-note{color:var(--gold-bright);}
.${PREFIX}-choices-label{display:block;margin:8px 0 5px;font-size:9px;font-weight:600;
  text-transform:uppercase;letter-spacing:.06em;color:var(--gold-bright);}
.${PREFIX}-choices{display:flex;flex-wrap:wrap;gap:6px;}
.${PREFIX}-radio{
  display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:88px;
  padding:8px 12px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--muted);font:inherit;font-size:10px;line-height:1.3;cursor:pointer;
}
.${PREFIX}-radio:hover{border-color:var(--gold);color:var(--gold-bright);}
.${PREFIX}-radio[aria-checked="true"]{
  border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.12);font-weight:600;
}
.${PREFIX}-radio:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px;}
.${PREFIX}-contrast{
  min-height:16px;margin:10px 0 6px;padding:7px 9px;border-left:2px solid var(--gold);
  color:var(--ink);font-size:10px;line-height:1.6;font-variant-numeric:tabular-nums;
}
.${PREFIX}-table{width:100%;border-collapse:collapse;margin:8px 0 10px;font-size:10px;}
.${PREFIX}-table caption{text-align:left;padding:0 0 4px;color:var(--gold-bright);font-size:10px;}
.${PREFIX}-table th,.${PREFIX}-table td{border-bottom:1px solid var(--line);padding:5px 6px;text-align:left;vertical-align:top;}
.${PREFIX}-table th{font-weight:600;color:var(--gold-bright);font-size:9px;text-transform:uppercase;letter-spacing:.04em;}
.${PREFIX}-table td{font-variant-numeric:tabular-nums;}
.${PREFIX}-preview{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 4px;}
.${PREFIX}-run{
  min-height:44px;min-width:44px;padding:7px 12px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--muted);font:inherit;font-size:10px;cursor:pointer;
}
.${PREFIX}-run:hover{border-color:var(--gold);color:var(--gold-bright);}
.${PREFIX}-run:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px;}
.${PREFIX}-track{flex:1 1 160px;min-width:120px;height:12px;border:1px solid var(--line);border-radius:999px;overflow:hidden;}
.${PREFIX}-bar{height:100%;width:0;background:var(--gold);border-radius:999px;}
.${PREFIX}-readout{flex:1 1 200px;color:var(--ink);font-size:10px;font-variant-numeric:tabular-nums;}
.${PREFIX}-status{
  min-height:16px;margin:8px 0 0;padding:6px 8px;border-left:2px solid var(--gold);
  color:var(--ink);font-size:10px;font-variant-numeric:tabular-nums;
}

/* E060-03 : redéfinition des variables du design system pour le thème clair. */
html[${THEME_ATTR}="light"]{
  --bg:#f4f1ea;--surface:#ffffff;--surface-2:#f0ece3;
  --line:rgba(20,20,25,.16);--line-strong:rgba(120,80,20,.32);
  --ink:#1b1a17;--ink-soft:#2b2925;--muted:#5c574f;--muted-2:#7a756c;
  --gold:#8a5a12;--gold-bright:#6d460a;color-scheme:light;
}
html[${THEME_ATTR}="dark"]{color-scheme:dark;}

/* Correctifs des rares couleurs codées en dur dans la vue géographie. */
html[${THEME_ATTR}="light"] .geo-controls button{
  background:rgba(255,255,255,.9);border-color:rgba(20,20,25,.18);color:#1b1a17;
}
html[${THEME_ATTR}="light"] .geo-controls button:hover{color:var(--gold-bright);}
html[${THEME_ATTR}="light"] .geo-marker:focus .geo-ring{stroke:#1b1a17;}

@media (prefers-reduced-motion:reduce){
  .${PREFIX}-radio,.${PREFIX}-run,.${PREFIX}-bar{transition:none;}
}
@media (max-width:620px){
  #${PANEL_ID}{padding:10px;}
  .${PREFIX}-radio{min-width:78px;padding:7px 9px;}
  .${PREFIX}-run{min-height:40px;min-width:40px;}
}`;

/* ---------- E060-02 / E060-08 : choix unique en radiogroup ---------- */

function syncRadios() {
  Object.keys(RADIO_IDS).forEach((key) => {
    const node = document.getElementById(RADIO_IDS[key]);
    if (!node) return;
    const checked = key === S.choice;
    node.setAttribute('aria-checked', checked ? 'true' : 'false');
    node.setAttribute('tabindex', checked ? '0' : '-1');
  });
}

function selectMode(key, moveFocus = false) {
  if (!MODES.some((m) => m.key === key)) return;
  S.choice = key;
  saveChoice(key);
  applyTheme();
  syncRadios();
  const mode = MODES.find((m) => m.key === key);
  announce(`Thème ${mode ? mode.label.toLowerCase() : key} appliqué : ${S.effective === 'light' ? 'clair' : 'sombre'}.`);
  if (moveFocus) {
    const node = document.getElementById(RADIO_IDS[key]);
    if (node) node.focus({ preventScroll: true });
  }
}

function onGroupKey(event) {
  const group = event.currentTarget;
  if (!group || !(event.target instanceof Element)) return;
  const radio = event.target.closest('[role="radio"]');
  if (!radio || !group.contains(radio)) return;
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
  if (!keys.includes(event.key)) return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  event.stopPropagation();
  let index = MODES.findIndex((m) => RADIO_IDS[m.key] === radio.id);
  if (index < 0) index = 0;
  let next = index;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = MODES.length - 1;
  else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % MODES.length;
  else next = (index - 1 + MODES.length) % MODES.length;
  selectMode(MODES[next].key, true);
}

/* ---------- E060-05 / E060-06 : mesure et tableau comparatif ---------- */

function updateContrast() {
  const node = document.getElementById(CONTRAST_ID);
  if (!node) return;
  const palette = PALETTES[S.effective];
  const ratio = contrastOf(palette);
  node.textContent = `Contraste calculé du thème ${palette.label.toLowerCase()} : `
    + `${frenchNumber(ratio)} pour 1 (texte ${palette.ink} sur fond ${palette.bg}). `
    + `Verdict : ${verdict(ratio)}.`;
}

function buildTable(ctx) {
  const table = ctx.el('table', PREFIX + '-table');
  table.id = TABLE_ID;
  table.appendChild(ctx.el('caption', '', 'Comparaison des thèmes — rapport de contraste calculé'));
  const head = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Apparence', 'Texte', 'Fond', 'Contraste', 'Verdict'].forEach((label) => {
    headRow.appendChild(ctx.el('th', '', label));
  });
  head.appendChild(headRow);
  const body = ctx.el('tbody');
  MODES.forEach((mode) => {
    const row = ctx.el('tr');
    row.appendChild(ctx.el('td', '', mode.label));
    if (mode.key === 'system') {
      row.appendChild(ctx.el('td', '', 'selon le système'));
      row.appendChild(ctx.el('td', '', 'selon le système'));
      row.appendChild(ctx.el('td', '', 'variable'));
      row.appendChild(ctx.el('td', '', 'suit la préférence en direct'));
    } else {
      const palette = PALETTES[mode.key];
      const ratio = contrastOf(palette);
      row.appendChild(ctx.el('td', '', palette.ink));
      row.appendChild(ctx.el('td', '', palette.bg));
      row.appendChild(ctx.el('td', '', `${frenchNumber(ratio)} pour 1`));
      row.appendChild(ctx.el('td', '', verdict(ratio)));
    }
    body.appendChild(row);
  });
  table.append(head, body);
  return table;
}

/* ---------- E060-10 : unique boucle rAF, aperçu de contraste ---------- */

function updatePreviewReadout() {
  const node = document.getElementById(PREVIEW_ID);
  if (!node) return;
  const ratio = contrastOf(PALETTES[S.effective]);
  node.textContent = `Échelle de l’aperçu : ${frenchNumber(ratio / 21 * 100)} % pour un rapport de `
    + `${frenchNumber(ratio)} pour 1 (maximum de l’échelle : 21 pour 1).`;
}

function paintBar(value) {
  const bar = document.getElementById(PREVIEW_BAR_ID);
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
  const out = document.getElementById(PREVIEW_ID);
  if (out && S.preview) {
    out.textContent = `Aperçu en cours : ${frenchNumber(value)} % de l’échelle de contraste.`;
  }
}

function syncPreviewButton() {
  const button = document.getElementById(PREVIEW_BTN_ID);
  if (!button) return;
  button.textContent = S.preview ? '■ Arrêter l’aperçu' : '▶ Lancer l’aperçu de contraste';
}

function stopPreview(silent = false) {
  const preview = S.preview;
  if (!preview) return;
  if (preview.rafId) cancelAnimationFrame(preview.rafId);
  S.preview = null;
  syncPreviewButton();
  updatePreviewReadout();
  if (!silent) announce('Aperçu de contraste arrêté.');
}

function tickPreview(timestamp) {
  const preview = S.preview;
  if (!preview) return;
  preview.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) {
    /* Pause : l'horodatage est gelé, la barre n'avance pas. */
    preview.last = timestamp;
    preview.rafId = requestAnimationFrame(tickPreview);
    return;
  }
  if (!preview.last) preview.last = timestamp;
  const elapsed = Math.min(timestamp - preview.last, 80);
  preview.last = timestamp;
  preview.value = Math.min(preview.target, preview.value + elapsed / 8);
  paintBar(preview.value);
  if (preview.value >= preview.target) {
    stopPreview(true);
    announce(`Aperçu terminé : barre à ${frenchNumber(preview.target)} % de l’échelle.`);
    return;
  }
  preview.rafId = requestAnimationFrame(tickPreview);
}

function startPreview() {
  stopPreview(true);
  const ratio = contrastOf(PALETTES[S.effective]);
  const target = Math.min(100, ratio / 21 * 100);
  if (S.reduced) {
    /* Mouvement réduit : même résultat, sans aucune boucle d'animation. */
    const bar = document.getElementById(PREVIEW_BAR_ID);
    if (bar) bar.style.width = `${target.toFixed(1)}%`;
    announce(`Aperçu affiché instantanément à ${frenchNumber(target)} % (mouvement réduit).`);
    return;
  }
  S.preview = { rafId: 0, last: 0, value: 0, target };
  syncPreviewButton();
  paintBar(0);
  announce(`Aperçu de contraste lancé : cible ${frenchNumber(target)} %.`);
  S.preview.rafId = requestAnimationFrame(tickPreview);
}

/* ---------- E060-01 / E060-02 : panneau sémantique complet ---------- */

function radio(ctx, key) {
  const mode = MODES.find((m) => m.key === key);
  const node = ctx.el('button', PREFIX + '-radio', mode.label);
  node.type = 'button';
  node.id = RADIO_IDS[key];
  node.setAttribute('role', 'radio');
  node.setAttribute('aria-checked', 'false');
  node.setAttribute('tabindex', '-1');
  node.title = mode.desc;
  node.addEventListener('click', () => selectMode(key));
  return node;
}

function ensurePanel(ctx) {
  const layout = ctx.layout || ctx.stage;
  let panel = document.getElementById(PANEL_ID);
  if (!panel || (layout && !layout.contains(panel))) {
    panel = ctx.el('section', PREFIX + '-panel');
    panel.id = PANEL_ID;
    panel.setAttribute('aria-labelledby', TITLE_ID);

    const title = ctx.el('h2', PREFIX + '-title', 'Thème sombre et clair');
    title.id = TITLE_ID;
    panel.appendChild(title);

    const intro = ctx.el('p', PREFIX + '-intro',
      'L’atlas est conçu en sombre : texte clair sur fond profond. Ce panneau permet de choisir '
      + 'une apparence claire, de revenir au sombre ou de suivre le réglage du système. Le choix '
      + 'est appliqué immédiatement à toute l’interface et reste lisible sans aucune animation. '
      + 'Les rapports de contraste ci-dessous sont recalculés depuis les couleurs elles-mêmes.');
    intro.id = INTRO_ID;
    panel.appendChild(intro);

    const label = ctx.el('span', PREFIX + '-choices-label', 'Apparence de l’interface');
    label.id = CHOICES_LABEL_ID;
    panel.appendChild(label);

    const group = ctx.el('div', PREFIX + '-choices');
    group.id = GROUP_ID;
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-labelledby', CHOICES_LABEL_ID);
    MODES.forEach((mode) => group.appendChild(radio(ctx, mode.key)));
    group.addEventListener('keydown', onGroupKey);
    panel.appendChild(group);

    const contrast = ctx.el('p', PREFIX + '-contrast', '');
    contrast.id = CONTRAST_ID;
    panel.appendChild(contrast);

    panel.appendChild(buildTable(ctx));

    const preview = ctx.el('div', PREFIX + '-preview');
    const run = ctx.el('button', PREFIX + '-run', '▶ Lancer l’aperçu de contraste');
    run.type = 'button';
    run.id = PREVIEW_BTN_ID;
    run.addEventListener('click', () => (S.preview ? stopPreview() : startPreview()));
    const track = ctx.el('div', PREFIX + '-track');
    const bar = ctx.el('div', PREFIX + '-bar');
    bar.id = PREVIEW_BAR_ID;
    track.appendChild(bar);
    const readout = ctx.el('span', PREFIX + '-readout', '');
    readout.id = PREVIEW_ID;
    preview.append(run, track, readout);
    panel.appendChild(preview);

    const status = ctx.el('p', PREFIX + '-status', S.lastMessage);
    status.id = STATUS_ID;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    panel.appendChild(status);

    const note = ctx.el('p', PREFIX + '-note',
      'Le mode « Système » suit la préférence du système en direct. Avec « mouvement réduit », '
      + 'l’aperçu affiche son résultat final sans progression animée ; l’onglet masqué met la '
      + 'barre en pause. Les flèches, Début et Fin parcourent les trois choix, Échap n’est pas '
      + 'nécessaire : le thème est appliqué dès la sélection.');
    note.id = NOTE_ID;
    panel.appendChild(note);

    layout.appendChild(panel);
  }

  const status = document.getElementById(STATUS_ID);
  if (status) status.textContent = S.lastMessage;
  panel.dataset.choice = S.choice;
  panel.dataset.effective = S.effective;
  panel.dataset.reduced = S.reduced ? '1' : '0';
  return panel;
}

/* ---------- Point d'entrée ---------- */

register('E060', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (!ctx.layout || typeof ctx.layout.appendChild !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'geography') return;

  /* E060-01 : une seule feuille de style, injectée une seule fois. */
  ctx.css(CSS_ID, CSS);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.choice = loadChoice();
  installPreferenceListener();
  installVisibility();
  applyTheme();
  ensurePanel(ctx);
  syncRadios();
  syncPreviewButton();
  updateContrast();

  /* Si un aperçu était en cours avant un re-render, on repeint la barre sur
     le nouvel élément et on poursuit la même boucle, sans en créer une autre. */
  if (S.preview) {
    const bar = document.getElementById(PREVIEW_BAR_ID);
    if (bar) bar.style.width = `${S.preview.value.toFixed(1)}%`;
  }
  if (S.preview && S.reduced) stopPreview(true);
});
