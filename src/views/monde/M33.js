import { register } from './registry.js';

/* Lentille M33 — Codes ISO et drapeaux (domaine D : données & sémantique).
 *
 * Lectures seules : src/data/dataset.js, src/domain/store.js, src/views/globe.js,
 * src/views/globe-reveal.js, src/views/monde/registry.js.
 *
 * Les dix chantiers sont documentés dans UNIFIED_AUDIT/MONDE/views/M33.md.
 * Ce greffon possède uniquement son propre fichier : il n'écrit ni dans le
 * dataset, ni dans store.js, ni dans globe.js, ni dans globe-reveal.js.
 * Il audite le couple code ISO ↔ drapeau comme donnée : index canonique,
 * validation alpha-2, normalisation, unicité, cohérence emoji, étiquette de
 * norme, mention d'ère, libellé accessible, ordre déterministe et rapport.
 *
 * Invariants : zéro fetch/XHR, zéro Math.random, zéro console.*, zéro timer,
 * zéro animation propre, un seul id CSS (monde-m33), deux nœuds uniques.
 */

const STYLE_ID = 'monde-m33';
const STATUS_ID = 'monde-m33-iso-status';
const REPORT_ID = 'monde-m33-iso-report';
const ISO2 = /^[A-Z]{2}$/;

let countriesRef = [];
let hostRef = null;
let statusRef = null;
let reportRef = null;
let installToken = 0;
let signature = '';
let lastStatusKey = '';
let normalizedCount = 0;

const index = new Map(); // code canonique -> pays
const audit = {
  invalid: [],
  missing: [],
  duplicates: [],
  emojiMismatch: [],
};

function cssRules() {
  return `
  .m33-iso-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
    overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  `;
}

/* M33-02 : la casse et les espaces d'entrée ne font pas partie de la sémantique
 * ISO. Seul un code devenu /^[A-Z]{2}$/ après nettoyage est accepté. */
function normalizeCode(value) {
  if (typeof value !== 'string') return '';
  const cleaned = value.trim().toUpperCase();
  return ISO2.test(cleaned) ? cleaned : '';
}

/* M33-05 : 🇫🇷 -> FR. Deux indicateurs régionaux U+1F1E6..U+1F1FF, rien de plus. */
function emojiCode(flag) {
  if (typeof flag !== 'string') return '';
  const chars = Array.from(flag);
  if (chars.length !== 2) return '';
  let code = '';
  for (const char of chars) {
    const point = char.codePointAt(0);
    if (point < 0x1F1E6 || point > 0x1F1FF) return '';
    code += String.fromCharCode(0x41 + point - 0x1F1E6);
  }
  return ISO2.test(code) ? code : '';
}

function ensureStatus() {
  if (statusRef && statusRef.isConnected) return statusRef;
  statusRef = document.getElementById(STATUS_ID);
  if (!statusRef) {
    statusRef = document.createElement('p');
    statusRef.id = STATUS_ID;
    statusRef.className = 'm33-iso-sr';
    statusRef.setAttribute('role', 'status');
    statusRef.setAttribute('aria-live', 'polite');
    statusRef.setAttribute('aria-atomic', 'true');
    document.body.appendChild(statusRef);
  }
  return statusRef;
}

function ensureReport() {
  if (reportRef && reportRef.isConnected) return reportRef;
  reportRef = document.getElementById(REPORT_ID);
  if (!reportRef) {
    reportRef = document.createElement('span');
    reportRef.id = REPORT_ID;
    reportRef.className = 'm33-iso-sr';
    reportRef.setAttribute('aria-hidden', 'true');
    reportRef.hidden = true;
    document.body.appendChild(reportRef);
  }
  return reportRef;
}

function computeSignature() {
  return countriesRef.map((country) => {
    if (!country) return '~';
    return [country.id, country.code, country.flag, country.name].join('~');
  }).join('|');
}

/* M33-01/03/04/05/09/10 : une seule passe d'audit, dérivée de ctx.countries. */
function buildIndex() {
  const nextSignature = computeSignature();
  if (nextSignature === signature && index.size > 0) return;
  signature = nextSignature;

  index.clear();
  audit.invalid = [];
  audit.missing = [];
  audit.duplicates = [];
  audit.emojiMismatch = [];

  countriesRef.forEach((country) => {
    if (!country) return;
    const raw = country.code;
    const code = normalizeCode(raw);
    if (!code) {
      const label = String(raw === undefined || raw === null ? '' : raw).trim();
      if (label) audit.invalid.push(label);
      else audit.missing.push(String(country.id || country.name || 'sans-id'));
      return;
    }
    if (index.has(code)) {
      audit.duplicates.push(code);
      return;
    }
    index.set(code, country);
    const fromEmoji = emojiCode(country.flag);
    if (fromEmoji !== code) {
      audit.emojiMismatch.push(`${code}->${fromEmoji || '?'}`);
    }
  });

  publish();
}

