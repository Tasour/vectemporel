import { register } from './registry.js';

/* Lentille E082 — passe V2, domaine I (Qualité & validation).
 * Thème : « zéro journalisation, zéro requête réseau » — garanties de propreté de la
 * vue Chronologie, déclinées en dix chantiers complémentaires et disjoints
 * (E082-01 à E082-10), chacun avec une trace DOM/CSS observable.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E082.md.
 * Fichier possédé : src/views/chronology/v2/E082.js uniquement. Aucun
 * fichier partagé (registry.js, index.js, styles.css, chronology.js) n'est
 * modifié ; aucune autre lentille n'est touchée.
 *
 * Invariants du module :
 * - exactement un register('E082', ctx => …) et une feuille CSS unique ;
 * - aucun appel de journalisation, aucune requête réseau, aucun chargement
 *   de code ou de ressource distant, aucune évaluation dynamique ;
 * - aucun aléa, aucun HTML brut, aucun timer ni boucle d'animation ;
 * - IDs tous préfixés chronology-v2-e082- avec garde d'existence ;
 * - zéro écouteur global, zéro mutation d'un nœud hors de notre panneau.
 *
 * Le panneau est un bloc en flux normal en fin de colonne : il n'ajoute
 * aucun arrêt de tabulation, ne masque ni la frise ni la fiche, n'écrit dans
 * aucune région live et n'intercepte aucun événement du routeur.
 */

const CSS_ID = 'chronology-v2-e082';
const PANEL_ID = 'chronology-v2-e082-certificat';
const TITLE_ID = 'chronology-v2-e082-titre';
const LIST_ID = 'chronology-v2-e082-list';
const SUMMARY_ID = 'chronology-v2-e082-resume';
const MAIN_ID = 'atlas-chrono-main';
const PREFIX = 'chronology-v2-e082-';

/* Une seule feuille, injectée une fois par ctx.css. Le panneau reste lisible
 * en 390×844, sous mouvement réduit et en couleurs forcées. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e082-title {
    margin: 0 0 5px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e082-lede { margin: 0 0 8px; color: var(--muted); }
  #${LIST_ID} { margin: 0; padding: 0; list-style: none; }
  #${LIST_ID} .e082-row {
    display: flex; flex-wrap: wrap; gap: 2px 8px;
    padding: 3px 0; border-top: 1px solid var(--line);
  }
  #${LIST_ID} .e082-code {
    flex: 0 0 58px; color: var(--gold-bright); font-size: 9px;
  }
  #${LIST_ID} .e082-label { flex: 1 1 190px; min-width: 0; }
  #${LIST_ID} .e082-state {
    flex: 0 0 auto; padding: 0 6px; border-radius: 4px;
    border: 1px solid var(--line-strong); color: var(--ink-soft);
    font-size: 9px; text-transform: uppercase;
  }
  #${LIST_ID} .e082-row[data-e082-state="conforme"] .e082-state {
    border-color: var(--gold); color: var(--gold-bright);
  }
  #${LIST_ID} .e082-row[data-e082-state="absent"] .e082-state {
    border-color: var(--line-strong); color: var(--muted);
  }
  #${SUMMARY_ID} {
    margin: 8px 0 0; padding-top: 6px; border-top: 1px solid var(--line);
    color: var(--muted-2); font-size: 9px;
  }
  @media (max-width: 620px) {
    #${LIST_ID} .e082-code { flex-basis: 100%; }
    #${LIST_ID} .e082-label { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e082-title, #${LIST_ID} .e082-code,
    #${LIST_ID} .e082-state { color: CanvasText; border-color: CanvasText; }
  }
`;

/* Dix chantiers disjoints. Les verbes « absent » désignent une garantie
 * structurelle du module (aucun appel), « conforme » une vérification DOM
 * réellement exécutée ci-dessous. Les libellés évitent volontairement les
 * séquences de code interdites pour que le module reste autonome. */
const ROWS = [
  { key: '01', label: 'Journalisation : aucun message émis.', mode: 'absent' },
  { key: '02', label: 'Réseau : aucune requête de données.', mode: 'absent' },
  { key: '03', label: 'Réseau : aucun objet XHR instancié.', mode: 'absent' },
  { key: '04', label: 'Code : aucun import distant ni évaluation dynamique.', mode: 'absent' },
  { key: '05', label: 'Ressources : aucune source distante (src, href, style).', mode: 'check' },
  { key: '06', label: 'Aléa : aucune valeur tirée au hasard.', mode: 'absent' },
  { key: '07', label: 'DOM : aucun HTML brut ni gestionnaire en ligne.', mode: 'check' },
  { key: '08', label: 'Animation : aucun timer ni boucle d’images.', mode: 'absent' },
  { key: '09', label: 'Unicité : une feuille CSS, des identifiants préfixés.', mode: 'check' },
  { key: '10', label: 'Idempotence : un seul panneau, un seul greffon.', mode: 'check' },
];

