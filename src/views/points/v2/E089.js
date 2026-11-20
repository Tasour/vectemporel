import { register } from './registry.js';

/* Lentille E089 — passe V2, domaine I : qualité et validation.
 *
 * Thème : « tableau de vérification en fin de rapport ». La lentille V2 greffe
 * dans la vue Points V2 un tableau de vérification de second niveau, en fin de
 * .points-layout, dont les dix contrôles sont dérivés de l'état réel du DOM, de
 * la feuille injectée et du numéro de rendu — jamais de valeur codée en dur ni
 * d'aléa.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E089.md — chantiers E089-V2-01 à
 * E089-V2-10. Fichier possédé : src/views/points/v2/E089.js uniquement. Aucun
 * fichier partagé n'est modifié. La passe 1 (src/views/points/E089.js), son id
 * de feuille points-e089, sa classe points-e089-verify et ses identifiants
 * points-e089-* ne sont ni réécrits ni déplacés : le greffon V2 occupe un
 * espace de noms distinct.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Une seule feuille est injectée par ctx.css('points-v2-e089', CSS). Tous les
 * identifiants sont préfixés points-v2-e089-, uniques, avec garde d'existence
 * et réutilisation du nœud entre rendus (idempotence). Le récapitulatif est une
 * région live unique, dédupliquée, écrite seulement quand son texte change.
 *
 * Invariants : un seul register('E089', …), un seul appel à ctx.css, un seul
 * panneau par rendu ; tout le DOM est bâti avec ctx.el (jamais de balisage
 * injecté) ; zéro journalisation, zéro réseau, zéro aléa, zéro attente
 * temporisée, zéro animation par frame ; aucun vol de focus, aucune écriture
 * dans les régions produites par la vue ou par la passe 1.
 */

const CSS_ID = 'points-v2-e089';
const PANEL_ID = 'points-v2-e089-panel';
const TITLE_ID = 'points-v2-e089-title';
const SCROLL_ID = 'points-v2-e089-scroll';
const TABLE_ID = 'points-v2-e089-table';
const CAPTION_ID = 'points-v2-e089-caption';
const BODY_ID = 'points-v2-e089-body';
const LEGEND_ID = 'points-v2-e089-legend';
const CONTEXT_ID = 'points-v2-e089-context';
const SUMMARY_ID = 'points-v2-e089-summary';
const BUTTON_ID = 'points-v2-e089-refresh';
const VIEW_IDS = ['pointsv2', 'points'];

/* E089-V2-02 : liste canonique des identifiants de la lentille. Elle sert de
 * référence au contrôle d'unicité, calculé sur le DOM réel. La feuille porte
 * l'id points-v2-e089 (sans tiret final) et n'entre donc pas dans ce décompte. */
const IDS = [
  PANEL_ID, TITLE_ID, SCROLL_ID, TABLE_ID, CAPTION_ID, BODY_ID,
  LEGEND_ID, CONTEXT_ID, SUMMARY_ID, BUTTON_ID,
];

/* E089-V2-01 / 03 / 09 : une seule feuille, intégralement préfixée
 * .points-v2-e089. Les statuts sont doublés par un signe, un mot et un style de
 * bordure : jamais la couleur seule. Les cibles tactiles visent 44 px et le
 * repli 620 px conserve la lecture du tableau sans débordement. */
