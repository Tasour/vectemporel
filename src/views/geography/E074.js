import { register } from './registry.js';

/* Lentille E074 — vue GEOGRAPHIE.
 * Thème : panneau de réglages de la vue (préférences locales, persistance).
 *
 * Dix chantiers E074-01 … E074-10, tous réellement implémentés (aucun stub),
 * décrits dans UNIFIED_AUDIT/GEOGRAPHIE/views/E074.md. Tout est local : aucune
 * requête réseau, aucune graine aléatoire, aucun appel console, aucun fichier
 * partagé modifié. Le texte pédagogique est du texte sémantique réel inséré
 * dans le DOM : le panneau reste lisible et compréhensible même quand la
 * boucle d'animation est à l'arrêt et que le laboratoire n'est pas dessiné.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() } (registry.js).
 */

const P = 'geography-e074';
const CSS_ID = 'geography-e074';

/* ---------- Identifiants, tous préfixés geography-e074-* ---------- */

const PANEL_ID = `${P}-panel`;
const TITLE_ID = `${P}-title`;
const LEDE_ID = `${P}-lede`;
const FACTS_ID = `${P}-facts`;
const TABLE_ID = `${P}-table`;
const DENSITE_ID = `${P}-densite`;
const RADIO_IDS = {
  compacte: `${P}-densite-compacte`,
  confortable: `${P}-densite-confortable`,
  large: `${P}-densite-large`,
};
const TOGGLE_LABELS_ID = `${P}-toggle-labels`;
const TOGGLE_SOURCES_ID = `${P}-toggle-sources`;
const TOGGLE_ANIM_ID = `${P}-toggle-anim`;
const RESET_ID = `${P}-reset`;
const EXPORT_ID = `${P}-export`;
const EXPORT_FIELD_ID = `${P}-export-field`;
const IMPORT_ID = `${P}-import`;
const IMPORT_FIELD_ID = `${P}-import-field`;
const STATUS_ID = `${P}-status`;
const JOURNAL_ID = `${P}-journal`;
const MESURE_ID = `${P}-mesure`;
const CANVAS_ID = `${P}-canvas`;
const BADGE_ID = `${P}-badge`;

const STORE_KEY = `${P}-prefs`;
const BUDGET_OCTETS = 256;
const JOURNAL_MAX = 6;

/* ---------- Valeurs de référence : rien n'est inventé ---------- */

const DEFAULTS = Object.freeze({
  densite: 'confortable',
  etiquettes: true,
  sources: true,
  animation: false,
});

const DENSITES = [
  { key: 'compacte', label: 'Compacte', desc: 'Liste resserrée : 26 px de hauteur minimale par lieu.' },
  { key: 'confortable', label: 'Confortable', desc: 'Réglage d’origine : 32 px de hauteur minimale par lieu.' },
  { key: 'large', label: 'Large', desc: 'Liste aérée : 42 px de hauteur minimale par lieu.' },
];

const PREF_KEYS = ['densite', 'etiquettes', 'sources', 'animation'];

/* Étiquettes lisibles pour le journal et le laboratoire. */
const LABELS = {
  densite: 'Densité de la liste',
  etiquettes: 'Étiquettes sur les repères',
  sources: 'Sources de coordonnées',
  animation: 'Animation du balayage',
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  prefs: { ...DEFAULTS },
  reduced: false,
  lastMessage: 'Réglages prêts : quatre préférences locales, aucune donnée envoyée.',
  journal: [],
  actionNo: 0,
  /* Laboratoire déterministe. */
  selected: 0,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  scanning: false,
  /* Garde-fous d'installation des écouteurs (une seule fois). */
  bound: { panel: false, global: false },
  nodes: {},
  storage: 'local',
};

/* ---------- E074-02 : magasin local validé ---------- */

function sanitize(raw) {
  const out = { ...DEFAULTS };
  if (!raw || typeof raw !== 'object') return out;
  if (DENSITES.some((d) => d.key === raw.densite)) out.densite = raw.densite;
  PREF_KEYS.filter((k) => k !== 'densite').forEach((k) => {
    if (typeof raw[k] === 'boolean') out[k] = raw[k];
  });
  return out;
}

