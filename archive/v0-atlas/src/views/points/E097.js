import { register } from './registry.js';

/* Lentille E097 — Pédagogie & narration : micro-tutoriel de lecture de la matrice
 * (domaine J : théorie & transmission). Rapport : UNIFIED_AUDIT/POINTS/views/E097.md
 * — chantiers E097-01 à E097-10.
 *
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : E097 ajoute un panneau LOCAL et
 * non modal, accroché à .points-matrix, qui APPREND À LIRE la matrice (lignes =
 * ères, colonnes = domaines, cellules = croisements). Il ne fait que LIRE le DOM
 * déjà produit par la vue ; le greffon d'aide de la coque (? / #atlas-help) n'est
 * ni touché ni doublé.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ou le détail : le tutoriel reste vrai
 * avec un ctx minimal.
 *
 * Invariants :
 * - aucune structure codée en dur : ni nombre d'ères, ni nombre de domaines,
 *   ni millésime — tout est mesuré sur la grille rendue ;
 * - un seul CSS, un seul panneau, une seule région live, un seul observateur ;
 * - mise en évidence NON destructive : E097 n'ajoute que ses propres classes,
 *   retire les siennes avant chaque changement d'étape, ne touche à aucun
 *   gestionnaire natif de points.js ;
 * - non destructif et idempotent : aucun nœud périmé conservé, aucun doublon
 *   après un second passage ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e097';
const SCOPE = 'points-e097';
const PANEL_ID = 'points-e097-tutorial';
const TITLE_ID = 'points-e097-title';
const STEP_ID = 'points-e097-step';
const READOUT_ID = 'points-e097-readout';
const PROGRESS_ID = 'points-e097-progress';
const REDUCED_ATTR = 'data-e097-reduced';

/* Classes de mise en évidence, toutes préfixées : elles ne changent que le
 * rendu (contour/fond), jamais la structure ni les écouteurs de la matrice. */
const HL_ERA = 'e097-hl-era';
const HL_DOMAIN = 'e097-hl-domain';
const HL_CELL = 'e097-hl-cell';

/* Les trois temps du micro-tutoriel. Le libellé sert aussi d'annonce live. */
const STEP_LABELS = [
  'Les lignes portent les ères',
  'Les colonnes portent les domaines',
  'Les cellules croisent ère et domaine',
];

/* Toutes les règles sont préfixées par `.points-e097`, classe posée sur
 * .points-layout : aucune fuite hors de cette vue. L'information n'est jamais
 * portée par la seule couleur (contour + libellé textuel + chiffres tabulaires). */
