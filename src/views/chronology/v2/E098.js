import { register } from './registry.js';

/* Lentille E098 — Pédagogie & narration : encadré « un silence est une donnée ».
 * Domaine J de la passe V2 de l'atlas Chronologie (thème themes.json:E098).
 *
 * Périmètre possédé (deux fichiers, et seulement deux) :
 *   - src/views/chronology/v2/E098.js (ce module) ;
 *   - UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E098.md (le rapport).
 * Aucun autre fichier n'est modifié : ni la passe 1, ni registry.js, index.js,
 * styles.css, src/views/chronology.js, ni une autre lentille V2.
 *
 * Contrat exploité : viewId === 'chronologyv2', stage, layout, css, el,
 * reducedMotion. Le registre V2 n'expose pas say() : la lentille n'ajoute
 * aucune région live concurrente, elle affiche son état en texte visible et
 * dans des attributs de données.
 *
 * Invariants :
 * - un seul appel au registre pour l'identifiant E098, avec ctx en paramètre ;
 * - une seule feuille CSS, injectée sous l'identifiant chronology-v2-e098 ;
 * - IDs tous préfixés chronology-v2-e098-, uniques, avec garde d'existence ;
 * - ni journalisation, réseau, aléa, HTML brut, timer, animation ni écriture concurrente.
 */

const CSS_ID = 'chronology-v2-e098';
const PANEL_ID = 'chronology-v2-e098-panel';
const TITLE_ID = 'chronology-v2-e098-title';
const DFN_ID = 'chronology-v2-e098-dfn-silence';
const STRIP_ID = 'chronology-v2-e098-strip';
const METRIC_ID = 'chronology-v2-e098-metric';
const FALSIFY_ID = 'chronology-v2-e098-falsify';

/* E098-01, E098-03, E098-04, E098-09 : une seule feuille, injectée une fois
   par ctx.css. L'encadré est un bloc en flux normal (jamais une modale, jamais
   superposé) : il n'ajoute aucun arrêt de tabulation et ne masque rien. Le
   schéma en `.e098-gap` reste décoratif : l'information est dans le texte. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 12px 14px 14px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.55;
    overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e098-title {
    margin: 0 0 8px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 16px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e098-def,
  #${PANEL_ID} .e098-metric,
  #${PANEL_ID} .e098-falsify,
  #${PANEL_ID} .e098-plain { margin: 0 0 8px; }
  #${PANEL_ID} .e098-dfn { color: var(--gold-bright); font-style: normal; font-weight: 600; }
  #${PANEL_ID} .e098-triad { margin: 0 0 10px; padding: 0; list-style: none; }
  #${PANEL_ID} .e098-kind { margin: 0 0 5px; padding-left: 10px; border-left: 2px solid var(--line-strong); }
  #${PANEL_ID} .e098-kind-label { color: var(--gold-bright); }
  #${PANEL_ID} .e098-strip { display: flex; align-items: stretch; gap: 3px; margin: 0 0 8px; }
  #${PANEL_ID} .e098-seg { flex: 1 1 auto; min-height: 18px; border: 1px solid var(--line-strong); border-radius: 3px; background: rgba(255,255,255,.04); }
  #${PANEL_ID} .e098-gap { flex: 0 0 34px; min-height: 18px; border: 1px dashed var(--gold); border-radius: 3px; }
  #${PANEL_ID} .e098-inference { margin: 0 0 8px; padding: 6px 10px; border-left: 3px solid var(--gold); color: var(--ink); font-style: italic; }
  #${PANEL_ID} .e098-metric { color: var(--muted); font-variant-numeric: tabular-nums; }
  #${PANEL_ID} .e098-falsify { color: var(--muted); }
  #${PANEL_ID} .e098-anchor { display: inline-block; margin: 0 10px 8px 0; color: var(--gold-bright); text-decoration: underline; }
  #${PANEL_ID} .e098-plain { color: var(--muted-2); }
  @media (max-width: 620px) {
    #${PANEL_ID} .e098-gap { flex-basis: 24px; }
    #${PANEL_ID} .e098-anchor { display: block; margin: 0 0 6px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e098-title, #${PANEL_ID} .e098-dfn,
    #${PANEL_ID} .e098-kind-label, #${PANEL_ID} .e098-anchor { color: CanvasText; }
    #${PANEL_ID} .e098-gap { border: 1px dashed CanvasText; }
  }
`;

let installCount = 0;

/* E098-10 : garde d'existence pour toute ID préfixée chronology-v2-e098.
   Un nœud déjà présent est réutilisé puis déplacé dans le parent courant ; la
   coque reconstruisant le stage, un nœud du rendu précédent est détaché et
   n'est donc pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E098-06, E098-10 : une seule fonction d'écriture, qui ne touche au texte
   que s'il diffère : deux rafraîchissements sans changement n'écrivent rien. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E098-06 : les chiffres sont dérivés du DOM réel (jamais codés en dur), via
   un ensemble pour ne pas compter deux fois un nœud présent dans layout et
   stage. La lentille ne crée aucun de ces repères : elle ne fait que les lire. */
