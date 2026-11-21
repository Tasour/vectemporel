import { register } from './registry.js';

/* V2 lentille E091 — Lisibilité et mesure de lecture (complément de la passe 1).
   Dix chantiers V2 neufs, distincts de ceux de la passe 1 (orphelins, marge,
   sélection, voile de légende, durée 200 mots/min, densité, volume en lignes,
   phase de lecture, charge cumulée, caractères agrandis). Ici : compte de
   caractères, richesse lexicale, longueur des phrases, moyenne du fil, points
   restants, césure, interlignage, contraste, retrait du fil et mouvement réduit.
   Tout chiffre est dérivé du DOM réel (textContent / aria-label), jamais inventé.
   Tous non destructifs : sans ce module, la vue reste intégralement lisible.
   Préfixes : classes recit-v2-e091-, ids DOM v2-e091- (jamais e091- de la passe 1,
   qui tourne sur le MÊME DOM). Zéro réseau, zéro console, zéro aléa. Français. */

const CSS = `
/* E091-01 — Compte de caractères et de mots du point courant. */
.recit-v2-e091-readout{margin:2px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-v2-e091-caracteres{margin-top:4px}

/* E091-02 — Richesse lexicale : mots distincts sur occurrences. */
.recit-v2-e091-vocabulaire{margin-top:1px}

/* E091-03 — Longueur moyenne des phrases du point. */
.recit-v2-e091-phrases{margin-top:1px}

/* E091-04 — Moyenne de mots par point du fil. */
.recit-v2-e091-moyenne{margin-top:6px;padding-top:5px;border-top:1px solid var(--line)}

/* E091-05 — Points restants dans le repère. */
.recit-v2-e091-restants{margin-top:1px}

/* E091-06 — Césure douce des mots longs dans le résumé. */
.recit-layout .recit-v2-e091-cesure .recit-context{hyphens:auto;overflow-wrap:break-word}

/* E091-07 — Interlignage de confort du résumé. */
.recit-layout .recit-v2-e091-interligne .recit-context{line-height:1.72}

/* E091-08 — Contraste des mentions secondaires. */
.recit-layout .recit-v2-e091-contraste .recit-meta,
.recit-layout .recit-v2-e091-contraste .c3a-status,
.recit-layout .recit-v2-e091-contraste .recit-timing{color:var(--ink-soft)}

/* E091-09 — Mise en retrait discrète du fil du repère. */
.recit-layout .recit-v2-e091-fil{border-left:1px solid var(--line);padding-left:10px}
@media (max-width:620px){.recit-layout .recit-v2-e091-fil{padding-left:6px}}

/* E091-10 — Mouvement réduit des lectures chiffrées V2. */
.recit-v2-e091-readout{transition:opacity .18s linear}
.recit-layout[data-v2-e091-motion="reduce"] .recit-v2-e091-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e091-readout{transition:none}}
`;

/* Ajoute une classe sans jamais écraser les classes déjà portées par le nœud. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Comptages déterministes, tous fondés sur le texte réellement affiché. */
function compteMots(texte) {
  return String(texte || '').trim().split(/\s+/).filter(Boolean).length;
}

function compteCaracteres(texte) {
  return String(texte || '').replace(/\s+/g, '').length;
}

function vocabulaire(texte) {
  const propres = String(texte || '').trim().split(/\s+/).filter(Boolean)
    .map((mot) => mot.toLowerCase().replace(/^[^a-z0-9à-ÿ'’-]+|[^a-z0-9à-ÿ'’-]+$/g, ''))
    .filter(Boolean);
  return { occurrences: propres.length, distincts: new Set(propres).size };
}

function virgule(valeur) {
  return String(valeur).replace('.', ',');
}

/* Dépose (ou réutilise) un paragraphe visible de synthèse, de façon idempotente.
   Le retrait d'un nœud déplacé garantit l'unicité de l'id v2-e091-. */
function placeParagraphe(fabrique, id, classe, parent, ancre, texte) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (noeud && noeud.parentElement !== parent) {
    if (noeud.parentNode) noeud.parentNode.removeChild(noeud);
    noeud = null;
  }
  if (!noeud) {
    noeud = fabrique('p', `recit-v2-e091-readout ${classe}`);
    noeud.id = id;
  }
  noeud.textContent = texte;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

