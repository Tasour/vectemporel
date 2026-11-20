import { register } from './registry.js';

/* Lentille E053 — Passe V2 CHRONOLOGIE (domaine F : sémantique & données).
 * Thème : « forme P = (S, R, O, T, E, D, Src, C) rendue lisible ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E053.md
 * Chantiers : E053-01 à E053-10 (dix angles non chevauchants d'un même thème).
 *
 * Fichier possédé : src/views/chronology/v2/E053.js uniquement. Aucun fichier
 * partagé n'est modifié : ni registry.js, ni index.js, ni styles.css, ni
 * src/views/chronology.js, ni la passe 1, ni une autre lentille.
 *
 * Contrat exploité : viewId ('chronologyv2'), stage, layout, css, el,
 * reducedMotion. Le registre V2 ne fournit pas de say() : la lentille n'ajoute
 * aucune région live concurrente ; elle n'utilise qu'un seul role="status"
 * local, dédupliqué, pour le compteur de champs.
 *
 * Note d'autonomie : le code de la vue V2 n'étant ni possédé ni consultable,
 * la lecture est multi-critères (data-*, classes, aria-*) et chaque champ
 * absent est déclaré explicitement « Non exposé par la vue de base ». Aucune
 * donnée historique, aucune date, aucune relation n'est inventée : la forme
 * canonique est rendue comme un relevé vérifiable, jamais comme un résumé.
 *
 * Invariants :
 * - un seul enregistrement sous l'identifiant E053 ;
 * - une seule feuille CSS, injectée une seule fois sous l'identifiant canonique ;
 * - IDs tous préfixés 'chronology-v2-e053-' avec garde d'existence ;
 * - zéro journalisation, réseau, aléa, HTML brut, timer, animation ou écouteur.
 */

const CSS_ID = 'chronology-v2-e053';
const PREFIXE = 'chronology-v2-e053';

/* E053-01 / E053-10 : identifiants stables, tous préfixés. */
const IDS = {
  panneau: 'chronology-v2-e053-panel',
  titre: 'chronology-v2-e053-title',
  intro: 'chronology-v2-e053-lede',
  champs: 'chronology-v2-e053-fields',
  verite: 'chronology-v2-e053-truth',
  statut: 'chronology-v2-e053-status',
  notes: 'chronology-v2-e053-notes',
};

/* E053-02 : les huit lettres de la forme canonique, dans leur ordre exact. */
const LETTRES = ['S', 'R', 'O', 'T', 'E', 'D', 'Src', 'C'];

/* La lettre seule n'est jamais une explication : chaque champ porte son nom
   français, lisible sans CSS et indexable dans un paragraphe réel. */
const NOMS = {
  S: 'Sujet · qui / quoi',
  R: 'Relation · prédicat',
  O: 'Objet · complément',
  T: 'Temps · ancre datée',
  E: 'Échelle · portée',
  D: 'Domaine · matrice',
  Src: 'Sources · références',
  C: 'Certitude · degré',
};

const ABSENT = 'Non exposé par la vue de base.';
const SILENCE = 'Aucune référence renseignée — omission explicite.';

/* E053-03 à E053-08 : sélecteurs larges, ordonnés du plus précis au plus
   générique. La lecture tolère aussi bien le DOM de la passe 1 que celui,
   non consultable, de la passe V2. */
const SELECTEURS = {
  repere: [
    '#atlas-chrono-event-title', '.aside-title', '[data-event-title]',
    '.event-card[aria-current="true"] strong', '.event-card.is-active strong',
  ],
  annee: [
    '.event-card[aria-current="true"] .event-year',
    'li[data-event-id][aria-current="true"]',
    '.aside-year', '.event-year', '[data-year]',
  ],
  ere: [
    '.era-band[aria-current="true"] span', '.era-band.is-active span',
    '[data-era-id] span', '.atlas-chrono-era-range',
  ],
  themes: [
    '.atlas-chrono-tags .atlas-chrono-tag', '.aside-tags .atlas-chrono-tag',
    'li[data-event-id][data-tags]', '[data-tags]',
  ],
  points: [
    '[data-chronology-v2-e053-point].is-active', '.point.is-active',
    '.point[aria-current="true"]', '[data-point-id]', '.point',
  ],
};

