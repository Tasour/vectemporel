import { register } from './registry.js';

/* Lentille E096 — vue GEOGRAPHIE.
 * Thème : découpage administratif et codes ISO.
 *
 * Les dix chantiers E096-01 … E096-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E096.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le texte pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableaux, statut) présent dans le DOM : le panneau reste
 * lisible et compréhensible même si aucune animation ne démarre.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const PREFIX = 'geography-e096';
const CSS_ID = 'geography-e096';
const PANEL_ID = PREFIX + '-panel';
const TITLE_ID = PREFIX + '-title';
const INTRO_ID = PREFIX + '-intro';
const LEVELS_TABLE_ID = PREFIX + '-levels-table';
const COUNTRIES_TABLE_ID = PREFIX + '-countries-table';
const FORMAT_LABEL_ID = PREFIX + '-format-label';
const FORMAT_GROUP_ID = PREFIX + '-format-group';
const FORMAT_RADIO_IDS = {
  a2: PREFIX + '-format-a2',
  a3: PREFIX + '-format-a3',
  num: PREFIX + '-format-num',
  cog: PREFIX + '-format-cog',
};
const FORMAT_READOUT_ID = PREFIX + '-format-readout';
const CODE_LABEL_ID = PREFIX + '-code-label';
const CODE_INPUT_ID = PREFIX + '-code-input';
const CHECK_BTN_ID = PREFIX + '-check-btn';
const CHECK_RESULT_ID = PREFIX + '-check-result';
const MEASURE_ID = PREFIX + '-measure';
const ANIM_BTN_ID = PREFIX + '-anim-run';
const ANIM_TRACK_ID = PREFIX + '-anim-track';
const ANIM_BAR_ID = PREFIX + '-anim-bar';
const ANIM_READOUT_ID = PREFIX + '-anim-readout';
const STATUS_ID = PREFIX + '-status';
const NOTE_ID = PREFIX + '-note';

/* Référentiel ISO 3166-1 local, recopié tel quel : aucune valeur inventée,
 * aucun téléchargement. Dix pays suffisent à illustrer les trois formes. */
const COUNTRIES = [
  { a2: 'FR', a3: 'FRA', num: '250', nom: 'France' },
  { a2: 'DE', a3: 'DEU', num: '276', nom: 'Allemagne' },
  { a2: 'IT', a3: 'ITA', num: '380', nom: 'Italie' },
  { a2: 'ES', a3: 'ESP', num: '724', nom: 'Espagne' },
  { a2: 'BE', a3: 'BEL', num: '056', nom: 'Belgique' },
  { a2: 'CH', a3: 'CHE', num: '756', nom: 'Suisse' },
  { a2: 'GB', a3: 'GBR', num: '826', nom: 'Royaume-Uni' },
  { a2: 'US', a3: 'USA', num: '840', nom: 'États-Unis' },
  { a2: 'CA', a3: 'CAN', num: '124', nom: 'Canada' },
  { a2: 'JP', a3: 'JPN', num: '392', nom: 'Japon' },
];

/* Les six niveaux du découpage administratif français, du pays à la commune.
 * Le canton est signalé comme format illustratif pour ne pas prétendre à un
 * code réel précis. */
const LEVELS = [
  { niveau: 'État / pays', format: 'ISO 3166-1 alpha-2 (2 lettres)', code: 'FR', exemple: 'France' },
  { niveau: 'Région', format: 'COG (2 caractères)', code: '11', exemple: 'Île-de-France' },
  { niveau: 'Département', format: 'COG (2 caractères)', code: '75', exemple: 'Paris' },
  { niveau: 'Arrondissement', format: 'COG (3 caractères)', code: '751', exemple: 'Paris' },
  { niveau: 'Canton', format: 'COG (4 caractères)', code: '7501', exemple: 'format illustratif' },
  { niveau: 'Commune', format: 'COG (5 caractères)', code: '75056', exemple: 'Paris' },
];

