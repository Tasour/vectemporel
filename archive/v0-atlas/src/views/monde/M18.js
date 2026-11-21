import { register } from './registry.js';

/* Lentille M18 — Exactitude du drapeau (domaine B : drapeau & révélation).
 *
 * Lectures seules : src/data/dataset.js, public/flags/*.svg, src/views/globe.js,
 * src/views/globe-reveal.js, src/views/monde/registry.js.
 *
 * Les 10 chantiers sont documentés dans UNIFIED_AUDIT/MONDE/views/M18-exactitude-drapeau.md.
 * Ce greffon ne possède que son propre fichier : il n'écrit ni dans le dataset,
 * ni dans les SVG, ni dans globe-reveal.js. Il contrôle la cohérence
 * emoji ↔ code ISO ↔ fichier local, corrige le cadrage du drapeau (3:2 dans un
 * cadre 2:1) et expose un diagnostic textuel, sans réseau ni aléa.
 *
 * Invariants : zéro fetch/XHR, zéro Math.random, zéro console.*, zéro timer,
 * zéro call d'animation propre, un seul id CSS (monde-m18), un seul nœud_panel.
 */

const CSS_ID = 'monde-m18';
const PANEL_ID = 'monde-m18-flag';

/* Codes des dix fichiers réellement présents dans public/flags/ (lecture seule).
 * Constante figée : aucun test d'existence à distance, aucun chargement réseau. */
const LOCAL_SVG_CODES = Object.freeze([
  'CN', 'DE', 'EG', 'ES', 'FR', 'GB', 'IN', 'IT', 'JP', 'US',
]);

/* Fidélité graphique constatée par relecture des SVG locaux : les emblemes
 * complexes y sont stylisés. Aucun fait historique n'est inventé ici. */
const STYLIZED = Object.freeze({
  CN: 'étoiles secondaires simplifiées',
  EG: 'aigle remplacé par un motif géométrique',
  ES: 'écusson simplifié, sans couronne',
  GB: 'diagonales non décalées',
  IN: 'Chakra sans ses vingt-quatre rayons',
  US: 'quatorze étoiles pour cinquante',
});

const CSS = `
  /* M18-04 : le SVG est 60x40 (3:2), le cadre .gr-figure est 2:1 ;
     background-size:cover recoupe ~25 % de la hauteur et tronque les bandes. */
  #globe-reveal .gr-figure > .gr-flag{
    background-size:contain;
    background-repeat:no-repeat;
    background-position:center center;
    background-color:transparent;
  }
  /* M18-05 : pile de polices 100 % locale, aucun téléchargement de glyphe. */
  .globe-list .globe-country-flag{
    font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif;
    font-variant-emoji:emoji;
  }
  #${PANEL_ID}{
    position:absolute;left:16px;bottom:16px;z-index:4;
    max-width:min(330px,42vw);margin:0;padding:6px 9px;
    border:1px solid var(--line);border-radius:8px;
    background:rgba(8,11,16,.86);color:var(--muted);
    font-size:11px;line-height:1.4;font-variant-numeric:tabular-nums;
    pointer-events:none;
  }
  @media (max-width:700px){
    #${PANEL_ID}{left:8px;bottom:8px;max-width:calc(100vw - 16px)}
  }
  @media (prefers-reduced-motion:reduce){#${PANEL_ID}{transition:none}}
`;

let panel = null;
let installToken = 0;          // each render re-registers; stale callbacks are inert
const statuses = new Map();    // code -> { emojiCode, svg, fidelity, issue }

/* M18-02 : 🇫🇷 → FR. Deux indicateurs régionaux U+1F1E6..U+1F1FF, rien de plus. */
function flagEmojiCode(flag) {
  if (typeof flag !== 'string') return null;
  const chars = Array.from(flag);
  if (chars.length !== 2) return null;
  const letters = [];
  for (const char of chars) {
    const point = char.codePointAt(0);
    if (point < 0x1F1E6 || point > 0x1F1FF) return null;
    letters.push(String.fromCharCode(0x41 + point - 0x1F1E6));
  }
  return letters.join('');
}

function validCode(code) {
  return /^[A-Z]{2}$/.test(code);
}

function anomalyCount() {
  let count = 0;
  for (const status of statuses.values()) if (status.issue !== 'none') count += 1;
  return count;
}

/* M18-06 : l'ère n'est lue que si elle appartient au pays affiché ; sinon on
 * ne projette pas l'ère d'un autre pays sur son drapeau. */
function eraFor(ctx, country) {
  const state = ctx && ctx.state;
  if (!state || typeof state !== 'object' || !country || state.countryId !== country.id) return null;
  const eras = Array.isArray(country.eras) ? country.eras : [];
  const era = eras[state.eraIndex];
  return era && typeof era.name === 'string' ? era : null;
}

