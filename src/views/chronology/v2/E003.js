import { register } from './registry.js';

/* Lentille E003 (passe V2) — Échelle temporelle explicite de la frise.
 *
 * Thème : « A. Frise & ères — échelle temporelle explicite (amplitude, bornes,
 * unités) ». Dix chantiers uniques, E003-01 à E003-10, tous observables dans
 * le DOM ou dans la feuille de style injectée.
 *
 * Fichier possédé : src/views/chronology/v2/E003.js uniquement. Aucun fichier
 * partagé (registry.js, index.js, styles.css, chronology.js) n'est modifié ;
 * la passe 1 et les autres lentilles ne sont ni lues pour modèle ni touchées.
 *
 * Contrat : un seul register pour la clé E003, une seule feuille via
 * ctx.css('chronology-v2-e003', …), des helpers ctx.el / ctx.reducedMotion.
 * Toutes les grandeurs sont dérivées du DOM existant (dataset des bandes),
 * jamais codées en dur. Aucune journalisation, aucun réseau, aucun aléa,
 * aucun HTML brut, aucun timer, aucune boucle d'animation.
 *
 * Les bandes d'ère sont reconstruites à chaque rendu par chronology.js ; les
 * nœuds que nous greffons sont donc protégés par ensureNode (idempotence) et
 * leurs écritures passent par write (déduplication).
 */

const CSS_ID = 'chronology-v2-e003';
const PANEL_ID = 'chronology-v2-e003-panel';
const TITLE_ID = 'chronology-v2-e003-title';
const OVERVIEW_ID = 'chronology-v2-e003-overview';
const LEGEND_ID = 'chronology-v2-e003-legend';
const RULER_ID = 'chronology-v2-e003-ruler';
const ZERO_ID = 'chronology-v2-e003-zero';
const REFERENCE_ID = 'chronology-v2-e003-reference';
const STABILITY_ID = 'chronology-v2-e003-stability';
const MAIN_ID = 'atlas-chrono-main';
const ERAS_ID = 'atlas-chrono-eras';
const TOOLS_ID = 'atlas-chrono-tools';

/* E003-01, -04, -06, -07 : une seule feuille, injectée une fois par ctx.css.
   Le panneau est un bloc en flux normal, inséré avant les outils : il ne
   recouvre ni la frise ni la fiche, et n'ajoute aucun arrêt de tabulation. */
const CSS = `
  #${PANEL_ID} {
    margin: 12px 0 14px; padding: 10px 12px 11px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .v2e003-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 13px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} p { margin: 0 0 6px; }
  #${PANEL_ID} .v2e003-overview { color: var(--ink); font-size: 11px; }
  #${PANEL_ID} .v2e003-legend { color: var(--muted); }
  #${PANEL_ID} .v2e003-reference { color: var(--gold-bright); }
  #${PANEL_ID} .v2e003-stability { color: var(--muted-2); font-size: 9px; }
  #${RULER_ID} {
    position: relative; height: 34px; margin: 10px 0 18px;
    border-bottom: 1px solid var(--line-strong);
  }
  #${RULER_ID} .v2e003-tick {
    position: absolute; bottom: 0; width: 1px; height: 9px;
  }
  #${RULER_ID} .v2e003-tick-mark {
    position: absolute; left: 0; bottom: 0; width: 1px; height: 9px;
    background: var(--muted);
  }
  #${RULER_ID} .v2e003-tick-label {
    position: absolute; left: 0; bottom: 11px; transform: translateX(-50%);
    white-space: nowrap; color: var(--muted); font-size: 8px;
  }
  #${ZERO_ID} { position: relative; margin: 0 0 7px; color: var(--muted); }
  #${ZERO_ID}[data-e003-crosses-zero="1"]::before {
    content: ''; position: absolute; left: var(--e003-zero); top: -9px;
    width: 1px; height: 17px; background: var(--gold);
  }
  .era-band .v2e003-amplitude,
  .era-band .v2e003-bounds,
  .era-band .v2e003-iso {
    display: block; margin-top: 1px; color: var(--muted-2);
    font-size: 8px; line-height: 1.35; font-variant-numeric: tabular-nums;
    letter-spacing: 0; text-transform: none;
  }
  .era-band .v2e003-bound { margin-right: 7px; }
  .era-band .v2e003-time { color: var(--muted); }
  #${PANEL_ID}[data-e003-reduced="1"],
  #${PANEL_ID}[data-e003-reduced="1"] * { transition: none !important; }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *,
    .era-band .v2e003-amplitude,
    .era-band .v2e003-bounds,
    .era-band .v2e003-iso { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .v2e003-title, #${PANEL_ID} .v2e003-overview,
    #${PANEL_ID} .v2e003-reference { color: CanvasText; }
    #${RULER_ID} { border-color: CanvasText; }
    #${RULER_ID} .v2e003-tick-mark,
    #${ZERO_ID}[data-e003-crosses-zero="1"]::before { background: CanvasText; }
  }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 8px 9px 9px; }
    #${RULER_ID} .v2e003-tick-label { font-size: 7px; }
  }
`;

