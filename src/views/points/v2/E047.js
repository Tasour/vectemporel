import { register } from './registry.js';

/* Lentille E047 — passe 2 (module POINTS/V2 E047). Accessibilité & ARIA :
 * audit de perception du contraste des badges de certitude.
 *
 * Dix chantiers V2, E047-V2-01 à E047-V2-10, décrits dans
 * UNIFIED_AUDIT/POINTS/V2/views/E047.md.
 *
 * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
 * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E047.js) garde
 * la main sur la couleur des badges, leur nom accessible, leur glyphe unique
 * et son propre panneau `#points-e047-audit`. La passe 2 n'écrase rien : elle
 * REND AUDITABLE la perception du contraste (échelle calculée, exemple sous le
 * seuil, plancher correctif, survol/focus, opacité/filtres) et ajoute un repère
 * de longueur non coloré à côté du badge. Tout identifiant, classe, attribut
 * de données et id de feuille est préfixé `points-v2-e047` / `v2-e047`, pour ne
 * jamais entrer en collision avec la portée `points-e047` de la passe 1 ni
 * avec la portée `points-v2-e027` du bulletin de lisibilité.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, aucune écriture d'état, aucun écouteur
 * global : les badges sont lus dans le DOM réel de points.js:96-123 et leurs
 * couleurs sont mesurées via getComputedStyle quand il est disponible. Aucun
 * libellé de point, aucune source, aucune ère, aucune certitude n'est fabriqué :
 * le motif de la jauge est dérivé du token réel, et aucun chiffre de couverture
 * n'est recopié. Les ratios de l'échelle sont recalculés depuis la formule
 * WCAG 2.1 sur des couleurs déclarées, jamais codés en dur.
 *
 * Invariants : un seul register, une seule feuille, un seul panneau par rendu ;
 * ids préfixés et dédupliqués ; tout DOM statique bâti avec ctx.el (jamais
 * innerHTML) ; zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.* ;
 * chaque état porte un glyphe ET un mot, jamais la couleur seule.
 */

const CSS_ID = 'points-v2-e047';
const SCOPE = 'points-v2-e047';
const PANEL_ID = 'points-v2-e047-panel';
const TITLE_ID = 'points-v2-e047-title';
const REDUCED_ATTR = 'data-points-v2-e047-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* Seuil réglementaire : 4,5:1 pour un texte courant (WCAG 1.4.3). La lentille
 * l'applique aussi aux grands textes, par sécurité. */
const SEUIL = 4.5;

const GAUGE_CLASS = 'points-v2-e047-jauge';
const CORRECTION_CLASS = 'points-v2-e047-corrige';
const CORRECTION_DARK = 'points-v2-e047-encre-claire';
const SAMPLE_CLASS = 'points-v2-e047-exemple';

/* E047-V2-01 : feuille unique, entièrement préfixée par .points-v2-e047,
 * classe posée sur .points-detail : aucune fuite hors de cette vue. Les ids
 * sont écrits en dur (préfixés) pour rester lisibles sans interpolation. */
