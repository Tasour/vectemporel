import { register } from './registry.js';

/* Lentille E074 (V2) — vue GEOGRAPHIE.
 * Thème : panneau de réglages de la vue — préférences locales, persistance,
 * export/import validés et laboratoire canvas déterministe.
 *
 * Les dix chantiers E074-01 … E074-10 sont réellement implémentés (aucun stub).
 * Ils sont décrits dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E074.md. La V2
 * renforce la passe 1 sur dix points : lexique défini à la première occurrence,
 * tableau et mesures recalculés depuis les formules, radiogroupe explicite à
 * tabindex mobile, garde-clavier complet, défi falsifiable en cinq temps,
 * graine fixe via mulberry32, boucle rAF unique avec pause sur document.hidden
 * et hors écran, respect de ctx.reducedMotion(), DPR plafonné à 2 et
 * garde-fous d'écouteurs sur chaque panneau recréé.
 *
 * Tout est local : aucun réseau, aucune journalisation console, aucun
 * Math.random, aucun fichier partagé ni module de la passe 1 modifié.
 * Le savoir est du texte sémantique réel (h2, h3, p, dl, table, fieldset, ol)
 * présent dans le DOM même sans animation ni interaction : le canvas n'est
 * qu'un laboratoire qui illustre des règles déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e074- (identifiants, classes, attributs, bloc
 * CSS) : aucune collision avec la passe 1, qui utilise geography-e074-.
 */

const P = 'geography-v2-e074';

/* ---------- Identifiants, tous préfixés geography-v2-e074- ---------- */

const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const FACTS_ID = P + '-facts';
const GLOSSARY_ID = P + '-glossary';
const TABLE_ID = P + '-table';
const DENSITE_ID = P + '-densite';
const RADIO_IDS = {
  compacte: P + '-densite-compacte',
  confortable: P + '-densite-confortable',
  large: P + '-densite-large',
};
const TOGGLE_IDS = {
  etiquettes: P + '-toggle-etiquettes',
  sources: P + '-toggle-sources',
  animation: P + '-toggle-anim',
};
const RESET_ID = P + '-reset';
const EXPORT_ID = P + '-export';
const EXPORT_FIELD_ID = P + '-export-field';
const IMPORT_ID = P + '-import';
const IMPORT_FIELD_ID = P + '-import-field';
const MESURE_ID = P + '-mesure';
const READOUT_ID = P + '-readout';
const JOURNAL_ID = P + '-journal';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const DEFI_ID = P + '-defi';
const LIMITE_ID = P + '-limite';
const BADGE_ID = P + '-badge';

const REDUCED_ATTR = 'data-' + P + '-reduced';
const STORE_KEY = P + '-prefs';

/* ---------- Constantes canoniques : rien n'est inventé ---------- */

const DEFAULTS = Object.freeze({
  densite: 'confortable',
  etiquettes: true,
  sources: true,
  animation: false,
});

const DENSITES = [
  { key: 'compacte', label: 'Compacte', px: 26, desc: 'Liste resserrée : 26 px de hauteur minimale par lieu.' },
  { key: 'confortable', label: 'Confortable', px: 32, desc: 'Réglage d’origine : 32 px de hauteur minimale par lieu.' },
  { key: 'large', label: 'Large', px: 42, desc: 'Liste aérée : 42 px de hauteur minimale par lieu.' },
];

const PREF_KEYS = ['densite', 'etiquettes', 'sources', 'animation'];
const TOGGLE_KEYS = ['etiquettes', 'sources', 'animation'];

const LABELS = {
  densite: 'Densité de la liste',
  etiquettes: 'Étiquettes sur les repères',
  sources: 'Sources de coordonnées',
  animation: 'Animation du balayage',
};

const BUDGET_OCTETS = 256;      /* budget pédagogique de l'instantané */
const CIBLE_TACTILE = 44;       /* cible visée, en px */
const REF_TACTILE = 24;         /* minimum WCAG 2.5.8, en px */
const JOURNAL_MAX = 6;          /* journal borné */
const SEED = 0x45e074;          /* graine fixe, affichée sur le canvas */
const VITESSE = 0.00035;        /* progression du curseur, par ms */

/* ---------- État de module : survit au stage.replaceChildren() ---------- */

const S = {
  prefs: { ...DEFAULTS },
  storage: 'mémoire',
  reduced: false,
  lastMessage: 'Réglages prêts : quatre préférences locales, aucune donnée envoyée.',
  journal: [],
  actionNo: 0,
  /* Laboratoire déterministe. */
  selected: 0,
  scanning: false,
  phase: 0,
  inView: true,
  lastTs: 0,
  rafId: 0,
  /* Garde-fous d'installation (une seule fois par panneau / par document). */
  boundPanel: false,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  resizeObserver: null,
  nodes: {},
  scope: null,               /* portée des attributs de préférence */
};

/* ctx.reducedMotion() conservé hors du point d'entrée pour la boucle rAF. */
let ctxReduced = null;

