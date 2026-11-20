import { register } from './registry.js';

/* Lentille V2 E097 — domaine J : pédagogie & narration. La passe 1
 * (src/views/points/E097.js) propose un MICRO-TUTORIEL en trois temps qui
 * apprend à lire les axes de la matrice (lignes = ères, colonnes = domaines,
 * cellules = croisements). La V2 propose dix chantiers NEUFS ET DISTINCTS,
 * centrés sur le PARCOURS DE LECTURE commenté et le DÉFI FALSIFIABLE :
 * boussole de lecture, fil rouge numéroté, exemple annoté prélevé sur une vraie
 * cellule, légende des symboles, défi en cinq temps, glossaire enrichi
 * d'exemples du DOM, attributs machine, contrôle de cohérence des axes,
 * signature déterministe et rapport repliable.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E097.md — chantiers E097-01 à E097-10.
 * Fichier possédé : src/views/points/v2/E097.js uniquement. La passe 1, la vue
 * (src/views/points.js), le store, les deux registres, les deux index et
 * styles.css ne sont ni édités ni doublés. Le greffon d'aide de la coque
 * (? / #atlas-help) n'est ni touché ni évoqué dans le code.
 *
 * Contrat exploité : ctx = { viewId:'pointsv2', stage, layout } et les helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion(). Le
 * registre V2 n'expose pas de say() : la lentille n'ajoute aucune région
 * d'annonce, elle affiche son état en texte visible, dédupliqué et indexable.
 *
 * Périmètre strict : tout est dérivé du DOM réellement rendu (en-tête, lignes,
 * cellules, titres). Aucun nombre d'ères, de domaines ou de cellules n'est codé
 * en dur, aucune donnée n'est inventée, aucun silence n'est comblé. Le panneau
 * de la V2 est distinct de celui de la passe 1 (IDs préfixés points-v2-e097-) :
 * les deux lentilles lisent la même grille et coexistent sans collision.
 *
 * Invariants :
 * - exactement un register('E097', ctx => { … }) ;
 * - exactement un ctx.css('points-v2-e097', …) ;
 * - tous les IDs DOM sont préfixés points-v2-e097- et protégés par une garde
 *   d'existence (idempotence multi-rendus) ;
 * - toute écriture de texte passe par ctx.el / textContent / createTextNode,
 *   jamais par injection de balises ;
 * - zéro sortie de débogage, zéro réseau, zéro import distant, zéro aléa,
 *   zéro timer, zéro animation pilotée par le temps, zéro region live ajoutée.
 */

const RACINE = 'points-v2-e097-racine';
const CSS_ID = 'points-v2-e097';
const VIEW_ID = 'pointsv2';

const ID_BOUSSOLE = 'points-v2-e097-boussole';
const ID_TITRE = 'points-v2-e097-titre';
const ID_INTRO = 'points-v2-e097-intro';
const ID_FIL = 'points-v2-e097-fil';
const ID_EXEMPLE = 'points-v2-e097-exemple';
const ID_LEGENDE = 'points-v2-e097-legende';
const ID_DEFI = 'points-v2-e097-defi';
const ID_DEFI_BOUTON = 'points-v2-e097-defi-btn';
const ID_GLOSSAIRE = 'points-v2-e097-glossaire';
const ID_COHERENCE = 'points-v2-e097-coherence';
const ID_SIGNATURE = 'points-v2-e097-signature';
const ID_RAPPORT = 'points-v2-e097-rapport';
const ID_RAPPORT_BOUTON = 'points-v2-e097-rapport-btn';

/* Chaque règle est préfixée par `.points-v2-e097`, classe posée sur le layout :
 * aucune fuite hors de la vue Points. Aucune information n'est portée par la
 * seule couleur : le verdict de cohérence et le défi s'appuient sur la forme du
 * trait, la numérotation et le texte, la couleur n'étant qu'un renfort. */