let renderCount = 0;

/* Gardes d'existence : un nœud déjà présent est réutilisé et déplacé dans le
 * parent courant (la coque reconstruisant #app, l'ancien nœud est détaché). */
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

/* Vérifications DOM réelles, sans effet de bord hors du panneau. */
function countRemoteResources(root) {
  let total = 0;
  root.querySelectorAll('[src], [href]').forEach((node) => {
    const value = node.getAttribute('src') || node.getAttribute('href') || '';
    if (/^\s*(https?:)?\/\//i.test(value)) total += 1;
  });
  return total;
}

function countInlineHandlers(root) {
  let total = 0;
  root.querySelectorAll('*').forEach((node) => {
    for (let i = 0; i < node.attributes.length; i += 1) {
      if (node.attributes[i].name.indexOf('on') === 0) total += 1;
    }
  });
  return total;
}

function countBadPrefixes(root) {
  let total = 0;
  root.querySelectorAll('[id]').forEach((node) => {
    if (node.id.indexOf(PREFIX) !== 0) total += 1;
  });
  return total;
}

function countStyleSheets() {
  let total = 0;
  document.querySelectorAll('style').forEach((node) => {
    if (node.id === CSS_ID) total += 1;
  });
  return total;
}

function countPanels() {
  let total = 0;
  document.querySelectorAll('section').forEach((node) => {
    if (node.id === PANEL_ID) total += 1;
  });
  return total;
}

/* Évalue l'état de chaque chantier et le publie en texte visible + attributs. */
function refresh(panel, rows, summary, reduced) {
  if (!panel || !panel.isConnected) return;

  const remote = countRemoteResources(panel);
  const handlers = countInlineHandlers(panel);
  const badIds = countBadPrefixes(panel);
  const sheets = countStyleSheets();
  const panels = countPanels();
  const checks = {
    '05': remote === 0,
    '07': handlers === 0,
    '09': sheets === 1 && badIds === 0,
    '10': panels === 1,
  };

  let conform = 0;
  rows.forEach((row) => {
    const state = row.mode === 'check' ? (checks[row.key] ? 'conforme' : 'echec') : 'absent';
    if (state === 'conforme') conform += 1;
    const li = panel.querySelector(`#${PREFIX}${row.key}`);
    if (!li) return;
    if (li.dataset.e082State !== state) li.dataset.e082State = state;
    const badge = li.querySelector('.e082-state');
    write(badge, state === 'conforme' ? 'conforme' : state === 'absent' ? 'absent' : 'échec');
  });

  renderCount += 1;
  write(
    summary,
    `Rendus : ${renderCount} · feuille CSS : ${sheets} · panneaux : ${panels} · `
      + `contrôles DOM : ${conform}/4 conformes · mouvement réduit : ${reduced ? 'oui' : 'non'}.`
  );
  panel.dataset.e082Renders = String(renderCount);
  panel.dataset.e082Css = String(sheets);
  panel.dataset.e082Panels = String(panels);
  panel.dataset.e082Remote = String(remote);
  panel.dataset.e082Handlers = String(handlers);
  panel.dataset.e082BadIds = String(badIds);
  panel.dataset.e082Reduced = reduced ? '1' : '0';
}

register('E082', ctx => {
  const make = ctx && ctx.el;
  if (typeof make !== 'function') return;

  ctx.css('chronology-v2-e082', CSS);

  const host = document.getElementById(MAIN_ID) || (ctx && ctx.layout);
  if (!host) return;

  const panel = ensureNode(make, PANEL_ID, 'section', 'e082-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e082-title', 'Contrat de propreté de la vue');
  title.id = TITLE_ID;
  const lede = make(
    'p',
    'e082-lede',
    'Dix garanties de qualité : aucune journalisation, aucune requête réseau, aucun code ni style distant. Ce panneau décrit et vérifie, il n’ajoute aucun comportement.'
  );

  const list = make('ul', 'e082-list');
  list.id = LIST_ID;
  const built = ROWS.map((row) => {
    const li = make('li', 'e082-row');
    li.id = `${PREFIX}${row.key}`;
    li.append(
      make('span', 'e082-code', `E082-${row.key}`),
      make('span', 'e082-label', row.label),
      make('span', 'e082-state', row.mode === 'check' ? 'à vérifier' : 'absent')
    );
    return li;
  });
  list.replaceChildren(...built);

  const summary = make('p', 'e082-resume');
  summary.id = SUMMARY_ID;

  panel.replaceChildren(title, lede, list, summary);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refresh(panel, ROWS, summary, reduced);
});