/* ---------- Formules déterministes et formatage français ---------- */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

const fmt = (n, d) => {
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};

function E(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function strong(text) {
  const n = document.createElement('strong');
  n.textContent = text;
  return n;
}

/* mulberry32 : générateur à graine fixe, aucun Math.random. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const RNG = mulberry32(SEED);
const TICKS = PREF_KEYS.map(() => RNG()); /* décorations fixes et reproductibles */

/* ---------- E074-02 : magasin validé, schéma recalculé ---------- */

function sanitize(raw) {
  const out = { ...DEFAULTS };
  if (!raw || typeof raw !== 'object') return out;
  if (DENSITES.some((d) => d.key === raw.densite)) out.densite = raw.densite;
  TOGGLE_KEYS.forEach((k) => {
    if (typeof raw[k] === 'boolean') out[k] = raw[k];
  });
  return out;
}

function serialize() {
  return JSON.stringify(S.prefs);
}

function octets() {
  /* Clés et valeurs sérialisées : uniquement des caractères ASCII. */
  return serialize().length;
}

function nbEcards() {
  return PREF_KEYS.filter((k) => S.prefs[k] !== DEFAULTS[k]).length;
}

function valeurTexte(key) {
  const v = S.prefs[key];
  if (key === 'densite') {
    const d = DENSITES.find((x) => x.key === v);
    return d ? d.label : DENSITES[1].label;
  }
  return v ? 'activée' : 'désactivée';
}

/* ---------- E074-03 : persistance locale avec repli mémoire ---------- */

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
    /* Quota ou navigation privée : l'état reste en mémoire de module. */
  }
  S.storage = 'mémoire';
}

/* ---------- E074-01 : bloc CSS unique, isolé et sans réseau ---------- */

const CSS = `
#${PANEL_ID}[hidden]{display:none!important}
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 5px;font-size:11px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-lede{color:var(--muted)}
#${PANEL_ID} .${P}-hint{color:var(--ink-soft,#d7d1c6);font-size:10px}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} .${P}-limite{
  margin:7px 0;padding:7px 9px;border:1px dashed var(--gold,#e6b96f);
  border-radius:7px;color:var(--ink-soft,#d7d1c6);
}
#${PANEL_ID} dl{margin:6px 0}
#${PANEL_ID} dt{margin-top:6px;color:var(--gold-bright,#f4d69e);font-weight:600}
#${PANEL_ID} dd{margin:2px 0 4px 12px;color:var(--ink-soft,#d7d1c6)}
ol.${P}-defi{margin:6px 0 6px 18px;padding:0}
ol.${P}-defi li{margin:3px 0;color:var(--ink-soft,#d7d1c6)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
#${TABLE_ID} thead th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${DENSITE_ID}{margin:6px 0;padding:6px 8px;border:1px solid var(--line);border-radius:8px}
#${DENSITE_ID} legend{padding:0 4px;color:var(--muted)}
#${DENSITE_ID} label{
  display:block;margin:4px 0;padding:6px 8px;border:1px solid var(--line);
  border-radius:6px;cursor:pointer;min-height:36px;
}
#${DENSITE_ID} label[data-checked="1"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.1);
}
#${DENSITE_ID} input{min-width:24px;min-height:24px;margin-right:8px;accent-color:var(--gold,#e6b96f)}
.${P}-switch{
  display:inline-grid;place-items:center;min-width:44px;min-height:44px;width:44px;height:44px;
  margin:4px 6px 4px 0;padding:0;border:1px solid var(--line);border-radius:8px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);font:inherit;font-size:16px;
  font-weight:700;cursor:pointer;transition:border-color .18s,background-color .18s;
}
.${P}-switch:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.14)}
.${P}-switch[aria-pressed="true"]{border-style:dashed;border-color:var(--gold-bright,#f4d69e)}
.${P}-action{
  min-width:44px;min-height:44px;margin:4px 6px 4px 0;padding:6px 10px;
  border:1px solid var(--line);border-radius:8px;background:rgba(8,12,18,.9);
  color:var(--ink);font:inherit;font-size:10px;cursor:pointer;
  transition:border-color .18s,color .18s;
}
.${P}-action:hover{border-color:var(--gold,#e6b96f);color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${PANEL_ID} input[type="text"]{
  width:100%;margin:5px 0;padding:6px 8px;border:1px solid var(--line);border-radius:6px;
  background:rgba(0,0,0,.25);color:var(--ink);font:inherit;font-size:10px;
}
#${MESURE_ID},#${READOUT_ID}{
  min-height:46px;margin-top:8px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
}
#${READOUT_ID} strong,#${MESURE_ID} strong{color:var(--gold-bright,#f4d69e)}
#${JOURNAL_ID}{margin:6px 0;padding-left:20px;font-size:10px;color:var(--muted)}
#${JOURNAL_ID} li{margin:2px 0}
#${CANVAS_ID}{
  display:block;width:100%;max-width:420px;height:210px;margin:8px 0;
  border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.2);
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
.${P}-badge{
  position:absolute;right:16px;bottom:12px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] .${P}-switch,
#${PANEL_ID}[${REDUCED_ATTR}="1"] .${P}-action{transition:none!important}
/* Effets réels des préférences sur le rendu existant de la coque. */
[data-${P}-densite="compacte"] #c3b-places .c3b-place-item{min-height:26px;padding:3px 7px}
[data-${P}-densite="confortable"] #c3b-places .c3b-place-item{min-height:32px;padding:5px 8px}
[data-${P}-densite="large"] #c3b-places .c3b-place-item{min-height:42px;padding:9px 10px}
[data-${P}-etiquettes="0"] .geo-marker text{display:none}
[data-${P}-sources="0"] .geo-source{display:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} .${P}-switch,#${PANEL_ID} .${P}-action{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:200px}
  .${P}-badge{font-size:9px;max-width:80%;right:8px;bottom:8px}
}
`;