const FORMATS = [
  { key: 'a2', label: 'Alpha-2', example: 'FR', desc: 'Deux lettres majuscules (ISO 3166-1).' },
  { key: 'a3', label: 'Alpha-3', example: 'FRA', desc: 'Trois lettres majuscules (ISO 3166-1).' },
  { key: 'num', label: 'Numérique', example: '250', desc: 'Trois chiffres (ISO 3166-1).' },
  { key: 'cog', label: 'COG communal', example: '75056', desc: 'Cinq chiffres du Code officiel géographique.' },
];

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  format: 'a2',
  reduced: false,
  lastMessage: 'Panneau prêt :Explorez les niveaux administratifs et les codes ISO.',
  decoded: 'Aucun code vérifié pour l’instant.',
  anim: null,
  visibilityReady: false,
};

/* ---------- E096-04 / E096-05 : validation et décodage d'un code ---------- */

function findByA2(code) {
  return COUNTRIES.find((c) => c.a2 === code) || null;
}

function validateCode(raw) {
  const value = String(raw == null ? '' : raw).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(value)) {
    S.decoded = 'Format invalide : saisissez exactement deux lettres majuscules (ex. FR).';
    announce(S.decoded);
    renderCheckResult();
    return;
  }
  const country = findByA2(value);
  if (!country) {
    S.decoded = `Code ${value} correctement formaté, mais absent du référentiel local (${COUNTRIES.length} pays recensés).`;
    announce(S.decoded);
    renderCheckResult();
    return;
  }
  S.decoded = `${value} → ${country.nom} ; alpha-3 ${country.a3} ; code numérique ${country.num}.`;
  announce(`Code vérifié : ${S.decoded}`);
  renderCheckResult();
}

function renderCheckResult() {
  const node = document.getElementById(CHECK_RESULT_ID);
  if (node) node.textContent = S.decoded;
  const input = document.getElementById(CODE_INPUT_ID);
  if (input) input.setAttribute('aria-invalid', /^Format invalide/.test(S.decoded) ? 'true' : 'false');
}

/* ---------- E096-06 / E096-07 : choix du format et mesures calculées ---------- */

function formatByKey(key) {
  return FORMATS.find((f) => f.key === key) || FORMATS[0];
}

function syncRadios() {
  Object.keys(FORMAT_RADIO_IDS).forEach((key) => {
    const node = document.getElementById(FORMAT_RADIO_IDS[key]);
    if (!node) return;
    const checked = key === S.format;
    node.setAttribute('aria-checked', checked ? 'true' : 'false');
    node.setAttribute('tabindex', checked ? '0' : '-1');
  });
}

