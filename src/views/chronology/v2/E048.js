import { register } from './registry.js';

/* Lentille E048 (passe V2, domaine E — Accessibilité & ARIA) :
   AUCUNE INFORMATION PORTÉE PAR LA SEULE COULEUR.

   Fichier possédé : src/views/chronology/v2/E048.js uniquement. Rapport possédé :
   UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E048.md — chantiers E048-01 à E048-10.
   Modèles de qualité lus : src/views/chronology/E049.js et
   UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md. Aucun fichier partagé n'est modifié :
   ni registry.js, ni index.js, ni styles.css, ni src/views/chronology.js, ni la
   passe 1, ni une autre lentille V2.

   Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } ; helpers
   ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
   Une seule feuille via ctx.css('chronology-v2-e048', …) ; exactement un
   register('E048', ctx => { … }). Tous les IDs DOM sont préfixés
   chronology-v2-e048- et protégés par une garde d'existence.

   Invariants : zéro console.*, zéro fetch/XHR, zéro import distant, zéro
   Math.random, zéro innerHTML (replaceChildren, appendChild, textContent),
   zéro timer, zéro boucle rAF, zéro écouteur, zéro région live ajoutée,
   zéro vol de focus. La lentille ne supprime aucun style existant : elle
   AJOUTE un doublon textuel ou géométrique à chaque signal coloré. */

const CSS_ID = 'chronology-v2-e048';
const MAIN_ID = 'atlas-chrono-main';
const ASIDE_ID = 'atlas-chrono-aside';

/* Toutes les IDs possédées, explicitement énumérées pour l'audit E083. */
const ID = {
  PANEL: 'chronology-v2-e048-panel',
  TITLE: 'chronology-v2-e048-title',
  REGISTER: 'chronology-v2-e048-register',
  METRIC: 'chronology-v2-e048-metric',
};

/* Formes géométriques affectées de façon déterministe (aucun aléa) aux
   familles de points rencontrées, dans l'ordre alphabétique français. */
const FORMES = ['■', '▲', '◆', '●'];

/* Registre visible des codages : chaque ligne nomme le signal coloré et son
   équivalent non coloré. C'est le cœur de E048-08, lisible sans stylesheet. */
const CODAGES = [
  ['Ère courante', 'Pastille pleine ● et texte « Ère courante » sur la bande, en plus de aria-current.'],
  ['Repère affiché', 'Triangle ▶ et texte « Repère affiché » sur la carte, en plus de aria-current.'],
  ['Famille de point', 'Forme ■ ▲ ◆ ● accolée au libellé textuel de la famille, répétée dans le registre.'],
  ['Niveau de confiance', 'Barres ▮▮▮ / ▮▮ / ▮ accolées au libellé textuel du niveau.'],
  ['Puce de filtre active', 'Suffixe visible « actif » ou « inactif », en plus de aria-pressed.'],
  ['Couleur d’ère', 'Ordinal « Ère N » en texte, indépendamment de la teinte --era.'],
  ['Fil d’Ariane', 'Marqueur « (ici) » en texte sur le crumb courant, en plus de aria-current.'],
  ['Contraste forcé', 'Bordure et texte CanvasText : chaque marqueur survit à forced-colors.'],
  ['Mouvement réduit', 'Aucune transition ni animation propre ; l’état est publié en texte.'],
  ['Idempotence', 'Un seul greffon, une seule feuille, un seul jeu de marqueurs après re-render.'],
];

/* E048-01 à E048-09 : une seule feuille, injectée une fois par ctx.css.
   Les marqueurs ajoutés portent TOUJOURS un glyphe et/ou un texte : aucune
   règle ne repose sur var(--gold), var(--era) ou une teinte comme unique
   vecteur d'information. Le panneau est un bloc en flux, jamais une modale. */