const CSS = `
/* E097-01 — boussole de lecture : note pédagogique ordinaire, non modale. */
.points-v2-e097-racine .points-v2-e097-boussole{margin:10px 0 4px;padding:9px 11px;border:1px solid var(--line,#35405a);border-left:3px solid var(--gold,#e6b96f);border-radius:8px;background:rgba(255,255,255,.025);color:var(--ink-soft,#c8d0df);font:inherit;font-size:10px;line-height:1.55;overflow-wrap:anywhere}
.points-v2-e097-racine .points-v2-e097-titre{margin:0 0 5px;color:var(--gold-bright,#f5e9d0);font-size:12px;font-weight:600;letter-spacing:.03em}
.points-v2-e097-racine .points-v2-e097-intro{margin:0 0 6px;color:var(--muted,#9aa5b8);font-size:9px}
.points-v2-e097-racine .points-v2-e097-ligne{margin:3px 0;color:var(--muted,#9aa5b8);font-size:9px;line-height:1.5;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.points-v2-e097-racine .points-v2-e097-label{color:var(--gold-bright,#f5e9d0);font-weight:600}

/* E097-02 — fil rouge numéroté : l'ordre de lecture est porté par la liste. */
.points-v2-e097-racine .points-v2-e097-fil{margin:6px 0;padding-left:18px;color:var(--muted,#9aa5b8);font-size:9px;line-height:1.55}
.points-v2-e097-racine .points-v2-e097-fil li{margin:2px 0}
.points-v2-e097-racine .points-v2-e097-fil strong{color:var(--gold-bright,#f5e9d0)}

/* E097-03 — exemple annoté d'une cellule réelle. */
.points-v2-e097-racine .points-v2-e097-exemple{margin:6px 0;padding:6px 8px;border:1px dashed var(--line,#35405a);border-radius:6px;font-size:9px;line-height:1.5}
.points-v2-e097-racine .points-v2-e097-exemple dt{color:var(--gold-bright,#f5e9d0);font-weight:600}
.points-v2-e097-racine .points-v2-e097-exemple dd{margin:0 0 4px;padding-left:8px;color:var(--muted,#9aa5b8);overflow-wrap:anywhere}

/* E097-04 — légende des symboles : le signe et le texte, jamais la couleur seule. */
.points-v2-e097-racine .points-v2-e097-legende{margin:6px 0;color:var(--muted,#9aa5b8);font-size:9px;line-height:1.55;overflow-wrap:anywhere}

/* E097-05 — défi en cinq temps : cible tactile, focus visible, débrief repliable. */
.points-v2-e097-racine .points-v2-e097-defi{margin:6px 0;padding-left:18px;color:var(--muted,#9aa5b8);font-size:9px;line-height:1.55}
.points-v2-e097-racine .points-v2-e097-defi li{margin:2px 0}
.points-v2-e097-racine .points-v2-e097-defi strong{color:var(--gold-bright,#f5e9d0)}
.points-v2-e097-racine .points-v2-e097-defi li.points-v2-e097-defi--cache{display:none}
.points-v2-e097-racine .points-v2-e097-defi-btn{min-height:36px;padding:4px 10px;border:1px solid var(--line,#35405a);border-radius:8px;background:transparent;color:var(--gold-bright,#f5e9d0);font-size:9px;cursor:pointer}
.points-v2-e097-racine .points-v2-e097-defi-btn[aria-pressed="true"]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
.points-v2-e097-racine .points-v2-e097-defi-btn:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}

/* E097-06 — glossaire enrichi : contrôle natif, atteignable au clavier. */
.points-v2-e097-racine .points-v2-e097-glossaire{margin:6px 0}
.points-v2-e097-racine .points-v2-e097-glossaire summary{min-height:36px;display:flex;align-items:center;color:var(--gold,#e6b96f);cursor:pointer;font-size:9px}
.points-v2-e097-racine .points-v2-e097-glossaire summary:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}
.points-v2-e097-racine .points-v2-e097-glossaire dl{margin:6px 0 0;padding-left:2px;font-size:9px;line-height:1.5}
.points-v2-e097-racine .points-v2-e097-glossaire dt{color:var(--gold-bright,#f5e9d0);font-weight:600}
.points-v2-e097-racine .points-v2-e097-glossaire dd{margin:0 0 5px;color:var(--muted,#9aa5b8);overflow-wrap:anywhere}

/* E097-07 — attributs machine posés sur la matrice (distincts de la passe 1). */
.points-v2-e097-racine .points-matrix[data-points-v2-e097-signature]{border-top:1px dashed var(--line,#35405a)}

/* E097-08 — cohérence des axes : le trait (plein / tiret) porte le verdict. */
.points-v2-e097-racine .points-v2-e097-coherence--ok{padding-left:8px;border-left:3px solid var(--gold,#e6b96f)}
.points-v2-e097-racine .points-v2-e097-coherence--ecart{padding-left:8px;border-left:3px dashed #d98a6a}

/* E097-09 — signature déterministe. */
.points-v2-e097-racine .points-v2-e097-signature{font-variant-numeric:tabular-nums}

/* E097-10 — rapport repliable : mouvement réduit, zoom et couleurs forcées. */
.points-v2-e097-racine .points-v2-e097-rapport{margin:8px 0 0;padding:8px 10px;border:1px solid var(--line,#35405a);border-left:3px solid var(--gold,#e6b96f);border-radius:8px;background:rgba(255,255,255,.025);transition:opacity .18s linear}
.points-v2-e097-racine .points-v2-e097-rapport--masquee{display:none}
.points-v2-e097-racine .points-v2-e097-rapport p{margin:3px 0;color:var(--muted,#9aa5b8);font-size:9px;line-height:1.5;overflow-wrap:anywhere}
.points-v2-e097-racine .points-v2-e097-rapport-btn{min-height:36px;padding:4px 10px;border:1px solid var(--line,#35405a);border-radius:8px;background:transparent;color:var(--gold-bright,#f5e9d0);font-size:9px;cursor:pointer}
.points-v2-e097-racine .points-v2-e097-rapport-btn[aria-pressed="true"]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
.points-v2-e097-racine .points-v2-e097-rapport-btn:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}
.points-v2-e097-racine[data-points-v2-e097-motion="reduce"] .points-v2-e097-rapport{transition:none}
@media (prefers-reduced-motion: reduce){
  .points-v2-e097-racine .points-v2-e097-rapport{transition:none}
}
@media (max-width:620px){
  .points-v2-e097-racine .points-v2-e097-ligne,
  .points-v2-e097-racine .points-v2-e097-rapport p{font-size:10px}
}
@media (forced-colors: active){
  .points-v2-e097-racine .points-v2-e097-boussole,
  .points-v2-e097-racine .points-v2-e097-rapport{border-color:CanvasText;background:Canvas;color:CanvasText}
  .points-v2-e097-racine .points-v2-e097-titre,
  .points-v2-e097-racine .points-v2-e097-label{color:CanvasText}
  .points-v2-e097-racine .points-v2-e097-coherence--ok,
  .points-v2-e097-racine .points-v2-e097-coherence--ecart{border-left-color:CanvasText}
}
`;