/* ---------- E074-01 : contenu sémantique, lisible sans laboratoire ---------- */

function staticFacts() {
  const wrap = E('div');
  wrap.id = FACTS_ID;
  const faits = [
    'Une préférence locale ne concerne que cette vue : elle ne modifie ni le pays affiché, ni l’ère, ni la liste des lieux. Quatre paramètres seulement existent : la densité de la liste et trois bascules indépendantes.',
    'La persistance signifie que l’instantané est écrit dans le stockage local du navigateur, sur cet appareil, et jamais envoyé à un serveur. Aucune requête réseau n’est effectuée par ce panneau.',
    'Le repli mémoire garantit que les réglages restent actifs pendant la session si le stockage local est indisponible (quota, navigation privée, stockage illisible). Le mode effectif est toujours annoncé dans la mesure.',
  ];
  faits.forEach((texte) => wrap.appendChild(E('p', P + '-fait', texte)));
  return wrap;
}

function staticGlossary() {
  const wrap = E('div');
  wrap.appendChild(E('h3', '', 'Lexique'));
  const dl = E('dl');
  dl.id = GLOSSARY_ID;
  const entrees = [
    ['Préférence locale', 'Réglage qui ne s’applique qu’à la vue courante et qui n’altère aucune donnée géographique : ici la densité de la liste, les étiquettes, les sources et l’animation.'],
    ['Persistance', 'Conservation d’un instantané entre deux rendus, ici dans le stockage local du navigateur ; elle est distincte de la simple variable en mémoire, perdue au rechargement.'],
    ['Instantané', 'Sérialisation JSON compacte des quatre préférences, exclusivement ASCII, dont la taille en octets est mesurée et comparée à un budget explicite.'],
    ['Repli mémoire', 'Comportement de secours qui conserve l’état dans une variable de module quand localStorage est absent ou inutilisable, sans erreur visible ni journalisation.'],
    ['Mouvement réduit', 'Préférence système signalée par ctx.reducedMotion() ou matchMedia : le réglage d’animation reste mémorisé mais aucun balayage n’est lancé.'],
  ];
  entrees.forEach(([terme, def]) => {
    dl.append(E('dt', '', terme), E('dd', '', def));
  });
  wrap.appendChild(dl);
  return wrap;
}

/* Limite falsifiable, alignée avec la rubrique « Limites et angles morts ». */
function staticLimit() {
  const p = E('p', P + '-limite');
  p.id = LIMITE_ID;
  p.textContent = 'Limite falsifiable : le modèle prédit que l’instantané reste sous le budget de '
    + BUDGET_OCTETS + ' octets pour les quatre préférences, que le nombre d’écarts ne peut pas dépasser '
    + PREF_KEYS.length + ' et qu’un instantané invalide est toujours ramené aux références. Si un import corrompu produisait un état intermédiaire, si le compteur dépassait ' + PREF_KEYS.length
    + ' ou si la taille mesurée dépassait le budget annoncé, c’est la validation du magasin qui serait réfutée. Le canvas est schématique : il résume des réglages locaux, il ne dessine aucune carte.';
  return p;
}

function staticDefi() {
  const wrap = E('div');
  wrap.appendChild(E('h3', '', 'Défi falsifiable en cinq temps'));
  const ol = E('ol');
  ol.className = P + '-defi';
  ol.id = DEFI_ID;
  const etapes = [
    'Prédiction : avant toute action, prédisez la taille de l’instantané d’origine et le nombre d’écarts par rapport aux quatre références.',
    'Réglage : choisissez la densité « Large » puis désactivez les étiquettes ; observez la mesure et le journal.',
    'Résultat attendu : deux écarts sur quatre, une personnalisation de 0,50 et une taille d’instantané inférieure au budget de ' + BUDGET_OCTETS + ' octets.',
    'Falsification : si le compteur n’augmente pas de deux, si les effets CSS n’apparaissent pas sur la carte ou si un import invalide modifie les réglages, la règle de validation est réfutée.',
    'Débrief : ces grandeurs sont calculées depuis la configuration, pas lues dans le canvas ; changer la densité ne change ni le pays, ni l’ère, ni la liste des lieux.',
  ];
  etapes.forEach((texte) => ol.appendChild(E('li', '', texte)));
  wrap.appendChild(ol);
  return wrap;
}