const CSS = `
.points-v2-e089.points-v2-e089-panel {
  box-sizing: border-box;
  margin: 20px 0 4px; padding: 14px 16px;
  border: 1px solid var(--line, #444);
  border-left: 4px solid var(--gold, #c8a24a);
  border-radius: 10px; background: rgba(255,255,255,.02);
  color: var(--ink-soft, #d8d8d8); font: inherit;
  font-size: 12px; line-height: 1.5; overflow-wrap: anywhere;
}
.points-v2-e089 .points-v2-e089-title {
  margin: 0 0 6px; color: var(--gold-bright, #e6c56a);
  font-family: var(--serif, Georgia, serif); font-size: 15px;
  font-weight: 600; letter-spacing: 0; text-transform: none;
}
.points-v2-e089 .points-v2-e089-lede { margin: 0 0 8px; color: var(--muted, #aaa); }
.points-v2-e089 .points-v2-e089-scroll { max-width: 100%; overflow-x: auto; }
.points-v2-e089 .points-v2-e089-table {
  width: 100%; border-collapse: collapse; font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.points-v2-e089 .points-v2-e089-table caption {
  padding: 0 0 8px; text-align: left; color: var(--muted, #aaa);
  font-size: 10px; line-height: 1.5;
}
.points-v2-e089 .points-v2-e089-table th,
.points-v2-e089 .points-v2-e089-table td {
  padding: 7px 9px; border-bottom: 1px solid var(--line, #444);
  text-align: left; vertical-align: top;
}
.points-v2-e089 .points-v2-e089-table thead th {
  border-bottom: 2px solid var(--line-strong, #666);
  color: var(--gold-bright, #e6c56a); font-weight: 600;
}
.points-v2-e089 .points-v2-e089-table tbody th { width: 42%; font-weight: 500; }
.points-v2-e089 .points-v2-e089-table td[data-v2-e089-status="pass"] {
  border-left: 3px solid #2e7d32; white-space: nowrap;
}
.points-v2-e089 .points-v2-e089-table td[data-v2-e089-status="fail"] {
  border-left: 3px dashed #b00020; white-space: nowrap;
}
.points-v2-e089 .points-v2-e089-legend {
  display: flex; flex-wrap: wrap; gap: 8px 16px;
  margin: 10px 0 0; padding: 0; list-style: none;
  color: var(--muted, #aaa); font-size: 10px;
}
.points-v2-e089 .points-v2-e089-legend li { display: flex; gap: 6px; align-items: baseline; }
.points-v2-e089 .points-v2-e089-legend [data-v2-e089-status="pass"] {
  border-left: 3px solid #2e7d32; padding-left: 6px;
  color: var(--gold-bright, #e6c56a); font-weight: 600;
}
.points-v2-e089 .points-v2-e089-legend [data-v2-e089-status="fail"] {
  border-left: 3px dashed #b00020; padding-left: 6px;
  color: var(--ink-soft, #d8d8d8); font-weight: 600;
}
.points-v2-e089 .points-v2-e089-context,
.points-v2-e089 .points-v2-e089-summary { margin: 8px 0 0; font-size: 10px; }
.points-v2-e089 .points-v2-e089-context { color: var(--muted-2, #999); }
.points-v2-e089 .points-v2-e089-summary { color: var(--gold-bright, #e6c56a); font-weight: 600; }
.points-v2-e089 .points-v2-e089-actions { display: flex; margin-top: 10px; }
.points-v2-e089 .points-v2-e089-refresh {
  min-height: 44px; min-width: 44px; padding: 10px 16px;
  border: 1px solid var(--line-strong, #666); border-radius: 8px;
  background: transparent; color: var(--gold-bright, #e6c56a);
  font: inherit; font-size: 11px; cursor: pointer;
}
.points-v2-e089 .points-v2-e089-refresh:focus-visible {
  outline: 3px solid var(--gold-bright, #e6c56a); outline-offset: 3px;
}
@media (max-width: 620px) {
  .points-v2-e089.points-v2-e089-panel { padding: 10px; font-size: 11px; }
  .points-v2-e089 .points-v2-e089-table { font-size: 10px; }
  .points-v2-e089 .points-v2-e089-table th,
  .points-v2-e089 .points-v2-e089-table td { padding: 5px 6px; }
  .points-v2-e089 .points-v2-e089-table tbody th { width: 50%; }
}
@media (prefers-reduced-motion: reduce) {
  .points-v2-e089.points-v2-e089-panel,
  .points-v2-e089 .points-v2-e089-panel * {
    transition: none !important; animation: none !important;
  }
}
@media (prefers-contrast: more) {
  .points-v2-e089 .points-v2-e089-table th,
  .points-v2-e089 .points-v2-e089-table td { border-bottom-width: 2px; }
}
@media (forced-colors: active) {
  .points-v2-e089.points-v2-e089-panel,
  .points-v2-e089 .points-v2-e089-table th,
  .points-v2-e089 .points-v2-e089-table td {
    border-color: CanvasText; background: Canvas; color: CanvasText;
  }
  .points-v2-e089 .points-v2-e089-title,
  .points-v2-e089 .points-v2-e089-summary,
  .points-v2-e089 .points-v2-e089-refresh,
  .points-v2-e089 .points-v2-e089-legend [data-v2-e089-status] { color: CanvasText; }
}
@media print {
  .points-v2-e089 .points-v2-e089-refresh { display: none; }
  .points-v2-e089 .points-v2-e089-table tr { break-inside: avoid; }
}
`;