const CSS = `
  #${ID.PANEL} {
    margin: 16px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${ID.PANEL} .e048-title {
    margin: 0 0 6px; color: var(--gold-bright); font-family: var(--serif);
    font-size: 14px; font-weight: 600; letter-spacing: 0; text-transform: none;
  }
  #${ID.PANEL} .e048-lede { margin: 0 0 8px; color: var(--muted); }
  #${ID.PANEL} .e048-register { margin: 0; padding: 0; list-style: none; }
  #${ID.PANEL} .e048-row {
    display: flex; gap: 8px; padding: 5px 0;
    border-top: 1px dashed var(--line);
  }
  #${ID.PANEL} .e048-row:first-child { border-top: 0; }
  #${ID.PANEL} .e048-key {
    flex: 0 0 132px; color: var(--gold-bright); font-weight: 600;
  }
  #${ID.PANEL} .e048-value { flex: 1 1 auto; min-width: 0; color: var(--muted); }
  #${ID.PANEL} .e048-metric {
    margin: 8px 0 0; color: var(--muted-2); font-size: 9px;
  }
  /* E048-01 et E048-02 : drapeaux textuels + forme sur les éléments courants. */
  .chronology-v2-e048-flag {
    display: inline-flex; align-items: center; gap: 4px;
    margin-inline-start: 6px; padding: 0 5px;
    border: 1px solid var(--line-strong); border-radius: 999px;
    color: var(--gold-bright); font-size: 9px; font-weight: 600; white-space: nowrap;
  }
  .chronology-v2-e048-flag::before { content: '●'; font-size: 8px; }
  .chronology-v2-e048-flag[data-e048-forme="triangle"]::before { content: '▶'; }
  /* E048-03, E048-04, E048-05, E048-06, E048-07 : redondances textuelles. */
  .chronology-v2-e048-ordinal,
  .chronology-v2-e048-kind-form,
  .chronology-v2-e048-conf-form,
  .chronology-v2-e048-filter-state,
  .chronology-v2-e048-here {
    font-size: 9px; font-weight: 600; color: var(--gold-bright);
  }
  .chronology-v2-e048-ordinal { margin-inline-start: 5px; }
  .chronology-v2-e048-filter-state { margin-inline-start: 2px; font-weight: 400; }
  /* E048-09 : aucun mouvement propre, replis contraste et forced-colors. */
  @media (prefers-reduced-motion: reduce) {
    #${ID.PANEL}, #${ID.PANEL} *, .chronology-v2-e048-flag { transition: none !important; }
  }
  @media (prefers-contrast: more) {
    .chronology-v2-e048-flag { border-width: 2px; font-weight: 700; }
  }
  @media (forced-colors: active) {
    #${ID.PANEL}, .chronology-v2-e048-flag {
      border-color: CanvasText; background: Canvas; color: CanvasText;
    }
    #${ID.PANEL} .e048-title, #${ID.PANEL} .e048-key,
    #${ID.PANEL} .e048-value, #${ID.PANEL} .e048-metric,
    .chronology-v2-e048-ordinal, .chronology-v2-e048-kind-form,
    .chronology-v2-e048-conf-form, .chronology-v2-e048-filter-state,
    .chronology-v2-e048-here { color: CanvasText; }
  }
  @media (max-width: 620px) {
    #${ID.PANEL} .e048-row { flex-wrap: wrap; gap: 2px 8px; }
    #${ID.PANEL} .e048-key { flex-basis: 100%; }
  }
`;

let rendus = 0;
let mouvementReduit = false;
let refs = { panneau: null, metrique: null };

/* E048-10 : garde d'existence pour toute ID préfixée chronology-v2-e048-.
   Un nœud déjà présent est réutilisé et déplacé dans le parent courant : la
   coque reconstruisant #app, un nœud de la rendu précédente est détaché et
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

/* Enfant direct porteur d'une classe : évite de confondre un marqueur greffé
   avec un nœud identique appartenant à une autre ère ou à une autre carte. */
function enfantDirect(parent, classe) {
  return Array.from(parent.children).find((noeud) => noeud.classList.contains(classe)) || null;
}

function marqueDecorator(fabriquer, parent, classe, texte) {
  const marque = enfantDirect(parent, classe) || fabriquer('span', classe);
  marque.setAttribute('aria-hidden', 'true');
  ecrire(marque, texte);
  if (marque.parentElement !== parent) parent.insertBefore(marque, parent.firstChild);
  return marque;
}

/* E048-01 : l'ère courante est aujourd'hui signalée par bordure dorée et
   box-shadow. On ajoute un drapeau textuel et une pastille pleine. */
function annoterEreCourante(fabriquer, comptes) {
  const bandes = Array.from(document.querySelectorAll(`#${MAIN_ID} .era-band`));
  comptes.eres = bandes.length;
  bandes.forEach((bande) => {
    const courante = bande.getAttribute('aria-current') === 'true';
    const etat = courante ? '1' : '0';
    if (bande.dataset.e048Current !== etat) bande.dataset.e048Current = etat;
    if (!courante) return;
    if (bande.dataset.e048Flag !== '1') {
      const drapeau = fabriquer('span', 'chronology-v2-e048-flag', 'Ère courante');
      drapeau.dataset.e048Forme = 'disque';
      bande.appendChild(drapeau);
      bande.dataset.e048Flag = '1';
    }
    comptes.bandesCourantes += 1;
  });
}

/* E048-06 : la teinte --era est le seul code d'appartenance des bandes. On
   ajoute un ordinal « Ère N » en texte, stable et indépendant de la couleur. */
