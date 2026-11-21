import { register } from './registry.js';

/* Lentille E083 — passe V2, domaine I (qualité & validation).
 * Thème : « IDs uniques préfixés points-v2-eNNN ».
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E083.md — chantiers E083-01 à E083-10.
 * Fichier possédé : ce module uniquement. Ni la passe 1 (src/views/points/E083.js),
 * ni la vue (src/views/points.js), ni la coque, ni styles.css, ni registry.js /
 * index.js, ni une autre lentille V2 ne sont modifiés.
 *
 * Contrat exploité : viewId 'pointsv2', layout, css(id, règles), el(balise, classe, texte).
 * Exactement un appel au registre, une fonction fléchée prenant ctx, et une seule
 * feuille CSS injectée par le helper css. Tout ID DOM créé dérive du préfixe
 * normatif 'points-v2-e083-' et passe par une garde d'existence (idempotence).
 *
 * Invariants :
 * - zéro ID littéral hors du registre figé ci-dessous : les huit clés de base et
 *   les dix chantiers sont l'unique source de vérité, tous les noms en dérivent ;
 * - zéro doublon, zéro référence ARIA orpheline, zéro attribut data-* non préfixé ;
 * - aucun aléa, aucune date, aucun compteur dynamique dans un nom : les suffixes
 *   de liste sont déterministes (01..10) ;
 * - zéro journalisation, zéro accès réseau, zéro HTML brut, zéro minuteur,
 *   zéro boucle d'animation, zéro écouteur, zéro région live ajoutée, zéro vol de focus ;
 * - français partout : commentaires, libellés du panneau et rapport.
 */

const PREFIX = 'points-v2-e083-';
const SCOPE = 'points-v2-e083';
const CSS_ID = 'points-v2-e083';
const DATA_PREFIX = 'data-points-v2-e083-';
const MOTIF_ID = new RegExp('^' + PREFIX + '[a-z0-9-]+$');

/* E083-03 : les huit clés de base et les dix chantiers forment l'unique registre.
   Aucun ID n'est écrit en dur ailleurs : IDS, ROW_IDS, VALUE_IDS et ITEM_IDS en
   sont dérivés, puis DECLARED_IDS les réunit pour l'audit d'unicité. */
const ID_KEYS = Object.freeze([
  'panel', 'title', 'lede', 'prefix', 'registry', 'id-list', 'summary', 'check',
]);

const CHANTIERS = Object.freeze([
  { code: 'E083-01', key: 'prefixe', label: 'Préfixe normatif sur tout ID' },
  { code: 'E083-02', key: 'doublons', label: 'Unicité documentaire, zéro doublon' },
  { code: 'E083-03', key: 'source', label: 'Registre d’IDs en source unique' },
  { code: 'E083-04', key: 'rendus', label: 'Idempotence multi-rendus' },
  { code: 'E083-05', key: 'aria', label: 'Références ARIA résolues' },
  { code: 'E083-06', key: 'determinisme', label: 'IDs déterministes, sans aléa' },
  { code: 'E083-07', key: 'feuille', label: 'Feuille CSS unique' },
  { code: 'E083-08', key: 'donnees', label: 'Attributs data-* préfixés' },
  { code: 'E083-09', key: 'repetes', label: 'IDs uniques des éléments répétés' },
  { code: 'E083-10', key: 'audit', label: 'Audit vérifiable sans journalisation' },
]);

const IDS = Object.freeze(ID_KEYS.reduce((acc, key) => {
  acc[key] = PREFIX + key;
  return acc;
}, Object.create(null)));
const ROW_KEYS = Object.freeze(CHANTIERS.map((item) => item.key));
const ROW_IDS = Object.freeze(ROW_KEYS.map((key) => PREFIX + 'ligne-' + key));
const VALUE_IDS = Object.freeze(ROW_KEYS.map((key) => PREFIX + 'valeur-' + key));
const ITEM_IDS = Object.freeze(ROW_KEYS.map((_, index) => PREFIX + 'item-' + String(index + 1).padStart(2, '0')));
const DECLARED_IDS = Object.freeze([].concat(
  Object.keys(IDS).map((key) => IDS[key]),
  ROW_IDS,
  VALUE_IDS,
  ITEM_IDS
));

/* E083-07 : une seule feuille. Tous les sélecteurs commencent littéralement par
   `.points-v2-e083`, y compris dans les @media : aucune règle ne peut fuir hors
   de la vue Points. Le style s'ancre sur une classe, jamais sur un ID audité :
   un repli d'ID ne peut pas casser la mise en forme. Les dix styles de bordure
   ci-dessous donnent à chaque chantier un effet observable, sans porter
   d'information par la seule couleur (chaque ligne garde son libellé réel). */
