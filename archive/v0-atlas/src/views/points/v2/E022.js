import { register } from './registry.js';

/* Lentille POINTS V2 E022 — Certitude déclarée : échelle lisible et redondante.
 *
 * Seconde passe, fichier possédé : ce module uniquement. Aucun fichier de la
 * passe 1 (`points/E022.js`, `UNIFIED_AUDIT/POINTS/views/E022.md`) ni aucun
 * fichier partagé (vue `points.js`, coque, `styles.css`, `registry.js`,
 * `index.js`) n'est édité.
 *
 * La passe 1 ajoute un bloc « Certitude déclarée » à côté de `.points-meta`.
 * La V2 ne le réécrit pas : elle ajoute, dans `.points-detail`, une jauge de
 * lecture autonome dont tout le contenu est dérivé du token de confiance déjà
 * présent dans le DOM. Le classement en crans est une CONVENTION DE PRÉSENTATION,
 * pas une donnée historique : aucun millésime, aucun total, aucun fait n'est
 * inventé. Le badge d'origine reste intact.
 *
 * Contrat exploité intégralement :
 * - ctx.viewId  → identifiant de vue reporté sur la jauge, la légende, le
 *   récapitulatif et la marque posée sur ctx.stage ;
 * - ctx.stage   → racine de repli si la coque a détaché le layout, et cible
 *   d'une marque non destructive ;
 * - ctx.layout  → racine de requête, classe de portée .points-v2-e022 ;
 * - ctx.reducedMotion() → classes défensives .points-v2-e022-still / -motion ;
 * - ctx.css('points-v2-e022', CSS) → UNE seule feuille, toute préfixée ;
 * - ctx.el(...) → tout le DOM statique, jamais innerHTML.
 *
 * Invariants V2 :
 * - un seul greffon register('E022', …), une seule feuille CSS ;
 * - préfixe .points-v2-e022 sur TOUTES les règles, y compris dans les @media ;
 * - ids uniques points-v2-e022-* avec garde anti-doublon (getElementById) ;
 * - attributs V2 distincts de la passe 1 (data-e022-v2-*) ;
 * - zéro réseau, zéro aléa, zéro temporisation, zéro animation propre, zéro
 *   écouteur global, zéro console.*, zéro innerHTML ;
 * - le niveau est porté par le TEXTE (mot + crans ▮/▯) et la FORME (trait de
 *   soulignement plein/double/tireté/pointillé/absent), jamais par la couleur.
 */

const CSS_ID = 'points-v2-e022';
const SCOPE = 'points-v2-e022';
const RANK_MAX = 5;

const ID = {
  gauge: 'points-v2-e022-gauge',
  legend: 'points-v2-e022-legend',
  status: 'points-v2-e022-status',
};

/* Table d'interface, alignée sur les tokens de la fiche d'audit. La clé `key`
 * alimente l'attribut V2 et les sélecteurs de forme ; `word` est le libellé
 * lisible ; `rank` est la position sur l'échelle de lecture (0 à 5). */
const LEVELS = {
  'vérifié': { key: 'verified', rank: 5, word: 'Vérifié' },
  'certain': { key: 'certain', rank: 4, word: 'Certain' },
  'probable': { key: 'probable', rank: 3, word: 'Probable' },
  'disputed': { key: 'disputed', rank: 2, word: 'Contesté' },
  'non documenté': { key: 'undocumented', rank: 1, word: 'Non documenté' },
};
const UNKNOWN = { key: 'unknown', rank: 0, word: 'Non renseignée' };

/* Feuille unique. Chaque sélecteur COMMENCE par .points-v2-e022, y compris à
 * l'intérieur des blocs @media. Les crans ▮/▯ et le style de trait codent le
 * niveau SANS couleur : la teinte éventuelle devient redondante, jamais
 * nécessaire. Les attributs data-e022-v2-* sont propres à la V2. */
