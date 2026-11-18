import { register } from './registry.js';

/* Lentille M12 — Drapeaux SVG locaux (domaine B : drapeau & révélation).
 * N'écrit ni dans globe.js, ni dans globe-reveal.js, ni dans styles.css, ni
 * dans public/. Tout est local : sondage Image sur des chemins relatifs,
 * aucun réseau, aucun aléa, aucune donnée historique inventée, aucune
 * journalisation.
 */

const STYLE_ID = 'monde-m12';
const STATUS_ID = 'monde-m12-flag-status';
const REPORT_ID = 'monde-m12-flags-report';
const BADGE_ID = 'monde-m12-era-badge';
const BASE = './public/flags/';
const ISO2 = /^[A-Z]{2}$/;
/* Tolérant à la casse : un chemin de drapeau en minuscules doit quand même
 * retrouver son code ISO-2 (les sondages et les données sont en majuscules). */
const FLAG_IN_URL = /flags\/([A-Z]{2})\.svg/i;

/* Le registre réapplique la lentille à chaque render() de la coque, tandis que
 * onReady ne joue qu'une fois : l'état utile vit donc au niveau du module. */
const probed = new Map();
let probeSignature = '';
let observer = null;
let observedLayer = null;
let lastObservedCode = null;
let lastStatusKey = '';
let flagDismissed = false;
let countriesRef = [];
let hostRef = null;
let statusRef = null;
let badgeRef = null;
let reportRef = null;

function cssRules() {
  return `
  .m12-flag-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
    overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  #globe-reveal .gr-flag{background-size:contain!important;background-repeat:no-repeat!important;
    background-position:center!important}
  #globe-reveal .gr-flag.m12-flag-fallback{
    background-image:linear-gradient(180deg,rgba(0,0,0,.22),transparent 50%,rgba(0,0,0,.22))!important;
    background-color:var(--m12-flag-color,#7f9cff)!important}
  .globe-country-flag{font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif}
  #monde-m12-era-badge{position:absolute;top:8px;right:8px;z-index:2;pointer-events:none;
    max-width:62%;padding:4px 8px;border-radius:999px;background:rgba(8,11,18,.82);
    color:#f5e9d0;font-size:11px;font-weight:600;line-height:1.3;font-family:inherit;
    letter-spacing:.02em}
  #monde-m12-era-badge[hidden]{display:none}
  `;
}

function byCode(code) {
  return countriesRef.find((country) => country && country.code === code) || null;
}

function ensureStatus() {
  if (statusRef && statusRef.isConnected) return statusRef;
  statusRef = document.getElementById(STATUS_ID);
  if (!statusRef) {
    statusRef = document.createElement('p');
    statusRef.id = STATUS_ID;
    statusRef.className = 'm12-flag-sr';
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
    reportRef.className = 'm12-flag-sr';
    reportRef.setAttribute('aria-hidden', 'true');
    reportRef.hidden = true;
    document.body.appendChild(reportRef);
  }
  return reportRef;
}

function ensureBadge() {
  if (!hostRef) return null;
  if (badgeRef && badgeRef.isConnected && badgeRef.parentNode === hostRef) return badgeRef;
  badgeRef = document.getElementById(BADGE_ID);
  if (!badgeRef) {
    badgeRef = document.createElement('span');
    badgeRef.id = BADGE_ID;
    badgeRef.setAttribute('aria-hidden', 'true');
  }
  badgeRef.hidden = true;
  if (badgeRef.parentNode !== hostRef) hostRef.appendChild(badgeRef);
  return badgeRef;
}

/* M12-05 et M12-08 : doublage textuel du drapeau dans la liste des pays.
 * On ne touche qu'à des nœuds enfants portant de nouvelles classes/attributs ;
 * ni .globe-country ni #globe-choices button ne sont modifiés. */