function publish() {
  if (!hostRef) return;
  const order = Array.from(index.keys()).sort();
  hostRef.dataset.m33IsoStandard = 'ISO 3166-1 alpha-2';
  hostRef.dataset.m33IsoCount = String(index.size);
  hostRef.dataset.m33IsoOrder = order.join(',');
  hostRef.dataset.m33IsoInvalid = audit.invalid.join(',');
  hostRef.dataset.m33IsoMissing = audit.missing.join(',');
  hostRef.dataset.m33IsoDuplicates = audit.duplicates.join(',');
  hostRef.dataset.m33IsoEmojiMismatch = audit.emojiMismatch.join(',');
  hostRef.dataset.m33IsoNormalized = String(normalizedCount);

  const report = `valid=${index.size};invalid=${audit.invalid.join('|')};`
    + `missing=${audit.missing.join('|')};duplicates=${audit.duplicates.join('|')};`
    + `emojiMismatch=${audit.emojiMismatch.join('|')}`;
  hostRef.dataset.m33IsoReport = report;
  const node = ensureReport();
  if (node) node.textContent = report;
}

/* M33-02/07/08 : libellé accessible du code, avec mention d'ère générique. */
function describe(country, rawCode) {
  if (!country) return;
  const raw = typeof rawCode === 'string' && rawCode
    ? rawCode
    : (typeof country.code === 'string' ? country.code : '');
  const code = normalizeCode(raw);
  if (raw && raw !== code) {
    normalizedCount += 1;
    if (hostRef) hostRef.dataset.m33IsoNormalized = String(normalizedCount);
  }

  const key = `${code}|${String(country.id || country.name || '')}`;
  if (key === lastStatusKey) return;
  lastStatusKey = key;

  const isOld = Array.isArray(country.domain)
    && typeof country.domain[0] === 'number' && country.domain[0] < 0;
  const pieces = [`Code ISO : ${code || 'inconnu'}`];
  if (country.name) pieces.push(`— ${country.name}`);
  pieces.push('(ISO 3166-1 alpha-2)');
  if (isOld) {
    pieces.push('· identifiant ISO moderne : l’atlas couvre aussi des époques antérieures');
  }
  const node = ensureStatus();
  if (node) node.textContent = `${pieces.join(' ')}.`;

  if (hostRef) {
    hostRef.dataset.m33IsoCurrent = code || '';
    if (isOld) hostRef.dataset.m33IsoEra = 'ancienne';
    else delete hostRef.dataset.m33IsoEra;
  }
}

function clearStatus() {
  lastStatusKey = '';
  const node = ensureStatus();
  if (node) node.textContent = '';
  if (hostRef) {
    hostRef.dataset.m33IsoCurrent = '';
    delete hostRef.dataset.m33IsoEra;
    delete hostRef.dataset.m33IsoHover;
  }
}

/* M33-02 : le code du payload est normalisé puis résolu via l'index canonique ;
 * l'objet pays du payload reste un repli pour un code non indexé. */
function resolve(payload) {
  const data = payload && typeof payload === 'object' ? payload : {};
  const code = normalizeCode(data.code);
  if (code && index.has(code)) return { country: index.get(code), code };
  const country = data.country && typeof data.country === 'object' ? data.country : null;
  return { country, code: code || normalizeCode(country && country.code) };
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  ctx.css(STYLE_ID, cssRules());

  hostRef = (ctx.host && ctx.host.isConnected ? ctx.host : null)
    || (ctx.stage && typeof ctx.stage.querySelector === 'function'
      ? ctx.stage.querySelector('.globe-host')
      : null);
  countriesRef = Array.isArray(ctx.countries) ? ctx.countries : [];

  ensureStatus();
  ensureReport();
  buildIndex();

  /* registry.js:48-50 purge les callbacks à chaque rendu : on se réabonne à
   * chaque install() et le jeton rend les anciens abonnements inertes. */
  const token = ++installToken;

  if (typeof ctx.onReady === 'function') {
    ctx.onReady((payload) => {
      if (token !== installToken) return;
      if (payload && payload.host) hostRef = payload.host;
      buildIndex();
      publish();
    });
  }

  if (typeof ctx.onHover === 'function') {
    ctx.onHover((payload) => {
      if (token !== installToken) return;
      const resolved = resolve(payload);
      describe(resolved.country, payload && typeof payload === 'object' ? payload.code : '');
      if (hostRef) hostRef.dataset.m33IsoHover = resolved.code || '';
    });
  }

  if (typeof ctx.onLeave === 'function') {
    ctx.onLeave(() => {
      if (token !== installToken) return;
      clearStatus();
    });
  }
}

register('M33', install);