function serialize() {
  return JSON.stringify(S.prefs);
}

function octets() {
  /* Toutes les clés et valeurs sérialisées sont ASCII : longueur = octets. */
  return serialize().length;
}

function nbEcards() {
  return PREF_KEYS.filter((k) => S.prefs[k] !== DEFAULTS[k]).length;
}

/* ---------- E074-03 : persistance localStorage avec repli mémoire ---------- */

function loadPrefs() {
  try {
    if (typeof localStorage !== 'undefined') {
      const brut = localStorage.getItem(STORE_KEY);
      if (brut) {
        S.prefs = sanitize(JSON.parse(brut));
        S.storage = 'local';
        return;
      }
    }
  } catch {
    /* Stockage indisponible ou illisible : le repli mémoire reste actif. */
  }
  S.prefs = { ...DEFAULTS };
  S.storage = 'mémoire';
}

function savePrefs() {
  const donnees = serialize();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORE_KEY, donnees);
      S.storage = 'local';
      return;
    }
  } catch {
    /* Quota, navigation privée : on garde l'état en mémoire de module. */
  }
  S.storage = 'mémoire';
}

/* ---------- Utilitaires de texte sémantique ---------- */

function node(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function bold(text) {
  const n = document.createElement('strong');
  n.textContent = text;
  return n;
}

function scopeOf(ctx) {
  const layout = ctx.layout || ctx.stage;
  return layout && typeof layout.querySelector === 'function' ? layout : ctx.stage;
}

/* ---------- Mesures référencées (E074-08) ---------- */

function mesureTexte() {
  const n = PREF_KEYS.length;
  const ecarts = nbEcards();
  const oct = octets();
  const part = oct / BUDGET_OCTETS;
  const personnalisation = ecarts / n;
  const r = document.createDocumentFragment();
  r.append(
    bold(String(n)),
    document.createTextNode(' préférences locales, '),
    bold(String(ecarts)),
    document.createTextNode(' écart(s) de la configuration d’origine (référence 0 sur '),
    bold(String(n)),
    document.createTextNode(') : '),
    bold(fmt(personnalisation)),
    document.createTextNode(' de personnalisation. Instantané sérialisé : '),
    bold(`${oct} octets`),
    document.createTextNode(' sur un budget de '),
    bold(`${BUDGET_OCTETS} octets`),
    document.createTextNode(' ('),
    bold(fmt(part)),
    document.createTextNode('). Stockage : '),
    bold(S.storage),
    document.createTextNode('. '),
    bold(S.lastMessage),
  );
  return r;
}

/* ---------- E074-01 : feuille de style unique, isolée et sans réseau ---------- */

/* NOTE : le bloc ci-dessous est volontairement placé après les helpers pour
 * que les identifiants soient tous définis avant interpolation. */

const CSS = `
#${PANEL_ID}[hidden]{display:none!important}
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 5px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-lede{color:var(--muted)}
#${PANEL_ID} .${P}-hint{color:var(--ink-soft,#d7d1c6);font-size:10px}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 6px;text-align:left}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${DENSITE_ID}{margin:6px 0;padding:6px 8px;border:1px solid var(--line);border-radius:8px}
#${DENSITE_ID} label{display:block;margin:4px 0;padding:6px 8px;border:1px solid var(--line);
  border-radius:6px;cursor:pointer;min-height:36px}
#${DENSITE_ID} label[data-checked="1"]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.1)}
#${DENSITE_ID} input{margin-right:8px;accent-color:var(--gold,#e6b96f)}
.${P}-switch{
  display:inline-grid;place-items:center;min-width:44px;min-height:44px;width:44px;height:44px;
  margin:4px 6px 4px 0;padding:0;border:1px solid var(--line);border-radius:8px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);font:inherit;font-size:16px;
  font-weight:700;cursor:pointer;transition:border-color .18s,background-color .18s;
}
.${P}-switch:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.14)}
.${P}-switch[aria-pressed="true"]{border-style:dashed;border-color:var(--gold-bright,#f4d69e)}
.${P}-action{
  min-width:44px;min-height:36px;margin:4px 6px 4px 0;padding:5px 10px;
  border:1px solid var(--line);border-radius:8px;background:rgba(8,12,18,.9);
  color:var(--ink);font:inherit;font-size:10px;cursor:pointer;
}
.${P}-action:hover{border-color:var(--gold,#e6b96f);color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${PANEL_ID} input[type="text"]{
  width:100%;margin:5px 0;padding:6px 8px;border:1px solid var(--line);border-radius:6px;
  background:rgba(0,0,0,.25);color:var(--ink);font:inherit;font-size:10px;
}
#${STATUS_ID},#${MESURE_ID}{
  min-height:32px;margin-top:8px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
}
#${JOURNAL_ID}{margin:6px 0;padding-left:20px;font-size:10px;color:var(--muted)}
#${JOURNAL_ID} li{margin:2px 0}
#${CANVAS_ID}{display:block;width:100%;max-width:420px;height:190px;margin:8px 0;
  border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.2)}
#${PANEL_ID}[data-${P}-reduced="1"] .${P}-switch{transition:none!important;animation:none!important}
.${P}-badge{
  position:absolute;right:16px;bottom:12px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
/* Effets réels des préférences sur le DOM rendu par geography.js. */
[data-geography-e074-densite="compacte"] #c3b-places .c3b-place-item{min-height:26px;padding:3px 7px}
[data-geography-e074-densite="confortable"] #c3b-places .c3b-place-item{min-height:32px;padding:5px 8px}
[data-geography-e074-densite="large"] #c3b-places .c3b-place-item{min-height:42px;padding:9px 10px}
[data-geography-e074-etiquettes="0"] .geo-marker text{display:none}
[data-geography-e074-sources="0"] .geo-source{display:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} .${P}-switch{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  .${P}-badge{font-size:9px;max-width:80%;right:8px;bottom:8px}
}
`;

/* ---------- E074-01 : panneau sémantique, lisible sans animation ---------- */

function construireFaits() {
  const dl = document.createElement('dl');
  dl.id = FACTS_ID;
  const paires = [
    ['Périmètre', 'Les réglages ne concernent que cette vue : ils ne modifient ni le pays affiché, ni l’ère, ni la liste des lieux.'],
    ['Stockage', 'Les préférences sont écrites dans le stockage local du navigateur, jamais envoyées à un serveur.'],
    ['Repli', 'Si le stockage local est indisponible, les réglages restent actifs en mémoire pendant la session.'],
  ];
  paires.forEach(([terme, definition]) => {
    const dt = node('dt', '', terme);
    const dd = node('dd', '', definition);
    dl.append(dt, dd);
  });
  return dl;
}

function construireTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = node('caption', '', 'Grandeurs vérifiables des préférences (aucune information n’est portée par la seule couleur).');
  table.appendChild(caption);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Valeur', 'Référence'].forEach((t) => {
    const th = node('th', '', t);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  const lignes = [
    ['Paramètres locaux', '4', 'Configuration d’origine = 4 valeurs fixes'],
    ['Budget du instantané', `${BUDGET_OCTETS} octets`, 'Instantané réel affiché dans la mesure'],
    ['Cible tactile', '44 × 44 px', 'Minimum 24 × 24 px (WCAG 2.5.8)'],
    ['Boucle d’animation', '1 rAF', 'Pause sur document.hidden'],
  ];
  lignes.forEach(([g, v, ref]) => {
    const tr = document.createElement('tr');
    const th = node('th', '', g);
    th.scope = 'row';
    tr.append(th, node('td', '', v), node('td', '', ref));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function construireRadios() {
  const field = document.createElement('fieldset');
  field.id = DENSITE_ID;
  const legend = node('legend', '', 'Densité de la liste des lieux');
  field.appendChild(legend);
  DENSITES.forEach((d) => {
    const label = document.createElement('label');
    label.id = `${P}-label-${d.key}`;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `${P}-densite`;
    input.value = d.key;
    input.id = RADIO_IDS[d.key];
    label.append(input, document.createTextNode(`${d.label} — ${d.desc}`));
    field.appendChild(label);
  });
  return field;
}

function construirePanel() {
  const panel = node('section', `${P}-panel`);
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const titre = node('h2', '', 'Réglages de la vue GEOGRAPHIE');
  titre.id = TITLE_ID;
  const lede = node('p', `${P}-lede`, 'Ce panneau rassemble les préférences locales de la carte : densité de la liste, étiquettes des repères, sources de coordonnées et animation. Chaque choix est appliqué immédiatement et enregistré sur cet appareil ; aucun réseau n’est sollicité.');
  const introFacts = node('p', `${P}-hint`, 'Trois faits vérifiables avant toute manipulation :');
  const hReglages = node('h3', '', 'Préférences');
  const introReglages = node('p', `${P}-hint`, 'La densité est un choix unique ; les trois autres réglages sont des bascules indépendantes.');

  const toggleLabels = node('button', `${P}-switch`, '✓');
  toggleLabels.type = 'button';
  toggleLabels.id = TOGGLE_LABELS_ID;

  const toggleSources = node('button', `${P}-switch`, '✓');
  toggleSources.type = 'button';
  toggleSources.id = TOGGLE_SOURCES_ID;

  const toggleAnim = node('button', `${P}-switch`, '✓');
  toggleAnim.type = 'button';
  toggleAnim.id = TOGGLE_ANIM_ID;

  const ligneLabels = node('p', '', '');
  ligneLabels.append(node('strong', '', 'Étiquettes sur les repères : '), toggleLabels,
    document.createTextNode(' afficher le nom à côté de chaque marqueur de la carte.'));
  const ligneSources = node('p', '', '');
  ligneSources.append(node('strong', '', 'Sources de coordonnées : '), toggleSources,
    document.createTextNode(' afficher la référence sous la fiche du lieu.'));
  const ligneAnim = node('p', '', '');
  ligneAnim.append(node('strong', '', 'Animation du balayage : '), toggleAnim,
    document.createTextNode(' avancer le curseur du laboratoire ci-dessous.'));

  const hOutils = node('h3', '', 'Export, import et remise à zéro');
  const introOutils = node('p', `${P}-hint`, 'Ces trois actions ne quittent pas le navigateur : elles lisent ou écrivent l’instantané ci-dessous.');
  const exportField = node('input');
  exportField.type = 'text';
  exportField.id = EXPORT_FIELD_ID;
  exportField.readOnly = true;
  exportField.setAttribute('aria-label', 'Instantané des préférences en lecture seule');
  const importField = node('input');
  importField.type = 'text';
  importField.id = IMPORT_FIELD_ID;
  importField.setAttribute('aria-label', 'Coller un instantané de préférences à importer');
  const importLabel = node('label', `${P}-hint`, 'Instantané à importer :');
  importLabel.setAttribute('for', IMPORT_FIELD_ID);

  const reset = node('button', `${P}-action`, 'Réinitialiser');
  reset.type = 'button';
  reset.id = RESET_ID;
  const exportBtn = node('button', `${P}-action`, 'Exporter');
  exportBtn.type = 'button';
  exportBtn.id = EXPORT_ID;
  const importBtn = node('button', `${P}-action`, 'Importer');
  importBtn.type = 'button';
  importBtn.id = IMPORT_ID;

  const hLab = node('h3', '', 'Laboratoire des préférences');
  const introLab = node('p', `${P}-hint`, 'Le canvas ci-dessous dessine l’état réel des quatre préférences. Flèche gauche ou droite : changer de ligne ; Entrée : basculer la préférence sélectionnée ; la couleur n’est qu’un renfort, chaque état est écrit en toutes lettres.');
  const canvas = node('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Laboratoire des préférences : quatre lignes, une par réglage, avec sa valeur en toutes lettres. Flèche gauche ou droite pour sélectionner une ligne, Entrée pour basculer la préférence sélectionnée.');
  const mesure = node('p', `${P}-readout`);
  mesure.id = MESURE_ID;
  const status = node('p', `${P}-readout`);
  status.id = STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const hJournal = node('h3', '', 'Journal des modifications');
  const journal = node('ol');
  journal.id = JOURNAL_ID;

  panel.append(
    titre, lede,
    introFacts, construireFaits(), construireTable(),
    hReglages, introReglages, construireRadios(),
    ligneLabels, ligneSources, ligneAnim,
    hOutils, introOutils, exportField, importLabel, importField,
    reset, exportBtn, importBtn,
    hLab, introLab, canvas, mesure,
    hJournal, journal, status,
  );
  return panel;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: DENSITES.map((d) => document.getElementById(RADIO_IDS[d.key])),
      labels: document.getElementById(`${P}-label-${S.prefs.densite}`),
      toggles: [document.getElementById(TOGGLE_LABELS_ID), document.getElementById(TOGGLE_SOURCES_ID), document.getElementById(TOGGLE_ANIM_ID)],
      exportField: document.getElementById(EXPORT_FIELD_ID),
      importField: document.getElementById(IMPORT_FIELD_ID),
      reset: document.getElementById(RESET_ID),
      exportBtn: document.getElementById(EXPORT_ID),
      importBtn: document.getElementById(IMPORT_ID),
      canvas: document.getElementById(CANVAS_ID),
      mesure: document.getElementById(MESURE_ID),
      status: document.getElementById(STATUS_ID),
      journal: document.getElementById(JOURNAL_ID),
    };
  }
  const panel = construirePanel();
  const scope = scopeOf(ctx);
  const host = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-panel') || scope) : ctx.stage;
  if (host && typeof host.insertBefore === 'function') host.insertBefore(panel, host.firstChild);
  else if (host && typeof host.appendChild === 'function') host.appendChild(panel);
  return {
    panel, fresh: true,
    radios: DENSITES.map((d) => document.getElementById(RADIO_IDS[d.key])),
    toggles: [document.getElementById(TOGGLE_LABELS_ID), document.getElementById(TOGGLE_SOURCES_ID), document.getElementById(TOGGLE_ANIM_ID)],
    exportField: document.getElementById(EXPORT_FIELD_ID),
    importField: document.getElementById(IMPORT_FIELD_ID),
    reset: document.getElementById(RESET_ID),
    exportBtn: document.getElementById(EXPORT_ID),
    importBtn: document.getElementById(IMPORT_ID),
    canvas: document.getElementById(CANVAS_ID),
    mesure: document.getElementById(MESURE_ID),
    status: document.getElementById(STATUS_ID),
    journal: document.getElementById(JOURNAL_ID),
  };
}

/* ---------- E074-05 et E074-06 : application concrète des préférences ---------- */

function applyToScope(ctx) {
  const scope = scopeOf(ctx);
  if (!scope || !scope.dataset) return;
  scope.dataset.geographyE074Densite = S.prefs.densite;
  scope.dataset.geographyE074Etiquettes = S.prefs.etiquettes ? '1' : '0';
  scope.dataset.geographyE074Sources = S.prefs.sources ? '1' : '0';
  scope.dataset.geographyE074Animation = S.prefs.animation && !S.reduced ? '1' : '0';
}

function syncControls() {
  const n = S.nodes;
  (n.radios || []).forEach((input, i) => {
    if (!input) return;
    const key = DENSITES[i].key;
    const checked = S.prefs.densite === key;
    input.checked = checked;
    input.setAttribute('aria-checked', checked ? 'true' : 'false');
    input.tabIndex = checked ? 0 : -1;
    const label = document.getElementById(`${P}-label-${key}`);
    if (label) label.dataset.checked = checked ? '1' : '0';
  });
  (n.toggles || []).forEach((btn, i) => {
    if (!btn) return;
    const key = ['etiquettes', 'sources', 'animation'][i];
    const on = !!S.prefs[key];
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', `${LABELS[key]} : ${on ? 'activé' : 'désactivé'}. Activer ou désactiver.`);
    btn.textContent = on ? '✓' : '✗';
  });
}

function rendreJournal() {
  const n = S.nodes.journal;
  if (!n) return;
  n.replaceChildren();
  S.journal.forEach((texte) => n.appendChild(node('li', '', texte)));
}

function rendreMesure() {
  const n = S.nodes.mesure;
  if (!n) return;
  n.replaceChildren(mesureTexte());
}

function annonce(message) {
  S.lastMessage = message;
  const status = S.nodes.status;
  if (status) status.textContent = message;
}

function consigner(message) {
  S.actionNo += 1;
  S.journal.unshift(`Action ${S.actionNo} — ${message} (${octets()} octets enregistrés).`);
  if (S.journal.length > JOURNAL_MAX) S.journal.length = JOURNAL_MAX;
  rendreJournal();
}

/* ---------- E074-07 : réinitialisation, export et import locaux ---------- */

function updateAll(ctx, message, journaliser) {
  applyToScope(ctx);
  savePrefs();
  syncControls();
  rendreMesure();
  if (S.nodes.exportField) S.nodes.exportField.value = serialize();
  if (message) annonce(message);
  if (journaliser) consigner(message);
  if (S.prefs.animation && !S.reduced) demarrerBoucle(); else arreterBoucle();
  drawLab();
  updateBadge();
}

function setDensite(ctx, key) {
  if (!DENSITES.some((d) => d.key === key) || S.prefs.densite === key) return;
  S.prefs.densite = key;
  const label = DENSITES.find((d) => d.key === key).label;
  updateAll(ctx, `Densité réglée sur « ${label} » ; la liste des lieux s’est ajustée.`, true);
}

function basculer(ctx, key) {
  if (!PREF_KEYS.includes(key)) return;
  if (key === 'densite') {
    const i = DENSITES.findIndex((d) => d.key === S.prefs.densite);
    setDensite(ctx, DENSITES[(i + 1) % DENSITES.length].key);
    return;
  }
  S.prefs[key] = !S.prefs[key];
  const etat = S.prefs[key] ? 'activée' : 'désactivée';
  updateAll(ctx, `${LABELS[key]} ${etat} ; préférence enregistrée localement.`, true);
}

function resetPrefs(ctx) {
  S.prefs = { ...DEFAULTS };
  updateAll(ctx, 'Réglages revenus à la configuration d’origine (4 valeurs de référence).', true);
}

function exporterPrefs(ctx) {
  const donnees = serialize();
  if (S.nodes.exportField) {
    S.nodes.exportField.value = donnees;
    S.nodes.exportField.focus();
    S.nodes.exportField.select();
  }
  annonce(`Instantané exporté : ${donnees} (${octets()} octets), copiable manuellement, sans réseau.`);
  consigner('Instantané exporté');
  void ctx;
}

function importerPrefs(ctx) {
  const champ = S.nodes.importField;
  if (!champ) return;
  try {
    const parse = JSON.parse(champ.value.trim());
    S.prefs = sanitize(parse);
    updateAll(ctx, 'Instantané importé et validé : valeurs inconnues remplacées par les références.', true);
  } catch {
    annonce('Import refusé : l’instantané n’est pas un JSON valide ; les réglages sont inchangés.');
    consigner('Import invalide rejeté');
  }
}

function updateBadge() {
  let badge = document.getElementById(BADGE_ID);
  const scope = typeof document !== 'undefined' ? document : null;
  if (!badge && scope) {
    const map = document.querySelector('.geo-map');
    if (!map) return;
    badge = node('div', `${P}-badge`);
    badge.id = BADGE_ID;
    map.appendChild(badge);
  }
  if (!badge) return;
  const ecarts = nbEcards();
  badge.textContent = S.reduced
    ? `Réglages : ${ecarts}/4 personnalisés · mouvement réduit · animation suspendue.`
    : `Réglages : ${ecarts}/4 personnalisés · stockage ${S.storage} · ${octets()} octets.`;
}

/* ---------- E074-10 : laboratoire canvas déterministe ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;
  const cssW = cv.clientWidth || 360;
  const cssH = cv.clientHeight || 190;
  const dpr = clamp(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 1, 2);
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 14;
  const rowH = 34;
  g.font = '11px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText('Instantané des préférences — une ligne par réglage', pad, pad + 2);

  PREF_KEYS.forEach((key, i) => {
    const y = pad + 18 + i * rowH;
    const value = S.prefs[key];
    const valeurTexte = key === 'densite'
      ? DENSITES.find((d) => d.key === value).label
      : (value ? 'activée' : 'désactivée');
    const modifie = value !== DEFAULTS[key];
    const actif = i === S.selected;

    if (actif) {
      g.fillStyle = 'rgba(244,214,158,.10)';
      g.fillRect(pad - 4, y - 14, cssW - pad * 2 + 8, rowH - 2);
    }
    g.fillStyle = modifie ? 'rgba(230,185,111,.20)' : 'rgba(255,255,255,.05)';
    g.fillRect(pad, y - 11, 12, 12);
    g.strokeStyle = modifie ? 'rgba(244,214,158,.95)' : 'rgba(214,207,193,.7)';
    g.lineWidth = 1;
    if (g.setLineDash) g.setLineDash(modifie ? [] : [3, 2]);
    g.strokeRect(pad + 0.5, y - 10.5, 11, 11);
    if (g.setLineDash) g.setLineDash([]);
    if (modifie) {
      g.beginPath();
      g.moveTo(pad + 2, y - 5);
      g.lineTo(pad + 5, y - 2);
      g.lineTo(pad + 10, y - 8);
      g.stroke();
    }

    g.fillStyle = actif ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.85)';
    g.fillText(`${LABELS[key]} : ${valeurTexte}${modifie ? ' (modifié)' : ' (référence)'}${actif ? '  ◀ sélection' : ''}`, pad + 20, y);
  });

  /* Curseur déterministe : phase bornée, jamais de hasard. */
  const cx = pad + 6 + Math.round(S.phase * (cssW - pad * 2 - 12));
  const baseY = pad + 18 + PREF_KEYS.length * rowH + 6;
  g.fillStyle = 'rgba(244,214,158,.9)';
  g.fillRect(cx - 2, baseY, 4, 10);
  g.fillStyle = 'rgba(214,207,193,.7)';
  g.fillText(S.scanning ? `Balayage en cours — phase ${fmt(S.phase)}` : 'Balayage arrêté — Entrée sur le canvas pour le lancer', pad, baseY + 24);
}