/* ---------- E074-06 : tableau captioné, lignes recalculées ---------- */

function staticTableShell() {
  const table = E('table');
  table.id = TABLE_ID;
  table.appendChild(E('caption', '', ''));
  const thead = E('thead');
  const hr = E('tr');
  ['Grandeur', 'Valeur calculée', 'Référence'].forEach((t) => {
    const th = E('th', '', t);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = E('tbody');
  table.appendChild(tbody);
  return { table, caption: table.querySelector('caption'), tbody };
}

function rebuildTable() {
  const n = S.nodes;
  if (!n.tbody) return;
  const nb = PREF_KEYS.length;
  const ecarts = nbEcards();
  const oct = octets();
  const d = DENSITES.find((x) => x.key === S.prefs.densite) || DENSITES[1];
  const lignes = [
    ['Paramètres locaux', String(nb), 'Configuration d’origine = ' + nb + ' valeurs fixes'],
    ['Densité choisie', d.label + ' (' + d.px + ' px)', 'Référence : Confortable (32 px)'],
    ['Écarts à la référence', fmt(ecarts, 0) + ' / ' + nb, 'Référence : 0 écart sur ' + nb],
    ['Taille de l’instantané', fmt(oct, 0) + ' octets', 'Budget : ' + BUDGET_OCTETS + ' octets (' + fmt(oct / BUDGET_OCTETS, 2) + ')'],
    ['Cible tactile', CIBLE_TACTILE + ' × ' + CIBLE_TACTILE + ' px', 'Minimum ' + REF_TACTILE + ' × ' + REF_TACTILE + ' px (WCAG 2.5.8)'],
    ['Boucle d’animation', '1 rAF', 'Pause sur document.hidden et hors écran'],
    ['Graine du laboratoire', SEED.toString(16), 'Reproductible : mulberry32, aucun hasard'],
  ];
  n.tbody.textContent = '';
  lignes.forEach(([g, v, ref]) => {
    const tr = E('tr');
    const th = E('th', '', g);
    th.scope = 'row';
    tr.append(th, E('td', '', v), E('td', '', ref));
    n.tbody.appendChild(tr);
  });
  if (n.caption) {
    n.caption.textContent = 'Grandeurs vérifiables recalculées depuis la configuration courante. '
      + 'Aucune information n’est portée par la seule couleur : chaque état est aussi écrit en toutes lettres.';
  }
}

/* ---------- E074-08 : mesure référencée et region live unique ---------- */

function rendreMesure() {
  const n = S.nodes.mesure;
  if (!n) return;
  const nb = PREF_KEYS.length;
  const ecarts = nbEcards();
  const oct = octets();
  const part = oct / BUDGET_OCTETS;
  const personnalisation = ecarts / nb;
  const fragment = document.createDocumentFragment();
  const add = (t) => fragment.appendChild(document.createTextNode(t));
  fragment.appendChild(strong(String(nb)));
  add(' préférences locales, ');
  fragment.appendChild(strong(fmt(ecarts, 0) + ' écart(s)'));
  add(' par rapport à la configuration d’origine (référence 0 sur ' + nb + ') : ');
  fragment.appendChild(strong(fmt(personnalisation, 2)));
  add(' de personnalisation. Instantané sérialisé : ');
  fragment.appendChild(strong(fmt(oct, 0) + ' octets'));
  add(' sur un budget de ');
  fragment.appendChild(strong(fmt(BUDGET_OCTETS, 0) + ' octets'));
  add(' (');
  fragment.appendChild(strong(fmt(part, 2)));
  add('). Cible tactile ');
  fragment.appendChild(strong(CIBLE_TACTILE + ' × ' + CIBLE_TACTILE + ' px'));
  add(' contre un minimum de ' + REF_TACTILE + ' × ' + REF_TACTILE + ' px. Stockage : ');
  fragment.appendChild(strong(S.storage));
  add('. ');
  fragment.appendChild(strong(S.lastMessage));
  n.replaceChildren(fragment);
}

function annonce(message) {
  S.lastMessage = message;
  const n = S.nodes.readout;
  if (n && n.textContent !== message) n.textContent = message;
}

function consigner(message) {
  S.actionNo += 1;
  S.journal.unshift('Action ' + S.actionNo + ' — ' + message + ' (' + fmt(octets(), 0) + ' octets enregistrés).');
  if (S.journal.length > JOURNAL_MAX) S.journal.length = JOURNAL_MAX;
  rendreJournal();
}

function rendreJournal() {
  const n = S.nodes.journal;
  if (!n) return;
  n.replaceChildren();
  S.journal.forEach((texte) => n.appendChild(E('li', '', texte)));
}

/* ---------- Construction du panneau ---------- */

function buildPanel(ctx) {
  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = E('h2', '', 'Réglages de la vue GEOGRAPHIE');
  title.id = TITLE_ID;
  const lead = E('p', P + '-lede',
    'Ce panneau rassemble les préférences locales de la carte : densité de la liste, étiquettes des repères, sources de coordonnées et animation. Chaque choix est appliqué immédiatement au rendu existant, enregistré sur cet appareil et vérifiable dans le tableau. Aucun réseau n’est sollicité.');

  const formula = E('p', P + '-hint',
    'Grandeurs calculées : écarts = nombre de préférences différentes des références ; part = taille de l’instantané ÷ '
      + BUDGET_OCTETS + ' octets ; personnalisation = écarts ÷ ' + PREF_KEYS.length
      + '. La graine ' + SEED.toString(16) + ' alimente mulberry32 : aucun résultat n’est aléatoire.');

  /* E074-04 : radiogroupe natif complété par un rôle explicite. */
  const fieldset = E('fieldset');
  fieldset.id = DENSITE_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Densité de la liste des lieux (choix unique)');
  fieldset.appendChild(E('legend', '', 'Densité de la liste des lieux (choix unique)'));
  DENSITES.forEach((d) => {
    const label = E('label');
    label.id = P + '-label-' + d.key;
    const radio = E('input');
    radio.type = 'radio';
    radio.name = P + '-densite';
    radio.value = d.key;
    radio.id = RADIO_IDS[d.key];
    label.append(radio, document.createTextNode(d.label + ' — ' + d.desc));
    fieldset.appendChild(label);
  });

  /* E074-05 : trois bascules indépendantes, aria-pressed réservé à elles. */
  const hReglages = E('h3', '', 'Préférences');
  const introReglages = E('p', P + '-hint',
    'La densité est un choix unique (radiogroupe) ; les trois réglages ci-dessous sont des bascules indépendantes, chacune avec son propre état aria-pressed.');

  const switchs = {};
  const lignes = {};
  TOGGLE_KEYS.forEach((key) => {
    const btn = E('button', P + '-switch', '✓');
    btn.type = 'button';
    btn.id = TOGGLE_IDS[key];
    btn.setAttribute('aria-controls', CANVAS_ID);
    switchs[key] = btn;
    const p = E('p', '', '');
    const textes = {
      etiquettes: ' afficher le nom à côté de chaque marqueur de la carte.',
      sources: ' afficher la référence sous la fiche du lieu.',
      animation: ' avancer le curseur du laboratoire ci-dessous.',
    };
    p.append(strong(LABELS[key] + ' : '), btn, document.createTextNode(textes[key]));
    lignes[key] = p;
  });

  /* E074-07 : export, import et remise à zéro, tous locaux. */
  const hOutils = E('h3', '', 'Export, import et remise à zéro');
  const introOutils = E('p', P + '-hint',
    'Ces trois actions ne quittent pas le navigateur : elles lisent ou écrivent l’instantané affiché ci-dessous.');
  const exportField = E('input');
  exportField.type = 'text';
  exportField.id = EXPORT_FIELD_ID;
  exportField.readOnly = true;
  exportField.setAttribute('aria-label', 'Instantané des préférences en lecture seule');
  const importField = E('input');
  importField.type = 'text';
  importField.id = IMPORT_FIELD_ID;
  importField.setAttribute('aria-label', 'Coller un instantané de préférences à importer');
  const importLabel = E('label', P + '-hint', 'Instantané à importer :');
  importLabel.setAttribute('for', IMPORT_FIELD_ID);
  const reset = E('button', P + '-action', 'Réinitialiser');
  reset.type = 'button';
  reset.id = RESET_ID;
  const exportBtn = E('button', P + '-action', 'Exporter');
  exportBtn.type = 'button';
  exportBtn.id = EXPORT_ID;
  const importBtn = E('button', P + '-action', 'Importer');
  importBtn.type = 'button';
  importBtn.id = IMPORT_ID;

  /* E074-10 : laboratoire canvas focalisable, doublé en texte. */
  const hLab = E('h3', '', 'Laboratoire des préférences');
  const introLab = E('p', P + '-hint',
    'Le canvas dessine l’état réel des quatre préférences. Flèche gauche ou droite : changer de ligne ; Début ou Fin : première ou dernière ligne ; Entrée : basculer la ligne sélectionnée. Chaque état est aussi écrit en toutes lettres dans le tableau et dans la mesure.');
  const canvas = E('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire des préférences : quatre lignes, une par réglage, avec sa valeur en toutes lettres, une coche pour les écarts et le mot sélection. Flèche gauche ou droite pour changer de ligne, Début et Fin pour les bornes, Entrée pour basculer la préférence sélectionnée.');
  const legend = E('p', '', '');
  legend.id = LEGEND_ID;
  const mesure = E('p');
  mesure.id = MESURE_ID;
  const readout = E('p');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const hJournal = E('h3', '', 'Journal des modifications');
  const journal = E('ol');
  journal.id = JOURNAL_ID;

  const tableShell = staticTableShell();
  panel.append(
    title, lead, staticFacts(), staticGlossary(), formula, tableShell.table,
    fieldset, hReglages, introReglages,
    lignes.etiquettes, lignes.sources, lignes.animation,
    hOutils, introOutils, exportField, importLabel, importField,
    reset, exportBtn, importBtn,
    hLab, introLab, canvas, legend, mesure,
    staticDefi(), staticLimit(), hJournal, journal, readout,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host) : ctx.stage;
  if (aside && typeof aside.insertBefore === 'function') aside.insertBefore(panel, aside.firstChild);
  else if (aside && typeof aside.appendChild === 'function') aside.appendChild(panel);

  return {
    panel, fresh: true,
    radios: DENSITES.map((d) => document.getElementById(RADIO_IDS[d.key])),
    switchs,
    exportField, importField, reset, exportBtn, importBtn,
    canvas, legend, mesure, readout, journal,
    caption: tableShell.caption,
    tbody: tableShell.tbody,
  };
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    const table = document.getElementById(TABLE_ID);
    return {
      panel: existant,
      fresh: false,
      radios: DENSITES.map((d) => document.getElementById(RADIO_IDS[d.key])),
      switchs: {
        etiquettes: document.getElementById(TOGGLE_IDS.etiquettes),
        sources: document.getElementById(TOGGLE_IDS.sources),
        animation: document.getElementById(TOGGLE_IDS.animation),
      },
      exportField: document.getElementById(EXPORT_FIELD_ID),
      importField: document.getElementById(IMPORT_FIELD_ID),
      reset: document.getElementById(RESET_ID),
      exportBtn: document.getElementById(EXPORT_ID),
      importBtn: document.getElementById(IMPORT_ID),
      canvas: document.getElementById(CANVAS_ID),
      legend: document.getElementById(LEGEND_ID),
      mesure: document.getElementById(MESURE_ID),
      readout: document.getElementById(READOUT_ID),
      journal: document.getElementById(JOURNAL_ID),
      caption: table ? table.querySelector('caption') : null,
      tbody: table ? table.querySelector('tbody') : null,
    };
  }
  return buildPanel(ctx);
}

/* ---------- E074-05 / E074-06 : effets réels et synchronisation ---------- */

function applyToScope(ctx) {
  const scope = ctx.layout || ctx.stage;
  if (!scope || typeof scope.setAttribute !== 'function') return;
  scope.setAttribute('data-' + P + '-densite', S.prefs.densite);
  scope.setAttribute('data-' + P + '-etiquettes', S.prefs.etiquettes ? '1' : '0');
  scope.setAttribute('data-' + P + '-sources', S.prefs.sources ? '1' : '0');
  const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : S.reduced;
  scope.setAttribute('data-' + P + '-animation', S.prefs.animation && !reduced ? '1' : '0');
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
    const label = document.getElementById(P + '-label-' + key);
    if (label) label.setAttribute('data-checked', checked ? '1' : '0');
  });
  TOGGLE_KEYS.forEach((key) => {
    const btn = n.switchs && n.switchs[key];
    if (!btn) return;
    const on = !!S.prefs[key];
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', LABELS[key] + ' : ' + (on ? 'activé' : 'désactivé') + '. Activer ou désactiver.');
    btn.textContent = on ? '✓' : '✗';
  });
  if (n.exportField) n.exportField.value = serialize();
  if (n.legend) {
    n.legend.textContent = 'Coche ✓ = activé ; croix ✗ = désactivé ; ◀ = ligne sélectionnée ; case pleine = écart à la référence, case vide = référence. Graine '
      + SEED.toString(16) + ' : dessin reproductible, jamais de hasard.';
  }
  rebuildTable();
  rendreMesure();
  drawLab();
  updateBadge();
}

