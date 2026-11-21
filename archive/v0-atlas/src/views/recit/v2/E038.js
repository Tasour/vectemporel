import { register } from './registry.js';

/* V2 lentille E038 — « Performance et sobriété » (vue Récit, complément de la passe 1).
   La passe 1 traite déjà : paint différé du fil, attributs de l'image, mode sobre,
   containment des blocs texte, barre composée, fenêtre de fil bornée, recentrage,
   panneau de coût, bascule mouvement et réutilisation des nœuds. La V2 propose
   donc DIX chantiers neufs et distincts, tous mesurés sur le DOM réel :
     01 empreinte de données texte · 02 place réservée à l'image (CLS) ·
     03 audit des ressources distantes · 04 isolation paint du média ·
     05 défilement non lissé sous mouvement réduit · 06 chronomètre d'enrichissement ·
     07 contenu différé de la légende · 08 nombres tabulaires ·
     09 préférence « économie de données » · 10 mesures sobres et idempotentes.
   Préfixes : classes recit-v2-e038-, ids DOM v2-e038- (jamais les ids e038- de la
   passe 1 qui tourne sur le MÊME DOM). Zéro réseau, zéro console, zéro aléa,
   aucun fichier partagé modifié. Sans ce module, la vue reste intégralement lisible. */

const CSS = `
/* E038-01 — Empreinte de données : lecture chiffrée sobre du volume de texte. */
.recit-v2-e038-octets{color:var(--muted-2)}

/* E038-02 — Place réservée à l'image : le ratio est préservé, pas de saut de mise en page. */
.recit-layout .recit-v2-e038-image img{max-width:100%;height:auto}

/* E038-03 — Audit des ressources : lecture chiffrée des ressources distantes. */
.recit-v2-e038-ressources{color:var(--muted-2)}

/* E038-04 — Isolation de la surface média : sa peinture ne se propage pas au récit. */
.recit-layout .recit-v2-e038-paint{contain:paint}

/* E038-05 — Mouvement réduit : défilement non lissé dans le corps du récit. */
.recit-layout[data-v2-e038-motion="reduce"] .recit-body{scroll-behavior:auto}
.recit-layout[data-v2-e038-motion="reduce"] .recit-v2-e038-readout{transition:none}

/* E038-06 — Chronomètre : lecture locale du coût d'enrichissement de ce rendu. */
.recit-v2-e038-chrono{color:var(--muted-2)}

/* E038-07 — Contenu différé de la légende, long texte sous la ligne de flottaison. */
.recit-layout .recit-v2-e038-differe .recit-legend{content-visibility:auto;contain-intrinsic-size:auto 120px}

/* E038-08 — Nombres tabulaires : largeur stable quand les mesures changent (moins de repaint). */
.recit-layout .recit-v2-e038-tabulaire .recit-v2-e038-readout{font-variant-numeric:tabular-nums}

/* E038-09 — Économie de données : transition supprimée quand le réseau le demande. */
.recit-layout[data-v2-e038-econ="on"] .recit-v2-e038-readout{transition:none}
.recit-v2-e038-reseau{color:var(--muted-2)}

/* E038-10 — Affichage sobre et idempotent des mesures V2. */
.recit-v2-e038-readout{margin:2px 0;color:var(--muted-2);font-size:9px;line-height:1.45;transition:opacity .18s linear}
@media (prefers-reduced-motion:reduce){.recit-v2-e038-readout{transition:none}}
`;

/* Recherche défensive : aucune requête DOM ne doit pouvoir lever d'exception. */
function q(racine, selecteur) {
  if (!racine || typeof racine.querySelector !== 'function') return null;
  try { return racine.querySelector(selecteur); } catch { return null; }
}

function qAll(racine, selecteur) {
  if (!racine || typeof racine.querySelectorAll !== 'function') return [];
  try { return Array.from(racine.querySelectorAll(selecteur)); } catch { return []; }
}

