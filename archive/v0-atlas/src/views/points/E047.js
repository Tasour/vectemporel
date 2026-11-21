import { register } from './registry.js';

/* Lentille E047 — Accessibilité & ARIA : contraste des badges de certitude ≥ 4,5:1.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E047.md — chantiers E047-01 à E047-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le registre,
 * styles.css et les autres lentilles ne sont ni édités ni doublés : E047 enrichit
 * le DOM déjà produit par renderPoints (points.js:29-126), sans le reconstruire.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune dépendance au store, aux filtres ou au jeu de données :
 * chaque niveau est lu sur la classe réelle du badge, jamais codé en dur ailleurs
 * que dans la table de libellés (miroir de recit.js:8-13).
 *
 * Invariants :
 * - un seul css id (points-e047), un seul panneau de mesure, tous les identifiants
 *   préfixés points-e047-, tout le CSS cadré par [data-e047="contrast"] ;
 * - non destructif : classes, textContent, title et attributs préexistants conservés ;
 * - idempotent : garde data-e047="1" sur chaque badge, panneau réutilisé par id ;
 * - composable avec E048 (qui pose data-e048-glyph et son ::before) : le glyphe
 *   E047 ne s'affiche que si E048 n'a pas déjà fourni le sien ; un aria-label
 *   contenant « Certitude » fait renoncer E048 à insérer son propre libellé ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e047';
const AUDIT_ID = 'points-e047-audit';
const AUDIT_TITLE_ID = 'points-e047-audit-title';
const AUDIT_SUMMARY_ID = 'points-e047-audit-summary';
const THRESHOLD = 4.5;

/* Miroir local, non importé, de la table déjà présente dans recit.js:8-13.
 * Les glosses citent la mention brute du jeu de données : aucune valeur,
 * aucune date, aucun chiffre n'est inventé. */
const LEVELS = {
  'vérifié': { mark: '✓', gloss: 'mention « vérifié » reprise de l’audit' },
  'certain': { mark: '■', gloss: 'mention « certain » reprise de l’audit' },
  'probable': { mark: '◐', gloss: 'mention « probable » reprise de l’audit' },
  'disputé': { mark: '≈', gloss: 'mention « disputé » reprise de l’audit' },
  'disputed': { mark: '≈', gloss: 'mention « disputed » de l’audit, traduite par « contesté »' },
  'non documenté': { mark: '?', gloss: 'mention « non documenté » reprise de l’audit' },
};

/* Planchers de conception calculés hors ligne sur #05070a (voir le rapport).
 * Ils ne servent que de repli affiché « valeur de conception » si getComputedStyle
 * n'est pas disponible ; en conditions normales, les ratios sont MESURÉS. */
const FLOOR = {
  'vérifié': 17.29,
  'certain': 17.29,
  'probable': 14.37,
  'disputé': 11.08,
  'disputed': 11.08,
  'non documenté': 7.89,
};
const FLOOR_DEFAULT = 13.28;

const CSS = `
  /* E047-01 / 02 / 05 / 06 — badge : fond opaque, palette monotone, 11 px,
     bordure de composant au-dessus de 3:1. Spécificité > E027 (:75) et > :369-370. */
  .points-layout[data-e047="contrast"] .points-meta .confidence[data-e047-confidence] {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    margin: 0;
    padding: 3px 8px;
    border: 1px solid rgba(255,255,255,.42);
    border-radius: 999px;
    background: #05070a;
    color: var(--ink-soft);
    font-size: 11px;
    line-height: 1.25;
    letter-spacing: .04em;
    text-transform: none;
    font-variant-numeric: tabular-nums;
  }
  .points-layout[data-e047="contrast"] .points-meta .confidence[data-e047-confidence="vérifié"],
  .points-layout[data-e047="contrast"] .points-meta .confidence[data-e047-confidence="certain"] {
    color: var(--ink);
  }
  .points-layout[data-e047="contrast"] .points-meta .confidence[data-e047-confidence="probable"] {
    color: var(--gold-bright);
  }
  .points-layout[data-e047="contrast"] .points-meta .confidence[data-e047-confidence="disputé"],
  .points-layout[data-e047="contrast"] .points-meta .confidence[data-e047-confidence="disputed"] {
    color: var(--gold);
  }
  .points-layout[data-e047="contrast"] .points-meta .confidence[data-e047-confidence="non documenté"] {
    color: var(--muted);
  }

  /* E047-04 — redondance de forme. E048 pose deja data-e048-glyph et son ::before :
     le marqueur E047 ne parait qu'en son absence (jamais deux glyphes). */
  .points-layout[data-e047="contrast"] .points-meta .confidence[data-e047-mark]:not([data-e048-glyph])::before {
    content: attr(data-e047-mark) "\\00A0";
    font-style: normal;
  }

  /* E047-03 — nom accessible porté par role=img : on n'ajoute aucun texte visible,
     donc le token brut reste lisible et les autres lentilles le relisent tel quel. */

  /* E047-08 — panneau de mesure, masqué par défaut par _diagnostics.js:18-19. */
  .points-e047-audit {
    margin: 14px 0 0;
    padding: 8px 10px;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--ink-soft);
    font-size: 11px;
    line-height: 1.45;
  }
  .points-e047-audit h2 {
    margin: 0 0 6px;
    color: var(--gold-bright);
    font-family: var(--serif);
    font-size: 14px;
    font-weight: 450;
  }
  .points-e047-audit p { margin: 0 0 6px; }
  .points-e047-audit ul { margin: 6px 0; padding-left: 18px; }
  .points-e047-audit li { margin-bottom: 3px; }
  .points-e047-ratio { color: var(--gold-bright); font-variant-numeric: tabular-nums; }
  .points-e047-verdict { font-weight: 600; }
  .points-e047-verdict[data-ok="false"] { color: var(--red); }
  #${AUDIT_SUMMARY_ID} { color: var(--ink); font-variant-numeric: tabular-nums; }

  /* E047-07 — préférences système : couleurs système en modes contraste forcé,
     sans forced-color-adjust:none (l'utilisateur garde la main). */
  @media (prefers-contrast: more) {
    .points-layout[data-e047="contrast"] .points-meta .confidence[data-e047-confidence] {
      background: #000;
      color: #fff;
      border-color: #fff;
    }
  }
  @media (forced-colors: active) {
    .points-layout[data-e047="contrast"] .points-meta .confidence[data-e047-confidence] {
      background: Canvas;
      color: CanvasText;
      border-color: CanvasText;
    }
    .points-e047-audit { border-color: CanvasText; }
  }

  /* E047-10 — aucun mouvement propre, mais on neutralise toute transition
     qu'une autre lentille pourrait hériter du badge. */
  @media (prefers-reduced-motion: reduce) {
    .points-layout[data-e047="contrast"] .points-meta .confidence[data-e047-confidence] { transition: none; }
  }
`;

