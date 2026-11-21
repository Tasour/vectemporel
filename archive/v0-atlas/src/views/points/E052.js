import { register } from './registry.js';

/* Lentille E052 — Sémantique & données : aucune date codée en dur.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E052.md — chantiers E052-01 à E052-10.
 * Fichier possédé : ce module uniquement. La vue `src/views/points.js`, le
 * magasin `src/domain/store.js` et le jeu `src/data/dataset.js` sont lus mais
 * JAMAIS modifiés : E052 ajoute un panneau LOCAL de lisibilité de l'ancre
 * temporelle, par-dessus le DOM déjà produit.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune import de store, aucune écriture dans state, aucune
 * dépendance vers set()/selectEra() : tout est dérivé du DOM rendu.
 *
 * Invariant central : AUCUN millésime n'est écrit dans ce module. Chaque date
 * affichée est relue dans le DOM (champ `time` du point, noms d'ères de la
 * matrice, compteurs du titre et du kicker). Les seules chaînes numériques
 * autorisées sont des conventions de formatage (« av. J.-C. », « apr. J.-C. »,
 * « référence »), jamais une année. `auditLiterals()` vérifie cette propriété
 * à l'exécution et l'expose sur le layout.
 *
 * Invariants secondaires :
 * - un seul greffon, une seule feuille CSS (`points-e052`), des IDs préfixés ;
 * - zéro réseau, zéro aléa, zéro minuteur, zéro rAF, zéro journalisation ;
 * - aucune réinterprétation de balisage : seulement des nœuds créés par ctx.el ;
 * - les nœuds existants ne sont jamais retirés ni réécrits ;
 * - greffon idempotent : les nœuds ajoutés sont réutilisés par identifiant ;
 * - signature anti-écriture redondante du statut et des listes.
 */

const CSS_ID = 'points-e052';

const ID = {
  panel: 'points-e052-panel',
  title: 'points-e052-title',
  intro: 'points-e052-intro',
  anchor: 'points-e052-anchor',
  eraList: 'points-e052-era-list',
  status: 'points-e052-status',
  metrics: 'points-e052-metrics',
  note: 'points-e052-note',
};

/* Toutes les phrases écrites par la lentille. Aucun millésime n'y figure :
 * `auditLiterals()` compte les suites de 3 ou 4 chiffres et doit trouver 0. */
const PROSE = {
  intro: 'Aucune date n’est inscrite dans cette lentille : chaque millésime affiché est lu dans la fiche du point ou dans la matrice.',
  note: 'Les noms d’ères et les ancres temporelles sont reproduits tels qu’ils sont fournis par les données ; E052 n’en invente aucun.',
  eraLabel: 'Ère affichée',
  anchorLabel: 'Ancre temporelle',
  pointLabel: 'Point sélectionné',
  noEra: 'aucune ère repérée',
  noPoint: 'aucun point sélectionné',
  noTime: 'ancre temporelle non fournie',
  relative: 'ancre temporelle relative',
  bc: 'av. J.-C.',
  ac: 'apr. J.-C.',
  erasLabel: 'Ères de la matrice, dans leur ordre',
};

/* Feuille unique. Les règles ne visent que les ancres `points-e052-` : aucune
 * fuite, aucune ressource externe, aucune animation, focus visible et repli
 * mobile. Aucune information n'est portée par la seule couleur. */
const CSS = `
  #${ID.panel} {
    margin: 10px 0 0; padding: 10px 12px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(230, 185, 111, .04); color: var(--ink-soft);
    font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums;
  }
  #${ID.panel} h2 {
    margin: 0 0 6px; font-family: var(--serif);
    font-size: 14px; color: var(--gold-bright);
  }
  #${ID.intro}, #${ID.note} { margin: 0 0 8px; color: var(--muted-2); }
  #${ID.anchor} {
    display: grid; grid-template-columns: auto minmax(0, 1fr);
    gap: 3px 10px; margin: 0 0 8px;
  }
  #${ID.anchor} dt { color: var(--muted); font-weight: 600; }
  #${ID.anchor} dd { margin: 0; overflow-wrap: anywhere; }
  #${ID.status} {
    margin: 0 0 6px; min-height: 24px; padding: 6px 8px;
    border-left: 3px solid var(--gold); border-radius: 4px;
    background: rgba(230, 185, 111, .06);
  }
  #${ID.metrics} { margin: 0; color: var(--muted-2); font-size: 10px; }
  .points-e052-sr {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
  #${ID.panel}:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  @media (max-width: 620px) {
    #${ID.anchor} { grid-template-columns: minmax(0, 1fr); }
    #${ID.panel} { padding: 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${ID.panel} { transition: none; }
  }
`;

