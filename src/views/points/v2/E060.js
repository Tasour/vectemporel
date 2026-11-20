import { register } from './registry.js';

/* Lentille V2 E060 — domaine F : sémantique & données. La passe 1 explicite la
 * COUVERTURE BINAIRE de la matrice (chaque cellule vaut 1 ou 0) ; la V2 propose
 * dix chantiers neufs et distincts, centrés sur l'INVENTAIRE et la COHÉRENCE de
 * cette matrice : répartition par domaine et par ère, densité, contrôle
 * titre ↔ grille, attributs machine, légende des conventions, profil des
 * effectifs par cellule, signature déterministe et rapport repliable.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E060.md — chantiers E060-01 à E060-10.
 * Fichier possédé : src/views/points/v2/E060.js uniquement. La passe 1
 * (src/views/points/E060.js), la vue (src/views/points.js), le store, les
 * registres, index.js et styles.css ne sont ni édités ni doublés.
 *
 * Contrat exploité : ctx = { viewId:'pointsv2', stage, layout } et les helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion(). Le
 * registre V2 n'expose pas de say() : la lentille n'ajoute aucune région
 * d'annonce, elle affiche son état en texte visible et dédupliqué.
 *
 * Périmètre strict : tout est dérivé du DOM réellement rendu (cellules, titres,
 * en-têtes, périmètre). Aucun total n'est codé en dur, aucune donnée n'est
 * inventée, aucun champ manquant n'est corrigé. Le 784/784 global consigné dans
 * COVERAGE_POINTS.md n'est pas recopié : une seule matrice est montée à la fois.
 *
 * Invariants :
 * - exactement un register('E060', ctx => { … }) ;
 * - exactement un ctx.css('points-v2-e060', …) ;
 * - tous les IDs DOM sont préfixés points-v2-e060- et protégés par une garde
 *   d'existence (idempotence multi-rendus) ;
 * - toute écriture de texte passe par ctx.el / textContent, jamais par injection
 *   de balises ;
 * - zéro sortie de débogage, zéro réseau, zéro import distant, zéro aléa,
 *   zéro timer, zéro animation pilotée par le temps, zéro region live ajoutée.
 */

const RACINE = 'points-v2-e060-racine';
const CSS_ID = 'points-v2-e060';
const VIEW_ID = 'pointsv2';

const ID_TABLEAU = 'points-v2-e060-tableau';
const ID_TITRE = 'points-v2-e060-titre';
const ID_ENTETE = 'points-v2-e060-entete';
const ID_DOMAINES = 'points-v2-e060-domaines';
const ID_ERES = 'points-v2-e060-eres';
const ID_DENSITE = 'points-v2-e060-densite';
const ID_COHERENCE = 'points-v2-e060-coherence';
const ID_LEGENDE = 'points-v2-e060-legende';
const ID_SIGNATURE = 'points-v2-e060-signature';
const ID_RAPPORT = 'points-v2-e060-rapport';
const ID_BOUTON = 'points-v2-e060-rapport-btn';

/* Chaque règle est préfixée par `.points-v2-e060`, classe posée sur le layout :
 * aucune fuite hors de la vue Points. L'état binaire de la passe 1 (bit 1/0)
 * n'est pas modifié : la V2 ajoute un PROFIL D'EFFECTIF complémentaire, porté
 * par le texte, la forme du trait et un attribut, jamais par la seule couleur. */
