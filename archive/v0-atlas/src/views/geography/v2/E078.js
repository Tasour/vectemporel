import { register } from './registry.js';

/*
 * Lentille E078 — SECONDE PASSE (V2) : partage de lien local par fragment d’URL.
 *
 * Les dix chantiers (E078-01 … E078-10) sont réellement implémentés ci-dessous.
 * La V2 reprend le thème de la passe 1 (le fragment placé après le dièse dans
 * une adresse reste dans le navigateur et n’est jamais transmis à un serveur)
 * et y ajoute le scaffolding pédagogique de la seconde passe : une fiche de
 * vérité à trois faits sourcés, deux tableaux (grammaire et mesures recalculées),
 * un radiogroupe de source, un curseur de budget comparé à une référence, un
 * défi falsifiable en cinq temps, un badge sur la carte, un laboratoire canvas
 * déterministe et une boucle rAF unique suspendue sur trois garde-fous.
 *
 * Le panneau est du texte sémantique réel (h2/h3/p/table/caption/th/td/ul/li/
 * fieldset/label) présent dans le DOM : il reste lisible et indexable même sans
 * animation ni interaction. Le canvas n’est qu’une surcouche : chaque grandeur
 * qu’il illustre est aussi écrite en toutes lettres dans la liste, le tableau
 * de mesures et le bandeau `role="status" aria-live="polite"`.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e078-` (aucune collision avec la passe 1 `geography-e078-`).
 * Zéro console.*, zéro réseau, zéro Math.random, zéro écriture de location.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e078';
const PFX = 'geography-v2-e078';

const ID = {
  panel: PFX + '-panel',
  badge: PFX + '-badge',
  title: PFX + '-title',
  facts: PFX + '-facts',
  grammar: PFX + '-grammar',
  source: PFX + '-source',
  sourceLegend: PFX + '-source-legend',
  budget: PFX + '-budget',
  budgetValue: PFX + '-budget-value',
  budgetLabel: PFX + '-budget-label',
  linkLabel: PFX + '-link-label',
  link: PFX + '-link',
  copy: PFX + '-copy',
  reread: PFX + '-reread',
  params: PFX + '-params',
  canvas: PFX + '-canvas',
  canvasDesc: PFX + '-canvas-desc',
  legend: PFX + '-legend',
  measures: PFX + '-measures',
  defi: PFX + '-defi',
  readout: PFX + '-readout',
  play: PFX + '-play',
  reset: PFX + '-reset',
  note: PFX + '-note',
};

/* Plafond de lecture : la lentille observe l’URL, elle ne l’écrit jamais. */
const MAX_HASH = 2048;
const REF_BUDGET = 180;

const VIEWS = ['globe', 'chronology', 'recit', 'geography', 'constellation', 'points'];

/* E078-02 / E078-04 : vocabulaire canonique du fragment local (cf. store.js). */
const DICT = [
  { k: 'v', label: 'Vue affichée', ex: 'geography' },
  { k: 'c', label: 'Identifiant du pays sélectionné', ex: 'de' },
  { k: 'e', label: 'Index de l’ère', ex: '2' },
  { k: 'r', label: 'Index de l’événement du récit', ex: '5' },
  { k: 'p', label: 'Index du point', ex: '1' },
  { k: 'l', label: 'Index du lieu', ex: '3' },
  { k: 's', label: 'Portée : ère ou pays', ex: 'country' },
  { k: 'fd', label: 'Filtre de domaine des points', ex: '*' },
  { k: 'ff', label: 'Filtre de famille des points', ex: '*' },
  { k: 'd', label: 'Drapeau « détails ouverts »', ex: '1' },
  { k: 'h', label: 'Drapeau « aide ouverte »', ex: '1' },
];
const BY_KEY = Object.create(null);
DICT.forEach((entry) => { BY_KEY[entry.k] = entry; });

/* E078-08 : radiogroupe — choix unique de la source à décoder. Les deux
 * exemples sont des chaînes de démonstration en dur, jamais écrites dans
 * l’adresse : aucun format concurrent n’est introduit. */