/* --- Utilitaires non destructifs et sans exception. --- */

function setOnce(noeud, nom, valeur) {
  if (noeud && noeud.nodeType === 1 && !noeud.hasAttribute(nom)) noeud.setAttribute(nom, valeur);
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function texte(noeud) {
  if (!noeud || noeud.nodeType !== 1) return '';
  return String(noeud.textContent || '').replace(/\s+/g, ' ').trim();
}

/* Empreinte FNV-1a déterministe : Math.imul est de l'arithmétique, aucun aléa,
   aucune horloge. La même grille produit toujours la même signature. */
function empreinte(valeur) {
  let h = 2166136261;
  const chaine = String(valeur || '');
  for (let i = 0; i < chaine.length; i += 1) {
    h ^= chaine.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
}

function premierNombre(chaine) {
  const chaineTexte = String(chaine || '');
  const trouvee = chaineTexte.match(/\d+/);
  return trouvee ? Number(trouvee[0]) : null;
}

/* Lecture unique de toutes les grandeurs affichées par la V2. Les domaines sont
   reconstruits depuis l'en-tête dans l'ordre réel des colonnes, les ères depuis
   les boutons, les cellules depuis la grille. Un « · » est un silence compté,
   jamais une cellule absente. L'exemple annoté est prélevé sur le title d'une
   vraie cellule (format « ère · domaine · N point(s) » posé par points.js). */
function collecter(layout) {
  const matrice = layout.querySelector('.points-matrix');
  const grille = matrice && matrice.querySelector('.points-grid');
  const tete = grille && grille.querySelector('.points-grid-row.is-head');

  const domaines = [];
  if (tete) {
    Array.from(tete.children).forEach((child, index) => {
      if (index > 0) domaines.push(texte(child));
    });
  }

  const eraButtons = grille ? Array.from(grille.querySelectorAll('.points-era')) : [];
  const eras = eraButtons.map(texte);
  const cellules = grille ? Array.from(grille.querySelectorAll('.points-cell')) : [];

  let totalRemplies = 0;
  let totalPoints = 0;
  let silences = 0;
  cellules.forEach((cellule) => {
    const brut = texte(cellule);
    const effectif = /^\d+$/.test(brut) ? Number(brut) : 0;
    totalPoints += effectif;
    if (cellule.classList.contains('has-points')) totalRemplies += 1;
    if (brut === '·' || brut === '…') silences += 1;
  });

  const avecTitre = cellules.find((cellule) => cellule.getAttribute
    && texte(cellule.getAttribute('title'))) || null;
  const titreBrut = avecTitre ? texte(avecTitre.getAttribute('title')) : '';
  const morceaux = titreBrut ? titreBrut.split('·').map((part) => part.trim()).filter(Boolean) : [];
  const exemple = {
    titre: titreBrut,
    ere: morceaux[0] || '',
    domaine: morceaux[1] || '',
    effectifTexte: morceaux[2] || '',
    effectif: morceaux[2] ? premierNombre(morceaux[2]) : null,
    affiche: avecTitre ? texte(avecTitre) : '',
  };

  const titreNoeud = matrice && matrice.querySelector('.points-title');
  const titreTexte = titreNoeud ? texte(titreNoeud) : '';
  const titrePoints = premierNombre(titreTexte);
  const attendu = eras.length * domaines.length;
  const totalCellules = cellules.length;

  const cle = [
    domaines.join(','),
    eras.join(','),
    cellules.map((cellule) => texte(cellule)).join(','),
    titreBrut,
  ].join('|');

  return {
    matrice, grille, domaines, eras, cellules,
    totalCellules, totalRemplies, totalPoints, silences,
    attendu, titreTexte, titrePoints, exemple,
    signature: empreinte(cle),
  };
}

/* Dépose une ligne de synthèse visible, réutilisée par id. Le texte est écrit
   par createTextNode : aucune balise n'est construite depuis une chaîne. */
function ligne(panneau, el, id, classe, libelle, valeur) {
  if (!panneau) return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = el('p', `points-v2-e097-ligne ${classe}`);
    noeud.id = id;
  }
  noeud.textContent = '';
  noeud.appendChild(el('strong', 'points-v2-e097-label', `${libelle} : `));
  noeud.appendChild(document.createTextNode(valeur));
  panneau.appendChild(noeud);
  return noeud;
}

/* Bloc structurel (liste, définition, détail) réutilisé par id puis repeuplé. */
function bloc(panneau, el, id, classe, balise) {
  if (!panneau) return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = el(balise, classe);
    noeud.id = id;
  }
  noeud.replaceChildren();
  panneau.appendChild(noeud);
  return noeud;
}