const CSS = `
  .points-v2-e022 .points-v2-e022-gauge{box-sizing:border-box;margin:8px 0 4px;padding:8px 10px;border:1px solid var(--line,rgba(244,214,158,.35));border-radius:8px;background:var(--surface-2,rgba(255,255,255,.04));font-variant-numeric:tabular-nums}
  .points-v2-e022 .points-v2-e022-legend{margin:0 0 5px;color:var(--muted,#8aa);font-size:10px;line-height:1.5}
  .points-v2-e022 .points-v2-e022-legend .points-v2-e022-key{color:var(--gold-bright,#f5d99a);font-weight:700}
  .points-v2-e022 .points-v2-e022-readout{display:flex;align-items:baseline;gap:8px;margin:0;color:var(--ink,#f4f6f8);font-size:13px;font-weight:600;line-height:1.4}
  .points-v2-e022 .points-v2-e022-bars{display:inline-block;padding-bottom:2px;border-bottom:2px solid currentColor;color:var(--gold-bright,#f5d99a);font-weight:700;letter-spacing:.12em}
  .points-v2-e022 .points-v2-e022-gauge[data-e022-v2-level="verified"] .points-v2-e022-bars{border-bottom-style:solid}
  .points-v2-e022 .points-v2-e022-gauge[data-e022-v2-level="certain"] .points-v2-e022-bars{border-bottom-style:double}
  .points-v2-e022 .points-v2-e022-gauge[data-e022-v2-level="probable"] .points-v2-e022-bars{border-bottom-style:dashed}
  .points-v2-e022 .points-v2-e022-gauge[data-e022-v2-level="disputed"] .points-v2-e022-bars{border-bottom-style:dotted}
  .points-v2-e022 .points-v2-e022-gauge[data-e022-v2-level="undocumented"] .points-v2-e022-bars,
  .points-v2-e022 .points-v2-e022-gauge[data-e022-v2-level="unknown"] .points-v2-e022-bars{border-bottom-style:none}
  .points-v2-e022 .points-v2-e022-word{margin:0}
  .points-v2-e022 .points-v2-e022-status{margin:5px 0 0;color:var(--muted,#8aa);font-size:11px;line-height:1.45}
  .points-v2-e022 .points-v2-e022-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  .points-v2-e022.points-v2-e022-motion .points-v2-e022-bars{transition:letter-spacing .16s ease}
  @media (forced-colors:active){
    .points-v2-e022 .points-v2-e022-gauge{outline:1px solid CanvasText}
    .points-v2-e022 .points-v2-e022-bars{border-bottom-color:CanvasText}
  }
  @media (prefers-contrast:more){
    .points-v2-e022 .points-v2-e022-bars{border-bottom-width:3px}
  }
  @media (prefers-reduced-motion:reduce){
    .points-v2-e022 .points-v2-e022-bars{transition:none !important}
  }
  @media (max-width:480px){
    .points-v2-e022 .points-v2-e022-gauge{padding:7px 8px}
    .points-v2-e022 .points-v2-e022-readout{font-size:12px}
  }
`;

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function childrenOf(node) {
  return node && node.children ? Array.prototype.slice.call(node.children) : [];
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* Positionne un nœud sans le dupliquer : avant `before` si ce nœud appartient
 * encore au parent, sinon en fin de parent. */
function place(parent, node, before) {
  if (!parent || typeof parent.insertBefore !== 'function') return;
  if (before && before.parentElement === parent) {
    if (node.nextSibling !== before) parent.insertBefore(node, before);
    return;
  }
  if (parent.lastElementChild !== node) parent.appendChild(node);
}

/* Traduction déterministe du token. Un token inconnu n'est jamais rangé dans
 * une catégorie arbitraire : son libellé brut est réaffiché, rang zéro. */
function levelOf(token) {
  const raw = txt(token);
  const key = raw.toLocaleLowerCase('fr');
  if (!key) return { token: raw, key: UNKNOWN.key, rank: UNKNOWN.rank, word: UNKNOWN.word };
  const found = LEVELS[key];
  if (found) return { token: raw, key: found.key, rank: found.rank, word: found.word };
  return { token: raw, key: UNKNOWN.key, rank: 0, word: raw };
}

/* Cinq crans, toujours le même nombre : le texte porte le niveau en niveaux
 * de gris, indépendamment de toute couleur. */
function barsText(rank) {
  const n = Math.max(0, Math.min(RANK_MAX, rank | 0));
  return '▮'.repeat(n) + '▯'.repeat(RANK_MAX - n);
}

/* Étiquette du groupe : le MOT D'ÉTAT vient en premier, le reste est dérivé
 * du DOM (sujet + rang). Aucune valeur historique n'est ajoutée. */
function ariaLabel(level, subject) {
  const where = subject ? `pour « ${subject} »` : 'sujet non précisé';
  return `Certitude ${level.word}, rang ${level.rank}/${RANK_MAX} — ${where}.`;
}

/* Récapitulatif : le décompte vient du nombre réel de nœuds parcourus. */
function statusText(level, subject, metaCount, certCount) {
  const where = subject ? ` pour « ${subject} »` : '';
  return `Certitude${where} : ${level.word}, rang ${level.rank}/${RANK_MAX}. `
    + `${certCount} mention${plural(certCount, '', 's')} de certitude `
    + `parmi ${metaCount} métadonnée${plural(metaCount, '', 's')}.`;
}

/* Toutes les valeurs sont lues dans le DOM produit par points.js. */
function readSignals(detail) {
  const meta = detail.querySelector('.points-meta');
  const badge = meta ? meta.querySelector('.confidence') : detail.querySelector('.confidence');
  const title = detail.querySelector('.points-point-title');
  return {
    token: badge ? txt(badge) : '',
    subject: title ? txt(title) : '',
    hasMeta: !!meta,
    metaCount: meta ? childrenOf(meta).length : 0,
    certCount: nodes(detail, '.confidence').length,
  };
}

/* Ancre unique : réutilise le nœud s'il est déjà au bon endroit, le déplace
 * si nécessaire, sinon le crée par ctx.el. Garde anti-doublon explicite. */
function ensureGauge(doc, detail, ctx) {
  const nav = detail.querySelector('.points-nav');
  let gauge = doc.getElementById(ID.gauge);
  if (gauge && gauge.parentElement === detail && gauge.classList.contains('points-v2-e022-gauge')) {
    place(detail, gauge, nav);
    return gauge;
  }
  if (gauge && gauge.parentNode) gauge.parentNode.removeChild(gauge);
  gauge = ctx.el('section', 'points-v2-e022-gauge');
  gauge.id = ID.gauge;
  place(detail, gauge, nav);
  return gauge;
}

function apply(ctx) {
  /* Garde d'entrée : contexte incomplet = lentille neutre, sans exception. */
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = ctx.layout;
  const stage = ctx.stage;
  /* ctx.stage sert de racine de repli si la coque a détaché le layout. */
  const root = (layout && typeof layout.querySelector === 'function' && layout.isConnected !== false)
    ? layout
    : (stage && typeof stage.querySelector === 'function' ? stage : null);
  if (!root) return;

  const detail = root.querySelector('.points-detail');
  if (!detail || typeof detail.querySelector !== 'function') return;

  const doc = (layout && layout.ownerDocument)
    || (stage && stage.ownerDocument)
    || (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.getElementById !== 'function') return;

  /* ctx.viewId : identifiant de vue reporté, jamais inventé. */
  const viewId = typeof ctx.viewId === 'string' && ctx.viewId ? ctx.viewId : 'pointsv2';

  /* Portée unique, marqueur de coque, mouvement reduz consulté, puis UNE
   * seule feuille injectée (cssOnce garantit l'idempotence). */
  if (layout && layout.classList && typeof layout.classList.add === 'function') {
    layout.classList.add(SCOPE);
  }
  const still = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (layout && layout.classList && typeof layout.classList.toggle === 'function') {
    layout.classList.toggle(`${SCOPE}-still`, still);
    layout.classList.toggle(`${SCOPE}-motion`, !still);
  }
  put(stage, 'data-points-v2-e022', viewId);
  ctx.css(CSS_ID, CSS);

  const signals = readSignals(detail);
  /* Périmètre vide : aucune certitude à expliciter, on ne fabrique rien. */
  if (!signals.hasMeta) {
    const stale = doc.getElementById(ID.gauge);
    if (stale && stale.parentElement === detail) stale.remove();
    return;
  }

  const level = levelOf(signals.token);
  /* E022-V2-01 : ancrage binaire/ordinal V2, distinct de data-e022-token. */
  if (detail.dataset) detail.dataset.e022V2Confidence = level.key;

  const gauge = ensureGauge(doc, detail, ctx);
  if (gauge.dataset) gauge.dataset.e022V2Level = level.key;
  put(gauge, 'role', 'group');
  put(gauge, 'data-view-id', viewId);
  /* E022-V2-03 : état énoncé en premier dans l'étiquette du groupe. */
  put(gauge, 'aria-label', ariaLabel(level, signals.subject));

  /* E022-V2-05 : légende construite par ctx.el uniquement, puis remplacée
   * d'un seul bloc (jamais accumulée). */
  const legend = ctx.el('p', 'points-v2-e022-legend');
  legend.id = ID.legend;
  put(legend, 'data-view-id', viewId);
  legend.replaceChildren(
    ctx.el('span', '', 'Échelle de certitude (lecture V2) — '),
    ctx.el('strong', 'points-v2-e022-key', '▮'),
    ctx.el('span', '', ' = cran renseigné, '),
    ctx.el('strong', 'points-v2-e022-key', '▯'),
    ctx.el('span', '', ' = cran vide ; le trait sous la barre (plein, double, tireté, pointillé ou absent) redit le niveau. La couleur ne porte aucune information.')
  );

  /* E022-V2-02 : la jauge est du texte (crans) et une forme (trait), jamais
   * une teinte. La marque est retirée de l'arbre d'accessibilité. */
  const readout = ctx.el('p', 'points-v2-e022-readout');
  const sr = ctx.el('span', 'points-v2-e022-sr', '');
  const bars = ctx.el('span', 'points-v2-e022-bars', barsText(level.rank));
  put(bars, 'aria-hidden', 'true');
  const word = ctx.el('span', 'points-v2-e022-word', level.word);
  readout.append(sr, bars, word);

  /* E022-V2-04 / 06 : une seule région live, écrite une fois par rendu. */
  const status = ctx.el('p', 'points-v2-e022-status',
    statusText(level, signals.subject, signals.metaCount, signals.certCount));
  status.id = ID.status;
  put(status, 'data-view-id', viewId);
  put(status, 'role', 'status');
  put(status, 'aria-live', 'polite');

  gauge.replaceChildren(legend, readout, status);
  place(detail, gauge, detail.querySelector('.points-nav'));

  /* E022-V2-08 : infobulle enrichie une seule fois, sans toucher au titre du
   * point ni au badge d'origine. Le garde-fou empêche tout empilement. */
  if (gauge.dataset && gauge.dataset.e022V2Titled !== '1') {
    const base = gauge.getAttribute('title') || '';
    if (!/^Lecture V2\b/i.test(base)) {
      put(gauge, 'title', base ? `Lecture V2 — ${level.word} · ${base}` : `Lecture V2 — ${level.word}`);
    }
    gauge.dataset.e022V2Titled = '1';
  }

  /* E022-V2-07 : fusion additive de l'aria-describedby du détail. Toute
   * relation posée par la passe 1 ou une autre lentille est conservée, puis
   * dédupliquée ; seuls les ids réellement présents sont référencés. */
  const existing = (detail.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  const refs = [ID.legend, ID.status].filter((id) => doc.getElementById(id));
  const merged = Array.from(new Set(existing.concat(refs))).join(' ');
  if (merged) put(detail, 'aria-describedby', merged);

  void still;
}

register('E022', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