const CSS = `
  .points-e097 .points-e097-tutorial {
    margin: 10px 0 4px; padding: 10px 12px;
    border: 1px solid var(--line-strong, #444); border-left: 3px solid var(--gold, #e6b96f);
    border-radius: 8px; background: rgba(8, 11, 16, .55);
    color: var(--ink-soft, #c9d2e0); font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }
  .points-e097 .e097-title {
    margin: 0 0 6px; font-family: var(--serif); font-size: 14px;
    color: var(--gold-bright, #f0d49a);
  }
  .points-e097 .e097-p { margin: 0 0 6px; overflow-wrap: anywhere; }
  .points-e097 .e097-step-title { margin: 0 0 4px; font-size: 12px; color: var(--gold, #e6b96f); }
  .points-e097 .e097-step-body { margin: 0 0 8px; }
  .points-e097 .e097-readout {
    margin: 0 0 6px; padding: 6px 8px;
    border: 1px solid var(--line, #333); border-radius: 6px;
    background: rgba(230, 185, 111, .06); color: var(--ink, #e8e8e8);
    transition: background-color .2s linear;
  }
  .points-e097 .e097-progress { margin: 0 0 6px; color: var(--muted-2, #9aa6b8); }
  .points-e097 .e097-nav { display: flex; gap: 6px; margin: 6px 0 0; }
  .points-e097 .e097-nav button {
    min-height: 36px; padding: 0 10px;
    border: 1px solid var(--line-strong, #444); border-radius: 6px;
    background: rgba(230, 185, 111, .08); color: var(--gold, #e6b96f);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  .points-e097 .e097-nav button:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d49a); outline-offset: 3px;
  }
  .points-e097 .e097-nav button:disabled { opacity: .45; cursor: default; }
  .points-e097 .e097-glossary { margin: 6px 0 0; }
  .points-e097 .e097-glossary summary {
    min-height: 36px; display: flex; align-items: center;
    color: var(--gold, #e6b96f); cursor: pointer;
  }
  .points-e097 .e097-glossary summary:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d49a); outline-offset: 3px;
  }
  .points-e097 .e097-glossary dl { margin: 6px 0 0; padding-left: 2px; }
  .points-e097 .e097-glossary dt { color: var(--gold-bright, #f0d49a); }
  .points-e097 .e097-glossary dd { margin: 0 0 6px; }

  /* Mises en évidence : contour + fond discret, réversibles, non destructives. */
  .points-e097 .e097-hl-era,
  .points-e097 .e097-hl-domain,
  .points-e097 .e097-hl-cell {
    outline: 2px solid var(--gold-bright, #f0d49a);
    outline-offset: -2px;
    background-color: rgba(230, 185, 111, .12);
    transition: background-color .2s linear;
  }
  .points-e097[` + REDUCED_ATTR + `="1"] .e097-readout,
  .points-e097[` + REDUCED_ATTR + `="1"] .e097-hl-era,
  .points-e097[` + REDUCED_ATTR + `="1"] .e097-hl-domain,
  .points-e097[` + REDUCED_ATTR + `="1"] .e097-hl-cell { transition: none; }
  @media (max-width: 620px) {
    .points-e097 .points-e097-tutorial { padding: 8px; font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-e097 .e097-readout,
    .points-e097 .e097-hl-era,
    .points-e097 .e097-hl-domain,
    .points-e097 .e097-hl-cell { transition: none; }
  }
  @media (forced-colors: active) {
    .points-e097 .points-e097-tutorial,
    .points-e097 .e097-readout,
    .points-e097 .e097-nav button,
    .points-e097 .e097-hl-era,
    .points-e097 .e097-hl-domain,
    .points-e097 .e097-hl-cell { border-color: CanvasText; color: CanvasText; }
  }
`;

let currentCtx = null;       // dernier ctx reçu, pour les callbacks
let observer = null;         // unique MutationObserver, ciblé sur la grille
let step = 0;                // étape courante (0..STEP_LABELS.length-1)
let lastSignature = '';      // empreinte évitant les réécritures redondantes
let readoutNode = null;      // unique région live du module
let progressNode = null;     // « Étape N sur M. »
let stepBody = null;         // contenu de l'étape (titre + paragraphes)
let prevButton = null;
let nextButton = null;
let highlighted = [];        // nœuds portant une classe de mise en évidence

