import { register } from './registry.js';

/* Lentille E089 — passe V2, domaine I : qualité et validation.
 *
 * Thème : « tableau de vérification en fin de rapport ». La lentille greffe
 * dans la vue Chronologie V2 un tableau de vérification autonome, en fin de
 * colonne, dont les dix contrôles sont dérivés de l'état réel du DOM et du
 * nombre de rendus — jamais de valeurs codées en dur ni d'aléa.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E089.md — chantiers
 * E089-01 à E089-10. Fichier possédé : src/views/chronology/v2/E089.js
 * uniquement. Aucun fichier partagé n'est modifié.
 *
 * Contrat exploité : ctx = { viewId, stage, layout } ; helpers ctx.css(id,
 * règles), ctx.el(balise, classe, texte), ctx.reducedMotion(). Le registre
 * V2 ne fournit pas de say() : le récapitulatif est une région live unique,
 * dédupliquée, écrite seulement quand son texte change.
 *
 * Invariants :
 * - un seul register('E089', install), un seul ctx.css('chronology-v2-e089', …) ;
 * - tous les IDs sont préfixés chronology-v2-e089-, uniques, avec garde
 *   d'existence et réutilisation du nœud entre rendus (idempotence) ;
 * - zéro console.*, fetch/XHR, Math.random, innerHTML, timer, rAF ;
 * - zéro écriture dans les régions live existantes, zéro vol de focus.
 */

const CSS_ID = 'chronology-v2-e089';
const PANEL_ID = 'chronology-v2-e089-panel';
const TITLE_ID = 'chronology-v2-e089-title';
const SCROLL_ID = 'chronology-v2-e089-scroll';
const TABLE_ID = 'chronology-v2-e089-table';
const CAPTION_ID = 'chronology-v2-e089-caption';
const BODY_ID = 'chronology-v2-e089-body';
const LEGEND_ID = 'chronology-v2-e089-legend';
const CONTEXT_ID = 'chronology-v2-e089-context';
const SUMMARY_ID = 'chronology-v2-e089-summary';
const BUTTON_ID = 'chronology-v2-e089-refresh';

/* E089-02 : liste canonique des IDs appartenant à la lentille. Elle sert de
   référence au contrôle d'unicité, calculé sur le DOM réel. */
const IDS = [
  PANEL_ID, TITLE_ID, SCROLL_ID, TABLE_ID, CAPTION_ID, BODY_ID,
  LEGEND_ID, CONTEXT_ID, SUMMARY_ID, BUTTON_ID,
];

/* E089-01, E089-03, E089-08, E089-09 : une seule feuille CSS. Les statuts
   sont doublés par un signe, un mot et un style de bordure : jamais la couleur
   seule. Les cibles tactiles visent 44 px et le repli 620 px conserve la
   lecture du tableau sans débordement. */
