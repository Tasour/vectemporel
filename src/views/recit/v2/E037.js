import { register } from './registry.js';

/* V2 lentille E037 — Contraste et perception (complément de la passe 1).
   La passe 1 traite déjà : tokens de contraste, plancher de taille, lettre de
   certitude dans le fil, double anneau de focus, voile sur l'image, bascule
   « contraste renforcé », double codage de la progression, marqueur du point
   courant, enclosure des outils et panneau de mesures. La V2 propose ici dix
   chantiers neufs et distincts : mesures WCAG réellement calculées depuis les
   couleurs calculées du DOM, signalement du maillon faible, contraste de la
   pastille, état de lecture en texte, filtres actifs comptés, cibles tactiles,
   boutons désactivés texturés, hiérarchie par poids, délimitation des blocs
   d'aide et préférence de mouvement consignée.
   Préfixes : classes recit-v2-e037-, ids DOM v2-e037- (jamais e037- de la
   passe 1, qui tourne sur le MÊME DOM). Zéro réseau, zéro console, zéro aléa,
   aucun fichier partagé modifié. Sans ce module la vue reste lisible. */

const CSS = `
/* E037-01 — Lectures chiffrées de contraste, visiblement typographiées. */
.recit-v2-e037-readout{
  margin:4px 0;color:var(--ink-soft);font-size:10px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}

/* E037-02 — Renforcement local du texte mesuré comme le plus faible. */
.recit-layout[data-v2-e037="on"] .recit-v2-e037-faible{
  color:#f4efe6;text-shadow:0 1px 2px #070a0e;
}

/* E037-03 — La pastille de certitude est elle aussi mesurée (même gabarit). */
.recit-layout[data-v2-e037="on"] .recit-v2-e037-pastille{color:var(--gold-bright);}

/* E037-04 — État de lecture : texte de synthèse, pas seulement la couleur. */
.recit-layout[data-v2-e037="on"] .recit-v2-e037-lecture{color:var(--ink-soft);}

/* E037-05 — Filtres actifs : décompte lisible, chiffres à largeur fixe. */
.recit-layout[data-v2-e037="on"] .recit-v2-e037-filtres{color:var(--ink-soft);}

/* E037-06 — Cibles tactiles élargies (filtres et tracabilité ≥ 36 px). */
.recit-layout[data-v2-e037="on"] .c3a-filter{min-height:36px}
.recit-layout[data-v2-e037="on"] .recit-trace summary{min-height:36px}

/* E037-07 — Boutons désactivés codés par une texture, pas par l'opacité seule. */
.recit-layout[data-v2-e037="on"] .recit-actions button[disabled]{
  background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.07) 0 4px,transparent 4px 8px);
  border-style:dashed;
}

/* E037-08 — Hiérarchie perceptive par poids de police et espacement. */
.recit-layout[data-v2-e037="on"] .recit-v2-e037-hierarchie .view-kicker{
  font-weight:600;letter-spacing:.12em;
}
.recit-layout[data-v2-e037="on"] .recit-v2-e037-hierarchie .recit-meta{font-weight:500}
.recit-layout[data-v2-e037="on"] .recit-v2-e037-hierarchie .recit-timing{font-weight:400}

/* E037-09 — Blocs d'aide délimités par un filet vertical (perception de structure). */
.recit-layout[data-v2-e037="on"] .recit-v2-e037-blocs .recit-legend,
.recit-layout[data-v2-e037="on"] .recit-v2-e037-blocs .recit-trace{
  border-left:3px solid var(--line-strong);
  padding-left:10px;
  margin-left:2px;
}

/* E037-10 — Mouvement réduit : aucune transition sur les lectures V2. */
.recit-v2-e037-readout{transition:opacity .2s linear}
.recit-layout[data-v2-e037-motion="reduce"] .recit-v2-e037-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e037-readout{transition:none}}
`;

/* Échantillon de texte dont on mesure réellement le contraste. */
const ECHANTILLONS = [
  ['titre', '.recit-title'],
  ['repère d’étape', '.view-kicker'],
  ['métadonnées', '.recit-meta'],
  ['chronomètre', '.recit-timing'],
  ['statut des filtres', '.c3a-status'],
  ['légende', '.recit-legend p'],
  ['sources', '.recit-sources'],
  ['traçabilité', '.recit-trace p'],
];

/* --- Utilitaires de lecture : aucun jet, aucun effet de bord, aucune invention. --- */

function parseCouleur(valeur) {
  if (typeof valeur !== 'string') return null;
  const brut = valeur.trim();
  const found = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i.exec(brut);
  if (!found) return null;
  const transparent = /^rgba\(\s*\d{1,3}[\s,]+\d{1,3}[\s,]+\d{1,3}[\s,]+0(?:\.0+)?\s*\)$/i.test(brut);
  if (transparent) return null;
  return [Number(found[1]), Number(found[2]), Number(found[3])]
    .map((v) => Math.min(255, Math.max(0, v)));
}

function fondEffectif(noeud, styleFn) {
  let courant = noeud;
  while (courant && courant.nodeType === 1) {
    let fond = null;
    try { fond = parseCouleur(styleFn(courant).backgroundColor); }
    catch { fond = null; }
    if (fond) return fond;
    courant = courant.parentElement;
  }
  return null;
}

function luminance(rgb) {
  const canal = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(rgb[0]) + 0.7152 * canal(rgb[1]) + 0.0722 * canal(rgb[2]);
}

function contraste(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const clair = Math.max(la, lb);
  const sombre = Math.min(la, lb);
  return (clair + 0.05) / (sombre + 0.05);
}