const CSS = `
.points-v2-e047 .points-v2-e047-panel {
  box-sizing: border-box;
  margin: 16px 0 4px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-left: 3px solid var(--gold);
  border-radius: 10px; background: rgba(8, 11, 16, .6);
  color: var(--ink-soft); font-variant-numeric: tabular-nums;
  font-size: 11px; line-height: 1.5; overflow-wrap: anywhere;
}
.points-v2-e047 .points-v2-e047-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; font-weight: 600; color: var(--gold-bright);
}
.points-v2-e047 .points-v2-e047-intro,
.points-v2-e047 .points-v2-e047-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
  overflow-wrap: break-word;
}
.points-v2-e047 .points-v2-e047-block { margin: 0 0 10px; }
.points-v2-e047 .points-v2-e047-block-title {
  margin: 0 0 4px; font-size: 11px; font-weight: 700;
  letter-spacing: .03em; color: var(--gold);
}
.points-v2-e047 .points-v2-e047-list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 4px 10px;
}
.points-v2-e047 .points-v2-e047-list li {
  display: flex; align-items: baseline; gap: 6px;
  min-height: 24px; padding: 2px 0;
  font-size: 11px; line-height: 1.4; color: var(--ink-soft);
}
.points-v2-e047 .points-v2-e047-glyph {
  display: inline-block; min-width: 1.2em;
  color: var(--gold-bright); font-weight: 700;
}
.points-v2-e047 .points-v2-e047-name { color: var(--ink-soft); }
.points-v2-e047 .points-v2-e047-ratio {
  margin-left: auto; color: var(--gold-bright); white-space: nowrap;
}
.points-v2-e047 .points-v2-e047-state {
  color: var(--muted-2); font-size: 10px; white-space: nowrap;
}
.points-v2-e047 .points-v2-e047-item.is-fail .points-v2-e047-glyph { color: var(--gold); }
.points-v2-e047 .points-v2-e047-item.is-fail .points-v2-e047-state { color: var(--ink); }
.points-v2-e047 .points-v2-e047-current {
  margin: 4px 0 0; font-size: 10px; line-height: 1.4; color: var(--muted);
}
.points-v2-e047 .points-v2-e047-metrics {
  margin: 8px 0 0; padding-top: 6px; border-top: 1px solid var(--line);
  font-size: 10px; line-height: 1.5; color: var(--muted-2);
}

/* E047-V2-08 : repère de longueur non coloré, ajouté à côté du badge. Le
 * texte du badge n'est pas modifié (la passe 1 et E027-V2 le relisent tel quel). */
.points-v2-e047 .points-v2-e047-jauge {
  margin-left: 6px; font-family: monospace; font-size: 10px;
  letter-spacing: 1px; color: var(--gold-bright); white-space: nowrap;
}

/* E047-V2-05 / E047-V2-07 : plancher appliqué aux seuls badges sous le seuil ;
   opacité, filtres et ombre portée neutralisés pour que le ratio mesuré soit
   le ratio réellement rendu. */
.points-v2-e047 .points-v2-e047-corrige {
  color: #0a0a0a !important; background-color: #f4f4f4 !important;
  border: 1px solid #0a0a0a !important; opacity: 1 !important;
  filter: none !important; text-shadow: none !important;
}
.points-v2-e047 .points-v2-e047-corrige.points-v2-e047-encre-claire {
  color: #ffffff !important; background-color: #101010 !important;
  border-color: #ffffff !important;
}
/* E047-V2-06 : contraste maintenu au survol et au focus clavier. */
.points-v2-e047 .points-v2-e047-corrige:hover,
.points-v2-e047 .points-v2-e047-corrige:focus-visible {
  color: #0a0a0a !important; background-color: #ffffff !important;
  border-color: #0a0a0a !important;
}
.points-v2-e047 .points-v2-e047-corrige.points-v2-e047-encre-claire:hover,
.points-v2-e047 .points-v2-e047-corrige.points-v2-e047-encre-claire:focus-visible {
  color: #ffffff !important; background-color: #000000 !important;
  border-color: #ffffff !important;
}
.points-v2-e047 .points-v2-e047-exemple:focus-visible {
  outline: 3px solid var(--gold-bright); outline-offset: 2px;
}

/* E047-V2-09 : préférences système et replis, sans mouvement propre. */
.points-v2-e047[data-points-v2-e047-reduced="1"] .points-v2-e047-list li { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e047 .points-v2-e047-list li { transition: none; }
}
@media (forced-colors: active) {
  .points-v2-e047 .points-v2-e047-panel { border-color: CanvasText; background: Canvas; color: CanvasText; }
  .points-v2-e047 .points-v2-e047-title,
  .points-v2-e047 .points-v2-e047-block-title,
  .points-v2-e047 .points-v2-e047-ratio { color: CanvasText; }
  .points-v2-e047 .points-v2-e047-exemple,
  .points-v2-e047 .points-v2-e047-corrige { border: 1px solid CanvasText; color: CanvasText; }
}
@media (max-width: 620px) {
  .points-v2-e047 .points-v2-e047-list { grid-template-columns: 1fr; }
  .points-v2-e047 .points-v2-e047-panel { padding: 10px 12px; }
}
@media print {
  .points-v2-e047 .points-v2-e047-panel { border-color: #666; background: transparent; }
}
`;