function countMarks(ctx) {
  const vus = new Set();
  [ctx.layout, ctx.stage].filter(Boolean).forEach((racine) => {
    racine.querySelectorAll('[data-event-id], [data-point-id], [data-era-id], .event-card, .era-band')
      .forEach((noeud) => vus.add(noeud));
  });
  return vus.size;
}

function install(ctx) {
  const faire = ctx.el;
  if (typeof faire !== 'function') return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const hotte = ctx.layout || ctx.stage || document.body;
  const panneau = ensureNode(faire, PANEL_ID, 'section', 'e098-panel', hotte);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', TITLE_ID);
  panneau.dataset.e098Renders = String(installCount);
  panneau.dataset.e098Chantiers = '10';
  panneau.dataset.e098Reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() ? '1' : '0';
  panneau.dataset.e098View = ctx.viewId || 'chronologyv2';

  /* E098-01 : titre non ambigu, ancré par aria-labelledby. */
  const titre = faire('h2', 'e098-title', 'Un silence est une donnée');
  titre.id = TITLE_ID;

  /* E098-02 : glossaire au premier terme — <dfn> porte la définition courte. */
  const def = faire('p', 'e098-def');
  const dfn = faire('dfn', 'e098-dfn', 'silence');
  dfn.id = DFN_ID;
  dfn.setAttribute('title', 'Écart entre deux repères : une lacune de la source, non un événement manquant.');
  def.append(
    'Dans une frise chronologique, un ',
    dfn,
    ' est un écart entre deux repères : il signale une lacune de la source, pas un événement qui aurait manqué.'
  );

  /* E098-03 : triade Silence / Absence / Inconnu, étiquetée en texte — jamais
     la couleur seule. Chaque état porte un data-e098-kind distinct. */
  const triade = faire('ul', 'e098-triad');
  [
    ['Silence', ' : écart documenté, la source se tait sur cette période — ce rien est une donnée.'],
    ['Absence', ' : aucun événement n’est survenu, l’information est nulle et non manquante.'],
    ['Inconnu', ' : la donnée existe peut-être, mais elle n’est pas parvenue jusqu’à la frise.'],
  ].forEach(([libelle, suite]) => {
    const entree = faire('li', 'e098-kind');
    entree.dataset.e098Kind = libelle.toLowerCase();
    entree.append(faire('strong', 'e098-kind-label', libelle), document.createTextNode(suite));
    triade.appendChild(entree);
  });

  /* E098-04 : schéma textuel d'une frise trouée — repère, écart, repère. Le
     role="img" muni d'un aria-label unique donne une alternative verbale. */
  const bande = faire('div', 'e098-strip');
  bande.id = STRIP_ID;
  bande.setAttribute('role', 'img');
  bande.setAttribute('aria-label', 'Schéma : repère A, silence, repère B. L’écart entre A et B est une donnée sur la source.');
  bande.append(
    faire('span', 'e098-seg'),
    faire('span', 'e098-gap'),
    faire('span', 'e098-seg')
  );

  /* E098-05 : ce que le silence raconte, en citation lisible. */
  const inference = faire('blockquote', 'e098-inference',
    'Lire un silence, c’est se demander pourquoi la source se tait : le vide peut être une précaution, une perte ou un choix de sélection.');

  /* E098-06 : mesure dérivée du DOM, affichée en texte et publiée en données. */
  const observes = countMarks(ctx);
  const metrique = faire('p', 'e098-metric');
  metrique.id = METRIC_ID;
  metrique.dataset.e098Observed = String(observes);
  metrique.dataset.e098Gaps = '1';
  write(metrique, `Repères et ères déjà présents dans la vue : ${observes}. Silences illustrés dans cet encadré : 1. L’écart compte autant que le repère.`);

  /* E098-07 : affirmation falsifiable — un silence qui persiste entre deux
     sources est une donnée, pas une simple erreur de saisie. */
  const falsifiable = faire('p', 'e098-falsify');
  falsifiable.id = FALSIFY_ID;
  write(falsifiable, 'Vérification falsifiable : si ce silence n’était qu’une erreur de saisie, le retrouver dans une autre source le ferait disparaître. S’il persiste, il est bien une donnée sur la source.');

  /* E098-08 : ancres locales natives (clavier inclus) entre le titre et le
     schéma, pour relier l'encadré à la lecture de la frise. */
  const versBande = faire('a', 'e098-anchor', 'Voir le schéma du silence');
  versBande.setAttribute('href', `#${STRIP_ID}`);
  versBande.setAttribute('aria-label', 'Aller au schéma de la frise et au silence illustré');
  const versTitre = faire('a', 'e098-anchor', 'Revenir au titre de l’encadré');
  versTitre.setAttribute('href', `#${TITLE_ID}`);
  versTitre.setAttribute('aria-label', 'Revenir au titre de l’encadré Un silence est une donnée');

  /* E098-09 : repli sans CSS — tout l'essentiel reste dans le texte visible. */
  const brut = faire('p', 'e098-plain',
    'Sans style, l’essentiel reste lisible : dans une frise, un écart entre deux repères est une donnée sur la source ; il ne faut ni l’effacer ni le confondre avec un événement manquant.');

  panneau.replaceChildren(titre, def, triade, bande, inference, metrique, falsifiable, versBande, versTitre, brut);
}

register('E098', ctx => {
  install(ctx);
});
