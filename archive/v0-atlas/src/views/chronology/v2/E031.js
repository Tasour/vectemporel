import { register } from './registry.js';

/* Lentille V2 E031 — ordre de tabulation logique de la frise (domaine D :
 * Navigation & clavier).
 *
 * Thème : "D. Navigation & clavier — ordre de tabulation logique de la frise"
 * (UNIFIED_AUDIT/CHRONOLOGIE/V2/themes.json, clé E031). Rapport :
 * UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E031.md — chantiers E031-01 à E031-10.
 * Fichier possédé : src/views/chronology/v2/E031.js uniquement. Lectures seules :
 * src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } ; helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 *
 * Invariants :
 * - un seul appel à register pour E031 (rappel ctx => { … }), un seul CSS dédié ;
 * - tous les IDs créés sont préfixés chronology-v2-e031- et gardés par assurerNoeud ;
 * - AUCUN tabindex n'est posé, AUCUN focus volé, AUCUN écouteur de touche :
 *   modifier l'ordre Tab casserait focusSignature (shell.js:205-220) et la
 *   restauration de chronology.js:198-206. La lentille MESURE et REND VISIBLE
 *   l'ordre réel, elle ne le réécrit pas ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro rAF, zéro région live ajoutée.
 */

const CSS_ID = 'chronology-v2-e031';
const MAIN_ID = 'atlas-chrono-main';
const TOOLS_ID = 'atlas-chrono-tools';
const SEARCH_ID = 'atlas-chrono-search';
const PANEL_ID = 'chronology-v2-e031-panel';
const TITLE_ID = 'chronology-v2-e031-title';
const STOP_LIST_ID = 'chronology-v2-e031-stop-list';
const ORDER_ID = 'chronology-v2-e031-order';
const GROUPS_ID = 'chronology-v2-e031-groups';
const SIGNATURES_ID = 'chronology-v2-e031-signatures';
const SIGNATURE_NOTE_ID = 'chronology-v2-e031-signature-note';
const ARROWS_ID = 'chronology-v2-e031-arrows';
const SEARCH_HINT_ID = 'chronology-v2-e031-search-hint';
const CARDS_ID = 'chronology-v2-e031-cards';
const MOTION_ID = 'chronology-v2-e031-motion';
const METRIC_ID = 'chronology-v2-e031-metric';

/* Groupes attendus de la frise, du premier au dernier arrêt. L'orientation
   (bouton « Retour au monde », chronology.js:270-275) précède les ères. */
const GROUPES = ['Orientation', 'Ères', 'Outils', 'Cartes', 'Fiche'];

/* Sélecteur des arrêts Tab réels : miroir de shell.js:226 et de la mesure E049.
   Les éléments disabled et [tabindex="-1"] sont exclus par construction. */