const SOURCES = [
  {
    key: 'reel',
    label: 'Fragment réel de l’adresse',
    desc: 'Lit uniquement window.location.hash, sans rien modifier.',
  },
  {
    key: 'court',
    label: 'Exemple court',
    hash: '#v=geography&c=de',
    desc: 'Chaîne de démonstration : deux paramètres reconnus.',
  },
  {
    key: 'riche',
    label: 'Exemple riche',
    hash: '#v=chronology&e=2&r=5&fd=*&ff=*&d=1&x=9',
    desc: 'Chaîne de démonstration : sept paires, dont une clé inconnue.',
  },
];

/* Trames non chromatiques : la forme distingue les blocs, pas la couleur. */
const PATTERNS = [[], [4, 3], [1, 3], [6, 2], [2, 2], [8, 3], [3, 2, 1, 2]];

/* État de module : survit au remplacement du DOM par la coque. */
const S = {
  ctx: null,
  nodes: null,
  source: 'reel',
  budget: REF_BUDGET,
  decoded: { raw: '', params: [], recognized: 0, unknown: 0, invalids: 0, length: 0 },
  copyStatus: '',
  playing: false,
  scan: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  hashBound: false,
  motionBound: false,
};

/* ---------- utilitaires déterministes ---------- */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fmtInt(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

function el(tag, className, text) {
  if (S.ctx && typeof S.ctx.el === 'function') return S.ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function reduced() {
  if (S.ctx && typeof S.ctx.reducedMotion === 'function') {
    try { return Boolean(S.ctx.reducedMotion()); } catch { /* repli ci-dessous */ }
  }
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  } catch { return false; }
}

/* ---------- E078-03 : lecture plafonnée, strictement locale ---------- */

function readHash() {
  try {
    if (typeof window === 'undefined' || !window.location) return '';
    return String(window.location.hash || '').slice(0, MAX_HASH);
  } catch { return ''; }
}

function rawForSource(key) {
  if (key === 'reel') return readHash().replace(/^#/, '').slice(0, MAX_HASH);
  const found = SOURCES.filter((s) => s.key === key)[0];
  return found && found.hash ? found.hash.replace(/^#/, '').slice(0, MAX_HASH) : '';
}

/* ---------- E078-04 : décodage contrôlé et vocabulaire des clés ---------- */

function isValid(key, value) {
  const v = String(value);
  if (key === 'v') return VIEWS.indexOf(v) >= 0;
  if (key === 's') return v === 'era' || v === 'country';
  if (key === 'e' || key === 'r' || key === 'p' || key === 'l') return /^\d+$/.test(v);
  if (key === 'd' || key === 'h') return v === '1';
  if (key === 'c' || key === 'fd' || key === 'ff') return v.length > 0 && v.length <= 64;
  return false;
}

function decodeHash(hash) {
  const raw = String(hash || '').replace(/^#/, '').slice(0, MAX_HASH);
  const out = { raw, params: [], recognized: 0, unknown: 0, invalids: 0, length: raw.length };
  if (!raw) return out;
  let parsed;
  try { parsed = new URLSearchParams(raw); } catch { out.invalids += 1; return out; }
  parsed.forEach((value, key) => {
    const info = BY_KEY[key];
    if (!info) {
      out.unknown += 1;
      out.params.push({ key, value, label: 'Clé inconnue (ignorée)', known: false, valid: false });
      return;
    }
    const valid = isValid(key, value);
    if (valid) out.recognized += 1; else out.invalids += 1;
    out.params.push({ key, value, label: info.label, known: true, valid });
  });
  return out;
}

/* ---------- E078-06 : reconstitution textuelle du lien local ---------- */

function buildLink(raw) {
  let base = '';
  try { base = String(window.location.href || ''); } catch { base = ''; }
  const cut = base.indexOf('#');
  const sansFragment = cut >= 0 ? base.slice(0, cut) : base;
  return sansFragment + '#' + raw;
}

/* ---------- E078-01 : fiche de vérité à trois faits sourcés ---------- */

function buildFacts(ctx) {
  const wrap = el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'Un fragment d’URL est la chaîne placée après le symbole « dièse » dans une adresse. '
      + 'Il décrit un état de navigation sans changer de page : le navigateur ne le transmet jamais '
      + 'au serveur, il reste dans la machine.',
    'Le format local de l’atlas est une suite de paires clé=valeur séparées par « et » commercial '
      + '(v, c, e, r, p, l, s, fd, ff, d, h). Chaque clé est courte et chaque valeur est encodée '
      + 'pour rester lisible ; aucune requête réseau n’est nécessaire pour le décoder.',
    'La lecture est plafonnée à ' + fmtInt(MAX_HASH) + ' caractères et le budget de référence '
      + 'd’un lien facilement partageable est de ' + REF_BUDGET + ' caractères. Un fragment long '
      + 'n’est pas forcément un fragment riche : longueur et nombre de paramètres sont deux '
      + 'grandeurs distinctes.',
  ];
  faits.forEach((texte) => wrap.appendChild(el('p', PFX + '-fait', texte)));
  return wrap;
}

/* ---------- E078-02 : tableau de grammaire (texte sémantique) ---------- */

function buildGrammar(ctx) {
  const table = el('table', PFX + '-table');
  table.id = ID.grammar;
  table.appendChild(el('caption', '',
    'Grammaire du fragment local : une clé, une signification, un exemple. Aucune de ces valeurs ne quitte l’appareil.'));

  const thead = el('thead');
  const hr = el('tr');
  ['Clé', 'Signification', 'Exemple'].forEach((label) => {
    const th = el('th', '', label);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = el('tbody');
  DICT.forEach((entry) => {
    const tr = el('tr');
    const th = el('th', '', entry.k);
    th.scope = 'row';
    const tdLabel = el('td', '', entry.label);
    const tdEx = el('td', '', entry.ex);
    tr.append(th, tdLabel, tdEx);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E078-10 : tableau de mesures recalculées ---------- */

function buildMeasures(ctx) {
  const table = el('table', PFX + '-table');
  table.id = ID.measures;
  table.appendChild(el('caption', '',
    'Mesures recalculées depuis la chaîne elle-même : nombre de paramètres, reconnus, inconnus, longueur et part du budget.'));

  const thead = el('thead');
  const hr = el('tr');
  ['Source', 'Paramètres', 'Reconnus', 'Inconnus', 'Caractères', '% budget'].forEach((label) => {
    const th = el('th', '', label);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = el('tbody');
  S.measureCells = {};
  SOURCES.forEach((src) => {
    const tr = el('tr');
    const th = el('th', '', src.label);
    th.scope = 'row';
    const cells = {};
    ['params', 'recognized', 'unknown', 'length', 'ratio'].forEach((key) => {
      const td = el('td', key === 'ratio' ? PFX + '-num' : '', '—');
      cells[key] = td;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
    S.measureCells[src.key] = cells;
  });
  table.appendChild(tbody);
  return table;
}

function fillMeasures() {
  SOURCES.forEach((src) => {
    const cells = S.measureCells && S.measureCells[src.key];
    if (!cells) return;
    const d = decodeHash(rawForSource(src.key));
    const ratio = S.budget > 0 ? Math.round((d.length / S.budget) * 100) : 0;
    cells.params.textContent = fmtInt(d.params.length);
    cells.recognized.textContent = fmtInt(d.recognized);
    cells.unknown.textContent = fmtInt(d.unknown);
    cells.length.textContent = fmtInt(d.length);
    cells.ratio.textContent = ratio + ' %';
  });
}

/* ---------- E078-05 : liste sémantique des paramètres décodés ---------- */

function renderParams() {
  const list = S.nodes && S.nodes.params;
  if (!list) return;
  list.textContent = '';
  const params = S.decoded.params;
  if (!params.length) {
    list.appendChild(el('li', PFX + '-vide', 'Fragment vide : aucune paire clé=valeur à décoder.'));
    return;
  }
  params.forEach((p) => {
    const li = el('li', PFX + '-item');
    li.appendChild(el('strong', '', p.key));
    li.appendChild(document.createTextNode(' = ' + p.value + ' — ' + p.label));
    if (!p.known) li.appendChild(document.createTextNode(' (clé ignorée)'));
    else if (!p.valid) li.appendChild(document.createTextNode(' (valeur invalide : ignorée)'));
    else li.appendChild(document.createTextNode(' (valeur reconnue)'));
    list.appendChild(li);
  });
}

/* ---------- E078-10 : bandeau chiffré, une seule région live ---------- */

function updateReadout(forced) {
  const out = S.nodes && S.nodes.readout;
  if (!out) return;
  const total = S.decoded.params.length;
  const length = S.decoded.length;
  const ratio = S.budget > 0 ? Math.round((length / S.budget) * 100) : 0;
  out.textContent = '';
  const put = (texte) => out.appendChild(el('strong', '', texte));
  out.appendChild(document.createTextNode('Fragment lu : '));
  put(fmtInt(total) + ' paramètre(s)');
  out.appendChild(document.createTextNode(', dont '));
  put(fmtInt(S.decoded.recognized) + ' reconnu(s)');
  out.appendChild(document.createTextNode(', '));
  put(fmtInt(S.decoded.invalids) + ' invalide(s)');
  out.appendChild(document.createTextNode(' et '));
  put(fmtInt(S.decoded.unknown) + ' inconnu(s)');
  out.appendChild(document.createTextNode('. Longueur : '));
  put(fmtInt(length) + ' caractères');
  out.appendChild(document.createTextNode(', soit '));
  put(ratio + ' %');
  out.appendChild(document.createTextNode(' du budget de référence de ' + fmtInt(S.budget) + ' caractères. '));
  out.appendChild(document.createTextNode('Zéro octet envoyé : le fragment reste local. '));
  out.appendChild(document.createTextNode(S.copyStatus || 'Aucune copie demandée pour l’instant.'));
  if (forced) out.appendChild(document.createTextNode(' ' + forced));
}

/* ---------- E078-09 : laboratoire canvas déterministe ---------- */

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 224;
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
  const inner = Math.max(10, cssW - pad * 2);
  const baseY = Math.round(cssH * 0.40);
  const barH = 48;
  const params = S.decoded.params;

  g.font = '11px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText('Fragment d’URL — un bloc par paramètre', pad, pad + 4);
  g.font = '9px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.65)';
  g.fillText('Source : ' + (SOURCES.filter((s) => s.key === S.source)[0] || SOURCES[0]).label, pad, pad + 17);

  if (!params.length) {
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.fillText('Aucun paramètre : le fragment est vide.', pad, baseY + 10);
    g.fillStyle = 'rgba(214,207,193,.65)';
    g.fillText('Un lien local se construit avec #v=geography&c=de, sans serveur.', pad, baseY + 28);
    return;
  }

  const count = params.length;
  const gap = 4;
  const blockW = Math.max(8, (inner - gap * (count - 1)) / count);

  params.forEach((p, i) => {
    const x = pad + i * (blockW + gap);
    const ok = p.known && p.valid;
    g.fillStyle = ok ? 'rgba(230,185,111,.16)' : 'rgba(255,140,140,.14)';
    g.fillRect(x, baseY, blockW, barH);

    g.save();
    g.beginPath();
    g.rect(x, baseY, blockW, barH);
    g.clip();
    g.strokeStyle = ok ? 'rgba(244,214,158,.5)' : 'rgba(255,170,170,.7)';
    g.lineWidth = 1;
    if (g.setLineDash) g.setLineDash(PATTERNS[i % PATTERNS.length]);
    for (let y = baseY - barH; y < baseY + barH * 2; y += 7) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + blockW, y + (i % 2 ? 6 : -6));
      g.stroke();
    }
    g.restore();
    if (g.setLineDash) g.setLineDash([]);

    g.strokeStyle = 'rgba(255,255,255,.35)';
    g.strokeRect(x + 0.5, baseY + 0.5, Math.max(1, blockW - 1), barH - 1);
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = 'bold 11px sans-serif';
    g.fillText(p.key, x + 3, baseY + 14);
    g.font = '9px sans-serif';
    const court = p.value.length > 7 ? p.value.slice(0, 6) + '…' : p.value;
    g.fillStyle = 'rgba(214,207,193,.85)';
    g.fillText(court, x + 3, baseY + 29);
    g.fillStyle = ok ? 'rgba(244,214,158,.95)' : 'rgba(255,180,180,.95)';
    g.fillText(ok ? 'reconnu' : 'ignoré', x + 3, baseY + 42);
  });

  const sx = pad + S.scan * inner;
  g.strokeStyle = 'rgba(255,255,255,.9)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(sx, baseY - 12);
  g.lineTo(sx, baseY + barH + 12);
  g.stroke();
  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.fillText(Math.round(S.scan * 100) + ' %', Math.min(sx + 4, cssW - 44), baseY - 16);

  g.fillStyle = 'rgba(214,207,193,.7)';
  g.font = '10px sans-serif';
  g.fillText('Motifs + libellés = lecture sans couleur. Le balayage ne modifie aucune donnée.', pad, cssH - 22);
  g.fillText('Longueur ' + fmtInt(S.decoded.length) + ' caractères · budget ' + fmtInt(S.budget) + '.', pad, cssH - 8);
}

/* ---------- E078-07 : copie locale avec repli ---------- */

async function copyLink() {
  const texte = buildLink(rawForSource(S.source));
  let ok = false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard
      && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(texte);
      ok = true;
    }
  } catch { ok = false; }
  if (!ok) {
    try {
      const champ = S.nodes && S.nodes.link;
      if (champ) {
        champ.focus();
        champ.select();
        ok = Boolean(document.execCommand && document.execCommand('copy'));
      }
    } catch { ok = false; }
  }
  S.copyStatus = ok
    ? 'Lien copié dans le presse-papiers : aucune requête n’a été envoyée.'
    : 'Copie automatique indisponible : sélectionnez le champ ci-dessus et copiez manuellement.';
  updateReadout();
}

/* ---------- E078-03 / E078-05 / E078-08 : relecture ---------- */

function refresh(message) {
  const raw = rawForSource(S.source);
  S.decoded = decodeHash(raw);
  if (S.nodes && S.nodes.link) S.nodes.link.value = buildLink(raw);
  renderParams();
  fillMeasures();
  updateReadout(message);
  drawLab();
  updateBadge();
}

function applyState(message) {
  const n = S.nodes;
  if (!n) return;
  n.radios.forEach((r) => { if (r) r.checked = r.value === S.source; });
  if (n.budget) n.budget.value = String(S.budget);
  if (n.budgetValue) n.budgetValue.textContent = fmtInt(S.budget) + ' caractères';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E078Reduced = S.reduced ? '1' : '0';
  refresh(message);
}

function selectSource(key) {
  const found = SOURCES.filter((s) => s.key === key)[0];
  if (!found) return;
  S.source = key;
  S.scan = 0;
  applyState('Source : ' + found.label.toLowerCase() + '.');
}

function resetState() {
  S.source = 'reel';
  S.budget = REF_BUDGET;
  S.scan = 0;
  S.copyStatus = '';
  applyState('Valeurs par défaut restaurées : fragment réel, budget de ' + REF_BUDGET + ' caractères.');
}

/* ---------- E078-04 : défi falsifiable en cinq temps ---------- */

const DEFI = {
  prediction: 'Un fragment plus long contient toujours plus de paramètres que le fragment court.',
  reglage: 'Choisissez « Exemple riche » dans le radiogroupe, puis lisez le tableau de mesures et le bandeau.',
  attendu: 'Le riche passe de 2 à 7 paramètres et de 17 à 49 caractères : les deux grandeurs augmentent ensemble ici.',
  falsification: 'Si un fragment très long ne contenait qu’un seul paramètre (une valeur de 64 caractères), la prédiction serait fausse : la longueur ne mesure pas la richesse.',
  debrief: 'Longueur et nombre de paramètres sont indépendants : c’est pour cela que le bandeau énonce les deux et que le tableau les recalcule séparément.',
};
const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

function buildDefi(ctx) {
  const list = el('ol', PFX + '-defi');
  list.id = ID.defi;
  DEFI_ETAPES.forEach(([key, label]) => {
    const li = el('li', '');
    li.appendChild(el('strong', '', label + ' : '));
    li.appendChild(document.createTextNode(DEFI[key]));
    list.appendChild(li);
  });
  return list;
}

/* ---------- E078-01 / E078-02 / E078-08 : panneau sémantique ---------- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      radios: SOURCES.map((s) => document.getElementById(ID.source + '-' + s.key)),
      budget: document.getElementById(ID.budget),
      budgetValue: document.getElementById(ID.budgetValue),
      link: document.getElementById(ID.link),
      copy: document.getElementById(ID.copy),
      reread: document.getElementById(ID.reread),
      params: document.getElementById(ID.params),
      canvas: document.getElementById(ID.canvas),
      readout: document.getElementById(ID.readout),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
      fresh: false,
    };
  }

  panel = el('section', PFX + '-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = el('h2', '', 'Partager un lien local par fragment d’URL — laboratoire V2');
  title.id = ID.title;
  const lead = el('p', '',
    'Une adresse peut décrire un état de navigation sans rien envoyer : le fragment placé après le '
    + 'dièse reste dans le navigateur. Ce panneau explique ce format, décode le fragment réellement '
    + 'présent ou un exemple de démonstration, et affiche chaque grandeur en toutes lettres.');

  /* E078-08 : choix unique → fieldset/radiogroup, jamais aria-pressed. */
  const fieldset = el('fieldset', '');
  fieldset.id = ID.source;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-labelledby', ID.sourceLegend);
  const legend = el('legend', '', 'Source du fragment à décoder (choix unique)');
  legend.id = ID.sourceLegend;
  fieldset.appendChild(legend);
  SOURCES.forEach((src) => {
    const lab = el('label', PFX + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = PFX + '-source';
    radio.id = ID.source + '-' + src.key;
    radio.value = src.key;
    radio.checked = S.source === src.key;
    radio.title = src.desc;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(src.label));
    fieldset.appendChild(lab);
  });

  /* Curseur de budget : grandeur comparée à une référence explicite. */
  const budgetRow = el('div', PFX + '-slider-row');
  const budgetLabel = document.createElement('label');
  budgetLabel.id = ID.budgetLabel;
  budgetLabel.setAttribute('for', ID.budget);
  const budgetValue = el('span', PFX + '-valeur', '');
  budgetValue.id = ID.budgetValue;
  budgetLabel.append(document.createTextNode('Budget de référence : '), budgetValue);
  const budget = document.createElement('input');
  budget.type = 'range';
  budget.id = ID.budget;
  budget.min = '80';
  budget.max = '400';
  budget.step = '20';
  budget.value = String(S.budget);
  budget.setAttribute('aria-label',
    'Budget de référence en caractères, de 80 à 400 par pas de 20, valeur affichée dans le libellé');
  budgetRow.append(budgetLabel, budget);

  const linkLabel = el('label', PFX + '-label', 'Lien local complet (sélectionnable) :');
  linkLabel.setAttribute('for', ID.link);
  const link = document.createElement('input');
  link.type = 'text';
  link.id = ID.link;
  link.readOnly = true;
  link.setAttribute('aria-label', 'Lien local complet avec son fragment, champ en lecture seule');

  const copy = el('button', PFX + '-btn', 'Copier le lien');
  copy.type = 'button';
  copy.id = ID.copy;
  const reread = el('button', PFX + '-btn', 'Relire le fragment');
  reread.type = 'button';
  reread.id = ID.reread;

  const sub = el('h3', '', 'Paramètres décodés du fragment');
  const list = el('ul', '');
  list.id = ID.params;

  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Représentation du fragment : un bloc par paramètre, avec des motifs et des libellés. '
    + 'Flèche gauche ou droite : déplacer le balayage ; Entrée ou Espace : lancer ou arrêter le '
    + 'balayage ; Origine : restaurer les valeurs par défaut.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite déplacent le balayage, Entrée ou '
    + 'Espace le lance et l’arrête, Origine restaure les réglages. Chaque résultat est énoncé dans le '
    + 'bandeau de lecture et repris dans le tableau de mesures : aucune information n’est portée par la seule couleur.');
  canvasDesc.id = ID.canvasDesc;

  const canvasLegend = el('p', PFX + '-legend',
    'Chaque bloc porte sa clé, sa valeur et sa validité en toutes lettres ; la trame oblique distingue '
    + 'les blocs sans recourir à la couleur. Le balayage ne modifie aucune donnée.');
  canvasLegend.id = ID.legend;

  const measuresTitle = el('h3', '', 'Mesures recalculées');
  const defiTitle = el('h3', '', 'Limite falsifiable : vérifier soi-même');

  const readout = el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Lecture du fragment local : grandeurs énoncées ci-dessous.';

  const play = el('button', PFX + '-btn', '▶ Animer le balayage');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  const reset = el('button', PFX + '-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const note = el('p', '',
    'Ce laboratoire est déterministe : aucun tirage aléatoire, aucune ressource externe, aucune '
    + 'écriture dans l’adresse. Les textes ci-dessus sont réels, lisibles et indexables même sans '
    + 'animation ; la carte d’origine reste utilisable sans ce panneau.');
  note.id = ID.note;

  panel.append(title, lead, buildFacts(ctx), buildGrammar(ctx), fieldset, budgetRow, linkLabel,
    link, copy, reread, sub, list, canvas, canvasDesc, canvasLegend, measuresTitle,
    buildMeasures(ctx), defiTitle, buildDefi(ctx), readout, play, reset, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    radios: SOURCES.map((s) => document.getElementById(ID.source + '-' + s.key)),
    budget, budgetValue, link, copy, reread, params: list, canvas, readout, play, reset,
    fresh: true,
  };
}

/* ---------- E078-10 : badge de statut sur la carte existante ---------- */

function updateBadge() {
  const badge = document.getElementById(ID.badge);
  if (!badge) return;
  badge.textContent = 'Fragment local : ' + fmtInt(S.decoded.length) + ' caractères, '
    + fmtInt(S.decoded.params.length) + ' paramètres — zéro réseau.';
}

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = el('div', PFX + '-badge', '');
  badge.id = ID.badge;
  map.appendChild(badge);
}

/* ---------- E078-01 : feuille de style isolée, une seule injection ---------- */

const CSS = `
.${PFX}-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);font-size:11px;line-height:1.6;
}
.${PFX}-panel h2{margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700}
.${PFX}-panel h3{margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700}
.${PFX}-panel p{margin:5px 0;max-width:74ch}
.${PFX}-panel .${PFX}-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
.${PFX}-panel .${PFX}-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums}
.${PFX}-panel .${PFX}-table caption{margin-bottom:4px;color:var(--muted,#a8a198);text-align:left}
.${PFX}-panel .${PFX}-table th,.${PFX}-panel .${PFX}-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
.${PFX}-panel .${PFX}-table thead th{color:var(--gold-bright,#f4d69e)}
.${PFX}-panel .${PFX}-table tbody th{color:var(--gold,#e6b96f);font-weight:600}
.${PFX}-panel .${PFX}-table td.${PFX}-num{color:var(--gold-bright,#f4d69e);font-weight:600}
#${ID.source}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${ID.source} legend{padding:0 4px;color:var(--gold,#e6b96f)}
.${PFX}-panel .${PFX}-choix{display:inline-flex;align-items:center;gap:5px;min-height:36px;margin:0 8px 0 0;padding:2px 6px;cursor:pointer}
.${PFX}-panel .${PFX}-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
.${PFX}-slider-row{margin:7px 0}
.${PFX}-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.${PFX}-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
.${PFX}-panel input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.${PFX}-panel .${PFX}-label{display:block;margin:8px 0 3px;color:var(--muted,#a8a198)}
#${ID.link}{
  display:block;width:100%;min-height:44px;padding:7px 8px;box-sizing:border-box;
  border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.25);
  color:var(--ink-soft,#d7d1c6);font:inherit;font-size:10px;font-variant-numeric:tabular-nums;
}
#${ID.canvas}{
  display:block;width:100%;height:224px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.30);touch-action:manipulation;
}
.${PFX}-panel .${PFX}-legend{font-size:10px;color:var(--muted,#a8a198)}
.${PFX}-panel .${PFX}-defi{margin:6px 0;padding-left:18px;font-size:10px}
.${PFX}-panel .${PFX}-defi li{margin:3px 0}
.${PFX}-panel .${PFX}-defi strong{color:var(--gold,#e6b96f)}
#${ID.params}{margin:6px 0;padding-left:18px}
#${ID.params} li{margin:3px 0;max-width:68ch}
#${ID.params} .${PFX}-vide{color:var(--muted,#a8a198);font-style:italic}
#${ID.readout}{
  min-height:44px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${ID.readout} strong{color:var(--gold-bright,#f4d69e)}
.${PFX}-panel .${PFX}-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s,color .18s;
}
.${PFX}-panel .${PFX}-btn:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
.${PFX}-panel :focus-visible{outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${PFX}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.${PFX}-panel[data-geography-v2-e078-reduced="1"] .${PFX}-btn{transition:none}
@media (prefers-reduced-motion:reduce){
  .${PFX}-panel .${PFX}-btn{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  .${PFX}-panel{font-size:10px;padding:9px}
  #${ID.canvas}{height:184px}
  .${PFX}-panel .${PFX}-choix{margin-right:4px}
}
@media (forced-colors:active){
  .${PFX}-panel{border:1px solid CanvasText}
}
`;

/* ---------- E078-09 : boucle rAF unique, pauses multiples ---------- */

function stopLoop() {
  if (S.rafId) {
    try { cancelAnimationFrame(S.rafId); } catch { /* environnement sans rAF */ }
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.inView || S.reduced || !S.playing) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) { stopLoop(); return; }
  if (!S.inView || S.reduced || !S.playing) { stopLoop(); return; }
  if (S.lastTs) {
    const dt = clamp(ts - S.lastTs, 0, 80);
    S.scan = (S.scan + dt * 0.00013) % 1;
  }
  S.lastTs = ts;
  drawLab();
  S.rafId = requestAnimationFrame(tick);
}

function installListeners() {
  if (S.listenersInstalled) return;
  S.listenersInstalled = true;

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop(); else startLoop();
    });
  }

  /* Pause hors champ : au plus un canvas dessiné, et seulement à l’écran. */
  if (S.nodes && S.nodes.panel && typeof IntersectionObserver === 'function') {
    try {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { S.inView = !!entry.isIntersecting; });
        if (S.inView) startLoop(); else stopLoop();
      }, { threshold: 0.05 });
      io.observe(S.nodes.panel);
    } catch { /* observation indisponible : la visibilité de l’onglet reste le garde-fou */ }
  }

  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = (event) => {
        S.reduced = !!(event && event.matches);
        if (S.reduced) { S.playing = false; stopLoop(); } else startLoop();
        if (S.nodes) applyState();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }

  /* E078-08 : un seul hashchange, qui ne relit que si la source est réelle. */
  if (!S.hashBound && typeof window !== 'undefined') {
    S.hashBound = true;
    window.addEventListener('hashchange', () => {
      if (S.source === 'reel') refresh();
    });
  }
}