const CSS = `
  #${PANEL_ID} {
    margin: 20px 0 4px; padding: 14px 16px;
    border: 1px solid var(--line, #444);
    border-left: 4px solid var(--gold, #c8a24a);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft, #d8d8d8); font: inherit;
    font-size: 12px; line-height: 1.5; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e089-title {
    margin: 0 0 6px; color: var(--gold-bright, #e6c56a);
    font-family: var(--serif, Georgia, serif); font-size: 15px;
    font-weight: 600; letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e089-lede { margin: 0 0 8px; color: var(--muted, #aaa); }
  #${SCROLL_ID} { max-width: 100%; overflow-x: auto; }
  #${TABLE_ID} { width: 100%; border-collapse: collapse; font-size: 11px; }
  #${TABLE_ID} caption {
    padding: 0 0 8px; text-align: left; color: var(--muted, #aaa);
    font-size: 10px; line-height: 1.5;
  }
  #${TABLE_ID} th, #${TABLE_ID} td {
    padding: 7px 9px; border-bottom: 1px solid var(--line, #444);
    text-align: left; vertical-align: top;
  }
  #${TABLE_ID} thead th {
    border-bottom: 2px solid var(--line-strong, #666);
    color: var(--gold-bright, #e6c56a); font-weight: 600;
  }
  #${TABLE_ID} tbody th { width: 42%; font-weight: 500; }
  #${TABLE_ID} td[data-e089-status="pass"] {
    border-left: 3px solid #2e7d32; white-space: nowrap;
  }
  #${TABLE_ID} td[data-e089-status="fail"] {
    border-left: 3px dashed #b00020; white-space: nowrap;
  }
  #${LEGEND_ID} {
    display: flex; flex-wrap: wrap; gap: 8px 16px;
    margin: 10px 0 0; padding: 0; list-style: none;
    color: var(--muted, #aaa); font-size: 10px;
  }
  #${LEGEND_ID} li { display: flex; gap: 6px; align-items: baseline; }
  #${LEGEND_ID} [data-e089-status="pass"] {
    border-left: 3px solid #2e7d32; padding-left: 6px;
    color: var(--gold-bright, #e6c56a); font-weight: 600;
  }
  #${LEGEND_ID} [data-e089-status="fail"] {
    border-left: 3px dashed #b00020; padding-left: 6px;
    color: var(--ink-soft, #d8d8d8); font-weight: 600;
  }
  #${CONTEXT_ID}, #${SUMMARY_ID} { margin: 8px 0 0; font-size: 10px; }
  #${CONTEXT_ID} { color: var(--muted-2, #999); }
  #${SUMMARY_ID} { color: var(--gold-bright, #e6c56a); font-weight: 600; }
  #${PANEL_ID} .e089-actions { display: flex; margin-top: 10px; }
  #${BUTTON_ID} {
    min-height: 44px; min-width: 44px; padding: 10px 16px;
    border: 1px solid var(--line-strong, #666); border-radius: 8px;
    background: transparent; color: var(--gold-bright, #e6c56a);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  #${BUTTON_ID}:focus-visible {
    outline: 3px solid var(--gold-bright, #e6c56a); outline-offset: 3px;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 10px; font-size: 11px; }
    #${TABLE_ID} { font-size: 10px; }
    #${TABLE_ID} th, #${TABLE_ID} td { padding: 5px 6px; }
    #${TABLE_ID} tbody th { width: 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (prefers-contrast: more) {
    #${TABLE_ID} th, #${TABLE_ID} td { border-bottom-width: 2px; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${TABLE_ID} th, #${TABLE_ID} td {
      border-color: CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e089-title, #${SUMMARY_ID}, #${BUTTON_ID},
    #${LEGEND_ID} [data-e089-status] { color: CanvasText; }
  }
  @media print {
    #${BUTTON_ID} { display: none; }
    #${TABLE_ID} tr { break-inside: avoid; }
  }
`;

/* E089-10 : les rendus successifs partagent le même module. Ce compteur est
   une donnée de contexte affichée, pas un aléa ni un timer. */
let renderCount = 0;

/* E089-10 : garde d'existence. Un nœud déjà présent est réutilisé et déplacé
   dans le parent courant : la coque reconstruisant le stage, un nœud de la
   rendu précédent est détaché et n'est pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E089-04 : écriture dédupliquée dans la région live unique. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E089-01 à E089-10 : chaque contrôle est évalué contre l'état observable du
   DOM, du CSS injecté ou du nombre de rendus. Aucun résultat n'est préécrit. */