/* E097-01 — Boussole de lecture : une note pédagogique locale, non modale. */
function ch01(el, d) {
  let panneau = document.getElementById(ID_BOUSSOLE);
  if (!panneau) {
    panneau = el('aside', 'points-v2-e097-boussole');
    panneau.id = ID_BOUSSOLE;
  }
  setOnce(panneau, 'role', 'region');
  setOnce(panneau, 'aria-label', 'Boussole de lecture de la matrice de couverture');
  const titre = el('h2', 'points-v2-e097-titre', 'Boussole de lecture');
  titre.id = ID_TITRE;
  const intro = el('p', 'points-v2-e097-intro',
    'Parcours commenté de la matrice rendue : axes, symbole et défi. Chaque grandeur est mesurée sur le DOM affiché, sans chiffre codé en dur. '
    + 'Cette note ne remplace ni la matrice ni le micro-tutoriel de la passe 1 ; elle ne bloque ni le défilement ni le clavier.');
  intro.id = ID_INTRO;
  panneau.replaceChildren(titre, intro);
  if (d.matrice && panneau.parentNode !== d.matrice) d.matrice.appendChild(panneau);
  return panneau;
}

/* E097-02 — Fil rouge numéroté : l'ordre de lecture est porté par la liste
   ordonnée elle-même, pas par une couleur. */