/* ---------- E074-09 : une seule boucle rAF, pause sur document.hidden ---------- */

function arreterBoucle() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function demarrerBoucle() {
  if (!S.scanning || S.reduced || S.rafId) return;
  if (typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.scanning || S.reduced) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.phase = (S.phase + dt * 0.00035) % 1;
  }
  S.lastTs = ts;
  drawLab();
  S.rafId = requestAnimationFrame(tick);
}

/* ---------- E074-04 : radiogroup à choix unique, sans aria-pressed ---------- */

function installerRadios(ctx) {
  (S.nodes.radios || []).forEach((input, i) => {
    if (!input || input.dataset.bound) return;
    input.dataset.bound = '1';
    input.addEventListener('change', () => {
      if (input.checked) setDensite(ctx, DENSITES[i].key);
    });
    input.addEventListener('keydown', (e) => {
      const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      const dir = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
      const next = (i + dir + DENSITES.length) % DENSITES.length;
      const cible = document.getElementById(RADIO_IDS[DENSITES[next].key]);
      if (cible) {
        cible.focus();
        setDensite(ctx, DENSITES[next].key);
      }
    });
  });
}

/* ---------- E074-05 / E074-06 / E074-07 : bascules et actions ---------- */

function installerControles(ctx) {
  const n = S.nodes;
  const cleBascule = [TOGGLE_LABELS_ID, TOGGLE_SOURCES_ID, TOGGLE_ANIM_ID];
  cleBascule.forEach((id, i) => {
    const btn = document.getElementById(id);
    const key = ['etiquettes', 'sources', 'animation'][i];
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      if (key === 'animation' && S.reduced) {
        annonce('Animation indisponible : le système demande un mouvement réduit. Le réglage reste enregistré mais le balayage ne démarre pas.');
        return;
      }
      basculer(ctx, key);
    });
  });
  if (n.reset && !n.reset.dataset.bound) {
    n.reset.dataset.bound = '1';
    n.reset.addEventListener('click', () => resetPrefs(ctx));
  }
  if (n.exportBtn && !n.exportBtn.dataset.bound) {
    n.exportBtn.dataset.bound = '1';
    n.exportBtn.addEventListener('click', () => exporterPrefs(ctx));
  }
  if (n.importBtn && !n.importBtn.dataset.bound) {
    n.importBtn.dataset.bound = '1';
    n.importBtn.addEventListener('click', () => importerPrefs(ctx));
  }
}

