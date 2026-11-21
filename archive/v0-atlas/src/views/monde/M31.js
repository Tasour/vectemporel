import { register } from './registry.js';

/* Lentille M31 — Modèle de données pays (domaine D : données & sémantique).
 *
 * Observatoire READ-ONLY du schéma transmis par la coque via ctx.countries
 * (globe.js:433-441). Aucun chiffre n'est saisi à la main : tout est dérivé
 * des objets réels, à chaque rendu, afin de rester aligné sur une régénération
 * de src/data/dataset.js par build-dataset.mjs puis merge-points.mjs.
 *
 * Invariants vérifiés par UNIFIED_AUDIT/MONDE/views/M31.md :
 * - zéro réseau, aucune source aléatoire, aucun appel de console, ni rAF/timer ;
 * - aucun fichier partagé modifié, aucune mutation du modèle reçu ;
 * - un seul panneau #monde-m31-modele, role="status", garde d'existence ;
 * - CSS unique via ctx.css('monde-m31', …), positionné à gauche pour ne pas
 *   chevaucher le readout M07 (right:16px).
 */

const CSS_ID = 'monde-m31';
const PANEL_ID = 'monde-m31-modele';

const CSS = `
  #${PANEL_ID} {
    position: absolute; left: 16px; bottom: 16px; z-index: 4;
    max-width: min(360px, 46vw); margin: 0; padding: 6px 9px;
    border: 1px solid var(--line); border-radius: 8px;
    background: rgba(8, 11, 16, .86); color: var(--muted);
    font-size: 11px; line-height: 1.35; font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  #${PANEL_ID} .m31-line { display: block; }
`;

let panel = null;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/* M31-04 : les préfixes sont déduits des identifiants observés, jamais codés en dur. */
function eventPrefix(id) {
  if (typeof id !== 'string') return null;
  const match = id.match(/^([a-z]{2})-/);
  return match ? match[1] : null;
}

/* M31-08 : règle exacte de eraIndexForYear (build-dataset.mjs:74-80) :
 * borne haute exclusive, sauf dernière ère où elle est inclusive. */
function eraIdForYear(eras, year) {
  for (let i = 0; i < eras.length; i += 1) {
    const era = eras[i];
    if (!era) continue;
    const start = Number(era.start);
    const end = Number(era.end);
    if (Number.isFinite(start) && Number.isFinite(end) &&
        year >= start && (year < end || (i === eras.length - 1 && year <= end))) {
      return era.id;
    }
  }
  return null;
}

/* M31-01 : unique point de lecture du modèle. Aucune écriture sur `country`,
 * `event`, `point` ou `list` : la lentille ne modifie pas les données reçues. */
function analyze(ctx) {
  const list = asArray(ctx && ctx.countries);
  const meta = ctx && ctx.meta && typeof ctx.meta === 'object' ? ctx.meta : null;

  const metrics = {
    countries: list.length,
    events: 0,
    eventPointRefs: 0,
    eventPointIds: new Set(),
    validated: 0,
    duplicateEventIds: 0,
    idAnomalies: 0,
    eraMismatches: 0,
    confidences: new Set(),
    unlocalized: 0,
    nullBounds: 0,
    nullImage: 0,
    explicitLinks: 0,
    metaTotal: null,
    metaOk: null,
  };

  for (const country of list) {
    if (!country || typeof country !== 'object') continue;
    const expected = `${country.id}-`;
    const eras = asArray(country.eras);

    if (!country.bounds) metrics.nullBounds += 1; // M31-09

    /* M31-04 : ères, acteurs, lieux et claims préfixés par l'id du pays. */
    for (const era of eras) {
      if (!era || typeof era.id !== 'string' || !era.id.startsWith(expected)) {
        metrics.idAnomalies += 1;
      }
    }
    for (const key of ['actors', 'places', 'claims']) {
      for (const item of asArray(country[key])) {
        if (!item || typeof item.id !== 'string' || !item.id.startsWith(expected)) {
          metrics.idAnomalies += 1;
        }
      }
    }

    /* M31-02 : second conteneur, ajouté par merge-points.mjs:39,68-90. */
    metrics.validated += asArray(country.points).length;
    for (const point of asArray(country.points)) {
      if (point && typeof point.confidence === 'string' && point.confidence) {
        metrics.confidences.add(point.confidence); // M31-07
      }
    }

    const seen = new Set();
    const prefixes = new Set();
    for (const event of asArray(country.events)) {
      metrics.events += 1;
      const id = event && event.id;

      /* M31-05 : unicité des repères au sein d'un pays. */
      if (typeof id === 'string') {
        if (seen.has(id)) metrics.duplicateEventIds += 1;
        seen.add(id);
        const prefix = eventPrefix(id); // M31-04
        if (!prefix) metrics.idAnomalies += 1;
        else prefixes.add(prefix);
      } else {
        metrics.idAnomalies += 1;
      }

      if (!event || !event.image) metrics.nullImage += 1; // M31-09
      metrics.explicitLinks += asArray(event && event.related).length; // M31-10

      /* M31-08 : cohérence année -> ère, sans recalculer d'ère manquante. */
      const year = Number(event && event.year);
      if (Number.isFinite(year)) {
        const expectedEra = eraIdForYear(eras, year);
        if (expectedEra !== (event && event.eraId)) metrics.eraMismatches += 1;
      }

      /* M31-06 : références vs identifiants uniques ; M31-07 : confiance. */
      for (const point of asArray(event && event.points)) {
        metrics.eventPointRefs += 1;
        if (point && typeof point.id === 'string') metrics.eventPointIds.add(point.id);
        if (point && typeof point.confidence === 'string' && point.confidence) {
          metrics.confidences.add(point.confidence);
        }
      }
      for (const place of asArray(event && event.places)) {
        if (place && (place.lat === null || place.lat === undefined ||
                      place.lon === null || place.lon === undefined)) {
          metrics.unlocalized += 1; // M31-09
        }
      }
    }
    if (prefixes.size > 1) metrics.idAnomalies += prefixes.size - 1;
  }

  metrics.total = metrics.eventPointRefs + metrics.validated; // M31-03

  /* M31-03 : la coque ne transmet pas `meta` (globe.js:433-441) ; la
   * confrontation reste donc conditionnelle et n'invente jamais de chiffre. */
  if (meta && Number.isFinite(meta.points)) {
    metrics.metaTotal = meta.points;
    metrics.metaOk = meta.points === metrics.total;
  }

  return metrics;
}