/* ---------- E074-07 : actions locales validées ---------- */

function updateAll(ctx, message, journaliser) {
  applyToScope(ctx);
  applyReducedAttr();
  savePrefs();
  syncControls();
  if (message) annonce(message);
  if (journaliser) consigner(message);
  if (S.scanning && !S.reduced) startLoop(); else stopLoop();
}

function setDensite(ctx, key) {
  const d = DENSITES.find((x) => x.key === key);
  if (!d || S.prefs.densite === key) return;
  S.prefs.densite = key;
  updateAll(ctx, 'Densité réglée sur « ' + d.label + ' » ('
    + d.px + ' px) ; la liste des lieux s’est ajustée.', true);
}

function basculer(ctx, key) {
  if (!PREF_KEYS.includes(key)) return;
  if (key === 'densite') {
    const i = DENSITES.findIndex((d) => d.key === S.prefs.densite);
    setDensite(ctx, DENSITES[(i + 1) % DENSITES.length].key);
    return;
  }
  S.prefs[key] = !S.prefs[key];
  updateAll(ctx, LABELS[key] + ' ' + (S.prefs[key] ? 'activée' : 'désactivée')
    + ' ; préférence enregistrée localement.', true);
}

function resetPrefs(ctx) {
  S.prefs = { ...DEFAULTS };
  updateAll(ctx, 'Réglages revenus à la configuration d’origine (' + PREF_KEYS.length + ' valeurs de référence).', true);
}