function enrichList() {
  if (typeof document === 'undefined') return;
  const tops = document.querySelectorAll('#globe-choices .globe-country-top');
  tops.forEach((top) => {
    if (top.dataset.m12Enhanced === '1') return;
    const flagSpan = top.querySelector('.globe-country-flag');
    const nameSpan = top.querySelector('.globe-country-name');
    if (!flagSpan || !nameSpan) return;
    top.dataset.m12Enhanced = '1';
    const country = countriesRef.find((item) => item && item.name === nameSpan.textContent);
    if (!country) return;
    if (ISO2.test(country.code)) flagSpan.dataset.m12Code = country.code;
    if (!top.querySelector('.m12-flag-sr')) {
      const sr = document.createElement('span');
      sr.className = 'm12-flag-sr';
      sr.textContent = `Drapeau : ${country.name}`;
      top.appendChild(sr);
    }
  });
}

function publishReport() {
  if (!hostRef) return;
  const codes = countriesRef.map((country) => country && country.code).filter(Boolean);
  const ok = codes.filter((code) => probed.get(code) === 'ok');
  const missing = codes.filter((code) => probed.get(code) === 'missing');
  const invalid = codes.filter((code) => probed.get(code) === 'invalid');
  const pending = codes.filter((code) => probed.get(code) === 'pending');

  hostRef.dataset.m12Flags = missing.length || invalid.length
    ? (ok.length ? 'partial' : 'fail')
    : (pending.length ? 'loading' : 'ok');
  hostRef.dataset.m12FlagsOk = String(ok.length);
  hostRef.dataset.m12FlagsWarm = String(ok.length);
  hostRef.dataset.m12FlagsMissing = missing.join(',');
  hostRef.dataset.m12FlagsInvalid = invalid.join(',');

  const report = `ok=${ok.length};missing=${missing.join('|')};`
    + `invalid=${invalid.join('|')};pending=${pending.length}`;
  hostRef.dataset.m12FlagsReport = report;
  const node = ensureReport();
  if (node) node.textContent = report;
}

/* M12-01, M12-06 et M12-07 : une seule passe de sondage, dérivée de la source
 * unique ctx.countries. Les codes non ISO-2 ne produisent jamais d'URL. */
function probeFlags() {
  const signature = countriesRef.map((country) => country && country.code).join(',');
  if (signature === probeSignature) return;
  probeSignature = signature;

  countriesRef.forEach((country) => {
    const code = country && country.code;
    if (typeof code !== 'string' || !ISO2.test(code)) {
      if (code) probed.set(code, 'invalid');
      return;
    }
    if (probed.has(code)) return;
    probed.set(code, 'pending');
    if (typeof Image === 'undefined') {
      probed.set(code, 'missing');
      return;
    }
    const image = new Image();
    /* M12-02 : un drapeau révélé pendant que le sondage est encore « pending »
     * doit basculer en repli dès que l'échec est connu, sans attendre un autre
     * survol ni une autre mutation du calque. */
    image.onload = () => { probed.set(code, 'ok'); publishReport(); syncFlagState(); };
    image.onerror = () => { probed.set(code, 'missing'); publishReport(); syncFlagState(); };
    image.src = BASE + code + '.svg';
  });
  publishReport();
}

function writeStatus(country, code) {
  const isOld = Array.isArray(country.domain)
    && typeof country.domain[0] === 'number' && country.domain[0] < 0;
  const key = `${code}|${isOld ? 'old' : 'new'}`;
  if (key === lastStatusKey) return;
  lastStatusKey = key;

  const modern = isOld
    ? ' · drapeau national moderne (l’atlas couvre aussi des époques antérieures)'
    : '';
  const node = ensureStatus();
  if (node) {
    node.textContent = `Drapeau : ${country.name}${code ? ` (${code})` : ''}${modern}`;
  }
  if (hostRef) {
    hostRef.dataset.m12FlagCurrent = code || '';
    if (isOld) hostRef.dataset.m12FlagEra = 'ancienne';
    else delete hostRef.dataset.m12FlagEra;
  }
  const badge = ensureBadge();
  if (badge) {
    badge.textContent = isOld ? 'Drapeau national moderne' : '';
    badge.hidden = !isOld;
  }
}