function ch02(panneau, el, d) {
  const fil = bloc(panneau, el, ID_FIL, 'points-v2-e097-fil', 'ol');
  if (!fil) return;
  setOnce(fil, 'aria-label', 'Les trois axes de lecture de la matrice');
  const jalons = [
    ['Lignes = ères', `${d.eras.length} ère(s) affichée(s) : chaque bouton d’ère occupe sa propre ligne.`],
    ['Colonnes = domaines', `${d.domaines.length} domaine(s) dans l’en-tête, après la colonne « Ère ».`],
    ['Cellules = croisements', `${d.totalCellules} cellule(s) rendue(s) à l’intersection d’une ère et d’un domaine.`],
  ];
  jalons.forEach(([titre, detail]) => {
    const li = el('li', '', '');
    li.appendChild(el('strong', '', titre));
    li.appendChild(document.createTextNode(` — ${detail}`));
    fil.appendChild(li);
  });
}

/* E097-03 — Exemple annoté prélevé sur une vraie cellule : le title est décomposé
   en ère, domaine et effectif, sans rien inventer. */
function ch03(panneau, el, d) {
  const exemple = bloc(panneau, el, ID_EXEMPLE, 'points-v2-e097-exemple', 'dl');
  if (!exemple) return;
  setOnce(exemple, 'aria-label', 'Exemple annoté d’une cellule réelle');
  const paires = d.exemple.titre
    ? [
      ['Intitulé lisible', `« ${d.exemple.titre} »`],
      ['Ère', d.exemple.ere || 'non précisée'],
      ['Domaine', d.exemple.domaine || 'non précisé'],
      ['Effectif de l’intitulé', d.exemple.effectif === null ? 'non chiffré' : `${d.exemple.effectif} point(s)`],
      ['Affichage de la cellule', d.exemple.affiche ? `« ${d.exemple.affiche} »` : 'case vide'],
    ]
    : [['Exemple', 'aucune cellule intitulée n’est disponible dans la grille rendue.']];
  paires.forEach(([terme, definition]) => {
    exemple.appendChild(el('dt', '', terme));
    exemple.appendChild(el('dd', '', definition));
  });
}

/* E097-04 — Légende des symboles : le signe est nommé et compté. */
function ch04(panneau, el, d) {
  const legende = bloc(panneau, el, ID_LEGENDE, 'points-v2-e097-legende', 'p');
  if (!legende) return;
  legende.textContent = 'Légende V2 : « · » marque un silence documenté et se lit comme zéro point, '
    + `pas comme une case absente (${d.silences} silence(s) observé(s)) ; `
    + `un chiffre donne l’effectif réel de la cellule (${d.totalPoints} point(s) affiché(s) au total) ; `
    + `le marquage « avec point(s) » qualifie ${d.totalRemplies} cellule(s) sur ${d.totalCellules}. `
    + 'Ces trois conventions sont dites par le texte et par le signe, jamais par la seule couleur.';
}

/* E097-05 — Défi falsifiable en cinq temps. Tout le texte reste dans le DOM
   (donc indexable) ; seul le débrief est masqué par une classe réversible. */
function ch05(panneau, el, d) {
  const defi = bloc(panneau, el, ID_DEFI, 'points-v2-e097-defi', 'ol');
  if (!defi) return;
  setOnce(defi, 'aria-label', 'Défi de lecture en cinq temps');
  const attendu = d.attendu ? String(d.attendu) : 'le produit ères × domaines';
  const temps = [
    ['Prédiction', `Avant de compter, annoncez le nombre de cellules attendu : ${attendu}.`],
    ['Réglage', `Repérez ${d.eras.length} ère(s) en ligne et ${d.domaines.length} domaine(s) en colonne dans la grille affichée.`],
    ['Résultat attendu', `Le produit donne ${d.attendu ? `${d.attendu} cellule(s)` : 'une valeur à calculer'} ; c’est la référence, pas un chiffre mémorisé.`],
    ['Falsification', `Recomptez les cellules rendues : ${d.totalCellules}. Un écart signale une case manquante dans le rendu, pas une erreur historique.`],
    ['Débrief', 'Ce défi teste la structure affichée, pas le bien-fondé des points : il reste vrai quand le corpus change et se refait après chaque filtrage. C’est la limite et l’angle mort de cette lecture.'],
  ];
  const items = [];
  temps.forEach(([titre, detail], index) => {
    const li = el('li', index === temps.length - 1 ? 'points-v2-e097-defi--cache' : '');
    li.appendChild(el('strong', '', titre));
    li.appendChild(document.createTextNode(` — ${detail}`));
    defi.appendChild(li);
    items.push(li);
  });

  let bouton = document.getElementById(ID_DEFI_BOUTON);
  if (!bouton) {
    bouton = el('button', 'points-v2-e097-defi-btn', 'Afficher le débrief');
    bouton.id = ID_DEFI_BOUTON;
    bouton.type = 'button';
    bouton.setAttribute('aria-pressed', 'false');
    bouton.setAttribute('aria-controls', ID_DEFI);
    bouton.addEventListener('click', () => {
      const ouvert = bouton.getAttribute('aria-pressed') !== 'true';
      bouton.setAttribute('aria-pressed', String(ouvert));
      bouton.textContent = ouvert ? 'Masquer le débrief' : 'Afficher le débrief';
      const cible = document.getElementById(ID_DEFI);
      const dernier = cible && cible.lastElementChild;
      if (dernier) dernier.classList.toggle('points-v2-e097-defi--cache', !ouvert);
    });
  }
  panneau.appendChild(bouton);
}