function exporterPrefs(ctx) {
  const donnees = serialize();
  const n = S.nodes;
  if (n.exportField) {
    n.exportField.value = donnees;
    n.exportField.focus();
    n.exportField.select();
  }
  annonce('Instantané exporté : ' + donnees + ' (' + fmt(octets(), 0)
    + ' octets), copiable manuellement, sans réseau.');
  consigner('Instantané exporté');
  void ctx;
}

function importerPrefs(ctx) {
  const champ = S.nodes.importField;
  if (!champ) return;
  let parse;
  try {
    parse = JSON.parse(champ.value.trim());
  } catch {
    annonce('Import refusé : l’instantané n’est pas un JSON valide ; les réglages sont inchangés.');
    consigner('Import invalide rejeté');
    return;
  }
  S.prefs = sanitize(parse);
  updateAll(ctx, 'Instantané importé et validé : toute valeur inconnue est remplacée par sa référence.', true);
}

/* ---------- E074-10 : dessin déterministe, DPR plafonné ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;
  const cssW = cv.clientWidth || 360;
  const cssH = cv.clientHeight || 210;
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
    const modifie = S.prefs[key] !== DEFAULTS[key];
    const actif = i === S.selected;
    const tick = TICKS[i];

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

    /* Décoration reproductible issue de la graine : jamais seule porteuse d'info. */
    g.fillStyle = 'rgba(214,207,193,.30)';
    g.fillRect(pad + 18, y - 3, 4 + tick * 8, 2);

    g.fillStyle = actif ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.85)';
    g.fillText(LABELS[key] + ' : ' + valeurTexte(key)
      + (modifie ? ' (modifié)' : ' (référence)') + (actif ? '  ◀ sélection' : ''), pad + 32, y);
  });

  const cx = pad + 6 + Math.round(S.phase * (cssW - pad * 2 - 12));
  const baseY = pad + 18 + PREF_KEYS.length * rowH + 6;
  g.fillStyle = 'rgba(244,214,158,.9)';
  g.fillRect(cx - 2, baseY, 4, 10);
  g.fillStyle = 'rgba(214,207,193,.75)';
  g.font = '10px sans-serif';
  g.fillText('Graine ' + SEED.toString(16) + ' · ' + fmt(octets(), 0) + '/' + BUDGET_OCTETS + ' octets', pad, baseY + 2);
  g.fillText(S.scanning && !S.reduced
    ? 'Balayage en cours — phase ' + fmt(S.phase, 2)
    : (S.reduced ? 'Mouvement réduit — balayage suspendu' : 'Balayage arrêté — Entrée sur le canvas pour le lancer'),
  pad, baseY + 20);
}