/* Lectures de texte : uniquement createElement/ctx.el et textContent,
   jamais d'HTML brut, jamais de donnée interprétée comme balise. */
function texte(noeud) {
  return noeud && typeof noeud.textContent === 'string' ? noeud.textContent.trim() : '';
}

function trouver(racine, selecteurs) {
  if (!racine || typeof racine.querySelector !== 'function') return null;
  for (const selecteur of selecteurs) {
    const noeud = racine.querySelector(selecteur);
    if (noeud) return noeud;
  }
  return null;
}

function lireTexte(racine, selecteurs) {
  return texte(trouver(racine, selecteurs));
}

function attribut(noeud, noms) {
  if (!noeud) return '';
  for (const nom of noms) {
    const valeur = noeud.getAttribute(nom);
    if (valeur && valeur.trim()) return valeur.trim();
  }
  return '';
}

/* E053-04 / E053-07 / E053-08 : le point courant est détecté par signaux
   successifs ; à défaut, le premier point rendu sert de référence. */
function pointCourant(racine) {
  return trouver(racine, SELECTEURS.points);
}

/* E053-05 : T est lu dans l'année du repère ; le signe négatif est une
   convention de notation (« av. J.-C. »), jamais une date codée en dur. */
function lireAnnee(racine) {
  const brut = lireTexte(racine, SELECTEURS.annee);
  const donnees = attribut(trouver(racine, SELECTEURS.annee), ['data-year']);
  const valeur = donnees || brut;
  if (!valeur) return '';
  const extrait = /^(-?\d+)/.exec(valeur);
  if (!extrait) return valeur.slice(0, 48);
  const nombre = extrait[1];
  return nombre.startsWith('-') ? `${nombre.slice(1)} av. J.-C.` : nombre;
}

/* E053-07 : un silence de source est une donnée nommée, pas un vide masqué. */
function lireSources(point) {
  if (!point) return { valeur: ABSENT, silence: true, origine: 'absent' };
  let lignes = [];
  if (typeof point.querySelectorAll === 'function') {
    lignes = Array.prototype.slice.call(point.querySelectorAll('.point-sources li, [data-source-id]'));
  }
  const valeurs = lignes
    .map((ligne) => attribut(ligne, ['data-source-id']) || texte(ligne))
    .filter(Boolean);
  if (!valeurs.length) return { valeur: SILENCE, silence: true, origine: 'point' };
  return { valeur: valeurs.join(', '), silence: false, origine: 'point' };
}

/* E053-06 : le domaine est la matrice de thèmes du repère (et non le niveau
   de certitude du point) ; l'échelle est l'ère courante. */
function lireThemes(racine) {
  const noeud = trouver(racine, SELECTEURS.themes);
  if (!noeud) return '';
  const donnees = noeud.getAttribute('data-tags');
  if (donnees) return donnees.trim().split(/\s+/).join(', ');
  const frere = racine.querySelectorAll(SELECTEURS.themes.join(', '));
  return Array.prototype.slice.call(frere)
    .map(texte).filter(Boolean).join(', ');
}