let layout = null;        // .points-layout du rendu courant
let parts = null;         // nœuds locaux du panneau
let lastSignature = '';   // signature anti-écriture redondante
let updateCount = 0;      // compteur auditable d'actualisations réelles

/* Sélecteurs défensifs : un ctx minimal ou un DOM partiel ne doit jamais
 * faire lever une exception dans la lentille. */
function q(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function textOf(node) {
  return node ? String(node.textContent || '').trim() : '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

/* E052-01 — Audit à l'exécution : aucune phrase écrite par la lentille ne
 * contient de suite de 3 ou 4 chiffres. Le résultat est exposé sur le layout. */
function auditLiterals() {
  const found = Object.values(PROSE).join(' ').match(/\b\d{3,4}\b/g);
  return found ? found.length : 0;
}

/* E052-03 — Le formatage est une CONVENTION, jamais une date : le signe du
 * nombre lu détermine le suffixe, le nombre lui-même vient toujours du DOM. */
function formatYear(raw) {
  const value = String(raw == null ? '' : raw).trim();
  if (!value) return PROSE.noTime;
  const match = /^(-?)(\d{1,4})$/.exec(value);
  if (!match) return `${PROSE.relative} : ${value}`;
  const number = Number(match[2]);
  if (match[1] === '-') return `${number} ${PROSE.bc}`;
  if (number === 0) return '0 (référence)';
  return `${number} ${PROSE.ac}`;
}

/* E052-02 — L'ancre temporelle est le seul span numérique de .points-meta
 * (ordre rendu : domaine, échelle, temps, certitude). Aucun champ n'est supposé. */
function readPoint(detail) {
  const title = textOf(q(detail, '.points-point-title'));
  const spans = qa(detail, '.points-meta > span');
  let time = '';
  for (const span of spans) {
    if (/^-?\d{1,4}$/.test(textOf(span))) { time = textOf(span); break; }
  }
  if (!time && spans.length > 2) time = textOf(spans[2]);
  return { title, time, confidence: spans.length ? textOf(spans[spans.length - 1]) : '' };
}

/* E052-04 — Les ères sont relues dans l'ordre réel des lignes de la matrice. */
function erasOf(root) {
  return qa(root, '.points-grid-row:not(.is-head)')
    .map((row) => textOf(q(row, '.points-era')))
    .filter(Boolean);
}

/* E052-05 — L'ère courante est repérée par la classe `is-active` déjà posée
 * par la vue, jamais par comparaison avec une date écrite en dur. */
function currentEra(root) {
  return textOf(q(root, '.points-grid-row.is-active .points-era'));
}

/* E052-06 — Les compteurs sont dérivés du titre et du kicker réellement
 * rendus ; aucune valeur historique n'est recopiée dans la lentille. */
function countsOf(root) {
  const total = /(\d+)/.exec(textOf(q(root, '.points-title')));
  const scope = /(\d+)/.exec(textOf(q(root, '.points-detail .view-kicker')));
  return { total: total ? Number(total[1]) : null, scope: scope ? Number(scope[1]) : null };
}

/* E052-09 — Lecture linéaire du panneau : chaque paire terme / valeur est
 * construite par nœuds, sans réinterprétation de balisage ni couleur porteuse
 * de sens. */
function writePairs(ctx, dl, pairs) {
  const nodes = [];
  pairs.forEach(([label, value]) => {
    nodes.push(ctx.el('dt', '', label), ctx.el('dd', '', value));
  });
  dl.replaceChildren(...nodes);
}

function writeEras(ctx, list, names, active) {
  list.replaceChildren(...names.map((name, index) => {
    const item = ctx.el('li', '', name || PROSE.noEra);
    if (name === active && active) put(item, 'aria-current', 'true');
    put(item, 'data-points-e052-position', String(index + 1));
    return item;
  }));
}

/* Réutilise un nœud par identifiant ; le recrée seulement s'il est absent du
 * document ou mal parenté. Garantit l'idempotence après un rendu neuf. */
function place(ctx, id, tag, className, parent) {
  let node = document.getElementById(id);
  if (node && node.parentElement && node.parentElement !== parent) node.remove();
  if (!node || !node.isConnected) {
    node = ctx.el(tag, className);
    node.id = id;
    parent.appendChild(node);
  }
  return node;
}

function buildPanel(ctx, detail) {
  const panel = place(ctx, ID.panel, 'section', 'points-e052-panel', detail);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', ID.title);
  panel.setAttribute('aria-describedby', `${ID.intro} ${ID.note}`);

  const title = place(ctx, ID.title, 'h2', '', panel);
  title.textContent = 'Ancrage temporel des données';

  const intro = place(ctx, ID.intro, 'p', 'points-e052-intro', panel);
  intro.textContent = PROSE.intro;

  const anchor = place(ctx, ID.anchor, 'dl', 'points-e052-anchor', panel);
  const eraList = place(ctx, ID.eraList, 'ol', 'points-e052-eras points-e052-sr', panel);
  eraList.setAttribute('aria-label', PROSE.erasLabel);

  const status = place(ctx, ID.status, 'p', 'points-e052-status', panel);
  put(status, 'role', 'status');
  put(status, 'aria-live', 'polite');

  const metrics = place(ctx, ID.metrics, 'p', 'points-e052-metrics', panel);
  const note = place(ctx, ID.note, 'p', 'points-e052-note', panel);
  note.textContent = PROSE.note;

  /* Le panneau reste avant la navigation : la commande de déplacement entre
   * points demeure le dernier élément du détail. */
  const nav = q(detail, '.points-nav');
  if (nav && nav.parentElement === detail && panel.nextSibling !== nav) {
    detail.insertBefore(panel, nav);
  }
  return { panel, anchor, eraList, status, metrics };
}

/* E052-07 / E052-08 — Rafraîchissement signé : on ne réécrit que si l'une des
 * valeurs lues dans le DOM change ; les replis explicites couvrent les données
 * absentes sans jamais inventer de millésime. */
function refresh(ctx, root, force) {
  if (!parts || !root) return;
  const detail = q(root, '.points-detail');
  if (!detail) return;
  const point = readPoint(detail);
  const era = currentEra(root);
  const names = erasOf(root);
  const counts = countsOf(root);
  const formatted = formatYear(point.time);
  const signature = JSON.stringify([
    point.title, point.time, point.confidence, era, names, counts.total, counts.scope,
  ]);
  if (!force && signature === lastSignature) return;
  lastSignature = signature;
  updateCount += 1;

  writePairs(ctx, parts.anchor, [
    [PROSE.eraLabel, era || PROSE.noEra],
    [PROSE.anchorLabel, formatted],
    [PROSE.pointLabel, point.title || PROSE.noPoint],
  ]);
  writeEras(ctx, parts.eraList, names, era);

  const scope = counts.scope === null ? '' : ` · ${counts.scope} point(s) dans le périmètre`;
  parts.status.textContent = `Ère : ${era || PROSE.noEra} · ancre : ${formatted} · point : ${point.title || PROSE.noPoint}${scope}.`;
  parts.metrics.textContent = `E052 · actualisations : ${updateCount} · ères : ${names.length} · millésimes littéraux : ${auditLiterals()}.`;

  put(detail, 'data-points-e052-anchor', point.time || 'absent');
  put(detail, 'data-points-e052-era', era || 'absent');
  if (root.dataset) {
    root.dataset.pointsE052 = '1';
    root.dataset.pointsE052Literals = String(auditLiterals());
  }
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  ctx.css(CSS_ID, CSS);
  const stage = ctx.stage;
  if (!stage || typeof stage.querySelector !== 'function') return;
  const current = ctx.layout && ctx.layout.isConnected ? ctx.layout : q(stage, '.points-layout');
  if (!current) return;
  const detail = q(current, '.points-detail');
  const grid = q(current, '.points-grid');
  if (!detail || !grid || typeof detail.appendChild !== 'function') return;

  /* Un rendu neuf recrée le layout : la signature précédente est périmée. */
  if (layout && layout !== current) lastSignature = '';
  layout = current;

  /* E052-10 — Un seul panneau par rendu : `place` réutilise les nœuds déjà
   * greffés, aucun doublon n'est créé même si la lentille est rappelée. */
  parts = buildPanel(ctx, detail);
  refresh(ctx, layout, true);
}

register('E052', (ctx) => {
  try {
    install(ctx);
  } catch {
    return;
  }
});