/* ---------- E074-09 : boucle rAF unique, pause, mouvement réduit ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function canRun() {
  return typeof document === 'undefined' ? false : (!document.hidden && S.inView);
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof ctxReduced === 'function' && ctxReduced()) return;
  if (!canRun()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (!canRun()) return;
  const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : false;
  if (!reduced && S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.phase = (S.phase + dt * VITESSE) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (!reduced && S.scanning) S.rafId = requestAnimationFrame(tick);
}

function applyReducedAttr() {
  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.setAttribute(REDUCED_ATTR, S.reduced ? '1' : '0');
}

function updateBadge() {
  const map = document.querySelector('.geo-map');
  let badge = document.getElementById(BADGE_ID);
  if (!map) return;
  if (!badge) {
    badge = E('div', P + '-badge');
    badge.id = BADGE_ID;
    map.appendChild(badge);
  }
  const ecarts = nbEcards();
  badge.textContent = S.reduced
    ? 'Réglages : ' + ecarts + '/' + PREF_KEYS.length + ' personnalisés · mouvement réduit · balayage suspendu.'
    : 'Réglages : ' + ecarts + '/' + PREF_KEYS.length + ' personnalisés · stockage ' + S.storage
      + ' · ' + fmt(octets(), 0) + '/' + BUDGET_OCTETS + ' octets.';
}

/* ---------- E074-04 / E074-05 / E074-07 : écouteurs sur panneau frais ---------- */