function writePanel(text, data) {
  if (!panel) return;
  panel.textContent = text;
  if (!data) return;
  panel.dataset.m18Code = data.code || '';
  panel.dataset.m18Emoji = data.emojiCode || '';
  panel.dataset.m18Svg = data.svg ? 'present' : 'missing';
  panel.dataset.m18Fidelity = data.fidelity;
  panel.dataset.m18Era = data.eraId || '';
  panel.dataset.m18Issue = data.issue;
}

function ensurePanel(ctx) {
  if (panel && panel.isConnected) return panel;
  const existing = document.getElementById(PANEL_ID);
  if (existing) {
    panel = existing;
  } else {
    panel = ctx.el('p', 'monde-m18-flag');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Exactitude du drapeau');
  }
  const parent = ctx.scene && ctx.scene.isConnected
    ? ctx.scene
    : (ctx.host && ctx.host.isConnected ? ctx.host : null);
  if (parent && panel.parentNode !== parent) parent.appendChild(panel);
  return panel;
}

function describeSelected(ctx) {
  const selected = ctx && ctx.selected && typeof ctx.selected === 'object' ? ctx.selected : null;
  if (!selected) {
    writePanel('Drapeau : survolez un pays ou ouvrez sa fiche pour vérifier emoji, code ISO et SVG local.', null);
    return;
  }
  inspect(ctx, selected, selected.code, true);
}

/* M18-01/02/03/05/06/09 : une seule routine d'inspection, sans effet de bord
 * ni écriture hors du panneau. Le résultat est mémorisé par code pour le
 * compteur de couverture et l'attribut E2E. */
function inspect(ctx, country, payloadCode, quiet) {
  const code = typeof payloadCode === 'string' && payloadCode
    ? payloadCode
    : (country && typeof country.code === 'string' ? country.code : '');
  if (!country || !code) {
    if (!quiet) writePanel('Drapeau : aucun pays identifiable dans le survol.', null);
    return;
  }

  const emojiCode = flagEmojiCode(country.flag);
  const svg = validCode(code) && LOCAL_SVG_CODES.indexOf(code) >= 0;
  const stylizedNote = validCode(code) && STYLIZED[code] ? STYLIZED[code] : '';
  const fidelity = !svg ? 'unknown' : (stylizedNote ? 'stylized' : 'exact');
  const mismatchPayload = !!country.code && country.code !== code;
  const mismatchEmoji = validCode(code) && emojiCode !== code;

  let issue = 'none';
  if (!validCode(code)) issue = 'code-invalid';
  else if (mismatchPayload) issue = 'payload-mismatch';
  else if (mismatchEmoji) issue = 'emoji-mismatch';
  else if (!svg) issue = 'svg-missing';

  statuses.set(code, { emojiCode, svg, fidelity, issue });
  const era = eraFor(ctx, country);

  const pieces = [
    `Drapeau ${code}`,
    mismatchEmoji
      ? (emojiCode ? `emoji ${emojiCode} ≠ ${code}` : 'emoji invalide')
      : 'emoji cohérent',
    svg ? 'SVG local présent' : 'SVG local absent',
    stylizedNote ? `SVG stylisé : ${stylizedNote}` : (svg ? 'SVG fidèle' : 'fidélité inconnue'),
    'drapeau actuel : repère du pays, non drapeau de l’ère',
  ];
  if (era) pieces.push(`ère ${era.name}`);
  pieces.push(`vérifiés ${statuses.size} · anomalies ${anomalyCount()}`);
  writePanel(`${pieces.join(' · ')}.`, {
    code,
    emojiCode,
    svg,
    fidelity,
    issue,
    eraId: era ? era.id : '',
  });
}

/* M18-07 : notifyMondeHover transmet { country, code } (registry.js:70-71).
 * Le code du payload gagne ; le pays peut être résolu par code si le payload
 * ne fournit pas l'objet (survol moteur). */
function handleHover(ctx, payload) {
  const data = payload && typeof payload === 'object' ? payload : {};
  const countries = Array.isArray(ctx.countries) ? ctx.countries : [];
  const country = data.country && typeof data.country === 'object'
    ? data.country
    : countries.find((item) => item && item.code === data.code) || null;
  inspect(ctx, country, data.code);
}

/* M18-08 : registry.js:48-50 purge les callbacks à chaque rendu, donc on
 * réabonne à chaque install(); le jeton rend les anciens abonnements inertes
 * si le registre venait à ne pas purger. Le nœud, lui, reste unique par ID. */
function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  ctx.css(CSS_ID, CSS);
  ensurePanel(ctx);

  const token = ++installToken;
  if (typeof ctx.onHover === 'function') {
    ctx.onHover((payload) => {
      if (token === installToken) handleHover(ctx, payload);
    });
  }
  if (typeof ctx.onLeave === 'function') {
    ctx.onLeave(() => {
      if (token === installToken) describeSelected(ctx);
    });
  }
  describeSelected(ctx);
}

register('M18', install);