function selectFormat(key, moveFocus = false) {
  if (!FORMATS.some((f) => f.key === key)) return;
  S.format = key;
  syncRadios();
  updateFormatReadout();
  const format = formatByKey(key);
  announce(`Format ${format.label.toLowerCase()} sélectionné : ${format.example}.`);
  if (moveFocus) {
    const node = document.getElementById(FORMAT_RADIO_IDS[key]);
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
  const order = FORMATS.map((f) => f.key);
  let index = order.findIndex((key) => FORMAT_RADIO_IDS[key] === radio.id);
  if (index < 0) index = 0;
  let next = index;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = order.length - 1;
  else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % order.length;
  else next = (index - 1 + order.length) % order.length;
  selectFormat(order[next], true);
}

function frenchRatio(a, b) {
  return (a / b).toFixed(1).replace('.', ',');
}

function updateFormatReadout() {
  const node = document.getElementById(FORMAT_READOUT_ID);
  if (!node) return;
  const format = formatByKey(S.format);
  node.textContent = `Format sélectionné : ${format.label} — ${format.desc} `
    + `Exemple ${format.example}, soit ${format.example.length} caractères.`;
}

function updateMeasure() {
  const node = document.getElementById(MEASURE_ID);
  if (!node) return;
  const combos = 26 * 26;
  const ratio = frenchRatio('75056'.length, 'FR'.length);
  node.textContent = `Mesures : un code alpha-2 utilise 2 lettres sur 26, soit ${combos} combinaisons `
    + `possibles. Un code COG communal en utilise 5, soit ${ratio} fois plus. `
    + `Le découpage de la France compte ${LEVELS.length} niveaux et le référentiel local `
    + `${COUNTRIES.length} pays.`;
}

function announce(message) {
  S.lastMessage = message;
  const status = document.getElementById(STATUS_ID);
  if (status) status.textContent = message;
}

/* ---------- E096-10 : unique boucle rAF, descente des niveaux ---------- */

function paintBar(value) {
  const bar = document.getElementById(ANIM_BAR_ID);
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
  const readout = document.getElementById(ANIM_READOUT_ID);
  if (readout && S.anim) {
    readout.textContent = `Descente en cours : ${frenchRatio(value, 1)} % de l’échelle.`;
  }
}

function updateAnimReadout() {
  const readout = document.getElementById(ANIM_READOUT_ID);
  if (!readout) return;
  if (S.anim) return;
  readout.textContent = `Échelle : ${LEVELS.length} niveaux, de l’État à la commune (100 %).`;
}

function syncAnimButton() {
  const button = document.getElementById(ANIM_BTN_ID);
  if (!button) return;
  button.textContent = S.anim ? '■ Arrêter la descente' : '▶ Lancer la descente des niveaux';
}

function stopAnim(silent = false) {
  const anim = S.anim;
  if (!anim) return;
  if (anim.rafId) cancelAnimationFrame(anim.rafId);
  S.anim = null;
  syncAnimButton();
  updateAnimReadout();
  if (!silent) announce('Descente des niveaux arrêtée.');
}

function tickAnim(timestamp) {
  const anim = S.anim;
  if (!anim) return;
  anim.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) {
    /* Pause : l'horodatage est gelé, la barre n'avance pas en arrière-plan. */
    anim.last = timestamp;
    anim.rafId = requestAnimationFrame(tickAnim);
    return;
  }
  if (!anim.last) anim.last = timestamp;
  const elapsed = Math.min(timestamp - anim.last, 80);
  anim.last = timestamp;
  anim.value = Math.min(anim.target, anim.value + elapsed / 12);
  paintBar(anim.value);
  if (anim.value >= anim.target) {
    stopAnim(true);
    announce(`Descente terminée : ${LEVELS.length} niveaux franchis, de l’État à la commune.`);
    return;
  }
  anim.rafId = requestAnimationFrame(tickAnim);
}

function startAnim() {
  stopAnim(true);
  if (S.reduced) {
    /* Mouvement réduit : même résultat, sans aucune boucle d'animation. */
    const bar = document.getElementById(ANIM_BAR_ID);
    if (bar) bar.style.width = '100%';
    announce(`Descente affichée instantanément : ${LEVELS.length} niveaux (mouvement réduit).`);
    return;
  }
  S.anim = { rafId: 0, last: 0, value: 0, target: 100 };
  syncAnimButton();
  paintBar(0);
  announce('Descente des niveaux lancée.');
  S.anim.rafId = requestAnimationFrame(tickAnim);
}

function installVisibility() {
  if (S.visibilityReady || typeof document === 'undefined') return;
  S.visibilityReady = true;
  document.addEventListener('visibilitychange', () => {
    /* E096-10 : la boucle reprend sans saut au retour de l'onglet. */
    if (S.anim && !document.hidden) S.anim.last = 0;
  });
}

/* ---------- E096-01 / E096-02 / E096-03 : tableaux sémantiques ---------- */

function buildLevelsTable(ctx) {
  const table = ctx.el('table', PREFIX + '-table');
  table.id = LEVELS_TABLE_ID;
  table.appendChild(ctx.el('caption', '', 'Les six niveaux du découpage administratif français'));
  const head = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Niveau', 'Format du code', 'Exemple', 'Libellé'].forEach((label) => {
    headRow.appendChild(ctx.el('th', '', label));
  });
  head.appendChild(headRow);
  const body = ctx.el('tbody');
  LEVELS.forEach((level) => {
    const row = ctx.el('tr');
    row.appendChild(ctx.el('td', '', level.niveau));
    row.appendChild(ctx.el('td', '', level.format));
    row.appendChild(ctx.el('td', '', level.code));
    row.appendChild(ctx.el('td', '', level.exemple));
    body.appendChild(row);
  });
  table.append(head, body);
  return table;
}

