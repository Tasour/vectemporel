import { register } from './registry.js';

/* Lentille E097 — passe V2, domaine J (Pédagogie & narration).
 * Thème (themes.json, clé E097) : micro-tutoriel de lecture de la frise.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E097.md — chantiers E097-01 à E097-10.
 * Fichier possédé : src/views/chronology/v2/E097.js uniquement. Aucun fichier
 * partagé (registry.js, index.js, styles.css, src/views/chronology.js) ni aucune
 * autre lentille n'est modifié.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } ; helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * La vue ne fournit pas de say() : aucun role="status"/aria-live n'est ajouté,
 * l'état du tutoriel est rendu en texte visible ordinaire, dédupliqué.
 *
 * Invariants :
 * - un seul register('E097', install), un seul ctx.css('chronology-v2-e097', …) ;
 * - IDs préfixés chronology-v2-e097-, uniques, avec gardes d'existence ;
 * - zéro console.*, fetch/XHR, Math.random, innerHTML, timer, rAF ;
 * - zéro écouteur de touche, zéro vol de focus : la navigation du tutoriel
 *   passe par des boutons natifs et n'intercepte aucune touche du routeur ;
 * - aucune date n'est codée en dur : chaque exemple est relevé dans le DOM.
 */

const CSS_ID = 'chronology-v2-e097';
const PREFIX = 'chronology-v2-e097-';

const PANEL_ID = PREFIX + 'panel';
const TITLE_ID = PREFIX + 'title';
const STEP_LIST_ID = PREFIX + 'steps';
const PREV_ID = PREFIX + 'prev';
const NEXT_ID = PREFIX + 'next';
const NAV_ID = PREFIX + 'nav';
const PROGRESS_ID = PREFIX + 'progress';
const RECAP_ID = PREFIX + 'recap';
const METRIC_ID = PREFIX + 'metric';

const READOUT_IDS = [1, 2, 3, 4, 5].map((n) => PREFIX + 'readout-' + n);
const STEP_IDS = [1, 2, 3, 4, 5].map((n) => PREFIX + 'step-' + n);

/* E097-02 : cinq étapes ordonnées, verbes d'action explicites, libellés courts
   pour le fil récapitulatif. Le déroulé enseigne à lire la frise de l'ère au
   repère, puis à vérifier la confiance et à comparer deux points. */
const STEPS = [
  {
    titre: 'Repérer les ères',
    court: 'ères',
    texte: 'Commence par les bandes d’ères : elles découpent le temps en tranches nommées. Compte-les avant de lire la moindre date.',
  },
  {
    titre: 'Lire l’échelle',
    court: 'échelle',
    texte: 'Repère ensuite l’amplitude, les bornes et l’unité de l’axe. Une même distance ne veut rien dire sans son échelle.',
  },
  {
    titre: 'Lire un repère',
    court: 'repère',
    texte: 'Choisis un repère : son titre et son ancre temporelle disent quel fait est situé, et où, sur l’axe.',
  },
  {
    titre: 'Vérifier la confiance',
    court: 'confiance',
    texte: 'Ouvre le détail : le niveau de confiance et la source (ou leur omission justifiée) conditionnent ce que tu peux affirmer.',
  },
  {
    titre: 'Comparer deux repères',
    court: 'comparaison',
    texte: 'Pour finir, compare deux repères éloignés : leur écart, lu sur l’axe, transforme une suite de faits en récit du temps long.',
  },
];