register('E091', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e091', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const titre = document.getElementById('recit-point-title') || corps.querySelector('.recit-title');
    const contexte = document.getElementById('recit-context') || corps.querySelector('.recit-context');
    const timing = corps.querySelector('.recit-timing');
    const fil = corps.querySelector('.recit-thread');
    const kicker = corps.querySelector('.view-kicker');
    const textePlein = [titre && titre.textContent, contexte && contexte.textContent]
      .filter(Boolean).join(' ');

    /* Les lectures chiffrées s'enchaînent dans un ordre stable après .recit-timing. */
    let ancre = timing;
    const pose = (id, classe, texte) => {
      const noeud = placeParagraphe(el, id, classe, corps, ancre, texte);
      if (noeud) ancre = noeud;
      return noeud;
    };

    /* E091-01 — compte de caractères et de mots du point courant. */
    if (titre) {
      const caracteres = compteCaracteres(titre.textContent);
      const mots = compteMots(titre.textContent);
      if (mots > 0) {
        pose('v2-e091-caracteres', 'recit-v2-e091-caracteres',
          `Point courant : ${caracteres} caractère${caracteres > 1 ? 's' : ''}, ${mots} mot${mots > 1 ? 's' : ''}.`);
      }
    }

    /* E091-02 — richesse lexicale, distinct du rapport caractères/mot de la passe 1. */
    if (textePlein) {
      const { occurrences, distincts } = vocabulaire(textePlein);
      if (occurrences > 0) {
        pose('v2-e091-vocabulaire', 'recit-v2-e091-vocabulaire',
          `Vocabulaire : ${distincts} mot${distincts > 1 ? 's' : ''} distinct${distincts > 1 ? 's' : ''} sur ${occurrences} occurrence${occurrences > 1 ? 's' : ''}, rapport ${virgule((distincts / occurrences).toFixed(2))}.`);
      }
    }

    /* E091-03 — longueur moyenne des phrases, déduite de la ponctuation réelle. */
    if (textePlein) {
      const phrases = String(textePlein).split(/[.!?…]+/).map((s) => s.trim()).filter(Boolean);
      if (phrases.length) {
        pose('v2-e091-phrases', 'recit-v2-e091-phrases',
          `Phrases : ${phrases.length} phrase${phrases.length > 1 ? 's' : ''}, ≈ ${virgule((compteMots(textePlein) / phrases.length).toFixed(1))} mot${(compteMots(textePlein) / phrases.length) > 1 ? 's' : ''} en moyenne.`);
      }
    }

    /* E091-04 — moyenne de mots par point, depuis les libellés accessibles du fil. */
    if (fil) {
      const items = Array.from(fil.querySelectorAll('.recit-thread-item'));
      if (items.length) {
        const total = items.reduce((somme, item) => somme + compteMots(
          item.getAttribute('aria-label') || item.textContent || ''
        ), 0);
        const moyenne = total / items.length;
        pose('v2-e091-moyenne', 'recit-v2-e091-moyenne',
          `Fil : ${items.length} point${items.length > 1 ? 's' : ''}, ≈ ${virgule(moyenne.toFixed(1))} mot${moyenne > 1 ? 's' : ''} par point en moyenne.`);
      }
    }

    /* E091-05 — points restants, lus dans le kicker « Étape X / Y ». */
    if (kicker) {
      const repere = /Étape\s+(\d+)\s*\/\s*(\d+)/i.exec(kicker.textContent || '');
      if (repere) {
        const etape = parseInt(repere[1], 10);
        const total = parseInt(repere[2], 10);
        const restants = Math.max(0, total - etape);
        pose('v2-e091-restants', 'recit-v2-e091-restants',
          `Parcours : point ${etape} sur ${total}, ${restants} point${restants > 1 ? 's' : ''} restant${restants > 1 ? 's' : ''}.`);
      }
    }

    /* E091-06 — césure douce des mots longs du résumé. */
    ajouteClasse(corps, 'recit-v2-e091-cesure');

    /* E091-07 — interlignage de confort du résumé. */
    ajouteClasse(corps, 'recit-v2-e091-interligne');

    /* E091-08 — contraste des mentions secondaires. */
    ajouteClasse(corps, 'recit-v2-e091-contraste');

    /* E091-09 — mise en retrait discrète du fil du repère. */
    ajouteClasse(fil, 'recit-v2-e091-fil');

    /* E091-10 — préférence de mouvement lue une fois par rendu. */
    if (reducedMotion && typeof reducedMotion === 'function' && reducedMotion()) {
      layout.setAttribute('data-v2-e091-motion', 'reduce');
    } else {
      layout.setAttribute('data-v2-e091-motion', 'normal');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