function buildCountriesTable(ctx) {
  const table = ctx.el('table', PREFIX + '-table');
  table.id = COUNTRIES_TABLE_ID;
  table.appendChild(ctx.el('caption', '', 'Référentiel ISO 3166-1 local (pays et leurs trois codes)'));
  const head = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Pays', 'Alpha-2', 'Alpha-3', 'Numérique'].forEach((label) => {
    headRow.appendChild(ctx.el('th', '', label));
  });
  head.appendChild(headRow);
  const body = ctx.el('tbody');
  COUNTRIES.forEach((country) => {
    const row = ctx.el('tr');
    row.appendChild(ctx.el('td', '', country.nom));
    row.appendChild(ctx.el('td', '', country.a2));
    row.appendChild(ctx.el('td', '', country.a3));
    row.appendChild(ctx.el('td', '', country.num));
    body.appendChild(row);
  });
  table.append(head, body);
  return table;
}

/* ---------- Feuille de style isolée, une seule injection ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 6px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--muted);font-size:10px;line-height:1.65;
}
.${PREFIX}-title{margin:0 0 6px;font-size:12px;color:var(--gold-bright);}
.${PREFIX}-intro,.${PREFIX}-note{margin:4px 0 8px;font-size:10px;line-height:1.65;color:var(--muted);}
.${PREFIX}-note{color:var(--gold-bright);}
.${PREFIX}-section{
  margin:10px 0 6px;padding-top:8px;border-top:1px solid var(--line);
  font-size:10px;font-weight:600;color:var(--gold-bright);
}
.${PREFIX}-label{display:block;margin:8px 0 5px;font-size:9px;font-weight:600;
  text-transform:uppercase;letter-spacing:.06em;color:var(--gold-bright);}
.${PREFIX}-table{width:100%;border-collapse:collapse;margin:8px 0 10px;font-size:10px;}
.${PREFIX}-table caption{text-align:left;padding:0 0 4px;color:var(--gold-bright);font-size:10px;}
.${PREFIX}-table th,.${PREFIX}-table td{
  border-bottom:1px solid var(--line);padding:5px 6px;text-align:left;vertical-align:top;
}
.${PREFIX}-table th{font-weight:600;color:var(--gold-bright);font-size:9px;
  text-transform:uppercase;letter-spacing:.04em;}
.${PREFIX}-table td{font-variant-numeric:tabular-nums;}
.${PREFIX}-choices{display:flex;flex-wrap:wrap;gap:6px;}
.${PREFIX}-radio{
  display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:96px;
  padding:8px 12px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--muted);font:inherit;font-size:10px;line-height:1.3;cursor:pointer;
}
.${PREFIX}-radio:hover{border-color:var(--gold);color:var(--gold-bright);}
.${PREFIX}-radio[aria-checked="true"]{
  border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.12);font-weight:600;
}
.${PREFIX}-radio:focus-visible,.${PREFIX}-btn:focus-visible,.${PREFIX}-input:focus-visible{
  outline:2px solid var(--gold-bright);outline-offset:2px;
}
.${PREFIX}-format-readout,.${PREFIX}-measure{
  min-height:16px;margin:8px 0 6px;padding:7px 9px;border-left:2px solid var(--gold);
  color:var(--ink);font-size:10px;line-height:1.6;font-variant-numeric:tabular-nums;
}
.${PREFIX}-check{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 4px;}
.${PREFIX}-input{
  min-height:44px;min-width:110px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--ink);font:inherit;font-size:11px;letter-spacing:.08em;
}
.${PREFIX}-btn{
  min-height:44px;min-width:44px;padding:7px 12px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--muted);font:inherit;font-size:10px;cursor:pointer;
}
.${PREFIX}-btn:hover{border-color:var(--gold);color:var(--gold-bright);}
.${PREFIX}-check-result{
  min-height:16px;color:var(--ink);font-size:10px;line-height:1.6;font-variant-numeric:tabular-nums;
}
.${PREFIX}-anim{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 4px;}
.${PREFIX}-track{flex:1 1 160px;min-width:120px;height:12px;border:1px solid var(--line);
  border-radius:999px;overflow:hidden;}
.${PREFIX}-bar{height:100%;width:0;background:var(--gold);border-radius:999px;}
.${PREFIX}-anim-readout{flex:1 1 200px;color:var(--ink);font-size:10px;font-variant-numeric:tabular-nums;}
.${PREFIX}-status{
  min-height:16px;margin:8px 0 0;padding:6px 8px;border-left:2px solid var(--gold);
  color:var(--ink);font-size:10px;font-variant-numeric:tabular-nums;
}
@media (prefers-reduced-motion:reduce){
  .${PREFIX}-radio,.${PREFIX}-btn,.${PREFIX}-bar{transition:none;}
}
@media (max-width:620px){
  #${PANEL_ID}{padding:10px;}
  .${PREFIX}-radio{min-width:80px;padding:7px 9px;}
}`;

/* ---------- E096-08 / E096-09 : panneau unique, contrôles accessibles ---------- */