/* E089-V2-06 / 10 : les rendus successifs partagent le même module. Ce
 * compteur est une donnée de contexte affichée, pas un aléa ni une attente. */
let renderCount = 0;

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

/* E089-V2-10 : garde d'existence. Un nœud déjà présent est réutilisé et déplacé
 * dans le parent courant : la coque reconstruisant le stage, un nœud du rendu
 * précédent est détaché et n'est pas retrouvé ici — un neuf est créé. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E089-V2-04 : écriture dédupliquée dans la région live unique. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function reduced(ctx) {
  return typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
}

/* E089-V2-01 à E089-V2-10 : chaque contrôle est évalué contre l'état observable
 * du DOM, de la feuille injectée ou du nombre de rendus. Aucun résultat n'est
 * préécrit, aucune donnée du point n'est fabriquée. */
function buildChecks(refs, viewId, renders) {
  return [
    {
      id: 'E089-V2-01',
      label: 'Tableau de vérification unique et sémantique, en fin de vue',
      test() {
        const tables = document.querySelectorAll('#' + TABLE_ID);
        const caption = refs.table.querySelector('caption');
        const ok = tables.length === 1 && Boolean(caption);
        return {
          ok,
          detail: tables.length + ' tableau(x) de vérification ; légende '
            + (caption ? 'présente' : 'absente') + '.',
        };
      },
    },
    {
      id: 'E089-V2-02',
      label: 'IDs préfixés points-v2-e089- uniques, sans doublon',
      test() {
        const nodes = document.querySelectorAll('[id^="points-v2-e089-"]');
        const vus = new Set();
        let doublons = 0;
        nodes.forEach((node) => {
          if (vus.has(node.id)) doublons += 1;
          vus.add(node.id);
        });
        const ok = doublons === 0 && nodes.length === IDS.length;
        return {
          ok,
          detail: nodes.length + ' ID(s) préfixé(s), ' + doublons
            + ' doublon(s) ; ' + IDS.length + ' attendu(s).',
        };
      },
    },
    {
      id: 'E089-V2-03',
      label: 'Statut en toutes lettres doublé d’un signe',
      test() {
        const marques = refs.legend.querySelectorAll('[data-v2-e089-status]');
        let conformes = 0;
        marques.forEach((node) => {
          const texte = node.textContent || '';
          if ((texte.includes('✓') || texte.includes('✕'))
              && (texte.includes('PASS') || texte.includes('ÉCHEC'))) conformes += 1;
        });
        const ok = marques.length === 2 && conformes === 2;
        return {
          ok,
          detail: conformes + ' statut(s) sur ' + marques.length + ' avec signe et libellé.',
        };
      },
    },
    {
      id: 'E089-V2-04',
      label: 'Région live unique pour le récapitulatif',
      test() {
        const live = refs.panel.querySelectorAll('[aria-live]');
        const ok = live.length === 1 && refs.summary.getAttribute('role') === 'status';
        return {
          ok,
          detail: live.length + ' région(s) aria-live dans le panneau ; rôle '
            + (refs.summary.getAttribute('role') || 'absent') + '.',
        };
      },
    },
    {
      id: 'E089-V2-05',
      label: 'Légende des statuts définie à la première occurrence',
      test() {
        const items = refs.legend.children;
        const texte = refs.legend.textContent || '';
        const mots = texte.includes('PASS') && texte.includes('ÉCHEC');
        const ok = items.length === 2 && mots;
        return {
          ok,
          detail: items.length + ' entrée(s) de légende ; PASS et ÉCHEC '
            + (mots ? 'présents' : 'manquants') + '.',
        };
      },
    },
    {
      id: 'E089-V2-06',
      label: 'Contexte affiché : vue et numéro de rendu, sans aléa',
      test() {
        const texte = refs.context.textContent || '';
        const ok = texte.includes(viewId) && texte.includes('rendu n°' + renders);
        return { ok, detail: 'Contexte : ' + (texte.trim() || 'vide') };
      },
    },
    {
      id: 'E089-V2-07',
      label: 'Commande de relance explicite, accessible et sans attente',
      test() {
        const boutons = document.querySelectorAll('#' + BUTTON_ID);
        const type = refs.button.getAttribute('type');
        const libelle = refs.button.getAttribute('aria-label') || '';
        const ok = boutons.length === 1 && refs.button.tagName === 'BUTTON'
          && type === 'button' && libelle.length > 0;
        return {
          ok,
          detail: boutons.length + ' commande(s), type ' + (type || 'absent')
            + ', libellé ' + (libelle ? 'présent' : 'absent') + '.',
        };
      },
    },
    {
      id: 'E089-V2-08',
      label: 'En-têtes de colonne porteurs d’une portée explicite',
      test() {
        const tetes = refs.table.querySelectorAll('thead th[scope="col"]');
        const ok = tetes.length === 3;
        return {
          ok,
          detail: tetes.length + ' en-tête(s) avec scope="col" sur 3 attendus.',
        };
      },
    },
    {
      id: 'E089-V2-09',
      label: 'Replis mouvement réduit et couleurs forcées présents',
      test() {
        const feuille = document.getElementById(CSS_ID);
        const css = feuille ? feuille.textContent || '' : '';
        const replis = css.includes('prefers-reduced-motion') && css.includes('forced-colors');
        const etat = refs.panel.getAttribute('data-v2-e089-reduced') === (refs.reduced ? '1' : '0');
        const ok = replis && etat;
        return {
          ok,
          detail: 'Feuille ' + (feuille ? 'trouvée' : 'absente')
            + ' ; replis ' + (replis ? 'présents' : 'manquants')
            + ' ; mouvement réduit ' + (refs.reduced ? 'oui' : 'non') + '.',
        };
      },
    },
    {
      id: 'E089-V2-10',
      label: 'Idempotence multi-rendus du greffon',
      test() {
        const panneaux = document.querySelectorAll('#' + PANEL_ID);
        const feuilles = document.querySelectorAll('#' + CSS_ID);
        const ok = panneaux.length === 1 && feuilles.length === 1 && renders >= 1;
        return {
          ok,
          detail: panneaux.length + ' panneau(x), ' + feuilles.length
            + ' feuille(s), rendu n°' + renders + '.',
        };
      },
    },
  ];
}