/* ---------- E074-10 : clavier du laboratoire ---------- */

function installerCanvas(ctx) {
  const cv = S.nodes.canvas;
  /* Le garde-fou vit sur le canvas lui-même : après un replaceChildren() de la
   * coque, ensurePanel() crée un nouveau canvas qui doit être réécouté. */
  if (!cv || cv.dataset.bound) return;
  cv.dataset.bound = '1';
  cv.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      S.selected = (S.selected + dir + PREF_KEYS.length) % PREF_KEYS.length;
      annonce(`Ligne sélectionnée : ${LABELS[PREF_KEYS[S.selected]]}.`);
      drawLab();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (PREF_KEYS[S.selected] === 'animation' && S.reduced) {
        annonce('Balayage suspendu par la préférence de mouvement réduit.');
        return;
      }
      if (PREF_KEYS[S.selected] === 'animation') {
        S.scanning = !S.scanning;
        if (S.scanning) demarrerBoucle(); else arreterBoucle();
        annonce(S.scanning ? 'Balayage lancé ; la boucle s’arrête si l’onglet devient masqué.' : 'Balayage arrêté.');
        drawLab();
        return;
      }
      basculer(ctx, PREF_KEYS[S.selected]);
    }
  });
  cv.addEventListener('focus', () => {
    annonce(`Laboratoire focalisé : ligne ${S.selected + 1} sur ${PREF_KEYS.length} — ${LABELS[PREF_KEYS[S.selected]]}.`);
  });
}