const SELECTEUR_ARRETS = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/* E031-01, E031-03, E031-04, E031-06, E031-07, E031-09, E031-10 : une seule
   feuille, injectée une fois par ctx.css. Aucune règle ne touche à outline /
   :focus-visible (styles.css:33-36) : l'anneau de focus de la coque est intact.
   Les badges sont aria-hidden côté JS : ils n'entrent donc pas dans stableText
   (shell.js:193-202) et ne modifient pas focusSignature. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e031-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e031-lede { margin: 0 0 8px; color: var(--muted); }
  #${STOP_LIST_ID} { margin: 0 0 8px; padding: 0; list-style: none; }
  #${STOP_LIST_ID} .e031-stop { display: flex; gap: 7px; margin: 0 0 3px; }
  #${PANEL_ID} .e031-rank {
    flex: 0 0 24px; padding: 0 3px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); text-align: center;
  }
  #${PANEL_ID} .e031-stop-label { flex: 1 1 auto; min-width: 0; color: var(--muted); }
  #${ORDER_ID} {
    margin: 0 0 8px; padding: 4px 7px;
    border-left: 2px solid var(--line-strong); color: var(--muted);
  }
  #${ORDER_ID}[data-e031-order-ok="0"] { border-left-color: #d98b7a; }
  #${GROUPS_ID} { margin: 0 0 8px; padding: 0; list-style: none; }
  #${GROUPS_ID} .e031-group {
    display: flex; justify-content: space-between; gap: 8px;
    padding: 2px 0 2px 7px; border-left: 2px solid var(--line);
  }
  #${GROUPS_ID} .e031-group-count { color: var(--gold-bright); }
  #${SIGNATURES_ID} { margin: 0 0 6px; padding: 0 0 0 18px; color: var(--muted-2); font-size: 9px; }
  #${PANEL_ID} .e031-note,
  #${SIGNATURE_NOTE_ID},
  #${ARROWS_ID}, #${CARDS_ID}, #${MOTION_ID}, #${METRIC_ID} { margin: 5px 0 0; }
  #${PANEL_ID} .e031-note,
  #${SIGNATURE_NOTE_ID}, #${METRIC_ID} { color: var(--muted-2); font-size: 9px; }
  #${ARROWS_ID}, #${CARDS_ID}, #${MOTION_ID} { color: var(--muted); }
  #${SEARCH_HINT_ID} {
    flex: 1 1 100%; margin: 0; color: var(--muted-2);
    font-size: 9px; line-height: 1.4;
  }
  #${SEARCH_HINT_ID}[data-e031-search-marked="1"] { color: var(--gold-bright); }

  /* E031-03 : badge de rang posé sur les bandes et les cartes. pointer-events
     none laisse le clic atteindre le bouton ; position relative est nécessaire
     mais ne modifie ni l'ordre FLR ni l'ordre de tabulation. */
  #${MAIN_ID} .era-band, #${MAIN_ID} .event-card { position: relative; }
  .e031-tab-rank {
    position: absolute; top: 2px; right: 3px; z-index: 1;
    min-width: 16px; padding: 0 3px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    background: rgba(11,15,21,.85); color: var(--gold-bright);
    font: inherit; font-size: 8px; line-height: 14px; text-align: center;
    pointer-events: none;
  }
  @media (max-width: 620px) {
    .e031-tab-rank { min-width: 14px; font-size: 7px; }
    #${PANEL_ID} .e031-rank { flex-basis: 20px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, #${SEARCH_HINT_ID}, .e031-tab-rank {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${ORDER_ID}, #${GROUPS_ID} .e031-group, .e031-tab-rank {
      border-color: CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e031-title, #${PANEL_ID} .e031-rank,
    #${GROUPS_ID} .e031-group-count, .e031-tab-rank,
    #${SEARCH_HINT_ID}[data-e031-search-marked="1"] { color: CanvasText; }
  }
`;

let nombreInstallations = 0;
let nombreBadges = 0;

/* E031-10 : garde d'existence pour toute ID préfixée chronology-v2-e031-. Un
   nœud déjà présent est réutilisé et déplacé dans le parent courant : la coque
   reconstruisant #app (shell.js:533), un nœud du rendu précédent est détaché et
   n'est donc pas retrouvé par getElementById. */
function assurerNoeud(fabriquer, id, balise, classe, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = fabriquer(balise, classe);
    noeud.id = id;
  }
  if (noeud.parentElement !== parent) parent.appendChild(noeud);
  return noeud;
}

function ecrire(noeud, texte) {
  if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
}

function attr(noeud, cle, valeur) {
  if (noeud && noeud.dataset[cle] !== valeur) noeud.dataset[cle] = valeur;
}

function libelleDe(noeud) {
  return (noeud.getAttribute('aria-label') || noeud.textContent || '').trim().replace(/\s+/g, ' ');
}

/* E031-02 et E031-04 : classer chaque arrêt dans un groupe de la frise. Le
   regroupement est déduit de l'ancêtre DOM réel, jamais d'une liste codée en dur
   d'identifiants. */
function groupeDe(noeud) {
  if (noeud.closest('.nav-c2-orientation')) return 'Orientation';
  if (noeud.closest('#atlas-chrono-eras')) return 'Ères';
  if (noeud.closest(`#${TOOLS_ID}`)) return 'Outils';
  if (noeud.closest('#atlas-chrono-events')) return 'Cartes';
  if (noeud.closest('#atlas-chrono-aside')) return 'Fiche';
  return null;
}