/* ------------------------------------------------------------------------- *
 * Mesure WCAG 2.x en sRGB : (Lclair + 0,05) / (Lsombre + 0,05).
 * ------------------------------------------------------------------------- */
function parseColor(value) {
  const match = String(value || '').match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/i);
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function luminance(color) {
  const channel = (value) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function composite(foreground, background) {
  const alpha = foreground.a;
  return {
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
    a: 1,
  };
}

/* Fond effectif : on empile les couches semi-transparentes jusqu'au premier
 * ancêtre opaque, pour mesurer le badge tel qu'il est réellement rendu. */
function effectiveBackground(node) {
  const layers = [];
  let current = node;
  while (current && current.nodeType === 1) {
    const color = parseColor(window.getComputedStyle(current).backgroundColor);
    if (color && color.a > 0) layers.push(color);
    if (color && color.a >= 1) break;
    current = current.parentElement;
  }
  if (!layers.length) return { r: 255, g: 255, b: 255, a: 1 };
  let result = layers[layers.length - 1];
  for (let i = layers.length - 2; i >= 0; i -= 1) result = composite(layers[i], result);
  return result;
}

function formatRatio(value) {
  const french = value.toFixed(2).replace('.', ',').replace(/,?0+$/, '');
  return `${french}:1`;
}

/* ------------------------------------------------------------------------- *
 * E047-03 / 04 / 09 — enrichissement du badge existant, sans toucher au texte.
 * ------------------------------------------------------------------------- */
function levelOf(badge) {
  /* Le texte du badge EST la mention brute du jeu de données (points.js:105).
   * On le lit d'abord : la classe `is-non documenté` produite pour la valeur
   * « non documenté » se scinde en deux tokens et ne suffit pas à la retrouver. */
  const text = String((badge.textContent || '')).trim();
  if (Object.prototype.hasOwnProperty.call(LEVELS, text)) return text;
  const attribute = badge.getAttribute && badge.getAttribute('class') ? badge.getAttribute('class') : (badge.className || '');
  const classes = String(attribute).split(/\s+/);
  for (let i = 0; i < classes.length; i += 1) {
    if (classes[i].indexOf('is-') === 0) return classes[i].slice(3);
  }
  return text;
}

function describe(raw) {
  const key = String(raw || '').trim();
  const found = Object.prototype.hasOwnProperty.call(LEVELS, key) ? LEVELS[key] : null;
  if (found) return { raw: key, mark: found.mark, gloss: found.gloss };
  if (!key) return { raw: '', mark: '•', gloss: 'aucune certitude déclarée dans la fiche' };
  return { raw: key, mark: '•', gloss: 'mention reprise telle quelle de l’audit' };
}

function enhanceBadge(ctx, badge) {
  if (badge.dataset && badge.dataset.e047 === '1') return;
  const raw = levelOf(badge);
  const info = describe(raw);

  /* Le texte visible et les classes restent intacts : les lentilles qui
   * relisent le token après E047 (E053, E098…) voient la valeur d'origine. */
  if (badge.dataset) {
    badge.dataset.e047 = '1';
    badge.dataset.e047Confidence = info.raw;
    badge.dataset.e047Mark = info.mark;
  }

  if (!badge.getAttribute('role')) badge.setAttribute('role', 'img');
  const label = `Certitude : ${info.raw || 'non renseignée'}. ${info.gloss}.`;
  const existing = badge.getAttribute('aria-label') || '';
  if (!/certitude/i.test(existing)) {
    badge.setAttribute('aria-label', existing ? `${existing} — ${label}` : label);
  }
  if (!badge.getAttribute('title')) badge.setAttribute('title', label);
  return info;
}

/* ------------------------------------------------------------------------- *
 * E047-08 — panneau de mesure, unique, réutilisé d'un rendu à l'autre.
 * ------------------------------------------------------------------------- */
function measureBadge(badge, info) {
  let ratio = null;
  let measured = false;
  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const foreground = parseColor(window.getComputedStyle(badge).color);
    if (foreground) {
      ratio = contrastRatio(foreground, effectiveBackground(badge));
      measured = true;
    }
  }
  if (!measured) ratio = FLOOR[info.raw] === undefined ? FLOOR_DEFAULT : FLOOR[info.raw];
  return { ratio, measured };
}