let rebuilds = 0;
let lastSignature = null;

/* Reproduit le formatage de chronology.js:27-29 sans l'importer : une année
   négative du jeu de données est une année « av. J.-C. ». */
function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

/* E003-09 : année astronomique ISO 8601. L'année 1 av. J.-C. correspond à
   l'année 0 ; une année -44 devient donc -0043. Les bornes positives sont
   simplement complétées sur quatre chiffres. */
function isoYear(year) {
  const expanded = year < 0 ? year + 1 : year;
  if (expanded < 0) return `-${String(Math.abs(expanded)).padStart(4, '0')}`;
  return String(expanded).padStart(4, '0');
}

/* Écriture dédupliquée : deux rendus sans changement ne touchent pas au texte. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* Garde d'existence : un nœud déjà présent est réutilisé et déplacé dans le
   parent courant. La coque reconstruisant #app, un nœud de la rendu précédent
   est détaché et n'est donc pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  } else if (className && !node.classList.contains(className)) {
    node.classList.add(className);
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E003-02 à E003-09 : toutes les grandeurs sont lues dans le dataset des
   bandes rendues par chronology.js:288-290. Aucune date n'est inventée. */
function readSpans() {
  const root = document.getElementById(ERAS_ID);
  if (!root) return null;
  const bands = Array.from(root.querySelectorAll('.era-band[data-start][data-end]'));
  if (!bands.length) return null;
  const spans = bands.map((band) => ({
    band,
    id: band.dataset.eraId || band.id || '',
    start: Number(band.dataset.start),
    end: Number(band.dataset.end),
  })).filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end));
  if (!spans.length) return null;
  const years = [];
  spans.forEach((item) => { years.push(item.start, item.end); });
  const min = Math.min(...years);
  const max = Math.max(...years);
  return { spans, min, max, total: max - min };
}

/* E003-02 — amplitude par ère, E003-03 — bornes « De / À »,
   E003-09 — bornes lisibles par machine en <time datetime>. */
function decorateBands(make, spans) {
  spans.forEach((item) => {
    const band = item.band;
    const amplitude = item.end - item.start;
    band.dataset.e003Amplitude = String(amplitude);
    band.dataset.e003Bounds = `${item.start}|${item.end}`;

    let amp = band.querySelector('.v2e003-amplitude');
    if (!amp) {
      amp = make('span', 'v2e003-amplitude');
      band.appendChild(amp);
    }
    write(amp, `Amplitude : ${amplitude} ans`);

    let bounds = band.querySelector('.v2e003-bounds');
    if (!bounds) {
      bounds = make('span', 'v2e003-bounds');
      bounds.append(make('span', 'v2e003-bound'), make('span', 'v2e003-bound'));
      band.appendChild(bounds);
    }
    const bornes = bounds.querySelectorAll('.v2e003-bound');
    if (bornes.length === 2) {
      write(bornes[0], `De ${formatYear(item.start)}`);
      write(bornes[1], `À ${formatYear(item.end)}`);
    }

    let iso = band.querySelector('.v2e003-iso');
    if (!iso) {
      iso = make('span', 'v2e003-iso');
      iso.append(make('time', 'v2e003-time'), document.createTextNode(' → '), make('time', 'v2e003-time'));
      band.appendChild(iso);
    }
    const times = iso.querySelectorAll('time');
    if (times.length === 2) {
      times[0].dateTime = isoYear(item.start);
      times[1].dateTime = isoYear(item.end);
      write(times[0], formatYear(item.start));
      write(times[1], formatYear(item.end));
      iso.title = `Bornes ISO 8601 : ${times[0].dateTime} → ${times[1].dateTime} (année astronomique ; 1 av. J.-C. = 0000).`;
      band.dataset.e003Iso = `${times[0].dateTime}|${times[1].dateTime}`;
    }
  });
}

/* E003-04 : une règle graduée en cinq repères, de la borne minimale à la
   borne maximale du pays. Le texte intégral reste dans l'aria-label et dans
   le récapitulatif, pour ne jamais porter d'information par la seule couleur. */