const CSS = `
/* E060-01 — tableau de bord d'inventaire de la matrice. */
.points-v2-e060-racine .points-v2-e060-tableau{margin:10px 0 4px;padding:9px 11px;border:1px solid var(--line,#35405a);border-left:3px solid var(--gold,#e6b96f);border-radius:8px;background:rgba(255,255,255,.025);color:var(--ink-soft,#c8d0df);font:inherit;font-size:10px;line-height:1.55;overflow-wrap:anywhere}
.points-v2-e060-racine .points-v2-e060-titre{margin:0 0 5px;color:var(--gold-bright,#f5e9d0);font-size:12px;font-weight:600;letter-spacing:.03em}
.points-v2-e060-racine .points-v2-e060-intro{margin:0 0 6px;color:var(--muted,#9aa5b8);font-size:9px}
.points-v2-e060-racine .points-v2-e060-ligne{margin:3px 0;color:var(--muted,#9aa5b8);font-size:9px;line-height:1.5;overflow-wrap:anywhere}
.points-v2-e060-racine .points-v2-e060-label{color:var(--gold-bright,#f5e9d0);font-weight:600}

/* E060-02 — répartition des cellules par domaine. */
.points-v2-e060-racine .points-v2-e060-domaines{font-variant-numeric:tabular-nums}

/* E060-03 — répartition des cellules par ère. */
.points-v2-e060-racine .points-v2-e060-eres{font-variant-numeric:tabular-nums}

/* E060-04 — densité de la matrice. */
.points-v2-e060-racine .points-v2-e060-densite{font-variant-numeric:tabular-nums}

/* E060-05 — contrôle de cohérence : la forme du trait porte le verdict, la
   couleur n'est qu'un renfort (« conforme » plein, « divergence » en pointillé). */
.points-v2-e060-racine .points-v2-e060-coherence--ok{padding-left:8px;border-left:3px solid var(--gold,#e6b96f)}
.points-v2-e060-racine .points-v2-e060-coherence--divergence{padding-left:8px;border-left:3px dashed #d98a6a}

/* E060-06 — attributs machine posés sur la matrice. */
.points-v2-e060-racine .points-matrix[data-points-v2-e060-signature]{border-top:1px dashed var(--line,#35405a)}

/* E060-07 — légende des conventions de composition. */
.points-v2-e060-racine .points-v2-e060-legende{margin:6px 0 0;color:var(--muted-2,#7c8699);font-size:9px;line-height:1.5;overflow-wrap:anywhere}

/* E060-08 — profil des cellules par effectif, complément du bit de la passe 1. */
.points-v2-e060-racine .points-cell[data-points-v2-e060-count]{box-shadow:inset 0 -2px 0 var(--line,#35405a)}
.points-v2-e060-racine .points-v2-e060-profil--vide{font-style:italic}
.points-v2-e060-racine .points-v2-e060-profil--un{font-weight:600}
.points-v2-e060-racine .points-v2-e060-profil--quelques{text-decoration:underline dotted}
.points-v2-e060-racine .points-v2-e060-profil--plusieurs{text-decoration:underline}

/* E060-09 — signature déterministe. */
.points-v2-e060-racine .points-v2-e060-signature{font-variant-numeric:tabular-nums}

/* E060-10 — rapport repliable : cible tactile, focus visible, mouvement réduit. */
.points-v2-e060-racine .points-v2-e060-rapport{margin:8px 0 0;padding:8px 10px;border:1px solid var(--line,#35405a);border-left:3px solid var(--gold,#e6b96f);border-radius:8px;background:rgba(255,255,255,.025);transition:opacity .18s linear}
.points-v2-e060-racine .points-v2-e060-rapport--masquee{display:none}
.points-v2-e060-racine .points-v2-e060-rapport p{margin:3px 0;color:var(--muted,#9aa5b8);font-size:9px;line-height:1.5;overflow-wrap:anywhere}
.points-v2-e060-racine .points-v2-e060-rapport-btn{min-height:36px;padding:4px 10px;border:1px solid var(--line,#35405a);border-radius:8px;background:transparent;color:var(--gold-bright,#f5e9d0);font-size:9px;cursor:pointer}
.points-v2-e060-racine .points-v2-e060-rapport-btn[aria-pressed="true"]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
.points-v2-e060-racine .points-v2-e060-rapport-btn:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}
.points-v2-e060-racine[data-points-v2-e060-motion="reduce"] .points-v2-e060-rapport{transition:none}
@media (prefers-reduced-motion: reduce){
  .points-v2-e060-racine .points-v2-e060-rapport{transition:none}
}
@media (max-width:620px){
  .points-v2-e060-racine .points-v2-e060-ligne,
  .points-v2-e060-racine .points-v2-e060-rapport p{font-size:10px}
}
@media (forced-colors: active){
  .points-v2-e060-racine .points-v2-e060-tableau,
  .points-v2-e060-racine .points-v2-e060-rapport{border-color:CanvasText;background:Canvas;color:CanvasText}
  .points-v2-e060-racine .points-v2-e060-titre,
  .points-v2-e060-racine .points-v2-e060-label{color:CanvasText}
  .points-v2-e060-racine .points-v2-e060-coherence--ok,
  .points-v2-e060-racine .points-v2-e060-coherence--divergence{border-left-color:CanvasText}
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
   aucune horloge. La même matrice produit toujours la même signature. */
function empreinte(valeur) {
  let h = 2166136261;
  const chaine = String(valeur || '');
  for (let i = 0; i < chaine.length; i += 1) {
    h ^= chaine.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
}

/* Pourcentage français, dérivé des seuls compteurs du DOM. */
function pourcentage(part, total) {
  if (!total) return '0,0 %';
  return `${((part * 100) / total).toFixed(1).replace('.', ',')} %`;
}

function formatDomaines(parDomaine) {
  if (!parDomaine.length) return 'aucun domaine affiché';
  return parDomaine.map((d) => `${d.nom || 'domaine sans nom'} ${d.remplies}/${d.cellules}`).join(' · ');
}

function formatEres(parEre) {
  if (!parEre.length) return 'aucune ère affichée';
  return parEre.map((e) => `${e.nom || 'ère sans nom'} ${e.remplies}/${e.cellules}`).join(' · ');
}

/* Lecture unique de toutes les grandeurs affichées par la V2. Les domaines sont
   reconstruits depuis l'en-tête, dans l'ordre réel des colonnes ; les ères depuis
   les lignes, hors ligne d'en-tête. Un « · » vaut zéro point, pas une absence de
   cellule : la cellule est comptée et profilée comme vide. */
function collecter(layout) {
  const matrice = layout.querySelector('.points-matrix');
  const grille = matrice && matrice.querySelector('.points-grid');
  const tete = grille && grille.querySelector('.points-grid-row.is-head');

  const domaines = [];
  if (tete) {
    Array.from(tete.children).forEach((child, index) => {
      if (index > 0 && child.tagName === 'SPAN') domaines.push(texte(child));
    });
  }

  const lignes = grille
    ? Array.from(grille.querySelectorAll('.points-grid-row')).filter((r) => !r.classList.contains('is-head'))
    : [];

  const parDomaine = domaines.map((nom) => ({ nom, cellules: 0, remplies: 0, points: 0 }));
  const parEre = [];
  const cellules = [];
  let totalCellules = 0;
  let totalRemplies = 0;
  let pointsGrille = 0;

  lignes.forEach((ligne) => {
    const bouton = ligne.querySelector('.points-era');
    const nomEre = bouton ? texte(bouton) : '';
    const noeuds = Array.from(ligne.querySelectorAll('.points-cell'));
    let ereCellules = 0;
    let ereRemplies = 0;
    let erePoints = 0;

    noeuds.forEach((cellule, index) => {
      const brut = texte(cellule);
      const effectif = /^\d+$/.test(brut) ? Number(brut) : 0;
      const present = cellule.classList.contains('has-points');
      const domaine = parDomaine[index] || null;

      totalCellules += 1;
      ereCellules += 1;
      pointsGrille += effectif;
      erePoints += effectif;
      if (present) {
        totalRemplies += 1;
        ereRemplies += 1;
      }
      if (domaine) {
        domaine.cellules += 1;
        domaine.points += effectif;
        if (present) domaine.remplies += 1;
      }
      cellules.push({ noeud: cellule, effectif, present, domaine: domaine ? domaine.nom : '' });
    });

    parEre.push({ nom: nomEre, cellules: ereCellules, remplies: ereRemplies, points: erePoints });
  });

  const titreNoeud = matrice && matrice.querySelector('.points-title');
  const titreTexte = titreNoeud ? texte(titreNoeud) : '';
  const titreMatch = titreTexte.match(/(\d+)\s*points?\s*isolés/i);
  const titrePoints = titreMatch ? Number(titreMatch[1]) : null;

  const kickerDetail = layout.querySelector('.points-detail .view-kicker');
  const perimetreTexte = kickerDetail ? texte(kickerDetail) : '';
  const perimetreMatch = perimetreTexte.match(/(\d+)\s*point/i);
  const perimetrePoints = perimetreMatch ? Number(perimetreMatch[1]) : null;

  const cle = [
    domaines.join(','),
    parEre.map((e) => e.nom).join(','),
    cellules.map((c) => c.effectif).join(','),
  ].join('|');

  return {
    matrice, domaines, parDomaine, parEre, cellules,
    totalCellules, totalRemplies, pointsGrille,
    titrePoints, titreTexte, perimetrePoints, perimetreTexte,
    signature: empreinte(cle),
  };
}

/* Dépose une ligne de synthèse visible dans le tableau, réutilisée par id. */
function ligneTableau(tableau, el, id, classe, libelle, valeur) {
  if (!tableau) return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = el('p', `points-v2-e060-ligne ${classe}`);
    noeud.id = id;
  }
  noeud.textContent = '';
  noeud.appendChild(el('strong', 'points-v2-e060-label', `${libelle} : `));
  noeud.appendChild(document.createTextNode(valeur));
  tableau.appendChild(noeud);
  return noeud;
}

/* E060-01 — Tableau de bord d'inventaire, inséré en fin de matrice. */
function ch01(el, d) {
  let panneau = document.getElementById(ID_TABLEAU);
  if (!panneau) {
    panneau = el('aside', 'points-v2-e060-tableau');
    panneau.id = ID_TABLEAU;
  }
  setOnce(panneau, 'aria-label', 'Tableau de bord d’inventaire de la matrice de couverture');
  panneau.replaceChildren(
    el('h2', 'points-v2-e060-titre', 'Inventaire de la matrice'),
    el('p', 'points-v2-e060-intro',
      'Synthèse de la matrice rendue : domaines, ères, cellules et cohérence du titre. Tout est mesuré sur le DOM affiché, sans chiffre codé en dur ni donnée supposée.')
  );
  if (d.matrice && panneau.parentNode !== d.matrice) d.matrice.appendChild(panneau);

  ligneTableau(panneau, el, ID_ENTETE, 'points-v2-e060-entete', 'Inventaire',
    `${d.domaines.length} domaine(s) · ${d.parEre.length} ère(s) · ${d.totalCellules} cellule(s) · ${d.totalRemplies} avec point(s) · `
    + (d.perimetrePoints === null ? 'périmètre non précisé dans la vue'
      : `${d.perimetrePoints} point(s) affiché(s) dans le détail`));
  return panneau;
}

/* E060-02 — Répartition des cellules par domaine, lue dans les colonnes. */
function ch02(panneau, el, d) {
  ligneTableau(panneau, el, ID_DOMAINES, 'points-v2-e060-domaines',
    'Domaines (remplies/total)', formatDomaines(d.parDomaine));
}

/* E060-03 — Répartition des cellules par ère, lue dans les lignes. */
function ch03(panneau, el, d) {
  ligneTableau(panneau, el, ID_ERES, 'points-v2-e060-eres',
    'Ères (remplies/total)', formatEres(d.parEre));
}

/* E060-04 — Densité de la matrice, distincte de la couverture binaire. */
function ch04(panneau, el, d) {
  ligneTableau(panneau, el, ID_DENSITE, 'points-v2-e060-densite',
    'Densité de la matrice',
    `${pourcentage(d.totalRemplies, d.totalCellules)} de cellules avec point(s) (${d.totalRemplies}/${d.totalCellules}) — la couverture binaire, elle, vaut 100 % des cellules rendues.`);
}

/* E060-05 — Contrôle de cohérence entre le titre et la somme des cellules. */
function ch05(panneau, el, d) {
  let valeur;
  let etat;
  if (d.titrePoints === null) {
    valeur = 'titre de la matrice illisible : contrôle non effectué';
    etat = 'divergence';
  } else if (d.titrePoints === d.pointsGrille) {
    valeur = `conforme : le titre annonce ${d.titrePoints} point(s) et la grille en recense ${d.pointsGrille} par la somme de ses cellules`;
    etat = 'ok';
  } else {
    valeur = `divergence : le titre annonce ${d.titrePoints} point(s) mais la grille en recense ${d.pointsGrille} — contrôle à rejouer après filtrage`;
    etat = 'divergence';
  }
  const noeud = ligneTableau(panneau, el, ID_COHERENCE, 'points-v2-e060-coherence',
    'Cohérence titre ↔ grille', valeur);
  if (!noeud) return;
  noeud.classList.remove('points-v2-e060-coherence--ok', 'points-v2-e060-coherence--divergence');
  noeud.classList.add(etat === 'ok' ? 'points-v2-e060-coherence--ok' : 'points-v2-e060-coherence--divergence');
}

/* E060-06 — Attributs machine de composition posés sur la matrice. Les noms
   sont propres à la V2 et distincts des data-e060-* de la passe 1. */
function ch06(d) {
  if (!d.matrice) return;
  setOnce(d.matrice, 'data-points-v2-e060-domaines', String(d.domaines.length));
  setOnce(d.matrice, 'data-points-v2-e060-eres', String(d.parEre.length));
  setOnce(d.matrice, 'data-points-v2-e060-cellules', String(d.totalCellules));
  setOnce(d.matrice, 'data-points-v2-e060-remplies', String(d.totalRemplies));
  setOnce(d.matrice, 'data-points-v2-e060-points', String(d.pointsGrille));
  setOnce(d.matrice, 'data-points-v2-e060-densite', pourcentage(d.totalRemplies, d.totalCellules));
  setOnce(d.matrice, 'data-points-v2-e060-signature', d.signature);
}

/* E060-07 — Légende des conventions, ajoutée aux filtres sans toucher aux deux
   sélecteurs ni au bouton « Réinitialiser les filtres ». */
function ch07(layout, el) {
  const filtres = layout.querySelector('.points-filters');
  if (!filtres) return;
  let legende = document.getElementById(ID_LEGENDE);
  if (!legende) {
    legende = el('p', 'points-v2-e060-legende');
    legende.id = ID_LEGENDE;
  }
  legende.textContent = 'Conventions V2 : « remplies/total » compte les cellules avec point(s) sur les cellules de la colonne ou de la ligne ; la densité est le rapport entre cellules remplies et cellules rendues ; la cohérence compare le total du titre à la somme des cellules ; le profil d’une cellule qualifie son effectif, distinct du bit 1/0 de la passe 1 ; la signature identifie cette matrice sans lien externe.';
  if (legende.parentNode !== filtres) filtres.appendChild(legende);
}

/* E060-08 — Profil d'effectif de chaque cellule, complément non destructif du
   marquage binaire de la passe 1 : on n'écrit ni title ni aria-label existants. */
function ch08(d) {
  d.cellules.forEach(({ noeud, effectif }) => {
    const profil = effectif === 0 ? 'vide' : effectif === 1 ? 'un' : effectif <= 3 ? 'quelques' : 'plusieurs';
    setOnce(noeud, 'data-points-v2-e060-count', String(effectif));
    ajouteClasse(noeud, `points-v2-e060-profil--${profil}`);
  });
}

/* E060-09 — Signature déterministe de la matrice. */
function ch09(panneau, el, d) {
  ligneTableau(panneau, el, ID_SIGNATURE, 'points-v2-e060-signature',
    'Signature de la matrice',
    `${d.signature} · empreinte calculée sur les domaines, ères et effectifs affichés, sans aléa ni horloge.`);
}

/* E060-10 — Rapport de composition repliable et prise en compte du mouvement
   réduit. L'écouteur n'est posé qu'à la création du bouton (idempotence). */
function ch10(layout, el, d, reducedMotion) {
  const detail = layout.querySelector('.points-detail');
  if (!detail) return;
  const nav = detail.querySelector('.points-nav');

  let rapport = document.getElementById(ID_RAPPORT);
  if (!rapport) {
    rapport = el('div', 'points-v2-e060-rapport points-v2-e060-rapport--masquee');
    rapport.id = ID_RAPPORT;
  }
  setOnce(rapport, 'aria-label', 'Rapport d’inventaire de la matrice');
  rapport.replaceChildren(
    el('p', '', `Inventaire : ${d.domaines.length} domaine(s), ${d.parEre.length} ère(s), ${d.totalCellules} cellule(s), ${d.totalRemplies} avec point(s).`),
    el('p', '', `Domaines : ${formatDomaines(d.parDomaine)}`),
    el('p', '', `Ères : ${formatEres(d.parEre)}`),
    el('p', '', `Densité : ${pourcentage(d.totalRemplies, d.totalCellules)} · signature : ${d.signature}`)
  );
  if (nav && nav.parentNode === detail) {
    if (rapport.parentNode !== detail || rapport.nextSibling !== nav) detail.insertBefore(rapport, nav);
  } else if (!rapport.parentNode) {
    detail.appendChild(rapport);
  }

  let bouton = document.getElementById(ID_BOUTON);
  if (!bouton) {
    bouton = el('button', 'points-v2-e060-rapport-btn', 'Afficher le rapport d’inventaire');
    bouton.id = ID_BOUTON;
    bouton.type = 'button';
    bouton.setAttribute('aria-pressed', 'false');
    bouton.setAttribute('aria-controls', ID_RAPPORT);
    bouton.addEventListener('click', () => {
      const ouvert = bouton.getAttribute('aria-pressed') !== 'true';
      bouton.setAttribute('aria-pressed', String(ouvert));
      bouton.textContent = ouvert
        ? 'Masquer le rapport d’inventaire'
        : 'Afficher le rapport d’inventaire';
      rapport.classList.toggle('points-v2-e060-rapport--masquee', !ouvert);
    });
  }
  if (nav && bouton.parentNode !== nav) nav.appendChild(bouton);
  else if (!bouton.parentNode) detail.appendChild(bouton);

  let reduit = false;
  try { reduit = Boolean(reducedMotion && typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduit = false; }
  layout.setAttribute('data-points-v2-e060-motion', reduit ? 'reduce' : 'normal');
}

register('E060', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx || {};
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function'
      || typeof el !== 'function' || typeof css !== 'function') return;
    /* Un viewId étranger neutralise la lentille ; un ctx minimal sans viewId
       reste accepté, comme dans E052. */
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
    ch06(d);
    ch07(layout, el);
    ch08(d);
    ch09(panneau, el, d);
    ch10(layout, el, d, reducedMotion);
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