/* E053-02 à E053-08 : les huit champs, chacun avec son origine auditable. */
function lireChamps(racine) {
  const point = pointCourant(racine);

  const sujet = lireTexte(racine, SELECTEURS.repere) || ABSENT;
  const relation = point
    ? (attribut(point, ['data-kind', 'data-predicate', 'data-relation'])
      || lireTexte(point, ['.point-kind', '[data-kind]', '.predicate']) || ABSENT)
    : ABSENT;
  const objet = point
    ? (lireTexte(point, ['[data-point-text]', '.point-text', 'p']) || ABSENT)
    : ABSENT;
  const temps = lireAnnee(racine) || ABSENT;
  const echelle = lireTexte(racine, SELECTEURS.ere) || ABSENT;
  const domaine = lireThemes(racine) || ABSENT;
  const sources = lireSources(point);
  const certitude = point
    ? (attribut(point, ['data-confidence', 'data-certainty'])
      || lireTexte(point, ['.confidence', '[data-confidence]']) || ABSENT)
    : ABSENT;

  const brut = {
    S: { valeur: sujet, origine: sujet === ABSENT ? 'absent' : 'repère' },
    R: { valeur: relation, origine: relation === ABSENT ? 'absent' : 'point' },
    O: { valeur: objet, origine: objet === ABSENT ? 'absent' : 'point' },
    T: { valeur: temps, origine: temps === ABSENT ? 'absent' : 'repère' },
    E: { valeur: echelle, origine: echelle === ABSENT ? 'absent' : 'ère' },
    D: { valeur: domaine, origine: domaine === ABSENT ? 'absent' : 'repère' },
    Src: sources,
    C: { valeur: certitude, origine: certitude === ABSENT ? 'absent' : 'point' },
  };

  /* E053-09 : le compteur dérive des valeurs réellement lues, jamais d'une
     constante : « 8/8 » devient falsifiable. */
  return LETTRES.map((lettre) => ({
    lettre,
    nom: NOMS[lettre],
    valeur: brut[lettre].valeur,
    origine: brut[lettre].origine,
    silence: Boolean(brut[lettre].silence),
  }));
}

/* E053-10 : garde d'existence. Un nœud retrouvé dans un ancien parent détaché
   est déplacé, jamais cloné : un seul panneau, quels que soient les re-rendus. */
function assurerNoeud(fabriquer, id, balise, classe, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = fabriquer(balise, classe);
    noeud.id = id;
  }
  if (noeud.parentElement !== parent) parent.appendChild(noeud);
  return noeud;
}

function ecrire(noeud, texteAVecrire) {
  if (noeud && noeud.textContent !== texteAVecrire) noeud.textContent = texteAVecrire;
}

function mouvement(ctx) {
  if (typeof ctx.reducedMotion !== 'function') return 'complet';
  try { return ctx.reducedMotion() ? 'reduit' : 'complet'; }
  catch { return 'complet'; }
}

/* E053-01 / E053-04 / E053-08 / E053-10 : feuille unique, strictement locale
   au panneau. Aucune animation propre, repli mouvement réduit, contraste
   forcé et colonne étroite ; la clé de champ n'est jamais portée par la seule
   couleur (bordure + texte + hauteur minimale). */