function formatRadio(ctx, key) {
  const format = formatByKey(key);
  const node = ctx.el('button', PREFIX + '-radio', format.label);
  node.type = 'button';
  node.id = FORMAT_RADIO_IDS[key];
  node.setAttribute('role', 'radio');
  node.setAttribute('aria-checked', 'false');
  node.setAttribute('tabindex', '-1');
  node.title = format.desc;
  node.addEventListener('click', () => selectFormat(key));
  return node;
}

function ensurePanel(ctx) {
  const layout = ctx.layout || ctx.stage;
  let panel = document.getElementById(PANEL_ID);
  if (!panel || (layout && !layout.contains(panel))) {
    panel = ctx.el('section', PREFIX + '-panel');
    panel.id = PANEL_ID;
    panel.setAttribute('aria-labelledby', TITLE_ID);

    const title = ctx.el('h2', PREFIX + '-title', 'Découpage administratif et codes ISO');
    title.id = TITLE_ID;
    panel.appendChild(title);

    const intro = ctx.el('p', PREFIX + '-intro',
      'Un territoire se décrit par des codes : la norme ISO 3166-1 identifie les États avec '
      + 'trois écritures (alpha-2, alpha-3, numérique), tandis que le Code officiel géographique '
      + '(COG) identifie les subdivisions françaises, de la région à la commune. Ce panneau '
      + 'présente les six niveaux du découpage, un référentiel de dix pays, un vérificateur de '
      + 'code et les mesures qui en découlent. Tout le texte ci-dessous reste lisible sans '
      + 'aucune interaction.');
    intro.id = INTRO_ID;
    panel.appendChild(intro);

    const levelsTitle = ctx.el('p', PREFIX + '-section', 'Niveaux administratifs français');
    panel.appendChild(levelsTitle);
    panel.appendChild(buildLevelsTable(ctx));

    const countriesTitle = ctx.el('p', PREFIX + '-section', 'Référentiel ISO 3166-1');
    panel.appendChild(countriesTitle);
    panel.appendChild(buildCountriesTable(ctx));

    const formatLabel = ctx.el('span', PREFIX + '-label', 'Format de code à explorer');
    formatLabel.id = FORMAT_LABEL_ID;
    panel.appendChild(formatLabel);
    const group = ctx.el('div', PREFIX + '-choices');
    group.id = FORMAT_GROUP_ID;
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-labelledby', FORMAT_LABEL_ID);
    FORMATS.forEach((format) => group.appendChild(formatRadio(ctx, format.key)));
    group.addEventListener('keydown', onGroupKey);
    panel.appendChild(group);

    const formatReadout = ctx.el('p', PREFIX + '-format-readout', '');
    formatReadout.id = FORMAT_READOUT_ID;
    panel.appendChild(formatReadout);

    const measure = ctx.el('p', PREFIX + '-measure', '');
    measure.id = MEASURE_ID;
    panel.appendChild(measure);

    const codeLabel = ctx.el('label', PREFIX + '-label', 'Vérifier un code alpha-2 (ex. FR)');
    codeLabel.id = CODE_LABEL_ID;
    codeLabel.htmlFor = CODE_INPUT_ID;
    panel.appendChild(codeLabel);
    const check = ctx.el('div', PREFIX + '-check');
    const input = ctx.el('input', PREFIX + '-input');
    input.type = 'text';
    input.id = CODE_INPUT_ID;
    input.maxLength = 2;
    input.autocomplete = 'off';
    input.setAttribute('aria-labelledby', CODE_LABEL_ID);
    input.value = 'FR';
    const checkBtn = ctx.el('button', PREFIX + '-btn', 'Vérifier le code');
    checkBtn.type = 'button';
    checkBtn.id = CHECK_BTN_ID;
    checkBtn.addEventListener('click', () => {
      validateCode(document.getElementById(CODE_INPUT_ID).value);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        validateCode(input.value);
      }
    });
    check.append(input, checkBtn);
    panel.appendChild(check);
    const result = ctx.el('p', PREFIX + '-check-result', S.decoded);
    result.id = CHECK_RESULT_ID;
    panel.appendChild(result);

    const anim = ctx.el('div', PREFIX + '-anim');
    const run = ctx.el('button', PREFIX + '-btn', '▶ Lancer la descente des niveaux');
    run.type = 'button';
    run.id = ANIM_BTN_ID;
    run.addEventListener('click', () => (S.anim ? stopAnim() : startAnim()));
    const track = ctx.el('div', PREFIX + '-track');
    track.id = ANIM_TRACK_ID;
    const bar = ctx.el('div', PREFIX + '-bar');
    bar.id = ANIM_BAR_ID;
    track.appendChild(bar);
    const animReadout = ctx.el('span', PREFIX + '-anim-readout', '');
    animReadout.id = ANIM_READOUT_ID;
    anim.append(run, track, animReadout);
    panel.appendChild(anim);

    const status = ctx.el('p', PREFIX + '-status', S.lastMessage);
    status.id = STATUS_ID;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    panel.appendChild(status);

    const note = ctx.el('p', PREFIX + '-note',
      'Les flèches, Début et Fin parcourent les quatre formats ; la touche Entrée valide le code '
      + 'saisi. Avec « mouvement réduit », la descente des niveaux affiche son résultat sans '
      + 'progression animée ; un onglet masqué met la barre en pause. Le code de canton indiqué '
      + 'dans le tableau illustre un format, non un canton précis.');
    note.id = NOTE_ID;
    panel.appendChild(note);

    layout.appendChild(panel);
  }

  const status = document.getElementById(STATUS_ID);
  if (status) status.textContent = S.lastMessage;
  panel.dataset.format = S.format;
  panel.dataset.reduced = S.reduced ? '1' : '0';
  return panel;
}

/* ---------- Point d'entrée ---------- */

register('E096', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (!ctx.layout || typeof ctx.layout.appendChild !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'geography') return;

  /* E096-01 : une seule feuille de style, injectée une seule fois. */
  ctx.css(CSS_ID, CSS);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  installVisibility();
  ensurePanel(ctx);
  syncRadios();
  syncAnimButton();
  updateFormatReadout();
  updateMeasure();
  updateAnimReadout();
  renderCheckResult();

  /* Si une descente était en cours avant un re-render, on repeint la barre sur
     le nouvel élément et on poursuit la même boucle, sans en créer une autre. */
  if (S.anim) {
    const bar = document.getElementById(ANIM_BAR_ID);
    if (bar) bar.style.width = `${S.anim.value.toFixed(1)}%`;
  }
  if (S.anim && S.reduced) stopAnim(true);
});