function rootOf(ctx) {
  if (ctx && ctx.layout && typeof ctx.layout.querySelector === 'function') return ctx.layout;
  if (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function') return ctx.stage;
  return null;
}

function textOf(node) {
  return node ? String(node.textContent || '').trim() : '';
}

/* E097-02 : toute la structure est LUE sur la grille rendue par points.js:33-57.
 * Aucun nombre d'ères, de domaines ou de cellules n'est supposé ; le repli sur
 * un tableau vide rend un tutoriel honnête (« indisponible ») avec un ctx minimal. */
function readMatrix(root) {
  const grid = root ? root.querySelector('.points-grid') : null;
  const head = grid ? grid.querySelector('.points-grid-row.is-head') : null;
  const headCells = head ? [...head.children] : [];
  const eraButtons = grid ? [...grid.querySelectorAll('.points-era')] : [];
  const cells = grid ? [...grid.querySelectorAll('.points-cell')] : [];
  const rows = grid ? [...grid.querySelectorAll('.points-grid-row')].filter((row) => !row.classList.contains('is-head')) : [];
  const domains = headCells.slice(1).map(textOf); // « Ère » n'est pas un domaine
  const eras = eraButtons.map(textOf);
  const covered = cells.filter((cell) => cell.classList.contains('has-points')).length;

  /* Un échantillon réel de cellule : son title porte « era · domaine · N point(s) »
   * (points.js:48). On le lit, on ne l'invente pas. */
  const sample = cells.find((cell) => textOf(cell.getAttribute ? cell.getAttribute('title') : '')) || null;
  const sampleTitle = sample && sample.getAttribute ? textOf(sample.getAttribute('title')) : '';
  const sampleText = textOf(sample);

  return {
    grid, head, headCells, eraButtons, cells, rows, domains, eras, covered,
    sample, sampleTitle, sampleText,
    total: cells.length,
    eraCount: eras.length || rows.length,
    domainCount: domains.length,
    expected: (eras.length || rows.length) * domains.length,
  };
}

function dashOr(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? String(n) : '—';
}

/* E097-03 / E097-05 / E097-06 : le contenu de chaque étape est dérivé du DOM.
 * Le texte est sémantique (<h3>, <p>, <li>) : lisible et indexable sans JS.
 * Le glossaire donne la définition des termes dès leur première occurrence. */
function stepContent(data, index) {
  const eraCount = dashOr(data.eraCount);
  const domainCount = dashOr(data.domainCount);
  const total = dashOr(data.total);
  if (index === 0) {
    return {
      title: 'Étape 1 · Les lignes portent les ères',
      lines: [
        'Une ère est une tranche de temps nommée : c’est la plus petite colonne de gauche de la matrice, celle qui porte un bouton. Chaque ligne horizontale correspond donc à une ère.',
        data.eraCount
          ? `Observation : la matrice affine ${eraCount} ère(s), dont « ${data.eras[0] || '—'} » en premier. Chacune occupe sa propre ligne.`
          : 'Observation : aucune ère lisible pour le moment — le tutoriel se tait plutôt que d’en inventer une.',
        'Astuce : le bouton d’une ère sélectionne cette période. Survolez la ligne en surbrillance pour la repérer avant de changer d’ère.',
      ],
    };
  }
  if (index === 1) {
    return {
      title: 'Étape 2 · Les colonnes portent les domaines',
      lines: [
        'Un domaine est un champ de savoir (par exemple une discipline ou un thème). Les domaines sont écrits dans l’en-tête de la matrice, une par colonne, après la colonne « Ère ».',
        data.domainCount
          ? `Observation : l’en-tête compte ${domainCount} domaine(s), dont « ${data.domains[0] || '—'} » en premier. Chaque domaine occupe sa propre colonne.`
          : 'Observation : aucun domaine lisible dans l’en-tête — le tutoriel attend une matrice rendue.',
        'Astuce : cliquez l’en-tête d’un domaine pour filtrer la vue ; la colonne surbrillance montre alors où il se trouve.',
      ],
    };
  }
  return {
    title: 'Étape 3 · Les cellules croisent ère et domaine',
    lines: [
      'Une cellule est le croisement d’une ligne (ère) et d’une colonne (domaine). Elle affiche le nombre de points validés à cette intersection, ou « · » lorsqu’un silence est documenté.',
      data.sampleTitle
        ? `Exemple réel : la cellule « ${data.sampleTitle} » affiche « ${data.sampleText || '·'} ». Elle croise donc l’ère et le domaine indiqués dans son intitulé.`
        : 'Exemple : aucune cellule intitulée n’est disponible — choisissez une ère pour rendre la matrice lisible.',
      data.total
        ? `La matrice contient ${total} cellule(s), dont ${dashOr(data.covered)} portent un nombre. Un « · » n’est pas une erreur : c’est un silence à justifier, jamais à masquer.`
        : 'Aucune cellule à lire tant que la matrice n’est pas rendue.',
    ],
  };
}

/* E097-07 : au moins trois grandeurs chiffrées, dont une comparée à une
 * référence explicite (ères × domaines = cellules attendues). Écart falsifiable. */
function buildReadout(data) {
  const eraCount = dashOr(data.eraCount);
  const domainCount = dashOr(data.domainCount);
  const total = dashOr(data.total);
  const expected = dashOr(data.expected);
  if (!data.total) {
    return 'Grandeurs : matrice absente. Référence : indisponible. Aucun écart calculable.';
  }
  const diff = data.expected - data.total;
  const ecart = diff === 0
    ? 'aucun écart : la grille est complète.'
    : `écart : ${Math.abs(diff)} cellule(s) par rapport à la référence.`;
  return `Grandeurs mesurées : ${eraCount} ère(s), ${domainCount} domaine(s), ${total} cellule(s), ${dashOr(data.covered)} avec un nombre. Référence (ères × domaines) : ${expected} cellule(s) attendue(s) ; ${ecart}`;
}

/* E097-08 : une seule région live, dédupliquée par signature : on n'écrit que
 * si l'étape ou les mesures changent réellement, pour ne pas bavarder à chaque
 * MutationObserver. L'annonce contient l'étape ET les grandeurs. */
function signatureOf(index, data, content) {
  return [index, data.eraCount, data.domainCount, data.total, data.covered, content.title].join(' | ');
}

function clearHighlight() {
  highlighted.forEach((node) => node.classList.remove(HL_ERA, HL_DOMAIN, HL_CELL));
  highlighted = [];
}

/* E097-05 : mise en évidence NON destructive. On retire d'abord nos propres
 * marques, puis on n'ajoute que nos classes sur les nœuds de la grille. Aucun
 * écouteur, aucun title, aucun attribut d'une autre lentille n'est modifié. */
function applyHighlight(data, index) {
  clearHighlight();
  let classname = HL_ERA;
  let targets = data.eraButtons;
  if (index === 1) {
    classname = HL_DOMAIN;
    targets = data.headCells.slice(1);
  } else if (index === 2) {
    classname = HL_CELL;
    targets = data.cells;
  }
  targets.forEach((node) => {
    if (!node || typeof node.classList.add !== 'function') return;
    node.classList.add(classname);
    highlighted.push(node);
  });
}

/* E097-04 / E097-08 : navigation native, cibles ≥ 36 px, focus visible, états
 * disabled aux bornes. Le rendu reconstruit uniquement les zones variables. */
function render(ctx, panel, data) {
  if (!panel || !ctx || typeof ctx.el !== 'function') return;
  const content = stepContent(data, step);
  const signature = signatureOf(step, data, content);
  const liveText = `Étape ${step + 1} sur ${STEP_LABELS.length} · ${content.title}. ${buildReadout(data)}`;

  /* Une seule région live, créée une fois dans buildPanel : on ne fait que mise
   * à jour son texte. La garde par signature évite toute réécriture redondante
   * (donc toute annonce en double) quand ni l'étape ni les mesures ne changent. */
  if (signature !== lastSignature || !stepBody || !stepBody.isConnected) {
    lastSignature = signature;

    const frag = document.createDocumentFragment();
    frag.appendChild(ctx.el('h3', 'e097-step-title', content.title));
    content.lines.forEach((line) => frag.appendChild(ctx.el('p', 'e097-p', line)));
    if (stepBody) stepBody.replaceChildren(frag);
    if (readoutNode) readoutNode.textContent = liveText;
    if (progressNode) progressNode.textContent = `Étape ${step + 1} sur ${STEP_LABELS.length}.`;
  }

  if (prevButton) prevButton.disabled = step === 0;
  if (nextButton) nextButton.disabled = step === STEP_LABELS.length - 1;

  panel.dataset.pointsE097Step = String(step + 1);
  panel.dataset.pointsE097Focus = ['era', 'domain', 'cell'][step];
  applyHighlight(data, step);
}

/* E097-04 : changement d'étape borné, puis rendu à partir du ctx courant. */
function setStep(next) {
  step = Math.max(0, Math.min(STEP_LABELS.length - 1, next));
  renderCurrent();
}

function renderCurrent() {
  if (!currentCtx) return;
  const root = rootOf(currentCtx);
  if (!root) return;
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  render(currentCtx, panel, readMatrix(root));
}

/* E097-06 : glossaire natif (<details>), atteignable au clavier, sans script. */
function buildGlossary(ctx) {
  const details = ctx.el('details', 'e097-glossary');
  details.appendChild(ctx.el('summary', '', 'Glossaire : ère, domaine, cellule'));
  const dl = ctx.el('dl');
  const terms = [
    ['Ère', 'une tranche de temps nommée, affichée en ligne dans la première colonne.'],
    ['Domaine', 'un champ de savoir, affiché en colonne dans l’en-tête de la matrice.'],
    ['Cellule', 'le croisement d’une ère et d’un domaine : un nombre de points validés, ou « · » pour un silence documenté.'],
  ];
  terms.forEach(([term, definition]) => {
    dl.appendChild(ctx.el('dt', '', term));
    dl.appendChild(ctx.el('dd', '', definition));
  });
  details.appendChild(dl);
  return details;
}

/* Structure statique construite une seule fois : seules les zones de contenu,
 * du readout et de la progression sont remplacées. Les écouteurs des boutons
 * sont attachés une fois pour toutes (aucun ajout à chaque rendu). */
function buildPanel(ctx, panel) {
  panel.replaceChildren();
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', 'e097-title', 'Lire la matrice en trois temps');
  title.id = TITLE_ID;
  title.tabIndex = -1;
  panel.appendChild(title);
  panel.appendChild(ctx.el('p', 'e097-p',
    'Micro-tutoriel : suivez les trois étapes pour apprendre à lire la matrice. Les zones surlignées montrent à chaque fois la partie concernée ; la matrice reste la source de vérité.'));

  stepBody = ctx.el('div', 'e097-step-body');
  stepBody.id = STEP_ID;
  panel.appendChild(stepBody);

  const readout = ctx.el('p', 'e097-readout', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  readoutNode = readout;
  panel.appendChild(readout);

  progressNode = ctx.el('p', 'e097-progress', '');
  progressNode.id = PROGRESS_ID;
  panel.appendChild(progressNode);

  const nav = ctx.el('div', 'e097-nav');
  prevButton = ctx.el('button', '', '← Étape précédente');
  prevButton.type = 'button';
  prevButton.setAttribute('aria-label', 'Étape précédente du tutoriel');
  prevButton.addEventListener('click', () => setStep(step - 1));
  nextButton = ctx.el('button', '', 'Étape suivante →');
  nextButton.type = 'button';
  nextButton.setAttribute('aria-label', 'Étape suivante du tutoriel');
  nextButton.addEventListener('click', () => setStep(step + 1));
  nav.append(prevButton, nextButton);
  panel.appendChild(nav);

  panel.appendChild(buildGlossary(ctx));
}

/* E097-10 : un seul observateur, ciblé sur la grille en lecture seule. Le
 * panneau est hors de la grille, donc ses écritures ne peuvent pas le déclencher
 * (pas de boucle). On n'observe PAS les attributs : nos propres classes de
 * surlignage ne doivent pas provoquer de re-render. */
function observe(ctx, grid) {
  if (typeof MutationObserver === 'undefined') return;
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (!grid) return;
  observer = new MutationObserver(() => {
    lastSignature = '';
    renderCurrent();
  });
  observer.observe(grid, { childList: true, characterData: true, subtree: true });
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;

  currentCtx = ctx;
  ctx.css(CSS_ID, CSS);

  const root = rootOf(ctx);
  if (!root) return;
  root.classList.add(SCOPE);
  /* E097-09 : couplage sonde JS + media query, sans aucune animation propre. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    root.setAttribute(REDUCED_ATTR, '1');
  } else {
    root.removeAttribute(REDUCED_ATTR);
  }

  const matrix = root.querySelector('.points-matrix');
  if (!matrix) return;
  const data = readMatrix(root);

  /* E097-01 / E097-10 : panneau unique. Un nœud du même id mais détaché ou mal
   * parenté est retiré ; le contenu est reconstruit, jamais doublé. */
  let panel = document.getElementById(PANEL_ID);
  if (panel && (panel.parentElement !== matrix || !matrix.contains(panel))) panel.remove();
  if (!panel) {
    panel = ctx.el('section', 'points-e097-tutorial');
    panel.id = PANEL_ID;
    buildPanel(ctx, panel);
  } else if (!panel.querySelector('#' + STEP_ID) || !panel.querySelector('#' + READOUT_ID)) {
    buildPanel(ctx, panel);
  } else {
    stepBody = panel.querySelector('#' + STEP_ID);
    readoutNode = panel.querySelector('#' + READOUT_ID);
    progressNode = panel.querySelector('#' + PROGRESS_ID);
    const buttons = panel.querySelectorAll('.e097-nav button');
    prevButton = buttons[0] || null;
    nextButton = buttons[1] || null;
  }
  if (panel.parentElement !== matrix) matrix.appendChild(panel);

  /* E097-10 : signaux préfixés, lisibles par les autres lentilles sans occuper
   * de nom générique. Aucun attribut d'une autre lentille n'est réécrit. */
  root.dataset.pointsE097 = 'ready';
  matrix.dataset.pointsE097Step = String(step + 1);
  if (data.grid) data.grid.dataset.pointsE097 = 'readable';

  lastSignature = '';
  render(ctx, panel, data);
  observe(ctx, data.grid);
}

register('E097', install);