/* E097-01, E097-08, E097-09, E097-10 : une seule feuille, injectée une fois.
   Le panneau reste un bloc en flux normal en fin de colonne : jamais modale,
   jamais superposée, jamais tabindex=-1 — il n'ajoute aucun arrêt Tab parasite. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 12px 14px 13px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${TITLE_ID} {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e097-lede { margin: 0 0 10px; color: var(--muted); }
  #${STEP_LIST_ID} { margin: 0 0 10px; padding: 0; list-style: none; }
  #${STEP_LIST_ID} .e097-step {
    display: grid; grid-template-columns: 26px 1fr; gap: 8px;
    margin: 0 0 9px; padding: 7px 8px;
    border: 1px solid transparent; border-radius: 8px;
  }
  #${STEP_LIST_ID} .e097-step[aria-current="step"] {
    border-color: var(--line-strong); background: rgba(255,255,255,.04);
  }
  #${STEP_LIST_ID} .e097-num {
    display: inline-flex; align-items: center; justify-content: center;
    width: 26px; height: 26px;
    border: 1px solid var(--line-strong); border-radius: 50%;
    color: var(--gold-bright); font-size: 11px; font-weight: 700;
  }
  #${STEP_LIST_ID} .e097-step[aria-current="step"] .e097-num {
    border-color: var(--gold); background: rgba(255,255,255,.06);
  }
  #${STEP_LIST_ID} .e097-step-title {
    margin: 0 0 2px; color: var(--ink); font-size: 12px; font-weight: 600;
  }
  #${STEP_LIST_ID} .e097-step-text { margin: 0 0 3px; }
  #${STEP_LIST_ID} .e097-readout { margin: 0; color: var(--gold-bright); }
  #${NAV_ID} { display: flex; gap: 8px; margin: 0 0 8px; }
  #${NAV_ID} .e097-nav {
    min-height: 44px; min-width: 44px; padding: 8px 14px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: transparent; color: var(--ink); font: inherit; font-size: 11px;
    cursor: pointer;
  }
  #${NAV_ID} .e097-nav:hover { border-color: var(--gold); color: var(--gold-bright); }
  #${NAV_ID} .e097-nav[aria-disabled="true"] { opacity: .55; cursor: default; }
  #${PANEL_ID} .e097-progress,
  #${PANEL_ID} .e097-recap,
  #${PANEL_ID} .e097-metric { margin: 4px 0 0; }
  #${PANEL_ID} .e097-progress { color: var(--gold-bright); font-weight: 600; }
  #${PANEL_ID} .e097-recap { color: var(--muted); }
  #${PANEL_ID} .e097-metric { color: var(--muted-2); font-size: 9px; }
  #${PANEL_ID} :focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 10px; }
    #${STEP_LIST_ID} .e097-step { grid-template-columns: 1fr; gap: 2px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${STEP_LIST_ID} .e097-num, #${STEP_LIST_ID} .e097-step[aria-current="step"] .e097-num,
    #${PANEL_ID} .e097-readout, #${PANEL_ID} .e097-progress,
    #${NAV_ID} .e097-nav { border-color: CanvasText; color: CanvasText; }
  }
`;

let installs = 0;

/* E097-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent est
   réutilisé et déplacé dans le parent courant : la coque reconstruisant #app, un
   nœud de la rendu précédent est détaché et n'est pas retrouvé — on le recrée. */
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

/* E097-03 à E097-07, E097-09 : tous les exemples sont dérivés du DOM vivant.
   Aucune date, aucun compte, aucune amplitude n'est codée en dur. Les lectures
   sont défensives : si la structure attendue est absente, on l'explique plutôt
   que d'inventer une valeur. */
function lireAttribut(node, noms) {
  if (!node) return '';
  for (const nom of noms) {
    const valeur = node.getAttribute(nom);
    if (valeur) return valeur.trim();
  }
  return '';
}

function premierTexte(selecteur) {
  const noeud = document.querySelector(selecteur);
  return noeud ? (noeud.textContent || '').trim() : '';
}

function tronquer(texte, max) {
  if (!texte) return '';
  return texte.length > max ? texte.slice(0, max - 1).trimEnd() + '…' : texte;
}

function extraireAnnee(texte) {
  const correspondance = /(-?\d{3,6})\s*(av\.?\s*J\.?-?C\.?|avant| BCE| BC)?/i.exec(texte || '');
  return correspondance ? correspondance[1] : '';
}