function buildChecks(refs, viewId, renders) {
  return [
    {
      id: 'E089-01',
      label: 'Tableau de vérification unique et sémantique',
      test() {
        const tables = document.querySelectorAll(`#${TABLE_ID}`);
        const legend = refs.table.querySelector('caption');
        const ok = tables.length === 1 && Boolean(legend);
        return {
          ok,
          detail: `${tables.length} tableau(x) de vérification ; légende ${legend ? 'présente' : 'absente'}.`,
        };
      },
    },
    {
      id: 'E089-02',
      label: 'IDs préfixés uniques (aucun doublon)',
      test() {
        const nodes = document.querySelectorAll('[id^="chronology-v2-e089-"]');
        const vus = new Set();
        let doublons = 0;
        nodes.forEach((node) => {
          if (vus.has(node.id)) doublons += 1;
          vus.add(node.id);
        });
        const ok = doublons === 0 && nodes.length === IDS.length;
        return {
          ok,
          detail: `${nodes.length} ID(s) préfixé(s), ${doublons} doublon(s) ; ${IDS.length} attendu(s).`,
        };
      },
    },
    {
      id: 'E089-03',
      label: 'Statut écrit en toutes lettres et doublé d’un signe',
      test() {
        const marques = refs.legend.querySelectorAll('[data-e089-status]');
        let conformes = 0;
        marques.forEach((node) => {
          const texte = node.textContent || '';
          if ((texte.includes('✓') || texte.includes('✕')) &&
              (texte.includes('PASS') || texte.includes('ÉCHEC'))) conformes += 1;
        });
        const ok = marques.length === 2 && conformes === 2;
        return {
          ok,
          detail: `${conformes} statut(s) sur ${marques.length} avec signe et libellé.`,
        };
      },
    },
    {
      id: 'E089-04',
      label: 'Région live unique pour le récapitulatif',
      test() {
        const live = refs.panel.querySelectorAll('[aria-live]');
        const ok = live.length === 1 && refs.summary.getAttribute('role') === 'status';
        return {
          ok,
          detail: `${live.length} région(s) aria-live dans le panneau ; rôle ${refs.summary.getAttribute('role') || 'absent'}.`,
        };
      },
    },
    {
      id: 'E089-05',
      label: 'Légende des statuts définie à la première occurrence',
      test() {
        const items = refs.legend.children;
        const texte = refs.legend.textContent || '';
        const ok = items.length === 2 && texte.includes('PASS') && texte.includes('ÉCHEC');
        return {
          ok,
          detail: `${items.length} entrée(s) de légende ; PASS et ÉCHEC ${texte.includes('PASS') && texte.includes('ÉCHEC') ? 'présents' : 'manquants'}.`,
        };
      },
    },
    {
      id: 'E089-06',
      label: 'Contexte affiché (vue et numéro de rendu)',
      test() {
        const texte = refs.context.textContent || '';
        const ok = texte.includes(viewId) && texte.includes(`rendu n°${renders}`);
        return {
          ok,
          detail: `Contexte : ${texte.trim() || 'vide'}`,
        };
      },
    },
    {
      id: 'E089-07',
      label: 'Commande de relance explicite et accessible',
      test() {
        const boutons = document.querySelectorAll(`#${BUTTON_ID}`);
        const type = refs.button.getAttribute('type');
        const libelle = refs.button.getAttribute('aria-label') || '';
        const ok = boutons.length === 1 && refs.button.tagName === 'BUTTON' &&
          type === 'button' && libelle.length > 0;
        return {
          ok,
          detail: `${boutons.length} commande(s), type ${type || 'absent'}, libellé ${libelle ? 'présent' : 'absent'}.`,
        };
      },
    },
    {
      id: 'E089-08',
      label: 'En-têtes de colonne porteurs d’une portée explicite',
      test() {
        const tetes = refs.table.querySelectorAll('thead th[scope="col"]');
        const ok = tetes.length === 3;
        return {
          ok,
          detail: `${tetes.length} en-tête(s) avec scope="col" sur 3 attendus.`,
        };
      },
    },
    {
      id: 'E089-09',
      label: 'Replis mouvement réduit et couleurs forcées présents',
      test() {
        const feuille = document.getElementById(CSS_ID);
        const css = feuille ? feuille.textContent || '' : '';
        const ok = css.includes('prefers-reduced-motion') &&
          css.includes('forced-colors') &&
          refs.panel.dataset.e089Reduced === (refs.reduced ? '1' : '0');
        return {
          ok,
          detail: `Feuille ${feuille ? 'trouvée' : 'absente'} ; mouvement réduit ${refs.reduced ? 'oui' : 'non'}.`,
        };
      },
    },
    {
      id: 'E089-10',
      label: 'Idempotence multi-rendus du greffon',
      test() {
        const panneaux = document.querySelectorAll(`#${PANEL_ID}`);
        const feuilles = document.querySelectorAll(`#${CSS_ID}`);
        const ok = panneaux.length === 1 && feuilles.length === 1 && renders >= 1;
        return {
          ok,
          detail: `${panneaux.length} panneau(x), ${feuilles.length} feuille(s), rendu n°${renders}.`,
        };
      },
    },
  ];
}