const CSS = `
  .points-v2-e083 .points-v2-e083-panel {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .points-v2-e083 .points-v2-e083-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  .points-v2-e083 .points-v2-e083-lede,
  .points-v2-e083 .points-v2-e083-id-note,
  .points-v2-e083 .points-v2-e083-summary,
  .points-v2-e083 .points-v2-e083-check { margin: 0 0 8px; color: var(--muted); }
  .points-v2-e083 .points-v2-e083-prefix-line {
    display: flex; flex-wrap: wrap; gap: 4px 8px;
    margin: 0 0 8px; padding: 5px 7px;
    border: 1px solid var(--line); border-radius: 6px;
  }
  .points-v2-e083 .points-v2-e083-key-inline { color: var(--muted); }
  .points-v2-e083 .points-v2-e083-prefix {
    color: var(--gold-bright); font-family: ui-monospace, monospace;
    font-size: 10px; overflow-wrap: anywhere;
  }
  .points-v2-e083 .points-v2-e083-registry { margin: 0 0 8px; padding: 0; }
  .points-v2-e083 .points-v2-e083-row {
    display: flex; gap: 10px; margin: 0 0 3px; padding: 3px 0 3px 8px;
    border-bottom: 1px solid var(--line); border-left: 3px solid var(--line-strong);
  }
  .points-v2-e083 .points-v2-e083-row[data-points-v2-e083-chantier="E083-01"] { border-left-style: solid; }
  .points-v2-e083 .points-v2-e083-row[data-points-v2-e083-chantier="E083-02"] { border-left-style: dashed; }
  .points-v2-e083 .points-v2-e083-row[data-points-v2-e083-chantier="E083-03"] { border-left-style: dotted; }
  .points-v2-e083 .points-v2-e083-row[data-points-v2-e083-chantier="E083-04"] { border-left-style: double; }
  .points-v2-e083 .points-v2-e083-row[data-points-v2-e083-chantier="E083-05"] { border-left-style: groove; }
  .points-v2-e083 .points-v2-e083-row[data-points-v2-e083-chantier="E083-06"] { border-left-style: ridge; }
  .points-v2-e083 .points-v2-e083-row[data-points-v2-e083-chantier="E083-07"] { border-left-style: inset; }
  .points-v2-e083 .points-v2-e083-row[data-points-v2-e083-chantier="E083-08"] { border-left-style: outset; }
  .points-v2-e083 .points-v2-e083-row[data-points-v2-e083-chantier="E083-09"] { border-left-style: solid; border-left-width: 6px; }
  .points-v2-e083 .points-v2-e083-row[data-points-v2-e083-chantier="E083-10"] { border-left-style: double; border-left-width: 6px; }
  .points-v2-e083 .points-v2-e083-key { flex: 0 0 168px; margin: 0; color: var(--muted); }
  .points-v2-e083 .points-v2-e083-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  .points-v2-e083 .points-v2-e083-id-list { margin: 0 0 6px; padding: 0 0 0 18px; }
  .points-v2-e083 .points-v2-e083-id {
    margin: 0 0 2px; color: var(--muted-2);
    font-family: ui-monospace, monospace; font-size: 10px; overflow-wrap: anywhere;
  }
  .points-v2-e083 .points-v2-e083-summary { color: var(--ink-soft); }
  .points-v2-e083 .points-v2-e083-check {
    margin: 6px 0 0; padding-top: 6px; border-top: 1px solid var(--line);
    color: var(--muted-2); font-family: ui-monospace, monospace; font-size: 10px;
  }
  @media (max-width: 620px) {
    .points-v2-e083 .points-v2-e083-row { flex-wrap: wrap; gap: 1px 8px; }
    .points-v2-e083 .points-v2-e083-key { flex-basis: 100%; }
  }
  /* Repli défensif : neutralise un mouvement hérité, n'en crée aucun. */
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e083 .points-v2-e083-panel,
    .points-v2-e083 .points-v2-e083-panel * {
      animation: none !important;
      transition: none !important;
    }
  }
  @media (prefers-contrast: more) {
    .points-v2-e083 .points-v2-e083-row { border-left-width: 5px; }
  }
  /* L'état reste lisible par le texte et la bordure en couleurs forcées. */
  @media (forced-colors: active) {
    .points-v2-e083 .points-v2-e083-panel {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    .points-v2-e083 .points-v2-e083-title,
    .points-v2-e083 .points-v2-e083-key,
    .points-v2-e083 .points-v2-e083-val,
    .points-v2-e083 .points-v2-e083-prefix,
    .points-v2-e083 .points-v2-e083-id,
    .points-v2-e083 .points-v2-e083-summary,
    .points-v2-e083 .points-v2-e083-check { color: CanvasText; }
  }
`;