/* E031-05 : signature locale calquée sur shell.js:205-220, en lecture seule.
   Elle rend auditable la cible que la coque utilisera pour restaurer le focus,
   sans toucher à data-fk ni à tabindex. */
function signatureDe(noeud, parent) {
  const etiquette = noeud.getAttribute('aria-label') || '';
  let texte = '';
  for (const enfant of noeud.childNodes) {
    if (enfant.nodeType === 3) texte += enfant.nodeValue;
    else if (enfant instanceof Element && enfant.getAttribute('aria-hidden') !== 'true'
      && !enfant.classList.contains('sr-only')) texte += enfant.textContent;
  }
  texte = texte.trim().slice(0, 80);
  const freres = parent
    ? Array.from(parent.children).filter((frere) => frere.tagName === noeud.tagName
      && (frere.getAttribute('aria-label') || '') === etiquette)
    : [];
  const index = freres.indexOf(noeud);
  return [noeud.tagName, noeud.getAttribute('role') || '', etiquette,
    noeud.getAttribute('aria-current') || '', texte, `#${index}`].join(' · ');
}

/* E031-02 : la suite des groupes doit être non décroissante selon GROUPES.
   Un retour en arrière signale un écart entre l'ordre du document et le modèle
   de lecture de la frise — sans que la lentille ne corrige quoi que ce soit. */
function verifierOrdre(suite) {
  let precedent = -1;
  let conforme = true;
  const ecarts = [];
  suite.forEach((groupe) => {
    const rang = GROUPES.indexOf(groupe);
    if (rang >= 0 && rang < precedent) {
      conforme = false;
      ecarts.push(groupe);
    }
    if (rang > precedent) precedent = rang;
  });
  return { conforme, ecarts };
}

/* E031-03 : retrait des badges propres à la lentille avant chaque pose. Cela
   garantit qu'un rejeu de greffon sur le même DOM ne duplique aucun badge. */
function nettoyerBadges(layout) {
  layout.querySelectorAll('.e031-tab-rank').forEach((badge) => badge.remove());
  layout.querySelectorAll('[data-e031-rank], [data-e031-card-rank]').forEach((noeud) => {
    delete noeud.dataset.e031Rank;
    delete noeud.dataset.e031CardRank;
    delete noeud.dataset.e031CardCurrent;
  });
}