/* M12-02 et M12-09 : observation non intrusive du calque de drapeau possédé
 * par globe-reveal.js. Aucune écriture dans le fichier source de ce module. */
function flagLayer() {
  const overlay = document.getElementById('globe-reveal');
  return overlay ? overlay.querySelector('.gr-flag') : null;
}

function currentFlagCode(layer) {
  const image = layer && layer.style ? (layer.style.backgroundImage || '') : '';
  const match = FLAG_IN_URL.exec(image);
  return match ? match[1].toUpperCase() : '';
}

/* L'état du repli est recalculé de façon idempotente, à la fois sur mutation
 * du calque et à l'arrivée d'un résultat de sondage. flagDismissed empêche un
 * sondage tardif de réafficher un repli après une sortie de survol. */
function syncFlagState() {
  const layer = observedLayer && observedLayer.isConnected ? observedLayer : flagLayer();
  if (!layer) return;
  observedLayer = layer;
  const code = currentFlagCode(layer);
  if (code && code !== lastObservedCode) flagDismissed = false;
  if (code !== lastObservedCode) {
    lastObservedCode = code;
    layer.dataset.m12FlagCode = code;
  }
  const country = byCode(code);
  if (code && !flagDismissed && probed.get(code) === 'missing') {
    layer.classList.add('m12-flag-fallback');
    if (country && country.color) layer.style.setProperty('--m12-flag-color', country.color);
    if (hostRef) hostRef.dataset.m12FlagFallback = code;
  } else {
    layer.classList.remove('m12-flag-fallback');
    if (hostRef) delete hostRef.dataset.m12FlagFallback;
  }
  if (country) writeStatus(country, code);
}

function observeFlagLayer() {
  if (typeof MutationObserver === 'undefined') return;
  const layer = flagLayer();
  if (!layer || layer === observedLayer) return;
  if (observer) observer.disconnect();
  observedLayer = layer;
  observer = new MutationObserver(syncFlagState);
  observer.observe(layer, { attributes: true, attributeFilter: ['style'] });
  syncFlagState();
}

register('M12', (ctx) => {
  if (typeof ctx.css === 'function') ctx.css(STYLE_ID, cssRules());

  hostRef = ctx.host || (ctx.stage && ctx.stage.querySelector('.globe-host')) || null;
  countriesRef = Array.isArray(ctx.countries) ? ctx.countries : [];

  ensureStatus();
  ensureReport();
  ensureBadge();
  enrichList();
  /* Le registre vide ses tableaux à chaque rendu : le sondage et l'observateur
   * sont réarmés ici (leurs propres gardes évitent doublons et re-sondages). */
  probeFlags();
  observeFlagLayer();

  /* Un onReady/onHover/onLeave par appel de register, sans garde module :
   * la garde faisait disparaître le drapeau au second rendu de la coque. */
  if (typeof ctx.onReady === 'function') {
    ctx.onReady((payload) => {
      if (payload && payload.host) hostRef = payload.host;
      probeFlags();
      observeFlagLayer();
    });
  }

  if (typeof ctx.onHover === 'function') {
    ctx.onHover((payload) => {
      if (!payload) return;
      const country = payload.country || byCode(payload.code);
      if (country) writeStatus(country, country.code || payload.code || '');
    });
  }

  if (typeof ctx.onLeave === 'function') {
    ctx.onLeave(() => {
      if (observedLayer) observedLayer.classList.remove('m12-flag-fallback');
      lastObservedCode = null;
      flagDismissed = true;
      lastStatusKey = '';
      const node = ensureStatus();
      if (node) node.textContent = '';
      if (badgeRef) badgeRef.hidden = true;
      if (hostRef) {
        delete hostRef.dataset.m12FlagFallback;
        hostRef.dataset.m12FlagCurrent = '';
        delete hostRef.dataset.m12FlagEra;
      }
    });
  }
});