function annoterOrdinaux(fabriquer, comptes) {
  const bandes = Array.from(document.querySelectorAll(`#${MAIN_ID} .era-band`));
  bandes.forEach((bande, index) => {
    const libelle = `Ère ${index + 1}`;
    if (bande.dataset.e048Ordinal !== libelle) bande.dataset.e048Ordinal = libelle;
    const ordinal = enfantDirect(bande, 'chronology-v2-e048-ordinal')
      || fabriquer('span', 'chronology-v2-e048-ordinal');
    ordinal.setAttribute('aria-hidden', 'true');
    ecrire(ordinal, libelle);
    if (ordinal.parentElement !== bande) bande.appendChild(ordinal);
    comptes.eresOrdinees += 1;
  });
}

/* E048-02 : la carte courante repose sur border-color:var(--gold) et un
   box-shadow. On ajoute un triangle ▶ et le texte « Repère affiché ». */
function annoterCarteCourante(fabriquer, comptes) {
  const cartes = Array.from(document.querySelectorAll(`#${MAIN_ID} .event-card`));
  comptes.cartes = cartes.length;
  cartes.forEach((carte) => {
    const courante = carte.getAttribute('aria-current') === 'true';
    const etat = courante ? '1' : '0';
    if (carte.dataset.e048Current !== etat) carte.dataset.e048Current = etat;
    if (!courante) return;
    if (carte.dataset.e048Flag !== '1') {
      const drapeau = fabriquer('span', 'chronology-v2-e048-flag', 'Repère affiché');
      drapeau.dataset.e048Forme = 'triangle';
      carte.appendChild(drapeau);
      carte.dataset.e048Flag = '1';
    }
    comptes.cartesCourantes += 1;
  });
}

/* E048-03 : les badges .point-kind sont teintés par famille. On leur accole
   une forme déterministe, assignée par ordre alphabétique des libellés réels
   relevés dans le DOM — aucune donnée historique n'est inventée. */
function annoterFamilles(fabriquer, comptes) {
  const noeuds = Array.from(document.querySelectorAll(`#${ASIDE_ID} .point-kind`));
  const libelles = Array.from(new Set(noeuds.map((noeud) =>
    (noeud.dataset.e048Label || noeud.textContent || '').trim()
  ))).sort((a, b) => a.localeCompare(b, 'fr'));
  const formes = new Map(libelles.map((libelle, index) => [libelle, FORMES[index % FORMES.length]]));
  noeuds.forEach((noeud) => {
    const libelle = (noeud.dataset.e048Label || noeud.textContent || '').trim();
    if (!noeud.dataset.e048Label && libelle) noeud.dataset.e048Label = libelle;
    const forme = formes.get(libelle) || FORMES[0];
    if (noeud.dataset.e048Forme !== forme) noeud.dataset.e048Forme = forme;
    marqueDecorator(fabriquer, noeud, 'chronology-v2-e048-kind-form', `${forme} `);
    comptes.familles += 1;
  });
  return formes;
}

/* E048-04 : le niveau de confiance est porté par la teinte du badge. On ajoute
   une échelle de barres ▮, lisible en noir et blanc, et on conserve le libellé
   d'origine dans un dataset pour ne jamais le réinjecter tronqué. */
function annoterConfiance(fabriquer, comptes) {
  const noeuds = Array.from(document.querySelectorAll(`#${ASIDE_ID} .confidence`));
  noeuds.forEach((noeud) => {
    const libelle = (noeud.dataset.e048Label || noeud.textContent || '').trim();
    if (!noeud.dataset.e048Label && libelle) noeud.dataset.e048Label = libelle;
    const bas = libelle.toLocaleLowerCase('fr');
    const barres = /élev|haut|fort|certain/.test(bas)
      ? '▮▮▮' : /faible|bas|incertain/.test(bas) ? '▮' : '▮▮';
    if (noeud.dataset.e048Barres !== barres) noeud.dataset.e048Barres = barres;
    marqueDecorator(fabriquer, noeud, 'chronology-v2-e048-conf-form', `${barres} `);
    comptes.confiance += 1;
  });
}

/* E048-05 : aria-pressed est doublé d'une couleur de bordure. On ajoute un
   suffixe visible « actif » / « inactif », masqué aux lecteurs d'écran puisque
   aria-pressed porte déjà l'état : zéro bavardage, information non colorée. */
function annoterFiltres(fabriquer, comptes) {
  const puces = Array.from(document.querySelectorAll('.atlas-chrono-tag[aria-pressed]'));
  puces.forEach((puce) => {
    const actif = puce.getAttribute('aria-pressed') === 'true';
    const etat = actif ? 'actif' : 'inactif';
    if (puce.dataset.e048State !== etat) puce.dataset.e048State = etat;
    const suffixe = enfantDirect(puce, 'chronology-v2-e048-filter-state')
      || fabriquer('span', 'chronology-v2-e048-filter-state');
    suffixe.setAttribute('aria-hidden', 'true');
    ecrire(suffixe, ` — ${etat}`);
    if (suffixe.parentElement !== puce) puce.appendChild(suffixe);
    comptes.puces += 1;
  });
}