/* E047-V2-01 : critères de détection larges, recoupés et dédupliqués, bornés
 * au détail courant pour ne pas remonter vers les panneaux des autres lentilles. */
const BADGE_SELECTORS = [
  '.points-meta .confidence',
  '[class*="confidence"]',
  '[data-confidence]',
  '[aria-label*="ertitude"]',
];

/* E047-V2-03 / 04 : palette de référence. Les ratios ne sont pas écrits : ils
 * sont recalculés depuis la formule WCAG sur ces couleurs déclarées. La dernière
 * entrée est volontairement sous le seuil pour rendre la correction observable. */
const REFERENCE_PALETTE = [
  { label: 'Établi', bg: '#1b4332', fg: '#ffffff' },
  { label: 'Probable', bg: '#1d3557', fg: '#ffffff' },
  { label: 'Disputé', bg: '#5c3a00', fg: '#ffffff' },
  { label: 'Non documenté', bg: '#4a1d96', fg: '#ffffff' },
  { label: 'Exemple sous le seuil', bg: '#eeeeee', fg: '#bdbdbd', demonstration: true },
];

/* E047-V2-03 : repli hors navigateur. Les couleurs sont déclarées, le ratio
 * est calculé — aucune valeur de ratio n'est codée en dur. */
const FOND_DEFAUT = '#05070a';
const ENCRES_DEFAUT = {
  'vérifié': '#f2ede3',
  'certain': '#f2ede3',
  'probable': '#f4d69e',
  'disputé': '#e6b96f',
  'disputed': '#e6b96f',
  'non documenté': '#a8a198',
};
const ENCRE_DEFAUT = '#d7d1c6';

/* E047-V2-08 : motif de longueur dérivé du token réel. Aucun token inconnu ne
 * reçoit de motif : rien n'est deviné. */
const MOTIFS = [
  { test: /contest|disput/i, motif: '▮▯▯▯' },
  { test: /vérifi|verifi/i, motif: '▮▮▮▮' },
  { test: /certain/i, motif: '▮▮▮▯' },
  { test: /probable/i, motif: '▮▮▯▯' },
  { test: /non\s*document/i, motif: '▯▯▯▯' },
];

/* ------------------------------------------------------------------------- *
 * Utilitaires gardés (E047-V2-01).
 * ------------------------------------------------------------------------- */