/* ---------- Câblage des contrôles (une seule fois) ---------- */

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  n.radios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (radio.checked) selectSource(radio.value);
    });
  });

  n.budget.addEventListener('input', () => {
    const v = Math.max(80, Math.min(400, Number(n.budget.value)));
    S.budget = Math.round(v / 20) * 20;
    applyState();
  });

  n.copy.addEventListener('click', () => { void copyLink(); });
  n.reread.addEventListener('click', () => { refresh(); });

  n.play.addEventListener('click', () => {
    S.playing = !S.playing;
    if (!S.playing || S.reduced) stopLoop(); else startLoop();
    applyState();
  });
  n.reset.addEventListener('click', () => { resetState(); });

  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      S.scan = (S.scan + (event.key === 'ArrowRight' ? 0.05 : 0.95)) % 1;
      drawLab();
    } else if (event.key === 'Enter' || event.key === ' ') {
      S.playing = !S.playing;
      if (!S.playing || S.reduced) stopLoop(); else startLoop();
      applyState();
    } else if (event.key === 'Home') {
      resetState();
    } else {
      used = false;
    }
    if (used) event.preventDefault();
  });
}

/* ---------- Point d’entrée unique ---------- */

register('E078', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (!ctx.layout || typeof ctx.layout.appendChild !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'geography') return;

  /* E078-01 : une seule feuille de style, injectée une seule fois. */
  ctx.css(CSS_ID, CSS);

  S.ctx = ctx;
  try { S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false; }
  catch { S.reduced = false; }
  if (S.reduced) S.playing = false;

  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  wirePanel();
  applyState();
  installListeners();
  if (S.playing && !S.reduced) startLoop();
});
