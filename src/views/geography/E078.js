import { register } from './registry.js';

/* Lentille E078 — vue GEOGRAPHIE.
 * Thème : partage de lien local via fragment d'URL (hash), sans réseau.
 *
 * Les dix chantiers E078-01 … E078-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E078.md. Tous sont réellement implémentés.
 *
 * Principe : le fragment d'URL (`#v=geography&c=...`) est un espace de données
 * strictement local. Il n'est jamais transmis à un serveur, jamais écrit dans
 * un fichier, jamais généré par un aléa. La lentille l'expose sous forme de
 * texte sémantique (tableau de grammaire, liste des paramètres décodés, champ
 * de lien, statut chiffré) et ajoute un laboratoire canvas qui dessine un bloc
 * par paramètre avec des motifs non chromatiques. L'appartenance au format
 * existant de l'application est respectée : aucun fragment concurrent n'est
 * écrit, la lecture se fait sur `window.location.hash` et l'écoute `hashchange`
 * se contente de refléter les changements déjà opérés localement.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e078';
const PFX = 'geography-e078';
const PANEL_ID = PFX + '-panel';
const TITLE_ID = PFX + '-title';
const TABLE_ID = PFX + '-table';
const LINK_ID = PFX + '-link';
const COPY_ID = PFX + '-copy';
const REREAD_ID = PFX + '-reread';
const PLAY_ID = PFX + '-play';
const LIST_ID = PFX + '-params';
const CANVAS_ID = PFX + '-canvas';
const READOUT_ID = PFX + '-readout';
const LEGEND_ID = PFX + '-legend';

const MAX_HASH = 2048;      // plafond de lecture, jamais d'écriture
const REF_BUDGET = 180;     // référence : budget d'une URL facilement partageable
const VIEWS = ['globe', 'chronology', 'recit', 'geography', 'constellation', 'points'];
const PATTERNS = [[], [4, 3], [1, 3], [6, 2], [2, 2], [8, 3]];

/* E078-02 / E078-04 : vocabulaire canonique du fragment local. */
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

/* État de module : survit aux reconstructions du DOM par la coque. */
const S = {
  ctx: null,
  nodes: {},
  hash: '',
  decoded: { raw: '', params: [], recognized: 0, unknown: 0, invalids: 0 },
  copyStatus: '',
  scanning: false,
  scan: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  hashBound: false,
};