register('E031', (ctx) => {
  const fabriquer = ctx && ctx.el;
  if (typeof fabriquer !== 'function' || !ctx || !ctx.layout) return;

  nombreInstallations += 1;
  ctx.css(CSS_ID, CSS);

  const layout = ctx.layout;
  const host = document.getElementById(MAIN_ID) || layout;
  const outils = document.getElementById(TOOLS_ID);
  const recherche = document.getElementById(SEARCH_ID);
  const mouvementReduit = typeof ctx.reducedMotion === 'function'
    ? Boolean(ctx.reducedMotion()) : false;

  /* Le panneau est un bloc en flux, en fin de colonne : jamais modal, jamais
     superposé, jamais tabindex=-1. Il n'ajoute AUCUN arrêt Tab (E031-01). */
  const panneau = assurerNoeud(fabriquer, PANEL_ID, 'section', 'e031-panel', host);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', TITLE_ID);

  const titre = fabriquer('h2', 'e031-title', 'Ordre de tabulation de la frise');
  titre.id = TITLE_ID;
  const lede = fabriquer('p', 'e031-lede', 'Miroir de lecture : il expose l’ordre Tab réel du document. Il ne pose aucun tabindex, ne déplace jamais le focus et n’ajoute aucun raccourci.');
  const liste = fabriquer('ol', 'e031-stop-list');
  liste.id = STOP_LIST_ID;
  const ordre = fabriquer('p', 'e031-order');
  ordre.id = ORDER_ID;
  const groupes = fabriquer('ul', 'e031-groups');
  groupes.id = GROUPS_ID;
  const signatures = fabriquer('ol', 'e031-signatures');
  signatures.id = SIGNATURES_ID;
  const noteSignature = fabriquer('p', 'e031-note');
  noteSignature.id = SIGNATURE_NOTE_ID;
  const fleches = fabriquer('p', 'e031-arrows');
  fleches.id = ARROWS_ID;
  const cartes = fabriquer('p', 'e031-cards');
  cartes.id = CARDS_ID;
  const mouvement = fabriquer('p', 'e031-motion');
  mouvement.id = MOTION_ID;
  const metrique = fabriquer('p', 'e031-metric');
  metrique.id = METRIC_ID;

  panneau.replaceChildren(titre, lede, liste, ordre, groupes, signatures,
    noteSignature, fleches, cartes, mouvement, metrique);

  /* E031-07 : l'indice du champ vit près des outils, sans devenir un arrêt. */
  const indiceRecherche = assurerNoeud(
    fabriquer, SEARCH_HINT_ID, 'p', 'e031-search-hint', outils || host
  );

  nettoyerBadges(layout);

  /* E031-01 : relevé des arrêts dans l'ordre du document, donc dans l'ordre
     où Tab les parcourt réellement. Le panneau lui-même n'en fait pas partie. */
  const arrets = Array.from(layout.querySelectorAll(SELECTEUR_ARRETS))
    .filter((noeud) => noeud !== panneau && !panneau.contains(noeud)
      && noeud !== indiceRecherche);

  const comptes = Object.create(null);
  const suite = [];
  const items = [];
  const lignesSignature = [];
  let rangCartes = 0;

  arrets.forEach((noeud, position) => {
    const rang = position + 1;
    const groupe = groupeDe(noeud);
    if (groupe) {
      comptes[groupe] = (comptes[groupe] || 0) + 1;
      if (suite[suite.length - 1] !== groupe) suite.push(groupe);
    }

    const item = fabriquer('li', 'e031-stop');
    item.append(
      fabriquer('span', 'e031-rank', String(rang)),
      fabriquer('span', 'e031-stop-label', `${groupe || 'Divers'} — ${libelleDe(noeud).slice(0, 60) || 'sans libellé'}`)
    );
    items.push(item);
    lignesSignature.push(fabriquer('li', '', `${rang}. ${signatureDe(noeud, noeud.parentElement)}`));

    /* E031-03 : badge de rang sur les seules bandes et cartes de la frise. */
    if (groupe === 'Ères' || groupe === 'Cartes') {
      const badge = fabriquer('span', 'e031-tab-rank', String(rang));
      badge.setAttribute('aria-hidden', 'true');
      noeud.appendChild(badge);
      noeud.dataset.e031Rank = String(rang);
      nombreBadges += 1;
    }

    /* E031-08 : rang propre aux cartes et repère de la carte courante. */
    if (groupe === 'Cartes') {
      rangCartes += 1;
      noeud.dataset.e031CardRank = String(rangCartes);
      if (noeud.getAttribute('aria-current') === 'true') {
        noeud.dataset.e031CardCurrent = '1';
      }
    }

    /* E031-07 : le rang Tab du champ de recherche est publié sur le champ lui-même. */
    if (noeud === recherche) {
      noeud.dataset.e031SearchRank = String(rang);
    }
  });

  liste.replaceChildren(...items);
  signatures.replaceChildren(...lignesSignature);
  attr(panneau, 'e031StopCount', String(arrets.length));

  /* E031-02 : conformité de la suite de groupes au modèle Ères → Outils →
     Cartes → Fiche. Le texte porte toujours le verdict, jamais la couleur seule. */
  const verification = verifierOrdre(suite);
  const suiteTexte = suite.length ? suite.join(' → ') : 'aucun arrêt observable';
  const verdict = verification.conforme ? 'Conforme' : 'Écart';
  ecrire(ordre, `Ordre Tab observé : ${suiteTexte}. ${verdict} au modèle de la frise.`
    + (verification.ecarts.length ? ` Retour en arrière : ${verification.ecarts.join(', ')}.` : ''));
  attr(ordre, 'e031OrderOk', verification.conforme ? '1' : '0');

  /* E031-04 : légende des groupes et de leur poids en arrêts. */
  const lignesGroupes = GROUPES.filter((groupe) => comptes[groupe] > 0).map((groupe) => {
    const ligne = fabriquer('li', 'e031-group');
    ligne.append(
      fabriquer('span', 'e031-group-name', groupe),
      fabriquer('span', 'e031-group-count', `${comptes[groupe]} arrêt(s)`)
    );
    return ligne;
  });
  groupes.replaceChildren(...lignesGroupes);
  attr(panneau, 'e031GroupCount', String(lignesGroupes.length));

  /* E031-05 : la lentille ne touche jamais à tabindex ; elle mesure ceux qui
     existent et miroir les signatures que la coque utilisera. */
  ecrire(noteSignature, `Signatures en lecture seule : ${lignesSignature.length}. Aucun tabindex ajouté par cette lentille ; tabindex présents dans la vue : ${layout.querySelectorAll('[tabindex]').length}.`);
  attr(panneau, 'e031TabindexTouched', '0');
  attr(panneau, 'e031TabindexSeen', String(layout.querySelectorAll('[tabindex]').length));

  /* E031-06 : deux parcours distincts, explicitement séparés. */
  ecrire(fleches, 'Deux parcours distincts : Tab suit l’ordre du document (orientation → ères → outils → cartes → fiche) ; ← → changent de repère et ↑ ↓ d’ère (keyboard.js:43-51, 171-176) sans déplacer le focus. Tab n’est pas intercepté.');
  attr(panneau, 'e031Routes', '2');

  /* E031-07 : idem visible près du champ, avec son rang calculé. */
  const rangRecherche = recherche ? recherche.dataset.e031SearchRank : null;
  ecrire(indiceRecherche, rangRecherche
    ? `Recherche — arrêt Tab n° ${rangRecherche}. Tab poursuit vers les cartes ; les flèches sont suspendues tant que ce champ a le focus.`
    : 'Recherche — champ non présent dans ce rendu.');
  attr(indiceRecherche, 'e031SearchMarked', rangRecherche ? '1' : '0');

  /* E031-08 : périmètre des cartes déduit de l'aria-label de la liste
     (chronology.js:349-353), jamais d'une date ni d'un effectif codé en dur. */
  const listeEvenements = document.getElementById('atlas-chrono-events');
  const libelleListe = (listeEvenements && listeEvenements.getAttribute('aria-label')) || '';
  const perimetre = /filtr/i.test(libelleListe) ? 'pays entier (filtrage actif)' : 'ère courante';
  ecrire(cartes, `Cartes visibles : ${rangCartes}. Périmètre : ${perimetre}. Le rang de chaque carte est publié dans data-e031-card-rank ; la carte courante porte data-e031-card-current="1".`);
  attr(panneau, 'e031CardCount', String(rangCartes));

  /* E031-09 : préférence exposée sans créer la moindre animation. */
  ecrire(mouvement, `Mouvement réduit : ${mouvementReduit ? 'oui' : 'non'}. Les badges n’animent rien et l’anneau :focus-visible de la coque n’est pas surchargé.`);
  attr(panneau, 'e031Reduced', mouvementReduit ? '1' : '0');

  /* E031-10 : métrique d'unicité, relue à chaque rendu. */
  ecrire(metrique, `Installations : ${nombreInstallations} · arrêts : ${arrets.length} · badges : ${nombreBadges} · feuille CSS : ${CSS_ID}. Un seul greffon, un seul panneau.`);
  attr(panneau, 'e031Installs', String(nombreInstallations));
  attr(panneau, 'e031Badges', String(nombreBadges));
  attr(panneau, 'e031View', ctx.viewId || 'chronologyv2');
});