function ensureAudit(ctx) {
  let panel = document.getElementById(AUDIT_ID);
  if (panel && panel.parentNode !== ctx.layout && panel.parentNode !== ctx.stage) {
    panel.remove();
    panel = null;
  }
  if (!panel) {
    panel = ctx.el('section', 'points-e047-audit');
    panel.id = AUDIT_ID;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', AUDIT_TITLE_ID);
    panel.setAttribute('data-points-diagnostic', '');

    const title = ctx.el('h2', '', 'Contraste des badges de certitude');
    title.id = AUDIT_TITLE_ID;
    panel.appendChild(title);
    panel.appendChild(ctx.el('p', '',
      'Ratios sRGB calculés selon WCAG 2.x : (Lclair + 0,05) / (Lsombre + 0,05), sur la couleur de texte et le fond composé de chaque badge. Seuil réglementaire : 4,5:1.'));
    panel.appendChild(ctx.el('ul'));
    const summary = ctx.el('p', '', '');
    summary.id = AUDIT_SUMMARY_ID;
    summary.setAttribute('role', 'status');
    summary.setAttribute('aria-live', 'polite');
    panel.appendChild(summary);
  }
  if (panel.parentNode !== ctx.layout && panel.parentNode !== ctx.stage) {
    const detail = ctx.layout && ctx.layout.querySelector ? ctx.layout.querySelector('.points-detail') : null;
    (detail || ctx.layout || ctx.stage).appendChild(panel);
  }
  return panel;
}

function refreshAudit(ctx, panel, badges) {
  const list = panel.querySelector('ul');
  const summary = document.getElementById(AUDIT_SUMMARY_ID);
  if (!list) return;

  const rows = [];
  let smallest = Infinity;
  let failures = 0;
  badges.forEach((badge) => {
    const info = describe(badge.dataset ? badge.dataset.e047Confidence : '');
    const { ratio, measured } = measureBadge(badge, info);
    const ok = ratio >= THRESHOLD;
    if (!ok) failures += 1;
    if (ratio < smallest) smallest = ratio;
    rows.push({ info, ratio, measured, ok });
  });

  list.replaceChildren(...rows.map((row) => {
    const li = ctx.el('li');
    li.appendChild(document.createTextNode(row.info.raw || 'non renseignée'));
    li.appendChild(document.createTextNode(' — '));
    const value = ctx.el('span', 'points-e047-ratio', formatRatio(row.ratio) + (row.measured ? '' : ' (conception)'));
    li.appendChild(value);
    li.appendChild(document.createTextNode(' · '));
    const verdict = ctx.el('span', 'points-e047-verdict', row.ok ? 'PASS' : 'FAIL');
    verdict.setAttribute('data-ok', String(row.ok));
    li.appendChild(verdict);
    return li;
  }));

  if (summary) {
    summary.textContent = rows.length
      ? `${rows.length} badge(s) mesuré(s) · minimum ${formatRatio(smallest)} · seuil ${formatRatio(THRESHOLD)} · ${failures ? `${failures} échec(s)` : 'PASS'}.`
      : 'Aucun badge de certitude dans ce périmètre · rien à mesurer.';
  }
}

register('E047', (ctx) => {
  if (!ctx || !ctx.css || !ctx.el || !ctx.layout) return;
  ctx.css(CSS_ID, CSS);
  ctx.layout.setAttribute('data-e047', 'contrast');

  const badges = ctx.layout.querySelectorAll
    ? Array.prototype.slice.call(ctx.layout.querySelectorAll('.points-meta .confidence'))
    : [];
  badges.forEach((badge) => enhanceBadge(ctx, badge));

  const panel = ensureAudit(ctx);
  refreshAudit(ctx, panel, badges);
});