const CSS = `
  #${IDS.panneau} {
    margin: 18px 0 0; padding: 12px 14px 13px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${IDS.panneau} .${PREFIXE}-titre {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
  }
  #${IDS.panneau} .${PREFIXE}-lede { margin: 0 0 10px; color: var(--muted); }
  #${IDS.panneau} .${PREFIXE}-sous-titre {
    margin: 10px 0 5px; color: var(--gold-bright); font-weight: 600;
  }
  #${IDS.panneau} ul, #${IDS.panneau} ol { margin: 0; padding: 0; list-style: none; }
  #${IDS.panneau} .${PREFIXE}-champ {
    display: grid; grid-template-columns: 34px minmax(0, 1fr);
    column-gap: 9px; row-gap: 1px; padding: 6px 0;
    border-bottom: 1px solid var(--line);
  }
  #${IDS.panneau} .${PREFIXE}-cle {
    grid-row: span 2; align-self: start;
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 24px; min-height: 24px; padding: 0 3px;
    border: 1px solid var(--gold); border-radius: 5px;
    color: var(--gold-bright); font-size: 10px; font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  #${IDS.panneau} .${PREFIXE}-nom {
    color: var(--muted-2); font-size: 9px;
    letter-spacing: .02em; text-transform: uppercase;
  }
  #${IDS.panneau} .${PREFIXE}-valeur { color: var(--ink-soft); }
  #${IDS.panneau} .${PREFIXE}-champ[data-${PREFIXE}-origine="absent"] .${PREFIXE}-valeur {
    color: var(--muted-2); font-style: italic;
  }
  #${IDS.panneau} [data-${PREFIXE}-silence="1"] .${PREFIXE}-cle {
    border-style: dashed;
  }
  #${IDS.panneau} .${PREFIXE}-verite { margin-top: 4px; padding-left: 15px; list-style: disc; }
  #${IDS.panneau} .${PREFIXE}-verite li { margin-bottom: 4px; color: var(--muted); }
  #${IDS.panneau} .${PREFIXE}-statut {
    margin: 10px 0 0; padding-top: 8px; border-top: 1px solid var(--line);
    color: var(--gold); font-variant-numeric: tabular-nums;
  }
  #${IDS.panneau} .${PREFIXE}-note { margin: 5px 0 0; color: var(--muted-2); font-size: 10px; }
  #${IDS.panneau}:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  @media (max-width: 620px) {
    #${IDS.panneau} { padding: 10px 11px 11px; }
    #${IDS.panneau} .${PREFIXE}-champ { grid-template-columns: 30px minmax(0, 1fr); column-gap: 7px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${IDS.panneau}, #${IDS.panneau} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${IDS.panneau} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${IDS.panneau} .${PREFIXE}-titre,
    #${IDS.panneau} .${PREFIXE}-sous-titre,
    #${IDS.panneau} .${PREFIXE}-statut,
    #${IDS.panneau} .${PREFIXE}-cle { border-color: CanvasText; color: CanvasText; }
  }
`;

/* E053-02 : unique point d'entrée de construction. Le panneau est réutilisé
   (garde d'existence) mais ses enfants sont reconstruits par replaceChildren :
   un seul exemplaire de chaque ID, même si runEnhancements est rejoué. */