function calculerReadouts() {
  const eras = document.querySelectorAll('.era-band, [data-era-id]').length;
  const cards = Array.from(document.querySelectorAll('.event-card, [data-event-id]'));

  /* Étape 1 — compte d'ères relevé. */
  const readout1 = eras > 0
    ? `${eras} bande${eras > 1 ? 's' : ''} d’ère relevée${eras > 1 ? 's' : ''} dans la frise.`
    : 'Aucune bande d’ère détectée : repère visuellement les tranches nommées.';

  /* Étape 2 — amplitude, bornes et unités lues depuis le DOM ou son dataset. */
  const axe = document.querySelector('[data-chrono-scale], [data-era-amplitude], #atlas-chrono-scale');
  const amplitude = lireAttribut(axe, ['data-chrono-amplitude', 'data-era-amplitude', 'data-amplitude']);
  const debut = lireAttribut(axe, ['data-chrono-start', 'data-start']);
  const fin = lireAttribut(axe, ['data-chrono-end', 'data-end']);
  const unite = lireAttribut(axe, ['data-chrono-unit', 'data-unit']) || premierTexte('[data-chrono-unit-label]');
  const axeTexte = axe ? tronquer((axe.textContent || '').trim(), 70) : '';
  const readout2 = (amplitude || debut || fin || unite || axeTexte)
    ? `Échelle : ${amplitude ? `amplitude ${amplitude}` : 'amplitude non annotée'}` +
      `${debut || fin ? ` · bornes ${debut || '?'} → ${fin || '?'}` : ''}` +
      `${unite ? ` · unité ${unite}` : ''}${!amplitude && axeTexte ? ` · axe « ${axeTexte} »` : ''}.`
    : 'Aucune annotation d’échelle trouvée : lis l’amplitude, les bornes et l’unité sur l’axe lui-même.';

  /* Étape 3 — premier repère concret : titre et ancre temporelle du DOM. */
  const premiere = cards[0];
  const titreRepere = premiere ? tronquer((premiere.textContent || '').trim(), 54) : '';
  const ancre = lireAttribut(premiere, ['data-chrono-date', 'data-date', 'datetime']);
  const readout3 = premiere
    ? `Premier repère : « ${titreRepere || 'sans titre'} »${ancre ? ` · ancre ${ancre}` : ' · ancre à lire sur l’axe'}.`
    : 'Aucun repère visible : lève d’abord un filtre pour faire apparaître une carte.';

  /* Étape 4 — confiance et source lues dans le détail, avec repli « omission ». */
  const confiance = lireAttribut(document.querySelector('[data-confidence], #atlas-chrono-detail'), ['data-confidence']);
  const source = lireAttribut(document.querySelector('[data-source], #atlas-chrono-detail'), ['data-source', 'data-source-id']);
  const omission = lireAttribut(document.querySelector('[data-omission], #atlas-chrono-detail'), ['data-omission', 'data-omission-id']);
  let readout4;
  if (confiance || source) {
    readout4 = `Confiance : ${confiance || 'non annotée'}${source ? ` · source ${source}` : ''}${omission ? ` · omission justifiée ${omission}` : ''}.`;
  } else if (omission) {
    readout4 = `Source omise : ${omission} — l’omission est explicitement justifiée, pas un oubli.`;
  } else {
    readout4 = 'Aucun détail ouvert : ouvre un repère pour lire sa confiance et le nom de sa source.';
  }

  /* Étape 5 — écart entre deux repères, calculé depuis les ancres du DOM. */
  const derniere = cards[cards.length - 1];
  const ancreA = extraireAnnee(ancre || titreRepere);
  const ancreB = derniere
    ? extraireAnnee(lireAttribut(derniere, ['data-chrono-date', 'data-date', 'datetime']) || (derniere.textContent || ''))
    : '';
  let readout5;
  if (ancreA && ancreB && ancreA !== ancreB) {
    const ecart = Math.abs(Number(ancreB) - Number(ancreA));
    readout5 = `Écart lu entre le premier et le dernier repère : ${ecart} unité${ecart > 1 ? 's' : ''} d’après leurs ancres (${ancreA} → ${ancreB}).`;
  } else {
    readout5 = cards.length > 1
      ? 'Deux repères sont présents : lis leurs ancres sur l’axe et soustrais-les pour obtenir l’écart.'
      : 'Compare deux repères : il en faut au moins deux visibles pour lire une durée.';
  }

  return [readout1, readout2, readout3, readout4, readout5];
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const readouts = calculerReadouts();

  const host = document.getElementById('atlas-chrono-main') || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e097-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.dataset.e097Installs = String(installs);
  panel.dataset.e097Reduced = reduced ? '1' : '0';

  const title = make('h2', 'e097-title', 'Micro-tutoriel — lire la frise');
  title.id = TITLE_ID;
  const lede = make('p', 'e097-lede', 'Cinq étapes pour lire la frise : du repérage des ères à la comparaison de deux repères. Avance à ton rythme avec les boutons ; rien n’est animé.');

  const list = make('ol', 'e097-steps');
  list.id = STEP_LIST_ID;
  const etapes = STEPS.map((etape, index) => {
    const item = make('li', 'e097-step');
    item.id = STEP_IDS[index];
    const numero = make('span', 'e097-num', String(index + 1));
    numero.setAttribute('aria-hidden', 'true');
    const corps = make('div', 'e097-corps');
    const titre = make('h3', 'e097-step-title', etape.titre);
    const texte = make('p', 'e097-step-text', etape.texte);
    const lecture = make('p', 'e097-readout');
    lecture.id = READOUT_IDS[index];
    lecture.dataset.e097Readout = String(index + 1);
    write(lecture, readouts[index]);
    corps.append(titre, texte, lecture);
    item.append(numero, corps);
    list.appendChild(item);
    return item;
  });

  const nav = make('div', 'e097-nav');
  nav.id = NAV_ID;
  const precedent = make('button', 'e097-nav', '← Précédent');
  precedent.id = PREV_ID;
  precedent.setAttribute('type', 'button');
  precedent.setAttribute('aria-label', 'Étape précédente du micro-tutoriel');
  const suivant = make('button', 'e097-nav', 'Suivant →');
  suivant.id = NEXT_ID;
  suivant.setAttribute('type', 'button');
  suivant.setAttribute('aria-label', 'Étape suivante du micro-tutoriel');
  nav.append(precedent, suivant);

  const progression = make('p', 'e097-progress');
  progression.id = PROGRESS_ID;
  const recap = make('p', 'e097-recap');
  recap.id = RECAP_ID;
  const metrique = make('p', 'e097-metric');
  metrique.id = METRIC_ID;

  panel.replaceChildren(title, lede, list, nav, progression, recap, metrique);

  /* E097-08, E097-09 : navigation native, sans keydown ni vol de focus.
     aria-disabled garde les boutons focalisables aux bornes ; l'état courant est
     porté par aria-current="step" et par data-e097-step. */
  function afficherEtape(index) {
    const borne = Math.max(0, Math.min(STEPS.length - 1, index));
    panel.dataset.e097Step = String(borne);
    etapes.forEach((item, i) => {
      if (i === borne) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    precedent.setAttribute('aria-disabled', borne === 0 ? 'true' : 'false');
    suivant.setAttribute('aria-disabled', borne === STEPS.length - 1 ? 'true' : 'false');
    write(progression, `Étape ${borne + 1} sur ${STEPS.length} : ${STEPS[borne].titre}.`);
    const parcours = STEPS.slice(0, borne + 1).map((etape) => etape.court).join(' → ');
    write(recap, `Fil du tutoriel : ${parcours}.`);
  }

  precedent.addEventListener('click', () => {
    const courant = Number(panel.dataset.e097Step || 0);
    if (courant > 0) afficherEtape(courant - 1);
  });
  suivant.addEventListener('click', () => {
    const courant = Number(panel.dataset.e097Step || 0);
    if (courant < STEPS.length - 1) afficherEtape(courant + 1);
  });

  const depart = Number(panel.dataset.e097Step);
  afficherEtape(Number.isInteger(depart) ? depart : 0);
  write(metrique, `Installations : ${installs} · mouvement réduit : ${reduced ? 'oui' : 'non'} · cinq étapes, zéro animation.`);
}

register('E097', install);