function setTexte(noeud, texte) {
  if (!noeud || typeof noeud.textContent !== 'string' || noeud.textContent === texte) return;
  try { noeud.textContent = texte; } catch { /* nœud figé : on ignore */ }
}

function ajouteClasse(noeud, nom) {
  if (!noeud || !noeud.classList || noeud.classList.contains(nom)) return;
  try { noeud.classList.add(nom); } catch { /* ignoré */ }
}

/* E038-10 — dépose ou réutilise un paragraphe visible, sans doublon d'id. */
function assureParagraphe(racine, parent, id, classe, ancre, texte, fabrique) {
  if (!parent || typeof parent.insertBefore !== 'function' || typeof fabrique !== 'function') return null;
  let noeud = q(racine, `#${id}`);
  if (!noeud) {
    noeud = fabrique('p', `recit-v2-e038-readout ${classe}`, texte);
    if (!noeud) return null;
    noeud.id = id;
    try {
      noeud.setAttribute('role', 'status');
      noeud.setAttribute('aria-live', 'polite');
    } catch { /* attributs non applicables */ }
  }
  setTexte(noeud, texte);
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  try {
    if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
      parent.insertBefore(noeud, cible);
    }
  } catch { /* parent instable : on renonce sans casser le rendu */ }
  return noeud;
}

/* E038-01 — nombre d'octets UTF-8 réellement présents dans le texte affiché. */
function octetsUtf8(texte) {
  const chaine = String(texte == null ? '' : texte);
  try {
    return encodeURIComponent(chaine).replace(/%[0-9A-F]{2}/gi, 'x').length;
  } catch {
    return chaine.length; /* repli : lone surrogate, on compte les unités */
  }
}