function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function nodes(root, selector) {
  if (!isElement(root) || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || nodesById(id)[0] || null;
}

/* ------------------------------------------------------------------------- *
 * E047-V2-03 — arithmétique WCAG 2.1, sans arrondi aléatoire.
 * ------------------------------------------------------------------------- */
function parseColor(value) {
  if (!value) return null;
  const text = String(value).trim();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (m) {
    let hex = m[1];
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  m = /^rgba?\(([^)]+)\)$/i.exec(text);
  if (!m) return null;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  return {
    r: Math.max(0, Math.min(255, parseInt(parts[0], 10) || 0)),
    g: Math.max(0, Math.min(255, parseInt(parts[1], 10) || 0)),
    b: Math.max(0, Math.min(255, parseInt(parts[2], 10) || 0)),
    a: parts.length > 3 ? (parseFloat(parts[3]) || 0) : 1,
  };
}

function composanteLineaire(valeur) {
  const v = valeur / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(couleur) {
  return 0.2126 * composanteLineaire(couleur.r)
    + 0.7152 * composanteLineaire(couleur.g)
    + 0.0722 * composanteLineaire(couleur.b);
}

function ratioContraste(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function formatRatio(value) {
  return value.toFixed(2).replace('.', ',') + ':1';
}

/* E047-V2-09 : fond effectif remonté dans les ancêtres ; repli blanc, mesure
 * pessimiste valable en thème clair comme en thème sombre. */
function fondEffectif(noeud) {
  let courant = noeud;
  while (courant && courant !== (typeof document !== 'undefined' ? document.documentElement : null)) {
    let couleur = null;
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      couleur = parseColor(window.getComputedStyle(courant).backgroundColor);
    }
    if (couleur && couleur.a >= 0.5) return couleur;
    courant = courant.parentElement;
  }
  return { r: 255, g: 255, b: 255, a: 1 };
}

function mesurerBadge(noeud, token) {
  let mesuree = false;
  let fg = null;
  let bg = null;
  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    fg = parseColor(window.getComputedStyle(noeud).color);
    if (fg) {
      bg = fondEffectif(noeud);
      mesuree = true;
    }
  }
  if (!mesuree) {
    const cle = String(token || '').trim();
    fg = parseColor(Object.prototype.hasOwnProperty.call(ENCRES_DEFAUT, cle)
      ? ENCRES_DEFAUT[cle] : ENCRE_DEFAUT);
    bg = parseColor(FOND_DEFAUT);
  }
  const clean = { r: fg.r, g: fg.g, b: fg.b, a: 1 };
  const ratio = ratioContraste(clean, bg);
  return { ratio, mesuree, conforme: ratio >= SEUIL, fg: clean, bg };
}

function libeller(noeud) {
  const etiquette = getAttr(noeud, 'aria-label')
    || getAttr(noeud, 'data-confidence')
    || txt(noeud);
  return etiquette ? etiquette.slice(0, 48) : 'badge sans libellé';
}

/* ------------------------------------------------------------------------- *
 * E047-V2-04 / 05 — états dérivés de la mesure, jamais de la couleur seule.
 * ------------------------------------------------------------------------- */
function appliquerPlancher(noeud, mesure) {
  noeud.classList.add(CORRECTION_CLASS);
  const contrasteClair = ratioContraste({ r: 255, g: 255, b: 255 }, mesure.bg);
  const contrasteSombre = ratioContraste({ r: 10, g: 10, b: 10 }, mesure.bg);
  if (contrasteClair > contrasteSombre) noeud.classList.add(CORRECTION_DARK);
  setAttr(noeud, 'data-v2-e047-etat', 'corrige');
  setAttr(noeud, 'data-v2-e047-ratio-avant', mesure.ratio.toFixed(2));
  setAttr(noeud, 'data-v2-e047-seuil', String(SEUIL));
}

function marquerConforme(noeud, mesure) {
  setAttr(noeud, 'data-v2-e047-etat', 'conforme');
  setAttr(noeud, 'data-v2-e047-ratio-avant', mesure.ratio.toFixed(2));
  setAttr(noeud, 'data-v2-e047-seuil', String(SEUIL));
}

function listeReference(ctx, palette) {
  const liste = ctx.el('ul', 'points-v2-e047-list points-v2-e047-reference-list');
  palette.forEach((entree) => {
    const item = ctx.el('li', 'points-v2-e047-item');
    const badge = ctx.el('span', 'points-v2-e047-exemple ' + SAMPLE_CLASS, entree.label);
    badge.style.backgroundColor = entree.bg;
    badge.style.color = entree.fg;
    setAttr(badge, 'data-v2-e047-reference', entree.label);
    if (entree.demonstration) {
      setAttr(badge, 'data-v2-e047-demonstration', '1');
      setAttr(badge, 'tabindex', '0');
      setAttr(badge, 'aria-label',
        entree.label + ' : exemple interactif, Tab pour tester le contraste au focus');
    }
    const mesure = {
      ratio: ratioContraste(parseColor(entree.fg), parseColor(entree.bg)),
      conforme: ratioContraste(parseColor(entree.fg), parseColor(entree.bg)) >= SEUIL,
    };
    if (entree.demonstration && !mesure.conforme) appliquerPlancher(badge, mesure);
    item.append(
      ctx.el('span', 'points-v2-e047-glyph', mesure.conforme ? '✓' : '!'),
      badge,
      ctx.el('span', 'points-v2-e047-ratio', formatRatio(mesure.ratio)),
      ctx.el('span', 'points-v2-e047-state', mesure.conforme ? 'conforme' : 'sous le seuil, corrigé')
    );
    liste.appendChild(item);
  });
  return liste;
}

function listItem(ctx, glyph, name, ratio, state, kind) {
  const li = ctx.el('li', 'points-v2-e047-item is-' + kind);
  li.append(
    ctx.el('span', 'points-v2-e047-glyph', glyph),
    ctx.el('span', 'points-v2-e047-name', name),
    ctx.el('span', 'points-v2-e047-ratio', ratio),
    ctx.el('span', 'points-v2-e047-state', state)
  );
  return li;
}

/* E047-V2-02 : structure statique bâtie une seule fois par rendu avec ctx.el,
 * jamais innerHTML. Seules les deux listes et deux lignes sont remplacées. */
function buildPanel(ctx) {
  const panel = ctx.el('section', 'points-v2-e047-panel');
  panel.id = PANEL_ID;
  setAttr(panel, 'role', 'region');
  setAttr(panel, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e047-title', 'Perception du contraste des certitudes');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e047-intro',
    'Audit local de perception : chaque niveau est mesuré selon WCAG 2.1. '
    + 'La passe 1 garde la main sur la couleur, le nom accessible et son propre panneau ; '
    + 'cette passe ajoute une échelle calculée, un exemple sous le seuil et un plancher correctif.'));

  const blocks = [
    ['points-v2-e047-reference', 'Échelle de référence (calculée)', 'points-v2-e047-reference-list', 'points-v2-e047-reference-holder'],
    ['points-v2-e047-detect', 'Badges détectés dans la vue', 'points-v2-e047-detect-list', 'points-v2-e047-detect-holder'],
  ];
  blocks.forEach(([blockClass, label, listClass, holderClass]) => {
    const block = ctx.el('div', 'points-v2-e047-block ' + blockClass);
    block.appendChild(ctx.el('p', 'points-v2-e047-block-title', label));
    const holder = ctx.el('div', holderClass);
    holder.appendChild(ctx.el('ul', 'points-v2-e047-list ' + listClass));
    block.appendChild(holder);
    panel.appendChild(block);
  });

  panel.appendChild(ctx.el('p', 'points-v2-e047-current', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e047-metrics', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e047-note',
    'Règle de seuil : 4,5:1 pour un texte courant ; la lentille l’applique aussi aux grands textes. '
    + 'Chaque état est écrit avec un signe et un mot, jamais par la couleur seule. '
    + 'Les badges sous le seuil sont corrigés en place, sans retirer leur libellé.'));
  return panel;
}