function buildRuler(make, ruler, data) {
  const description = `Règle temporelle : de ${formatYear(data.min)} à ${formatYear(data.max)}, soit ${data.total} années.`;
  ruler.setAttribute('role', 'img');
  ruler.setAttribute('aria-label', description);
  ruler.dataset.e003Min = String(data.min);
  ruler.dataset.e003Max = String(data.max);
  ruler.dataset.e003Span = String(data.total);

  const ticks = [];
  const steps = 4;
  for (let index = 0; index <= steps; index += 1) {
    const value = data.min + (data.total * index) / steps;
    const tick = make('span', 'v2e003-tick');
    tick.style.left = `${data.total ? (index / steps) * 100 : 0}%`;
    tick.setAttribute('aria-hidden', 'true');
    const mark = make('span', 'v2e003-tick-mark');
    const label = make('span', 'v2e003-tick-label', formatYear(Math.round(value)));
    tick.append(mark, label);
    ticks.push(tick);
  }
  ruler.replaceChildren(...ticks);
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;
  if (ctx.viewId && ctx.viewId !== 'chronologyv2') return;

  const data = readSpans();
  if (!data) return;

  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'v2e003-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ensureNode(make, TITLE_ID, 'h2', 'v2e003-title', panel);
  write(title, 'Échelle temporelle de la frise');
  const overview = ensureNode(make, OVERVIEW_ID, 'p', 'v2e003-overview', panel);
  const legend = ensureNode(make, LEGEND_ID, 'p', 'v2e003-legend', panel);
  const ruler = ensureNode(make, RULER_ID, 'div', 'v2e003-ruler', panel);
  const zero = ensureNode(make, ZERO_ID, 'p', 'v2e003-zero', panel);
  const reference = ensureNode(make, REFERENCE_ID, 'p', 'v2e003-reference', panel);
  const stability = ensureNode(make, STABILITY_ID, 'p', 'v2e003-stability', panel);
  panel.replaceChildren(title, overview, legend, ruler, zero, reference, stability);

  const tools = document.getElementById(TOOLS_ID);
  if (tools && tools.parentNode && panel.nextSibling !== tools) {
    tools.parentNode.insertBefore(panel, tools);
  }

  /* E003-05 — récapitulatif de la plage couverte. */
  write(overview, `Plage couverte : de ${formatYear(data.min)} à ${formatYear(data.max)} — ${data.total} années sur ${data.spans.length} ère(s).`);
  overview.dataset.e003Min = String(data.min);
  overview.dataset.e003Max = String(data.max);
  overview.dataset.e003Span = String(data.total);

  /* E003-01 — unité de mesure et convention av. / apr. J.-C. */
  const hasBce = data.spans.some((item) => item.start < 0 || item.end < 0);
  write(legend, `Unité de mesure : l'année civile. ${hasBce
    ? 'Les bornes négatives du jeu de données sont affichées « av. J.-C. », les autres « apr. J.-C. » (année 1 incluse).'
    : 'Toutes les bornes de ce pays sont postérieures au début de l’ère commune.'} Chiffres en largeur fixe pour la comparaison.`);
  panel.dataset.e003Unit = 'année';
  panel.dataset.e003Bce = hasBce ? '1' : '0';

  buildRuler(make, ruler, data);
  decorateBands(make, data.spans);

  /* E003-06 — marqueur de franchissement de l'ère commune, positionné sur
     la même règle que les graduations. */
  const crosses = data.min < 0 && data.max > 0;
  zero.dataset.e003CrossesZero = crosses ? '1' : '0';
  if (crosses) {
    const position = ((0 - data.min) / data.total) * 100;
    zero.style.setProperty('--e003-zero', `${position}%`);
    write(zero, `Franchissement de l'ère commune à ${position.toFixed(1)} % de la plage : « av. J.-C. » à gauche, « apr. J.-C. » à droite.`);
  } else {
    zero.style.removeProperty('--e003-zero');
    write(zero, `Aucun franchissement de l'ère commune : toutes les bornes sont ${data.max <= 0 ? 'avant' : 'après'} celle-ci.`);
  }

  /* E003-08 — comparaison chiffrée à une référence stable. */
  const current = data.spans.find((item) => item.band.getAttribute('aria-current') === 'true') || data.spans[0];
  const amplitude = current.end - current.start;
  const nameNode = current.band.querySelector('span');
  const name = nameNode ? nameNode.textContent.trim() : current.id;
  reference.dataset.e003Reference = String(amplitude);
  write(reference, `Référence d'échelle : l'ère « ${name} » couvre ${amplitude} ans, soit ${(amplitude / 100).toFixed(1)} siècle(s) ou ${(amplitude / 25).toFixed(1)} génération(s) de 25 ans (1 siècle = 100 ans).`);

  /* E003-07 — présentation numérique et mouvement réduit. */
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  panel.dataset.e003Numeric = '1';
  panel.dataset.e003Reduced = reduced ? '1' : '0';

  /* E003-10 — continuité de l'échelle entre rendus. */
  rebuilds += 1;
  const signature = `${data.min}|${data.max}|${data.spans.length}`;
  const stable = lastSignature === null || lastSignature === signature;
  lastSignature = signature;
  panel.dataset.e003Rebuilds = String(rebuilds);
  panel.dataset.e003Stable = stable ? '1' : '0';
  panel.dataset.e003Signature = signature;
  write(stability, `Échelle recalculée ${rebuilds} fois ; bornes ${stable ? 'inchangées' : 'modifiées'} entre rendus (signature ${signature}).`);
}

/* Point d'entrée unique : la clé E003 n'est enregistrée qu'une fois. */
register('E003', ctx => { install(ctx); });