/* E097-06 — Glossaire enrichi : la définition est donnée avec un exemple réel
   prélevé sur la grille, sans état ni script propre. */
function ch06(panneau, el, d) {
  const details = bloc(panneau, el, ID_GLOSSAIRE, 'points-v2-e097-glossaire', 'details');
  if (!details) return;
  details.appendChild(el('summary', '', 'Glossaire enrichi : ère, domaine, cellule'));
  const dl = el('dl', '');
  const termes = [
    ['Ère', 'une tranche de temps nommée, affichée en ligne dans la première colonne.', d.eras[0] ? `Exemple affiché : « ${d.eras[0]} ». ` : 'Aucune ère affichée pour le moment. '],
    ['Domaine', 'un champ de savoir, affiché en colonne dans l’en-tête de la matrice.', d.domaines[0] ? `Exemple affiché : « ${d.domaines[0]} ». ` : 'Aucun domaine affiché pour le moment. '],
    ['Cellule', 'le croisement d’une ère et d’un domaine : un effectif ou « · » pour un silence documenté.', d.exemple.titre ? `Exemple réel : « ${d.exemple.titre} ». ` : 'Aucune cellule intitulée disponible. '],
  ];
  termes.forEach(([terme, definition, exemple]) => {
    dl.appendChild(el('dt', '', terme));
    dl.appendChild(el('dd', '', definition + exemple));
  });
  details.appendChild(dl);
}

/* E097-07 — Attributs machine de lecture, posés sur la matrice. Les noms sont
   propres à la V2 et distincts des attributs de la passe 1. */
function ch07(d) {
  if (!d.matrice) return;
  setOnce(d.matrice, 'data-points-v2-e097-domaines', String(d.domaines.length));
  setOnce(d.matrice, 'data-points-v2-e097-eres', String(d.eras.length));
  setOnce(d.matrice, 'data-points-v2-e097-cellules', String(d.totalCellules));
  setOnce(d.matrice, 'data-points-v2-e097-avec-points', String(d.totalRemplies));
  setOnce(d.matrice, 'data-points-v2-e097-attendu', String(d.attendu));
  setOnce(d.matrice, 'data-points-v2-e097-signature', d.signature);
}

/* E097-08 — Contrôle de cohérence entre la référence des axes et la grille. */
function ch08(panneau, el, d) {
  let valeur;
  let etat;
  if (!d.totalCellules) {
    valeur = 'grille absente : contrôle non effectué';
    etat = 'ecart';
  } else if (d.attendu === d.totalCellules) {
    valeur = `conforme : ${d.eras.length} ère(s) × ${d.domaines.length} domaine(s) = ${d.attendu} cellule(s), soit le nombre rendu`;
    etat = 'ok';
  } else {
    valeur = `écart : ${d.eras.length} ère(s) × ${d.domaines.length} domaine(s) = ${d.attendu} attendue(s) pour ${d.totalCellules} rendue(s) — case manquante à vérifier`;
    etat = 'ecart';
  }
  const noeud = ligne(panneau, el, ID_COHERENCE, 'points-v2-e097-coherence',
    'Cohérence des axes', valeur);
  if (!noeud) return;
  noeud.classList.remove('points-v2-e097-coherence--ok', 'points-v2-e097-coherence--ecart');
  noeud.classList.add(etat === 'ok' ? 'points-v2-e097-coherence--ok' : 'points-v2-e097-coherence--ecart');
}

