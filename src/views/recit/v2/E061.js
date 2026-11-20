import { register } from './registry.js';

/* V2 lentille E061 — Lisibilité et mesure de lecture (second regard).
 *
 * La passe 1 traitait déjà la police de lecture, la mesure à 70 ch, le rythme
 * des textes secondaires, le surtitre hiérarchisé, le panneau à dégradé, les
 * cibles des commandes, la durée à 200 mots/min, la densité lexicale, la
 * progression en pourcentage et le mouvement réduit. Cette V2 propose dix
 * chantiers NEUFS et DISTINCTS, tous non destructifs : ici la mesure porte sur
 * la phrase, la lisibilité, les pauses, la largeur réellement rendue et le fil
 * restant ; le confort porte sur le titre, le contexte et la navigation.
 *
 * Un seul register, un seul bloc CSS (id `recit-v2-e061`), classes préfixées
 * `recit-v2-e061-`, ids DOM préfixés `v2-e061-` (jamais les ids `e061-` de la
 * passe 1 qui tourne sur le MÊME DOM). Zéro réseau, zéro console, zéro aléa.
 * Tout chiffre affiché est dérivé du texte ou de la géométrie réels du DOM.
 * Voir UNIFIED_AUDIT/RECIT/V2/views/E061.md pour le détail.
 */

const CSS = `
/* E061-01 — Longueur moyenne des phrases : socle des lectures chiffrées. */
.recit-v2-e061-root .recit-v2-e061-readout{
  margin:4px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5;
  font-variant-numeric:tabular-nums;
  transition:opacity .2s linear;
}
/* Le mouvement réduit est traité en CSS pur (@media ci-après), sans doubler
   l'attribut data-e061-motion de la passe 1. */
@media (prefers-reduced-motion:reduce){.recit-v2-e061-readout{transition:none}}

/* E061-02 — Indice de lisibilité : mêmes chiffres tabulaires alignés. */
.recit-v2-e061-root .recit-v2-e061-lisibilite{color:var(--ink-soft)}

/* E061-03 — Densité de pauses : lecture des signes de ponctuation. */
.recit-v2-e061-root .recit-v2-e061-pauses{color:var(--ink-soft)}

/* E061-04 — Mesure réelle de la colonne en caractères par ligne. */
.recit-v2-e061-root .recit-v2-e061-mesure{color:var(--ink-soft)}

/* E061-05 — Mots restants dans le fil, sous le titre du repère. */
.recit-v2-e061-root .recit-v2-e061-restants{
  margin:0 0 6px;color:var(--ink-soft);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}

/* E061-06 — Titre équilibré : évite les lignes orphelines très courtes. */
.recit-v2-e061-root .recit-v2-e061-titre{text-wrap:balance}

/* E061-07 — Orphelines évitées dans le paragraphe de contexte. */
.recit-v2-e061-root .recit-v2-e061-contexte{text-wrap:pretty}

/* E061-08 — Respiration des mots du contexte, distincte du lettrage passe 1. */
.recit-v2-e061-root .recit-v2-e061-contexte{word-spacing:.03em}

/* E061-09 — Cibles tactiles et focus des boutons du fil. */
.recit-v2-e061-root .recit-v2-e061-fil-item{min-height:36px}
.recit-v2-e061-root .recit-v2-e061-fil-item:focus-visible{
  outline:3px solid var(--gold-bright);outline-offset:3px;
}

/* E061-10 — Aération verticale de la liste du fil. */
.recit-v2-e061-root .recit-v2-e061-fil-liste{gap:8px 6px}

@media (max-width:620px){
  .recit-v2-e061-root .recit-v2-e061-readout{font-size:9px}
}
`;

/* Vrai nœud d'élément (écarte textes et commentaires). */
function estNoeud(noeud) {
  return !!(noeud && noeud.nodeType === 1);
}

/* Ajoute une classe sans jamais écraser les classes existantes ni lever d'erreur. */
function ajouteClasse(noeud, nom) {
  if (estNoeud(noeud) && noeud.classList && typeof noeud.classList.add === 'function'
      && !noeud.classList.contains(nom)) {
    noeud.classList.add(nom);
  }
}