/* Ratio WCAG arrondi au centième, ou null si le DOM ne fournit pas de couleur. */
function ratioTexte(noeud, styleFn) {
  if (!noeud || typeof styleFn !== 'function') return null;
  let couleur = null;
  try { couleur = parseCouleur(styleFn(noeud).color); }
  catch { return null; }
  if (!couleur) return null;
  const fond = fondEffectif(noeud, styleFn);
  if (!fond) return null;
  return Math.round(contraste(couleur, fond) * 100) / 100;
}

function decimal(ratio) {
  return String(ratio).replace('.', ',');
}

function mesureContrastes(corps, styleFn) {
  const echantillons = [];
  ECHANTILLONS.forEach(([libelle, selecteur]) => {
    const noeud = corps.querySelector(selecteur);
    const ratio = ratioTexte(noeud, styleFn);
    if (ratio !== null) echantillons.push({ libelle, selecteur, noeud, ratio });
  });
  if (!echantillons.length) {
    return { echantillons, min: null, max: null, nbSousAA: 0, faible: null };
  }
  const ratios = echantillons.map((entree) => entree.ratio);
  const min = Math.min(...ratios);
  const max = Math.max(...ratios);
  const nbSousAA = echantillons.filter((entree) => entree.ratio < 4.5).length;
  const faible = echantillons.reduce((a, b) => (b.ratio < a.ratio ? b : a));
  return { echantillons, min, max, nbSousAA, faible };
}

/* Dépose ou réutilise un paragraphe visible juste après une ancre stable. */
function placeApres(id, classe, parent, ancre, texte) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = el('p', `recit-v2-e037-readout recit-v2-e037-${classe}`);
    noeud.id = id;
  }
  noeud.textContent = texte;
  const reference = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (reference && noeud.nextSibling !== reference)) {
    parent.insertBefore(noeud, reference);
  }
  return noeud;
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

register('E037', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout
      || typeof layout.querySelector !== 'function') return;
    if (typeof css === 'function') css('recit-v2-e037', CSS); /* une seule feuille. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;
    layout.setAttribute('data-v2-e037', 'on');

    /* --- Lectures seules, effectuées avant toute mutation du DOM. --- */
    const styleFn = typeof window !== 'undefined' && window.getComputedStyle
      ? (noeud) => window.getComputedStyle(noeud) : null;
    const mesures = mesureContrastes(corps, styleFn);
    const pastille = corps.querySelector('.recit-conf');
    const ratioPastille = ratioTexte(pastille, styleFn);
    const lecture = corps.querySelector('.recit-play');
    const enLecture = Boolean(lecture && lecture.getAttribute
      && lecture.getAttribute('aria-pressed') === 'true');
    const filtres = Array.from(corps.querySelectorAll('.c3a-filter'));
    const actifs = filtres.filter((f) => f.getAttribute
      && f.getAttribute('aria-pressed') === 'true').length;
    let reduit = false;
    try {
      reduit = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
    } catch { reduit = false; }

    /* E037-01 — ratios de contraste réels, dérivés des couleurs calculées. */
    if (mesures.echantillons.length) {
      placeApres('v2-e037-ratios', 'ratios', corps, corps.querySelector('.view-kicker'),
        `Ratios de contraste mesurés : ${mesures.echantillons.length} textes · minimum ${decimal(mesures.min)}:1 · maximum ${decimal(mesures.max)}:1 · ${mesures.nbSousAA} sous le seuil AA 4,5:1.`);
    }

    /* E037-02 — maillon faible : classe locale + témoin textuel. */
    if (mesures.faible) {
      ajouteClasse(mesures.faible.noeud, 'recit-v2-e037-faible');
      const ancre = document.getElementById('v2-e037-ratios');
      placeApres('v2-e037-faible', 'faible', corps, ancre,
        `Maillon faible : ${mesures.faible.libelle} à ${decimal(mesures.faible.ratio)}:1 · ${mesures.nbSousAA ? 'contraste relevé localement' : 'aucun texte sous le seuil AA'}.`);
    }

    /* E037-03 — contraste de la pastille de certitude, mesuré séparément. */
    if (ratioPastille !== null) {
      placeApres('v2-e037-pastille', 'pastille', corps, corps.querySelector('.recit-meta'),
        `Pastille de certitude : ${decimal(ratioPastille)}:1 · seuil AA 4,5:1 · ${ratioPastille >= 4.5 ? 'atteint' : 'non atteint'}.`);
    }

    /* E037-04 — état de lecture rendu perceptible par un texte, pas une teinte. */
    if (lecture) {
      placeApres('v2-e037-lecture', 'lecture', corps, corps.querySelector('.recit-actions'),
        `Lecture automatique : ${enLecture ? 'en cours' : 'en pause'}.`);
    }

    /* E037-05 — décompte des filtres actifs, lu sur aria-pressed réel. */
    if (filtres.length) {
      placeApres('v2-e037-filtres', 'filtres', corps,
        document.getElementById('c3a-status') || corps.querySelector('.c3a-status'),
        `Filtres actifs : ${actifs} sur ${filtres.length}.`);
    }

    /* E037-06 — cibles tactiles élargies : portées uniquement par le CSS cadré. */

    /* E037-07 — boutons désactivés texturés : porté uniquement par le CSS cadré. */

    /* E037-08 — hiérarchie par poids de police. */
    ajouteClasse(corps, 'recit-v2-e037-hierarchie');

    /* E037-09 — délimitation des blocs d'aide. */
    ajouteClasse(corps, 'recit-v2-e037-blocs');

    /* E037-10 — préférence de mouvement consignée sans écraser d'attribut. */
    layout.setAttribute('data-v2-e037-motion', reduit ? 'reduce' : 'normal');
    placeApres('v2-e037-mouvement', 'mouvement', corps, corps.querySelector('.recit-legend'),
      `Mouvement réduit : ${reduit ? 'activé' : 'désactivé'} (préférence système).`);
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