/* E097-09 — Signature déterministe de la grille lue. */
function ch09(panneau, el, d) {
  ligne(panneau, el, ID_SIGNATURE, 'points-v2-e097-signature',
    'Signature de lecture',
    `${d.signature} · empreinte calculée sur les domaines, ères, libellés de cellules et intitulé de l’exemple, sans aléa ni horloge.`);
}

/* E097-10 — Rapport de lecture repliable et prise en compte du mouvement réduit.
   L'écouteur n'est posé qu'à la création du bouton (idempotence). */
function ch10(layout, el, d, reducedMotion) {
  const detail = layout.querySelector('.points-detail');
  if (!detail) return;
  const nav = detail.querySelector('.points-nav');

  let rapport = document.getElementById(ID_RAPPORT);
  if (!rapport) {
    rapport = el('div', 'points-v2-e097-rapport points-v2-e097-rapport--masquee');
    rapport.id = ID_RAPPORT;
  }
  setOnce(rapport, 'aria-label', 'Rapport de lecture de la matrice');
  rapport.replaceChildren(
    el('p', '', `Axes : ${d.eras.length} ère(s), ${d.domaines.length} domaine(s), ${d.totalCellules} cellule(s) rendue(s).`),
    el('p', '', `Symboles : ${d.totalRemplies} cellule(s) avec point(s), ${d.silences} silence(s), ${d.totalPoints} point(s) affiché(s).`),
    el('p', '', `Cohérence : référence ${d.attendu} cellule(s) pour ${d.totalCellules} rendue(s).`),
    el('p', '', `Exemple : ${d.exemple.titre || 'aucun intitulé'} · signature ${d.signature}.`)
  );
  if (nav && nav.parentNode === detail) {
    if (rapport.parentNode !== detail || rapport.nextSibling !== nav) detail.insertBefore(rapport, nav);
  } else if (!rapport.parentNode) {
    detail.appendChild(rapport);
  }

  let bouton = document.getElementById(ID_RAPPORT_BOUTON);
  if (!bouton) {
    bouton = el('button', 'points-v2-e097-rapport-btn', 'Afficher le rapport de lecture');
    bouton.id = ID_RAPPORT_BOUTON;
    bouton.type = 'button';
    bouton.setAttribute('aria-pressed', 'false');
    bouton.setAttribute('aria-controls', ID_RAPPORT);
    bouton.addEventListener('click', () => {
      const ouvert = bouton.getAttribute('aria-pressed') !== 'true';
      bouton.setAttribute('aria-pressed', String(ouvert));
      bouton.textContent = ouvert
        ? 'Masquer le rapport de lecture'
        : 'Afficher le rapport de lecture';
      const cible = document.getElementById(ID_RAPPORT);
      if (cible) cible.classList.toggle('points-v2-e097-rapport--masquee', !ouvert);
    });
  }
  if (nav && bouton.parentNode !== nav) nav.appendChild(bouton);
  else if (!bouton.parentNode) detail.appendChild(bouton);

  let reduit = false;
  try { reduit = Boolean(reducedMotion && typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduit = false; }
  layout.setAttribute('data-points-v2-e097-motion', reduit ? 'reduce' : 'normal');
}

register('E097', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx || {};
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function'
      || typeof el !== 'function' || typeof css !== 'function') return;
    /* Un viewId étranger neutralise la lentille ; un ctx minimal sans viewId
       reste accepté, comme dans les autres lentilles V2. */
    if (ctx.viewId && ctx.viewId !== VIEW_ID) return;
    css(CSS_ID, CSS);
    ajouteClasse(layout, RACINE);
    const d = collecter(layout);
    if (!d.matrice) return;

    const panneau = ch01(el, d);
    ch02(panneau, el, d);
    ch03(panneau, el, d);
    ch04(panneau, el, d);
    ch05(panneau, el, d);
    ch06(panneau, el, d);
    ch07(d);
    ch08(panneau, el, d);
    ch09(panneau, el, d);
    ch10(layout, el, d, reducedMotion);
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