/* Compte les mots réels d'un texte (séquences de non-blancs). */
function compteMots(texte) {
  return String(texte || '').trim().split(/\s+/).filter(Boolean).length;
}

/* Compte les phrases réelles : segments séparés par . ! ? et non vides. */
function comptePhrases(texte) {
  return String(texte || '').split(/[.!?]+/)
    .map((segment) => segment.trim()).filter(Boolean).length;
}

/* Syllabes approximées : groupes vocaliques, e final muet décompté. */
function compteSyllabes(mot) {
  const forme = String(mot || '').toLowerCase().replace(/['’]/g, '');
  const groupes = forme.match(/[aeiouyàâéèêëîïôûùüÿœæ]+/g);
  let total = groupes ? groupes.length : 0;
  if (total > 1 && /e$/.test(forme)) total -= 1;
  return Math.max(1, total);
}

/* Dépose (ou réutilise) un paragraphe visible, à un emplacement stable.
   `el` est passé explicitement : il appartient au ctx, pas au portée module. */
function placeParagraphe(el, id, classes, parent, ancre, texte) {
  if (!estNoeud(parent) || typeof parent.insertBefore !== 'function') return null;
  let noeud = null;
  try { noeud = document.getElementById(id); } catch { return null; }
  if (!noeud) {
    if (typeof el !== 'function') return null;
    noeud = el('p', classes);
    noeud.id = id;
  }
  noeud.textContent = texte;
  const cible = estNoeud(ancre) && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

/* Lit « Étape X / Y » dans le surtitre, sans le modifier. */
function lireEtape(kicker) {
  const found = String((kicker && kicker.textContent) || '').match(/(\d+)\s*\/\s*(\d+)/);
  if (!found) return null;
  return { etape: Number(found[1]), total: Number(found[2]) };
}

register('E061', (ctx) => {
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  const { layout, css, el } = ctx;

  try {
    if (typeof document === 'undefined') return;
    /* Un seul bloc CSS pour toute la lentille (cssOnce garantit l'idempotence). */
    if (typeof css === 'function') {
      try { css('recit-v2-e061', CSS); } catch { /* rendu préservé coûte que coûte */ }
    }
    ajouteClasse(layout, 'recit-v2-e061-root');

    const corps = layout.querySelector('.recit-body');
    if (!estNoeud(corps)) return;

    const titre = document.getElementById('recit-point-title') || corps.querySelector('.recit-title');
    const contexte = document.getElementById('recit-context') || corps.querySelector('.recit-context');
    const kicker = corps.querySelector('.view-kicker');
    const filTitre = corps.querySelector('.recit-thread-title');
    const filListe = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');

    /* Texte réellement affiché : le contexte n'existe qu'au premier point,
       la mesure retombe alors sur le seul titre, sans valeur figée. */
    const source = ((titre && titre.textContent) || '') + ' ' + ((contexte && contexte.textContent) || '');
    const mots = compteMots(source);
    const phrases = comptePhrases(source);
    let ancre = estNoeud(contexte) ? contexte : titre;

    /* E061-01 — Longueur moyenne des phrases (mots / phrases réels). */
    if (mots && phrases) {
      const moyenne = mots / phrases;
      const noeud = placeParagraphe(el, 'v2-e061-phrases',
        'recit-v2-e061-readout recit-v2-e061-phrases', corps, ancre,
        `${phrases} phrase${phrases > 1 ? 's' : ''} · ≈ ${moyenne.toFixed(1)} mot${moyenne > 1 ? 's' : ''} par phrase.`);
      if (noeud) ancre = noeud;
    }

    /* E061-02 — Indice de lisibilité Flesch–Vienne approximé.
       Les coefficients sont ceux de la formule ; score et verdict sont calculés
       depuis les mots, phrases et syllabes du texte réel. */
    if (mots && phrases) {
      const syllabes = source.trim().split(/\s+/).filter(Boolean)
        .reduce((somme, mot) => somme + compteSyllabes(mot), 0);
      const score = Math.round(207 - 1.015 * (mots / phrases) - 73.6 * (syllabes / mots));
      const verdict = score >= 60 ? 'aisé' : (score >= 30 ? 'moyen' : 'ardu');
      const noeud = placeParagraphe(el, 'v2-e061-lisibilite',
        'recit-v2-e061-readout recit-v2-e061-lisibilite', corps, ancre,
        `Lisibilité (Flesch–Vienne approx.) : ${score} · ${verdict}.`);
      if (noeud) ancre = noeud;
    }

    /* E061-03 — Densité de pauses (signes de ponctuation par phrase). */
    if (mots && phrases) {
      const pauses = (source.match(/[,;:!?—]/g) || []).length;
      const parPhrase = pauses / phrases;
      const noeud = placeParagraphe(el, 'v2-e061-pauses',
        'recit-v2-e061-readout recit-v2-e061-pauses', corps, ancre,
        `${pauses} pause${pauses > 1 ? 's' : ''} · ≈ ${parPhrase.toFixed(1)} par phrase.`);
      if (noeud) ancre = noeud;
    }

    /* E061-04 — Largeur de mesure réelle : caractères par ligne estimés depuis
       la largeur rendue (getBoundingClientRect) et la police calculée. */
    const cibleMesure = estNoeud(contexte) ? contexte : titre;
    if (estNoeud(cibleMesure) && typeof cibleMesure.getBoundingClientRect === 'function') {
      const largeur = cibleMesure.getBoundingClientRect().width;
      let taille = 0;
      try {
        const style = window.getComputedStyle ? window.getComputedStyle(cibleMesure) : null;
        taille = style ? parseFloat(style.fontSize) : 0;
      } catch { /* mesure facultative */ }
      if (largeur > 0 && taille > 0) {
        const parLigne = Math.max(1, Math.round(largeur / (taille * 0.5)));
        const noeud = placeParagraphe(el, 'v2-e061-mesure',
          'recit-v2-e061-readout recit-v2-e061-mesure', corps, ancre,
          `Mesure de lecture : ≈ ${parLigne} caractères par ligne (${Math.round(largeur)} px de large).`);
        if (noeud) ancre = noeud;
      }
    }

    /* E061-05 — Mots restants à parcourir dans le fil, dérivés des libellés
       visibles des boutons situés après l'item courant. */
    if (estNoeud(filListe)) {
      const items = Array.prototype.slice.call(filListe.querySelectorAll('.recit-thread-item'));
      const index = items.findIndex((n) => estNoeud(n) && n.classList && n.classList.contains('is-current'));
      const parentFil = filListe.parentNode;
      if (items.length && index >= 0 && estNoeud(parentFil) && estNoeud(filTitre)) {
        const restants = items.length - index - 1;
        const motsRestants = items.slice(index + 1)
          .reduce((somme, n) => somme + compteMots(n.textContent), 0);
        placeParagraphe(el, 'v2-e061-restants',
          'recit-v2-e061-readout recit-v2-e061-restants', parentFil, filTitre,
          `Fil : ${restants} point${restants > 1 ? 's' : ''} restant${restants > 1 ? 's' : ''} · ≈ ${motsRestants} mot${motsRestants > 1 ? 's' : ''} à parcourir.`);
      }
    }

    /* E061-06 — Titre équilibré : classe posée, règle text-wrap:balance en CSS. */
    ajouteClasse(titre, 'recit-v2-e061-titre');

    /* E061-07 — Orphelines évitées : classe posée sur le contexte. */
    ajouteClasse(contexte, 'recit-v2-e061-contexte');

    /* E061-08 — Respiration des mots : la classe E061-07 porte aussi
       word-spacing:.03em, distinct du letter-spacing de la passe 1. */

    /* E061-09 — Cibles tactiles et focus renforcés des boutons du fil. */
    if (estNoeud(filListe)) {
      Array.prototype.forEach.call(
        filListe.querySelectorAll('.recit-thread-item'),
        (n) => ajouteClasse(n, 'recit-v2-e061-fil-item')
      );
    }

    /* E061-10 — Aération verticale de la liste du fil. */
    ajouteClasse(filListe, 'recit-v2-e061-fil-liste');
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