/* E089-V2-03 / 04 : rafraîchissement synchrone, sans attente. Les cellules ne
 * sont réécrites que si leur texte ou leur état diffère réellement. */
function refresh(refs, viewId) {
  if (!refs.panel || !refs.panel.isConnected) return;
  const controles = buildChecks(refs, viewId, renderCount);
  let conformes = 0;

  controles.forEach((controle, index) => {
    const resultat = controle.test();
    if (resultat.ok) conformes += 1;
    const cellules = refs.rows[index];
    if (!cellules) return;
    const etat = resultat.ok ? 'pass' : 'fail';
    write(cellules.statut, resultat.ok ? '✓ PASS' : '✕ ÉCHEC');
    write(cellules.preuve, resultat.detail);
    if (cellules.statut.getAttribute('data-v2-e089-status') !== etat) {
      cellules.statut.setAttribute('data-v2-e089-status', etat);
    }
  });

  const total = controles.length;
  write(
    refs.summary,
    'Vérification : ' + conformes + ' contrôle(s) conforme(s) sur ' + total
      + ' — dernier lancement au rendu n°' + renderCount + '.'
  );
  refs.panel.setAttribute('data-v2-e089-result', conformes + '/' + total);
  refs.panel.setAttribute('data-v2-e089-renders', String(renderCount));
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || VIEW_IDS.indexOf(ctx.viewId) === -1) return;

  const host = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(host)) return;

  renderCount += 1;
  ctx.css(CSS_ID, CSS);

  const panel = ensureNode(make, PANEL_ID, 'section',
    'points-v2-e089 points-v2-e089-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h3', 'points-v2-e089-title', 'Tableau de vérification — Points V2');
  title.id = TITLE_ID;

  const lede = make('p', 'points-v2-e089-lede',
    'Dix contrôles relus sur l’état réel du DOM, de la feuille injectée et du numéro de rendu. Ce tableau de second niveau décrit la vue : il ne modifie ni les filtres, ni le détail, ni le tableau de la passe 1.');

  const scroll = ensureNode(make, SCROLL_ID, 'div', 'points-v2-e089-scroll', panel);
  const table = ensureNode(make, TABLE_ID, 'table', 'points-v2-e089-table', scroll);

  const caption = make('caption', 'points-v2-e089-caption',
    'Contrôles de qualité de la lentille E089 V2 — chaque statut est dérivé d’une observation, jamais codé en dur.');
  caption.id = CAPTION_ID;

  const head = make('thead', 'points-v2-e089-head');
  const headRow = make('tr', 'points-v2-e089-head-row');
  ['Contrôle', 'Statut', 'Preuve observée'].forEach((libelle) => {
    const th = make('th', 'points-v2-e089-col', libelle);
    th.setAttribute('scope', 'col');
    headRow.appendChild(th);
  });
  head.appendChild(headRow);

  const body = make('tbody', 'points-v2-e089-body');
  body.id = BODY_ID;
  const rows = [];
  buildChecks({ table }, ctx.viewId, renderCount).forEach((controle) => {
    const tr = make('tr', 'points-v2-e089-row');
    const th = make('th', 'points-v2-e089-row-label',
      controle.id + ' — ' + controle.label);
    th.setAttribute('scope', 'row');
    const statut = make('td', 'points-v2-e089-status');
    const preuve = make('td', 'points-v2-e089-proof');
    tr.append(th, statut, preuve);
    body.appendChild(tr);
    rows.push({ statut, preuve });
  });

  table.replaceChildren(caption, head, body);

  const legend = ensureNode(make, LEGEND_ID, 'ul', 'points-v2-e089-legend', panel);
  const legendPass = make('li', 'points-v2-e089-legend-item');
  const passMark = make('span', 'points-v2-e089-mark',
    '✓ PASS — contrôle observé conforme.');
  passMark.setAttribute('data-v2-e089-status', 'pass');
  const legendFail = make('li', 'points-v2-e089-legend-item');
  const failMark = make('span', 'points-v2-e089-mark',
    '✕ ÉCHEC — contrôle non conforme.');
  failMark.setAttribute('data-v2-e089-status', 'fail');
  legendPass.appendChild(passMark);
  legendFail.appendChild(failMark);
  legend.replaceChildren(legendPass, legendFail);

  const context = ensureNode(make, CONTEXT_ID, 'p', 'points-v2-e089-context', panel);
  write(context, 'Contexte : vue ' + ctx.viewId + ' · rendu n°' + renderCount
    + ' · mouvement réduit : ' + (reduced(ctx) ? 'oui' : 'non') + '.');

  const summary = ensureNode(make, SUMMARY_ID, 'p', 'points-v2-e089-summary', panel);
  summary.setAttribute('role', 'status');
  summary.setAttribute('aria-live', 'polite');

  const actions = make('div', 'points-v2-e089-actions');
  const button = ensureNode(make, BUTTON_ID, 'button', 'points-v2-e089-refresh', actions);
  button.setAttribute('type', 'button');
  button.setAttribute('aria-label', 'Relancer la vérification de la vue Points V2');
  button.textContent = 'Relancer la vérification';

  panel.replaceChildren(title, lede, scroll, legend, context, summary, actions);

  const refs = {
    panel, table, legend, context, summary, button, rows, reduced: reduced(ctx),
  };
  panel.setAttribute('data-v2-e089-reduced', refs.reduced ? '1' : '0');

  if (button.getAttribute('data-v2-e089-bound') !== '1') {
    button.addEventListener('click', () => { refresh(refs, ctx.viewId); });
    button.setAttribute('data-v2-e089-bound', '1');
  }

  refresh(refs, ctx.viewId);
}

register('E089', (ctx) => {
  try { install(ctx); }
  catch { return; }
});