/* E048-07 : le crumb courant du fil d'Ariane est seulement doré. On ajoute
   « (ici) » en texte, doublé de aria-current="location" déjà présent. */
function annoterFil(fabriquer, comptes) {
  const crumbs = Array.from(document.querySelectorAll(`#${MAIN_ID} .nav-c2-crumb.is-current`));
  crumbs.forEach((crumb) => {
    if (crumb.dataset.e048Here !== '1') crumb.dataset.e048Here = '1';
    const marque = enfantDirect(crumb, 'chronology-v2-e048-here')
      || fabriquer('span', 'chronology-v2-e048-here');
    marque.setAttribute('aria-hidden', 'true');
    ecrire(marque, ' (ici)');
    if (marque.parentElement !== crumb) crumb.appendChild(marque);
    comptes.fil += 1;
  });
}

function publierMetriques(panneau, metrique, comptes, formes) {
  panneau.dataset.e048Renders = String(rendus);
  panneau.dataset.e048Eras = String(comptes.eres);
  panneau.dataset.e048Bands = `${comptes.bandesCourantes}/${comptes.eres}`;
  panneau.dataset.e048Cards = `${comptes.cartesCourantes}/${comptes.cartes}`;
  panneau.dataset.e048Kinds = String(comptes.familles);
  panneau.dataset.e048Confidence = String(comptes.confiance);
  panneau.dataset.e048Filters = String(comptes.puces);
  panneau.dataset.e048Ordinals = String(comptes.eresOrdinees);
  panneau.dataset.e048Trail = String(comptes.fil);
  panneau.dataset.e048Signals = String(CODAGES.length);
  panneau.dataset.e048Forms = Array.from(formes.values()).join('');
  panneau.dataset.e048Reduced = mouvementReduit ? '1' : '0';
  ecrire(metrique,
    `Rendus : ${rendus} · ères : ${comptes.eres} (courantes : ${comptes.bandesCourantes}) · cartes : ${comptes.cartes} (courantes : ${comptes.cartesCourantes}) · familles : ${comptes.familles} · confiances : ${comptes.confiance} · puces : ${comptes.puces} · ordinaux : ${comptes.eresOrdinees} · fil : ${comptes.fil} · signaux : ${CODAGES.length} · mouvement réduit : ${mouvementReduit ? 'oui' : 'non'}.`);
}

/* E048-10 : exactement un register, sous la forme ctx => { … }. */
register('E048', ctx => {
  const fabriquer = ctx && ctx.el;
  if (typeof fabriquer !== 'function' || !ctx || !ctx.layout) return;

  rendus += 1;
  ctx.css(CSS_ID, CSS);
  mouvementReduit = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const panneau = assurerNoeud(fabriquer, ID.PANEL, 'section', 'chronology-v2-e048-panel', host);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', ID.TITLE);
  panneau.dataset.e048View = ctx.viewId || '';

  const titre = fabriquer('h2', 'e048-title', 'Aucune information par la seule couleur');
  titre.id = ID.TITLE;
  const lede = fabriquer('p', 'e048-lede', 'Chaque signal coloré de la frise est doublé d’un texte ou d’une forme : ère courante, repère affiché, famille de point, confiance, filtre actif, couleur d’ère et fil d’Ariane.');
  const registre = fabriquer('ul', 'e048-register');
  registre.id = ID.REGISTER;
  CODAGES.forEach(([signal, equivalent]) => {
    const ligne = fabriquer('li', 'e048-row');
    ligne.append(
      fabriquer('span', 'e048-key', signal),
      fabriquer('span', 'e048-value', equivalent)
    );
    registre.appendChild(ligne);
  });
  const metrique = fabriquer('p', 'e048-metric');
  metrique.id = ID.METRIC;
  panneau.replaceChildren(titre, lede, registre, metrique);
  refs = { panneau, metrique };

  const comptes = {
    eres: 0, bandesCourantes: 0, cartes: 0, cartesCourantes: 0,
    familles: 0, confiance: 0, puces: 0, eresOrdinees: 0, fil: 0,
  };
  annoterEreCourante(fabriquer, comptes);
  annoterCarteCourante(fabriquer, comptes);
  annoterOrdinaux(fabriquer, comptes);
  const formes = annoterFamilles(fabriquer, comptes);
  annoterConfiance(fabriquer, comptes);
  annoterFiltres(fabriquer, comptes);
  annoterFil(fabriquer, comptes);

  publierMetriques(panneau, metrique, comptes, formes);
});