function construirePanneau(fabriquer, ctx, racine) {
  const parent = ctx.layout || ctx.stage;
  const panneau = assurerNoeud(fabriquer, IDS.panneau, 'section', `${PREFIXE}-panneau`, parent);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', IDS.titre);
  panneau.setAttribute(`data-${PREFIXE}-passe`, 'v2');

  const titre = fabriquer('h2', `${PREFIXE}-titre`,
    'Lecture sémantique · P = (S, R, O, T, E, D, Src, C)');
  titre.id = IDS.titre;

  const intro = fabriquer('p', `${PREFIXE}-lede`,
    'Un point est la plus petite unité de connaissance vérifiable : un sujet, une relation, un objet, une ancre temporelle, une échelle, un domaine, une source et un degré de certitude. Chaque lettre ci-dessous est un fait à contrôler, jamais une date résumée.');
  intro.id = IDS.intro;

  const champs = lireChamps(racine);
  const liste = fabriquer('ol', `${PREFIXE}-champs`);
  liste.id = IDS.champs;
  champs.forEach((champ) => {
    const ligne = fabriquer('li', `${PREFIXE}-champ`);
    ligne.setAttribute(`data-${PREFIXE}-field`, champ.lettre);
    ligne.setAttribute(`data-${PREFIXE}-origine`, champ.origine);
    if (champ.lettre === 'T') ligne.setAttribute(`data-${PREFIXE}-sans-date-codage`, '1');
    if (champ.silence) ligne.setAttribute(`data-${PREFIXE}-silence`, '1');
    if (champ.lettre === 'C') ligne.setAttribute(`data-${PREFIXE}-valeur-textuelle`, champ.valeur);
    ligne.append(
      fabriquer('span', `${PREFIXE}-cle`, champ.lettre),
      fabriquer('span', `${PREFIXE}-nom`, champ.nom),
      fabriquer('span', `${PREFIXE}-valeur`, champ.valeur)
    );
    liste.appendChild(ligne);
  });

  const sousTitreVerite = fabriquer('p', `${PREFIXE}-sous-titre`, 'Fiche de vérité');
  const verite = fabriquer('ul', `${PREFIXE}-verite`);
  verite.id = IDS.verite;
  verite.append(
    fabriquer('li', '', 'P = (S, R, O, T, E, D, Src, C) : huit champs définis par la méthodologie du point.'),
    fabriquer('li', '', 'S, T et D sont lus dans le repère courant ; R, O et C sont lus dans le point, sans deviner leur contenu.'),
    fabriquer('li', '', 'T est lu depuis l’année affichée par la vue ; aucun millésime n’est écrit dans cette lentille.')
  );

  const remplis = champs.filter((champ) => champ.valeur && champ.valeur !== ABSENT).length;
  const statut = fabriquer('p', `${PREFIXE}-statut`, '');
  statut.id = IDS.statut;
  statut.setAttribute('role', 'status');
  statut.setAttribute('aria-live', 'polite');
  statut.setAttribute('aria-atomic', 'true');
  ecrire(statut, `Champs renseignés : ${remplis}/8 · origine : DOM de la vue · mouvement : ${mouvement(ctx)}.`);

  const notes = fabriquer('div', `${PREFIXE}-notes`);
  notes.id = IDS.notes;
  notes.replaceChildren(
    fabriquer('p', `${PREFIXE}-note`, 'S · R · O : le repère fournit le sujet, le type de point fournit la relation, le texte du point fournit l’objet. Aucune phrase n’est recomposée à partir d’un autre champ.'),
    fabriquer('p', `${PREFIXE}-note`, 'T · E · D : l’année, l’ère et les thèmes sont lus tels qu’affichés. Une année négative est notée « av. J.-C. » par convention, sans inventer de date.'),
    fabriquer('p', `${PREFIXE}-note`, 'Src : une absence de référence est affichée comme omission explicite. Un silence de la frise reste une donnée, jamais un vide interprété comme une preuve.'),
    fabriquer('p', `${PREFIXE}-note`, 'C : le degré de certitude est toujours écrit en toutes lettres. La couleur n’est qu’un renfort, conservé en mode contraste forcé.')
  );

  panneau.replaceChildren(titre, intro, liste, sousTitreVerite, verite, statut, notes);

  /* E053-01 / E053-09 / E053-10 : traces auditables, toutes dérivées du DOM. */
  panneau.setAttribute(`data-${PREFIXE}-champs`, String(champs.length));
  panneau.setAttribute(`data-${PREFIXE}-renseignes`, String(remplis));
  panneau.setAttribute(`data-${PREFIXE}-mouvement`, mouvement(ctx));
  panneau.setAttribute(`data-${PREFIXE}-point`, pointCourant(racine) ? 'present' : 'absent');
  return panneau;
}

function installer(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'chronologyv2') return;
  if (!ctx.layout && !ctx.stage) return;

  const fabriquer = ctx.el;

  ctx.css(CSS_ID, CSS);
  if (ctx.layout && typeof ctx.layout.setAttribute === 'function') {
    ctx.layout.setAttribute(`data-${PREFIXE}`, '1');
  }

  const racine = ctx.stage || ctx.layout;
  const panneau = construirePanneau(fabriquer, ctx, racine);
  panneau.setAttribute(`data-${PREFIXE}-installe`, '1');
}

/* E053-01 / E053-10 : un seul point d'entrée. Une structure inattendue
   neutralise la lentille, jamais le rendu de la vue. */
register('E053', (ctx) => {
  try { installer(ctx); }
  catch { /* neutralisation silencieuse, conforme au contrat du registre. */ }
});