function installPanelListeners(ctx) {
  const n = S.nodes;
  n.radios.forEach((input, i) => {
    if (!input || input.dataset.bound) return;
    input.dataset.bound = '1';
    input.addEventListener('change', () => {
      if (input.checked) setDensite(ctx, DENSITES[i].key);
    });
    input.addEventListener('keydown', (event) => {
      const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const dir = (event.key === 'ArrowDown' || event.key === 'ArrowRight') ? 1 : -1;
      const next = (i + dir + DENSITES.length) % DENSITES.length;
      const cible = document.getElementById(RADIO_IDS[DENSITES[next].key]);
      if (cible) {
        cible.focus();
        setDensite(ctx, DENSITES[next].key);
      }
    });
  });

  TOGGLE_KEYS.forEach((key) => {
    const btn = n.switchs[key];
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      if (key === 'animation' && S.reduced) {
        annonce('Animation indisponible : le système demande un mouvement réduit. Le réglage reste enregistré mais aucun balayage ne démarre.');
        return;
      }
      basculer(ctx, key);
    });
  });

  [n.reset, n.exportBtn, n.importBtn].forEach((btn, i) => {
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      if (i === 0) resetPrefs(ctx);
      else if (i === 1) exporterPrefs(ctx);
      else importerPrefs(ctx);
    });
  });

  const cv = n.canvas;
  if (cv && !cv.dataset.bound) {
    cv.dataset.bound = '1';
    cv.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const dir = event.key === 'ArrowRight' ? 1 : -1;
        S.selected = (S.selected + dir + PREF_KEYS.length) % PREF_KEYS.length;
        annonce('Ligne sélectionnée : ' + LABELS[PREF_KEYS[S.selected]] + '.');
        drawLab();
        return;
      }
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        S.selected = event.key === 'Home' ? 0 : PREF_KEYS.length - 1;
        annonce('Ligne sélectionnée : ' + LABELS[PREF_KEYS[S.selected]] + '.');
        drawLab();
        return;
      }
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const key = PREF_KEYS[S.selected];
      if (key === 'animation') {
        if (S.reduced) {
          annonce('Balayage suspendu par la préférence de mouvement réduit.');
          return;
        }
        S.scanning = !S.scanning;
        if (S.scanning) startLoop(); else stopLoop();
        annonce(S.scanning
          ? 'Balayage lancé ; la boucle s’arrête si l’onglet devient masqué ou le panneau hors écran.'
          : 'Balayage arrêté.');
        drawLab();
        return;
      }
      basculer(ctx, key);
    });
    cv.addEventListener('focus', () => {
      annonce('Laboratoire focalisé : ligne ' + (S.selected + 1) + ' sur '
        + PREF_KEYS.length + ' — ' + LABELS[PREF_KEYS[S.selected]] + '.');
    });
  }
}

/* ---------- E074-09 : écouteurs globaux, une seule fois ---------- */

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.scanning && !S.reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        applyReducedAttr();
        if (S.reduced) { S.scanning = false; stopLoop(); }
        else if (S.scanning) startLoop();
        if (S.scope) applyToScope({ layout: S.scope });
        syncControls();
        annonce(S.reduced
          ? 'Mouvement réduit détecté : balayage suspendu, les réglages restent lisibles.'
          : 'Mouvement réduit désactivé : le balayage peut reprendre sur action.');
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch {
      /* Préférence indisponible : ctx.reducedMotion() reste la source. */
    }
  }
  if (!S.observer && S.nodes.panel && typeof IntersectionObserver === 'function') {
    try {
      S.observer = new IntersectionObserver((entries) => {
        const e = entries[0];
        S.inView = !e || e.isIntersecting;
        if (!S.inView) stopLoop();
        else if (S.scanning && !S.reduced) startLoop();
      });
      S.observer.observe(S.nodes.panel);
    } catch {
      /* Observation indisponible : la pause sur document.hidden subsiste. */
    }
  }
  if (!S.resizeObserver && S.nodes.canvas && typeof ResizeObserver === 'function') {
    try {
      S.resizeObserver = new ResizeObserver(() => { drawLab(); });
      S.resizeObserver.observe(S.nodes.canvas);
    } catch {
      /* Redimensionnement sans observateur : drawLab reste appelé ailleurs. */
    }
  }
}

/* ---------- Point d'entrée ---------- */

register('E074', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E074-01 : bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css(P, CSS);

  S.scope = ctx.layout || ctx.stage;
  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : false;
  if (!S.boundPanel) {
    loadPrefs();
    if (reduced) S.scanning = false;
  }
  S.reduced = reduced;

  S.nodes = ensurePanel(ctx);
  const n = S.nodes;
  if (!n.panel) return;
  applyReducedAttr();
  if (n.exportField) n.exportField.value = serialize();

  applyToScope(ctx);
  savePrefs();
  syncControls();
  rendreJournal();
  if (n.readout && !n.readout.textContent) n.readout.textContent = S.lastMessage;
  updateBadge();

  if (n.fresh) installPanelListeners(ctx);

  installGlobalListeners();
  if (S.scanning && !S.reduced) startLoop(); else stopLoop();
  S.boundPanel = true;
});