/* E047-V2-08 : jauge de longueur ajoutée comme frère du badge, jamais dans son
 * texte : la passe 1 et E027-V2 relisent le token d'origine sans perturbation. */
function ajouterJauge(meta, token) {
  if (!isElement(meta) || query(meta, '.' + GAUGE_CLASS)) return;
  const brut = txt(token);
  let motif = '';
  for (let i = 0; i < MOTIFS.length; i += 1) {
    if (MOTIFS[i].test.test(brut)) { motif = MOTIFS[i].motif; break; }
  }
  if (!motif) return;
  /* Fabrique isolée : le panneau est construit avec ctx.el, mais la jauge est
   * posée ici avec createElement pour rester indépendante de l'ordre des
   * chantiers. Aucun innerHTML, aucun aléa. */
  let jauge = null;
  try { jauge = document.createElement('span'); }
  catch { return; }
  if (!jauge) return;
  jauge.className = GAUGE_CLASS;
  jauge.textContent = motif;
  jauge.setAttribute('aria-hidden', 'true');
  meta.appendChild(jauge);
}

/* E047-V2-01 / 03 : détection dédupliquée, limitée au détail courant. */
function detecterBadges(detail) {
  const trouves = [];
  const vus = [];
  BADGE_SELECTORS.forEach((selecteur) => {
    nodes(detail, selecteur).forEach((noeud) => {
      if (vus.indexOf(noeud) === -1) { vus.push(noeud); trouves.push(noeud); }
    });
  });
  return trouves;
}

/* E047-V2-03 / 04 / 05 / 06 : une seule passe de mesure, écrite en texte
 * lisible et dans des attributs auditables (jamais dans un live region). */