/* E089-03, E089-04 : rafraîchissement synchrone, sans timer. Les cellules ne
   sont réécrites que si leur texte ou leur état diffère. */
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
    const statut = resultat.ok ? '✓ PASS' : '✕ ÉCHEC';
    write(cellules.statut, statut);
    write(cellules.preuve, resultat.detail);
    if (cellules.statut.dataset.e089Status !== etat) {
      cellules.statut.dataset.e089Status = etat;
    }
  });

  const total = controles.length;
  write(
    refs.summary,
    `Vérification : ${conformes} contrôle(s) conforme(s) sur ${total} — dernier lancement au rendu n°${renderCount}.`
  );
  refs.panel.dataset.e089Result = `${conformes}/${total}`;
  refs.panel.dataset.e089Renders = String(renderCount);
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  renderCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e089-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e089-title', 'Tableau de vérification — Chronologie V2');
  title.id = TITLE_ID;

  const lede = make('p', 'e089-lede', 'Dix contrôles relus sur l’état réel du DOM et de la feuille de style. Ce tableau décrit la vue, il ne modifie ni le routeur ni les données affichées.');

  const scroll = ensureNode(make, SCROLL_ID, 'div', 'e089-scroll', panel);
  const table = ensureNode(make, TABLE_ID, 'table', 'e089-table', scroll);

  const caption = make('caption', 'e089-caption', 'Contrôles de qualité de la lentille E089 — chaque statut est dérivé d’une observation, jamais codé en dur.');
  caption.id = CAPTION_ID;

  const head = make('thead', 'e089-head');
  const headRow = make('tr', 'e089-head-row');
  ['Contrôle', 'Statut', 'Preuve observée'].forEach((libelle) => {
    const th = make('th', 'e089-col', libelle);
    th.setAttribute('scope', 'col');
    headRow.appendChild(th);
  });
  head.appendChild(headRow);

  const body = make('tbody', 'e089-body');
  body.id = BODY_ID;
  const rows = [];
  const controles = buildChecks({ table }, ctx.viewId, renderCount);
  controles.forEach((controle) => {
    const tr = make('tr', 'e089-row');
    const th = make('th', 'e089-row-label', `${controle.id} — ${controle.label}`);
    th.setAttribute('scope', 'row');
    const statut = make('td', 'e089-status');
    const preuve = make('td', 'e089-proof');
    tr.append(th, statut, preuve);
    body.appendChild(tr);
    rows.push({ statut, preuve });
  });

  table.replaceChildren(caption, head, body);

  const legend = ensureNode(make, LEGEND_ID, 'ul', 'e089-legend', panel);
  const legendPass = make('li', 'e089-legend-item');
  const passMark = make('span', 'e089-mark', '✓ PASS — contrôle observé conforme.');
  passMark.dataset.e089Status = 'pass';
  const legendFail = make('li', 'e089-legend-item');
  const failMark = make('span', 'e089-mark', '✕ ÉCHEC — contrôle non conforme.');
  failMark.dataset.e089Status = 'fail';
  legendPass.appendChild(passMark);
  legendFail.appendChild(failMark);
  legend.replaceChildren(legendPass, legendFail);

  const context = ensureNode(make, CONTEXT_ID, 'p', 'e089-context', panel);
  write(context, `Contexte : vue ${ctx.viewId} · rendu n°${renderCount} · mouvement réduit : ${refsReduced(ctx) ? 'oui' : 'non'}.`);

  const summary = ensureNode(make, SUMMARY_ID, 'p', 'e089-summary', panel);
  summary.setAttribute('role', 'status');
  summary.setAttribute('aria-live', 'polite');

  const actions = make('div', 'e089-actions');
  const button = ensureNode(make, BUTTON_ID, 'button', 'e089-refresh', actions);
  button.setAttribute('type', 'button');
  button.setAttribute('aria-label', 'Relancer la vérification de la vue Chronologie V2');
  button.textContent = 'Relancer la vérification';

  panel.replaceChildren(title, lede, scroll, legend, context, summary, actions);

  const reduced = refsReduced(ctx);
  const refs = {
    panel, table, legend, context, summary, button, rows, reduced,
  };
  panel.dataset.e089Reduced = reduced ? '1' : '0';

  if (button.dataset.e089Bound !== '1') {
    button.addEventListener('click', () => {
      refresh(refs, ctx.viewId);
    });
    button.dataset.e089Bound = '1';
  }

  refresh(refs, ctx.viewId);
}

function refsReduced(ctx) {
  return typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
}

register('E089', install);