let installs = 0;
let refs = { panel: null, values: Object.create(null), summary: null };

/* E083-02 et E083-04 : garde d'existence. La coque reconstruisant le stage, un
   nœud du rendu précédent peut être détaché : on le réutilise et on le déplace
   dans le parent courant plutôt que d'en créer un doublon. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E083-08 : toute écriture d'état passe par ce helper, dont les clés produisent
   exclusivement des attributs data-points-v2-e083-*. */
function setData(node, key, value) {
  if (!node) return;
  const name = DATA_PREFIX + key;
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

/* E083-01, E083-02, E083-05, E083-06, E083-07, E083-08 et E083-10 : toutes les
   mesures sont dérivées du DOM réel et du registre figé, jamais codées en dur
   dans un libellé. Aucune écriture dans une région live et aucun écouteur. */
function measure(panel) {
  const nodes = panel ? [panel].concat(Array.from(panel.querySelectorAll('[id]'))) : [];
  const ids = nodes.map((node) => node.id);
  const uniques = new Set(ids);
  const duplicates = ids.length - uniques.size;
  const conformes = ids.filter((value) => value.indexOf(PREFIX) === 0).length;

  let ariaRefs = 0;
  let orphelines = 0;
  if (panel) {
    const porteurs = [panel].concat(Array.from(panel.querySelectorAll('[aria-labelledby], [aria-describedby]')));
    porteurs.forEach((node) => {
      ['aria-labelledby', 'aria-describedby'].forEach((attr) => {
        const value = node.getAttribute(attr);
        if (!value) return;
        value.split(/\s+/).filter(Boolean).forEach((token) => {
          ariaRefs += 1;
          if (!document.getElementById(token)) orphelines += 1;
        });
      });
    });
  }

  let dataTotal = 0;
  let dataPrefixes = 0;
  if (panel) {
    [panel].concat(Array.from(panel.querySelectorAll('*'))).forEach((node) => {
      Array.from(node.attributes).forEach((attr) => {
        if (attr.name.indexOf('data-') !== 0) return;
        dataTotal += 1;
        if (attr.name.indexOf(DATA_PREFIX) === 0) dataPrefixes += 1;
      });
    });
  }

  const declaredUniques = new Set(DECLARED_IDS).size;
  const declarationsUniques = declaredUniques === DECLARED_IDS.length;
  const nomsConformes = DECLARED_IDS.every((value) => MOTIF_ID.test(value));
  const deterministe = declarationsUniques && nomsConformes;
  const feuilles = document.querySelectorAll('style#' + CSS_ID).length;
  const panneaux = document.querySelectorAll('#' + IDS.panel).length;
  const itemsUniques = new Set(ITEM_IDS).size;

  return {
    ids: ids.length,
    conformes,
    duplicates,
    declared: DECLARED_IDS.length,
    declaredDuplicates: DECLARED_IDS.length - declaredUniques,
    bases: ID_KEYS.length,
    chantiers: CHANTIERS.length,
    renders: installs,
    panels: panneaux,
    ariaRefs,
    orphelines,
    deterministe,
    feuilles,
    dataTotal,
    dataPrefixes,
    items: ITEM_IDS.length,
    itemsUniques,
  };
}

/* E083-10 : l'état est publié en texte visible ordinaire et dans des attributs
   data-points-v2-e083-*, sans région live, sans journalisation et sans valeur figée. */
function paint() {
  const { panel, values, summary } = refs;
  if (!panel || !panel.isConnected) return;
  const m = measure(panel);
  const val = (code, text) => write(values[code], text);

  val('E083-01', `${m.conformes}/${m.ids} IDs du panneau portent le préfixe ${PREFIX} ; ${m.ids - m.conformes} hors préfixe.`);
  val('E083-02', `${m.duplicates} doublon(s) dans le panneau · ${m.declaredDuplicates} doublon(s) dans le registre.`);
  val('E083-03', `${m.bases} clés de base + ${m.chantiers} chantiers → ${m.declared} IDs dérivés ; aucun ID littéral hors registre.`);
  val('E083-04', `${m.renders} rendu(s) du greffon · ${m.panels} panneau(x) dans le document.`);
  val('E083-05', `${m.ariaRefs} référence(s) ARIA vérifiée(s) · ${m.orphelines} orpheline(s).`);
  val('E083-06', `Motif respecté : ${m.deterministe ? 'oui' : 'non'} · ${m.declared} noms constants, sans aléa ni horodatage.`);
  val('E083-07', `${m.feuilles} feuille(s) de style ${CSS_ID} · un seul ctx.css par greffon.`);
  val('E083-08', `${m.dataPrefixes}/${m.dataTotal} attributs data-* préfixés · ${m.dataTotal - m.dataPrefixes} intrus.`);
  val('E083-09', `${m.items} éléments de liste · ${m.itemsUniques} IDs distincts · suffixe 01..${m.items}.`);
  const conforme = m.conformes === m.ids && m.duplicates === 0 && m.orphelines === 0
    && m.feuilles === 1 && m.deterministe && m.dataPrefixes === m.dataTotal;
  val('E083-10', `${conforme ? 'Conforme' : 'À revoir'} — vérification structurelle : node --check src/views/points/v2/E083.js.`);

  write(summary, `Bilan E083 — ${m.ids} IDs préfixés, ${m.duplicates} doublon, ${m.orphelines} référence orpheline, ${m.feuilles} feuille CSS, ${m.renders} rendu(s) : ${conforme ? 'contrat d’unicité respecté' : 'contrat à revoir'}.`);

  setData(panel, 'ids', String(m.ids));
  setData(panel, 'prefix-ok', m.conformes === m.ids ? '1' : '0');
  setData(panel, 'doublons', String(m.duplicates));
  setData(panel, 'registre', String(m.declared));
  setData(panel, 'rendus', String(m.renders));
  setData(panel, 'aria', String(m.ariaRefs));
  setData(panel, 'orphelines', String(m.orphelines));
  setData(panel, 'deterministe', m.deterministe ? '1' : '0');
  setData(panel, 'feuilles', String(m.feuilles));
  setData(panel, 'donnees', String(m.dataPrefixes));
  setData(panel, 'items', String(m.items));
  setData(panel, 'audit', conforme ? 'conforme' : 'a-revoir');
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;
  if (ctx.viewId !== 'pointsv2') return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const host = ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;
  if (!host.classList.contains(SCOPE)) host.classList.add(SCOPE);
  setData(host, 'scope', '1');

  const panel = ensureNode(make, IDS.panel, 'section', 'points-v2-e083-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', IDS.title);
  panel.setAttribute('aria-describedby', IDS.lede);

  const title = make('h2', 'points-v2-e083-title', 'Identifiants uniques — passe V2');
  title.id = IDS.title;
  const lede = make('p', 'points-v2-e083-lede', 'Ce panneau audite les identifiants de la lentille E083. Chaque nom dérive d’un registre figé, porte le préfixe normatif et est protégé contre les doublons lors des rendus successifs. Il n’ajoute ni région live ni arrêt de tabulation.');
  lede.id = IDS.lede;

  const prefixLine = make('p', 'points-v2-e083-prefix-line');
  prefixLine.append(make('span', 'points-v2-e083-key-inline', 'Préfixe normatif : '));
  const code = make('code', 'points-v2-e083-prefix', PREFIX);
  code.id = IDS.prefix;
  prefixLine.appendChild(code);

  const registry = make('dl', 'points-v2-e083-registry');
  registry.id = IDS.registry;
  const values = Object.create(null);
  CHANTIERS.forEach((item, index) => {
    const row = make('div', 'points-v2-e083-row');
    row.id = ROW_IDS[index];
    setData(row, 'chantier', item.code);
    const key = make('dt', 'points-v2-e083-key', `${item.code} — ${item.label}`);
    const value = make('dd', 'points-v2-e083-val');
    value.id = VALUE_IDS[index];
    setData(value, 'valeur', item.code);
    row.append(key, value);
    registry.appendChild(row);
    values[item.code] = value;
  });

  /* E083-09 : une entrée par chantier, chacune avec son ID déterministe 01..10.
     replaceChildren détache les nœuds du rendu précédent : aucun ID résiduel. */
  const idList = make('ul', 'points-v2-e083-id-list');
  idList.id = IDS['id-list'];
  ITEM_IDS.forEach((itemId, index) => {
    const entry = make('li', 'points-v2-e083-id', `${ROW_KEYS[index]} → ${ROW_IDS[index]}`);
    entry.id = itemId;
    setData(entry, 'position', String(index + 1).padStart(2, '0'));
    idList.appendChild(entry);
  });
  const idNote = make('p', 'points-v2-e083-id-note', 'Un identifiant par ligne de registre : suffixe déterministe de 01 à 10, sans nombre aléatoire ni horodatage.');

  const summary = make('p', 'points-v2-e083-summary');
  summary.id = IDS.summary;
  const check = make('p', 'points-v2-e083-check', 'Vérification structurelle : node --check src/views/points/v2/E083.js');
  check.id = IDS.check;

  panel.replaceChildren(title, lede, prefixLine, registry, idNote, idList, summary, check);

  refs = { panel, values, summary };
  paint();
}

register('E083', (ctx) => {
  try {
    install(ctx);
  } catch {
    return;
  }
});