function remplir(ctx, panel, badges, titre) {
  const detectList = query(panel, '.points-v2-e047-detect-list');
  if (detectList) {
    let conformes = 0;
    let corriges = 0;
    let minimum = Infinity;
    const items = badges.map((badge) => {
      const token = txt(getAttr(badge, 'data-confidence') || badge);
      const mesure = mesurerBadge(badge, token);
      if (mesure.conforme) { conformes += 1; marquerConforme(badge, mesure); }
      else { corriges += 1; appliquerPlancher(badge, mesure); }
      if (mesure.ratio < minimum) minimum = mesure.ratio;
      const nom = libeller(badge);
      return listItem(ctx, mesure.conforme ? '✓' : '!', nom,
        formatRatio(mesure.ratio) + (mesure.mesuree ? '' : ' (conception)'),
        mesure.conforme ? 'conforme' : 'sous le seuil, corrigé',
        mesure.conforme ? 'pass' : 'fail');
    });
    if (!items.length) {
      items.push(listItem(ctx, '○', 'Aucun badge détecté dans ce périmètre', '—',
        'rien à mesurer', 'pass'));
    }
    detectList.replaceChildren.apply(detectList, items);

    const current = query(panel, '.points-v2-e047-current');
    if (current) {
      current.textContent = titre
        ? 'Point affiché : ' + titre
        : 'Aucun point affiché dans ce périmètre.';
    }
    const metrics = query(panel, '.points-v2-e047-metrics');
    if (metrics) {
      metrics.textContent = 'Badges : ' + badges.length
        + ' · conformes : ' + conformes
        + ' · corrigés : ' + corriges
        + ' · minimum : ' + (badges.length ? formatRatio(minimum) : '—')
        + ' · seuil appliqué : ' + formatRatio(SEUIL) + '.';
    }
    setAttr(panel, 'data-v2-e047-total', String(badges.length));
    setAttr(panel, 'data-v2-e047-conformes', String(conformes));
    setAttr(panel, 'data-v2-e047-corriges', String(corriges));
    setAttr(panel, 'data-v2-e047-seuil', String(SEUIL));
  }

  const refHolder = query(panel, '.points-v2-e047-reference-holder');
  if (refHolder && !query(refHolder, '.points-v2-e047-reference-list')) {
    refHolder.replaceChildren(listeReference(ctx, REFERENCE_PALETTE));
  }
}

function signatureOf(badges, titre) {
  return [titre].concat(badges.map((badge) => libeller(badge))).join('|');
}

/* ------------------------------------------------------------------------- *
 * E047-V2-01 / 09 / 10 — point d'entrée unique, gardes, feuille unique, ids
 * dédupliqués, repli silencieux sur structure inattendue.
 * ------------------------------------------------------------------------- */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;

  const detail = query(layout, '.points-detail');
  if (!isElement(detail)) return;

  ctx.css(CSS_ID, CSS);
  detail.classList.add(SCOPE);

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(detail, REDUCED_ATTR, '1');
  else if (typeof detail.hasAttribute === 'function' && detail.hasAttribute(REDUCED_ATTR)) {
    detail.removeAttribute(REDUCED_ATTR);
  }

  const badges = detecterBadges(detail);
  const titre = txt(query(detail, '.points-point-title'));
  if (badges.length) {
    const meta = query(detail, '.points-meta');
    const token = txt(getAttr(badges[0], 'data-confidence') || badges[0]);
    ajouterJauge(meta, token);
  }

  const sig = signatureOf(badges, titre);

  const candidates = nodesById(PANEL_ID);
  let panel = null;
  for (const candidate of candidates) {
    if (detail.contains(candidate) && candidate.parentElement === detail) {
      panel = candidate;
      break;
    }
  }
  candidates.forEach((node) => { if (node !== panel) removeNode(node); });

  if (!isElement(panel)) {
    panel = buildPanel(ctx);
    detail.appendChild(panel);
  }
  enforceUnique(TITLE_ID, query(panel, '#' + TITLE_ID));

  if (getAttr(panel, 'data-v2-e047-signature') !== sig) {
    setAttr(panel, 'data-v2-e047-signature', sig);
    remplir(ctx, panel, badges, titre);
  }

  setAttr(panel, 'data-v2-e047', '1');
  setAttr(detail, 'data-v2-e047-badges', String(badges.length));
}

register('E047', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