/* ---------- E074-09 : visibilité et mouvement réduit ---------- */

function installerGlobal(ctx) {
  if (S.bound.global) return;
  S.bound.global = true;
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) arreterBoucle();
      else if (S.scanning && !S.reduced) demarrerBoucle();
    });
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset[`${P}Reduced`] = S.reduced ? '1' : '0';
        if (S.reduced) {
          S.scanning = false;
          arreterBoucle();
        }
        applyToScope(ctx);
        syncControls();
        drawLab();
        updateBadge();
        annonce(S.reduced
          ? 'Mouvement réduit détecté : animation suspendue, les réglages restent lisibles.'
          : 'Mouvement réduit désactivé : l’animation peut reprendre sur action.');
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch {
      /* Préférence indisponible : ctx.reducedMotion() reste la source. */
    }
  }
}

/* ---------- Point d'entrée ---------- */

register('E074', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  if (!S.bound.panel) {
    loadPrefs();
    S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
    if (S.reduced) S.scanning = false;
  }

  S.nodes = ensurePanel(ctx);
  const n = S.nodes;
  if (!n.panel) return;

  n.panel.dataset[`${P}Reduced`] = S.reduced ? '1' : '0';
  if (n.exportField) n.exportField.value = serialize();

  applyToScope(ctx);
  savePrefs();
  syncControls();
  rendreMesure();
  rendreJournal();
  if (n.status && !n.status.textContent) n.status.textContent = S.lastMessage;
  drawLab();
  updateBadge();

  installerRadios(ctx);
  installerControles(ctx);
  installerCanvas(ctx);
  installerGlobal(ctx);

  if (S.scanning && !S.reduced) demarrerBoucle(); else arreterBoucle();
  S.bound.panel = true;
});