function buildLines(metrics) {
  const confidences = [...metrics.confidences].sort((a, b) => a.localeCompare(b, 'fr'));
  const metaText = metrics.metaOk === null
    ? 'méta non transmise à la lentille'
    : (metrics.metaOk ? `méta ${metrics.metaTotal} ✓` : `méta ${metrics.metaTotal} ≠ ${metrics.total}`);

  return [
    `Modèle pays · ${metrics.countries} pays · ${metrics.events} repères`,
    `Points : ${metrics.eventPointRefs} de repère + ${metrics.validated} validés = ${metrics.total} · ${metaText}`,
    `IDs : ${metrics.idAnomalies} anomalie(s) · repères uniques ${metrics.events - metrics.duplicateEventIds}/${metrics.events}`,
    `Points partagés : ${metrics.eventPointIds.size} identifiants / ${metrics.eventPointRefs} références`,
    `Confiance : ${confidences.length ? confidences.join(' · ') : 'aucune valeur observée'}`,
    `Ères : ${metrics.eraMismatches} incohérence(s) · liens explicites : ${metrics.explicitLinks} · non localisés : ${metrics.unlocalized}`,
  ];
}

/* M31-10 / M31-01 : panneau unique, réutilisé d'un rendu à l'autre même si la
 * coque reconstruit le stage (registry.js:54 applique les 50 greffons à chaque
 * rendu). Aucun rôle ajouté au contenu sémantique de la vue d'arrivée. */
function ensurePanel(ctx) {
  if (typeof document === 'undefined') return null;
  let node = document.getElementById(PANEL_ID);
  if (node && node.isConnected) {
    panel = node;
    return panel;
  }
  if (!node && panel && panel.isConnected) {
    return panel;
  }
  if (!node && typeof ctx.el === 'function') {
    node = ctx.el('div', 'monde-m31-modele');
  }
  if (!node) return null;
  node.id = PANEL_ID;
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  node.setAttribute('aria-label', 'Modèle de données pays');
  const parent = ctx.scene && ctx.scene.isConnected
    ? ctx.scene
    : (ctx.host && ctx.host.isConnected ? ctx.host : null);
  if (parent) parent.appendChild(node);
  panel = node;
  return panel;
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  ctx.css(CSS_ID, CSS);
  const node = ensurePanel(ctx);
  if (!node) return;

  const lines = buildLines(analyze(ctx));
  const spans = node.querySelectorAll(':scope > .m31-line');
  if (spans.length === lines.length) {
    for (let i = 0; i < lines.length; i += 1) spans[i].textContent = lines[i];
    return;
  }
  const nodes = lines.map((text) => ctx.el('span', 'm31-line', text));
  node.replaceChildren(...nodes);
}

register('M31', install);