/* ---------- utilitaires déterministes ---------- */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fmtInt(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

function node(tag, className, text) {
  if (S.ctx && typeof S.ctx.el === 'function') return S.ctx.el(tag, className, text);
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
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

/* ---------- E078-03 : lecture du fragment, strictement locale ---------- */

function readHash() {
  try {
    if (typeof window === 'undefined' || !window.location) return '';
    return String(window.location.hash || '').slice(0, MAX_HASH);
  } catch { return ''; }
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
  const out = { raw: '', params: [], recognized: 0, unknown: 0, invalids: 0 };
  if (!raw) return out;
  out.raw = raw;
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

/* ---------- E078-06 : reconstitution du lien local ---------- */

function buildLink() {
  let base = '';
  try { base = String(window.location.href || ''); } catch { base = ''; }
  const cut = base.indexOf('#');
  const sansFragment = cut >= 0 ? base.slice(0, cut) : base;
  return sansFragment + '#' + S.decoded.raw;
}

/* ---------- E078-01 / E078-02 : contenu sémantique lisible sans JS ---------- */

function staticFacts() {
  const wrap = node('div');
  const faits = [
    'Un fragment d’URL est la partie qui suit le symbole « dièse » dans une adresse. Il sert à décrire un état de navigation sans changer de page.',
    'Le fragment n’est jamais envoyé à un serveur : il reste dans le navigateur. Partager un lien local revient donc à partager une chaîne de texte, pas une requête.',
    'Ici, le format est une suite de paires clé=valeur séparées par « et » commercial. Chaque clé est courte (v, c, e, r, p, l, s, fd, ff, d, h) et chaque valeur est encodée pour rester lisible.',
  ];
  faits.forEach((texte) => {
    const p = node('p', PFX + '-fait', texte);
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = node('table');
  table.id = TABLE_ID;
  const caption = node('caption', '', 'Grammaire du fragment local : une clé, une signification, un exemple. Aucune de ces valeurs ne quitte l’appareil.');
  table.appendChild(caption);

  const thead = node('thead');
  const hr = node('tr');
  ['Clé', 'Signification', 'Exemple'].forEach((h) => {
    const th = node('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = node('tbody');
  DICT.forEach((entry) => {
    const tr = node('tr');
    const th = node('th', '', entry.k);
    th.scope = 'row';
    const tdLabel = node('td', '', entry.label);
    const tdEx = node('td', '', entry.ex);
    tr.append(th, tdLabel, tdEx);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E078-05 : liste sémantique des paramètres décodés ---------- */

function renderParams() {
  const list = S.nodes.list;
  if (!list) return;
  list.textContent = '';
  const params = S.decoded.params;
  if (!params.length) {
    const li = node('li', PFX + '-vide', 'Fragment vide : aucune paire clé=valeur à décoder.');
    list.appendChild(li);
    return;
  }
  params.forEach((p) => {
    const li = node('li', PFX + '-item');
    const cle = node('strong', '', p.key);
    li.appendChild(cle);
    li.appendChild(document.createTextNode(' = ' + p.value + ' — ' + p.label));
    if (!p.known) li.appendChild(document.createTextNode(' (clé ignorée)'));
    else if (!p.valid) li.appendChild(document.createTextNode(' (valeur invalide : ignorée)'));
    else li.appendChild(document.createTextNode(' (valeur reconnue)'));
    list.appendChild(li);
  });
}

/* ---------- E078-09 / E078-10 : grandeurs chiffrées et statut ---------- */

function updateReadout() {
  const out = S.nodes.readout;
  if (!out) return;
  const total = S.decoded.params.length;
  const length = S.decoded.raw.length;
  const ratio = REF_BUDGET > 0 ? Math.round((length / REF_BUDGET) * 100) : 0;
  out.textContent = '';
  const bold = (texte) => {
    const s = node('strong', '', texte);
    return s;
  };
  out.appendChild(document.createTextNode('Fragment lu : '));
  out.appendChild(bold(fmtInt(total) + ' paramètre(s)'));
  out.appendChild(document.createTextNode(', dont '));
  out.appendChild(bold(fmtInt(S.decoded.recognized) + ' reconnu(s)'));
  out.appendChild(document.createTextNode(' et '));
  out.appendChild(bold(fmtInt(S.decoded.unknown) + ' inconnu(s)'));
  out.appendChild(document.createTextNode('. Longueur : '));
  out.appendChild(bold(fmtInt(length) + ' caractères'));
  out.appendChild(document.createTextNode(', soit '));
  out.appendChild(bold(ratio + ' %'));
  out.appendChild(document.createTextNode(' du budget de référence de ' + REF_BUDGET + ' caractères. '));
  out.appendChild(document.createTextNode('Zéro octet envoyé : le fragment reste local. '));
  out.appendChild(document.createTextNode(S.copyStatus || 'Aucune copie demandée pour l’instant.'));
}

/* ---------- E078-09 : laboratoire canvas ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
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
  const inner = Math.max(10, cssW - pad * 2);
  const baseY = Math.round(cssH * 0.38);
  const barH = 46;
  const params = S.decoded.params;

  g.font = '11px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText('Fragment d’URL — un bloc par paramètre', pad, pad + 4);

  if (!params.length) {
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.fillText('Aucun paramètre : le fragment est vide.', pad, baseY + 8);
    g.fillStyle = 'rgba(214,207,193,.65)';
    g.fillText('Un lien local se construit avec #v=geography&c=de, sans serveur.', pad, baseY + 26);
    return;
  }

  const n = params.length;
  const gap = 4;
  const blockW = Math.max(8, (inner - gap * (n - 1)) / n);

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
  g.fillText('Motifs + libellés = lecture sans couleur. Le balayage ne modifie aucune donnée.', pad, cssH - 8);
}

/* ---------- E078-07 : copie locale avec repli ---------- */

async function copyLink() {
  const texte = buildLink();
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
      const champ = S.nodes.link;
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

/* ---------- E078-08 : relecture et synchronisation ---------- */

function refresh() {
  const h = readHash();
  S.hash = h;
  S.decoded = decodeHash(h);
  if (S.nodes.link) S.nodes.link.value = buildLink();
  renderParams();
  updateReadout();
  drawLab();
}

/* ---------- E078-09 : une seule boucle rAF, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (reduced()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  const off = reduced();
  if (S.lastTs) {
    const dt = clamp(ts - S.lastTs, 0, 80);
    if (S.scanning && !off) S.scan = (S.scan + dt * 0.00013) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.scanning && !off) S.rafId = requestAnimationFrame(tick);
}

function installListeners() {
  if (!S.visibilityBound && typeof document !== 'undefined') {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.scanning) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE078Reduced = mq.matches ? '1' : '0';
        if (mq.matches) {
          S.scanning = false;
          stopLoop();
        } else if (S.scanning) startLoop();
        if (S.nodes.play) S.nodes.play.setAttribute('aria-pressed', S.scanning ? 'true' : 'false');
        drawLab();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  if (!S.hashBound && typeof window !== 'undefined') {
    S.hashBound = true;
    window.addEventListener('hashchange', () => {
      refresh();
    });
  }
}

/* ---------- construction du panneau ---------- */

function ensurePanel(ctx) {
  const existing = document.getElementById(PANEL_ID);
  if (existing && existing.isConnected) {
    return {
      panel: existing,
      fresh: false,
      link: document.getElementById(LINK_ID),
      copy: document.getElementById(COPY_ID),
      reread: document.getElementById(REREAD_ID),
      play: document.getElementById(PLAY_ID),
      list: document.getElementById(LIST_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
    };
  }

  const panel = node('section', PFX + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = node('h2', '', 'Partager un lien local par fragment d’URL');
  title.id = TITLE_ID;
  const lead = node('p', '', 'Une adresse peut décrire un état de navigation sans rien envoyer : le fragment placé après le dièse reste dans le navigateur. Voici comment le lire, le copier et le relire, entièrement en local.');

  const linkLabel = node('label', PFX + '-label', 'Lien local complet (sélectionnable) :');
  linkLabel.setAttribute('for', LINK_ID);
  const link = node('input');
  link.type = 'text';
  link.id = LINK_ID;
  link.readOnly = true;
  link.setAttribute('aria-label', 'Lien local complet avec son fragment, champ en lecture seule');

  const copy = node('button', '', 'Copier le lien');
  copy.type = 'button';
  copy.id = COPY_ID;
  const reread = node('button', '', 'Relire le fragment');
  reread.type = 'button';
  reread.id = REREAD_ID;
  const play = node('button', '', S.scanning ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.scanning ? 'true' : 'false');

  const sub = node('h3', '', 'Paramètres décodés du fragment');
  const list = node('ul');
  list.id = LIST_ID;

  const canvas = node('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Representation du fragment : un bloc par paramètre, avec des motifs et des libellés. Flèche gauche ou droite : déplacer le balayage ; Entrée : lancer ou arrêter le balayage.');

  const legend = node('p', PFX + '-legend', 'Chaque bloc porte sa clé, sa valeur et sa validité en toutes lettres : la couleur n’est qu’un renfort, jamais le seul code.');
  legend.id = LEGEND_ID;

  const readout = node('p', PFX + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  panel.append(
    title, lead, staticFacts(), staticTable(), linkLabel, link,
    copy, reread, play, sub, list, canvas, legend, readout,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return { panel, fresh: true, link, copy, reread, play, list, canvas, readout };
}

/* ---------- point d'entrée ---------- */

register('E078', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, `
  #${PANEL_ID}{
    margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
    background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
  }
  #${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
  #${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
  #${PANEL_ID} p{margin:5px 0;max-width:68ch}
  #${PANEL_ID} .${PFX}-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
  #${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
  #${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
  #${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
  #${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
  #${PANEL_ID} .${PFX}-label{display:block;margin:8px 0 3px;color:var(--muted)}
  #${LINK_ID}{
    display:block;width:100%;min-height:40px;padding:7px 8px;box-sizing:border-box;
    border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.25);
    color:var(--ink-soft,#d7d1c6);font:inherit;font-size:10px;font-variant-numeric:tabular-nums;
  }
  #${PANEL_ID} button{
    display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
    border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
    color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
    transition:border-color .18s,background-color .18s,color .18s;
  }
  #${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
  #${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
  #${LIST_ID}{margin:6px 0;padding-left:18px}
  #${LIST_ID} li{margin:3px 0;max-width:68ch}
  #${LIST_ID} .${PFX}-vide{color:var(--muted);font-style:italic}
  #${CANVAS_ID}{
    display:block;width:100%;height:210px;margin:8px 0;border:1px solid var(--line);
    border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
  }
  #${PANEL_ID} .${PFX}-legend{font-size:10px;color:var(--muted)}
  #${READOUT_ID}{
    min-height:36px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
    background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
    font-variant-numeric:tabular-nums;
  }
  #${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
  #${PANEL_ID}[data-geography-e078-reduced="1"] button{transition:none}
  @media (prefers-reduced-motion:reduce){
    #${PANEL_ID} button{transition:none!important;animation:none!important}
  }
  @media (max-width:620px){
    #${PANEL_ID}{font-size:10px;padding:9px}
    #${CANVAS_ID}{height:180px}
    #${PANEL_ID} button{margin-right:4px}
  }
  `);

  S.ctx = ctx;
  S.nodes = ensurePanel(ctx);

  const flag = reduced() ? '1' : '0';
  S.nodes.panel.dataset.geographyE078Reduced = flag;
  if (flag === '1') {
    S.scanning = false;
    stopLoop();
  }

  refresh();

  if (S.nodes.fresh) {
    S.nodes.copy.addEventListener('click', () => { void copyLink(); });
    S.nodes.reread.addEventListener('click', () => { refresh(); });
    S.nodes.play.addEventListener('click', () => {
      S.scanning = !S.scanning;
      S.nodes.play.setAttribute('aria-pressed', S.scanning ? 'true' : 'false');
      S.nodes.play.textContent = S.scanning ? '■ Arrêter le balayage' : '▶ Animer le balayage';
      if (!S.scanning) stopLoop(); else startLoop();
    });
    S.nodes.canvas.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        S.scan = (S.scan + (event.key === 'ArrowRight' ? 0.05 : 0.95)) % 1;
        drawLab();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        S.scanning = !S.scanning;
        S.nodes.play.setAttribute('aria-pressed', S.scanning ? 'true' : 'false');
        S.nodes.play.textContent = S.scanning ? '■ Arrêter le balayage' : '▶ Animer le balayage';
        if (!S.scanning) stopLoop(); else startLoop();
      }
    });
  }

  installListeners();
  if (S.scanning) startLoop();
});