register('E038', (ctx) => {
  try {
    const { layout, css, el, reducedMotion } = ctx;
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    if (typeof css !== 'function' || typeof el !== 'function') return;
    const corps = q(layout, '.recit-body');
    if (!corps) return;

    /* E038-06 — horodatage monotone : aucune valeur aléatoire, pas d'horloge murale. */
    const horodatage = (typeof performance !== 'undefined' && performance && typeof performance.now === 'function')
      ? performance.now() : null;

    css('recit-v2-e038', CSS); /* un seul appel, toutes les règles du module. */
    const fabrique = (tag, classe, texte) => el(tag, classe, texte);

    /* E038-01 — empreinte de données lue sur le texte réel du corps. */
    const texteCorps = typeof corps.textContent === 'string' ? corps.textContent : '';
    const caracteres = texteCorps.length;
    const octets = octetsUtf8(texteCorps);
    const ko = (octets / 1024).toFixed(1).replace('.', ',');
    assureParagraphe(layout, corps, 'v2-e038-octets', 'recit-v2-e038-octets',
      q(corps, '.recit-timing'),
      `Empreinte texte : ${caracteres} caractères · ≈ ${ko} Ko en UTF-8 (texte réellement affiché).`,
      fabrique);

    /* E038-02 — dimensions réservées de l'image pour limiter le décalage de mise en page. */
    const media = q(layout, '.recit-media');
    const img = q(layout, '.recit-media img');
    let etatImage = 'aucune image pour ce repère';
    if (img) {
      let largeur = '';
      let hauteur = '';
      try { largeur = img.getAttribute('width') || ''; hauteur = img.getAttribute('height') || ''; } catch { /* ignoré */ }
      if (!largeur || !hauteur) {
        try {
          const nw = img.naturalWidth || 0;
          const nh = img.naturalHeight || 0;
          if (nw > 0 && nh > 0) {
            if (!largeur) { img.setAttribute('width', String(nw)); largeur = String(nw); }
            if (!hauteur) { img.setAttribute('height', String(nh)); hauteur = String(nh); }
          }
        } catch { /* image non chargée : on laisse le CSS réserver la place */ }
      }
      if (largeur && hauteur) etatImage = `dimensions réservées ${largeur}×${hauteur}`;
      else if (largeur || hauteur) etatImage = `dimensions partielles (${largeur || '?'}×${hauteur || '?'})`;
      else etatImage = 'dimensions non connues — place réservée par CSS';
      ajouteClasse(media, 'recit-v2-e038-image');
    }
    assureParagraphe(layout, corps, 'v2-e038-image', 'recit-v2-e038-image-info',
      q(corps, '.recit-meta'), `Image : ${etatImage}.`, fabrique);

    /* E038-03 — audit des ressources : seules les dépendances réellement présentes sont comptées. */
    const images = qAll(layout, 'img');
    const distantes = qAll(layout, 'img[src^="http"], a[href^="http"], link[href^="http"], script[src^="http"]');
    assureParagraphe(layout, corps, 'v2-e038-ressources', 'recit-v2-e038-ressources',
      q(corps, '.recit-trace') || q(corps, '.recit-sources'),
      `Images : ${images.length} · ressources distantes : ${distantes.length} · aucune ajoutée par la V2.`,
      fabrique);

    /* E038-04 — la peinture du média est isolée du reste du récit. */
    ajouteClasse(media, 'recit-v2-e038-paint');

    /* E038-05 — préférence système lue une fois par rendu, attribut propre à la V2. */
    let reduit = false;
    try { reduit = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false; } catch { reduit = false; }
    try { layout.setAttribute('data-v2-e038-motion', reduit ? 'reduce' : 'normal'); } catch { /* ignoré */ }

    /* E038-06 — coût d'enrichissement mesuré sur ce rendu, arrondi en millisecondes. */
    if (horodatage !== null) {
      let maintenant = null;
      try { maintenant = performance.now(); } catch { maintenant = null; }
      if (maintenant !== null) {
        const ms = Math.max(0, maintenant - horodatage).toFixed(2).replace('.', ',');
        assureParagraphe(layout, corps, 'v2-e038-chrono', 'recit-v2-e038-chrono',
          q(corps, '.recit-progress'), `Enrichissement V2 : ${ms} ms (mesuré sur ce rendu).`, fabrique);
      }
    }

    /* E038-07 — la légende, long texte sous la ligne de flottaison, est différée. */
    ajouteClasse(corps, 'recit-v2-e038-differe');

    /* E038-08 — chiffres de largeur constante pour les lectures qui se rafraîchissent. */
    ajouteClasse(corps, 'recit-v2-e038-tabulaire');

    /* E038-09 — économie de données : préférence réseau réelle, aucun chiffre inventé. */
    let economie = false;
    let texteReseau;
    try {
      const connexion = (typeof navigator !== 'undefined') && navigator.connection;
      if (connexion) {
        economie = Boolean(connexion.saveData);
        const type = String(connexion.effectiveType || connexion.type || 'type inconnu');
        texteReseau = economie
          ? `Réseau : économie de données active · ${type}.`
          : `Réseau : économie de données non demandée · ${type}.`;
      } else {
        texteReseau = 'Réseau : préférence non exposée par ce navigateur.';
      }
    } catch {
      texteReseau = 'Réseau : préférence indisponible.';
    }
    try { layout.setAttribute('data-v2-e038-econ', economie ? 'on' : 'off'); } catch { /* ignoré */ }
    assureParagraphe(layout, corps, 'v2-e038-reseau', 'recit-v2-e038-reseau',
      q(corps, '.recit-legend'), texteReseau, fabrique);

    /* E038-10 — aucun attribut de la coque n'est écrasé ; seuls data-v2-e038-* sont posés,
       tous les nœuds sont réutilisés par id via assureParagraphe(), et le try global
       neutralise la lentille sans jamais casser le rendu de la vue. */
  } catch {
    /* Une lentille défaillante ne doit jamais interrompre le rendu. */
  }
});
