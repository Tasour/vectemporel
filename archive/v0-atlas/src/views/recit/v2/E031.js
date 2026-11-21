import { register } from './registry.js';

/* V2 lentille E031 — Lisibilité et mesure de lecture (complément de la passe 1).
   Dix chantiers V2 neufs, distincts de ceux de la passe 1 : respiration
   syntaxique, longueur lexicale moyenne, part de mots longs, rythme affiché,
   retour à la ligne naturel, respiration inter-paragraphes, mesure bornée des
   paragraphes de lecture, séparation visuelle des mesures, groupe étiqueté et
   confort des chiffres. Les quatre mesures sont calculées depuis le texte
   réellement affiché (textContent) et depuis le libellé réel de .recit-timing ;
   aucun chiffre n'est inventé.
   Greffon non destructif : aucun nœud de recit.js n'est modifié, ids préfixés
   v2-e031- (jamais les ids e031- de la passe 1 qui tourne sur le même DOM),
   classes préfixées recit-v2-e031-, zéro réseau, zéro console, zéro aléa. */

const CSS = `
/* E031-01 — Respiration syntaxique : paragraphe de mesure. */
.recit-v2-e031-readout{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.55}
.recit-v2-e031-phrases{margin-top:8px}

/* E031-02 — Longueur lexicale moyenne : paragraphe de mesure. */
.recit-v2-e031-lexique{margin-top:2px}

/* E031-03 — Part de mots longs : paragraphe de mesure. */
.recit-v2-e031-longs{margin-top:2px}

/* E031-04 — Rythme de lecture affiché : paragraphe de mesure. */
.recit-v2-e031-rythme{margin-top:2px}

/* E031-05 — Retour à la ligne naturel sur le récit et la légende. */
.recit-layout .recit-v2-e031-pretty .recit-context,
.recit-layout .recit-v2-e031-pretty .recit-legend p{text-wrap:pretty}

/* E031-06 — Respiration entre paragraphes du corps. */
.recit-layout .recit-v2-e031-respiration .recit-body>p+p{margin-top:10px}

/* E031-07 — Mesure bornée des paragraphes de mesure V2. */
.recit-layout .recit-v2-e031-mesure .recit-v2-e031-readout{max-width:62ch}

/* E031-08 — Séparation visuelle des mesures et du récit. */
.recit-layout .recit-v2-e031-separateur .recit-v2-e031-readout{border-left:2px solid var(--line);padding-left:10px}

/* E031-09 — Groupe de mesures étiqueté pour les lecteurs d'écran. */
.recit-v2-e031-groupe{margin:8px 0 0;padding:0}

/* E031-10 — Chiffres tabulaires et mouvement réduit des seules mesures V2. */
.recit-v2-e031-readout{font-variant-numeric:tabular-nums;transition:opacity .18s linear}
.recit-layout[data-v2-e031-motion="reduce"] .recit-v2-e031-groupe .recit-v2-e031-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e031-readout{transition:none}}
`;

function estNoeud(noeud) {
  return Boolean(noeud) && typeof noeud === 'object' && noeud.nodeType === 1;
}

function ajouteClasse(noeud, nom) {
  if (estNoeud(noeud) && noeud.classList
      && typeof noeud.classList.add === 'function'
      && typeof noeud.classList.contains === 'function'
      && !noeud.classList.contains(nom)) {
    noeud.classList.add(nom);
  }
}

function texteDe(noeud) {
  return estNoeud(noeud) && typeof noeud.textContent === 'string' ? noeud.textContent : '';
}

function motsDe(texte) {
  return String(texte || '').trim().split(/\s+/).filter(Boolean);
}

function lettres(mot) {
  return String(mot || '').replace(/[^A-Za-zÀ-ÿ0-9]/g, '').length;
}

function arrondi1(valeur) {
  return Math.round(valeur * 10) / 10;
}

function accord(nombre, singulier, pluriel) {
  return nombre > 1 ? pluriel : singulier;
}

/* Place un nœud juste après une ancre, ou en tête du parent si l'ancre est
   absente. Réutilise la position existante : aucun déplacement inutile. */
function apres(noeud, ancre, parent) {
  if (!estNoeud(noeud) || !estNoeud(parent)) return;
  if (estNoeud(ancre) && ancre.parentNode === parent) {
    if (ancre.nextSibling === noeud) return;
    parent.insertBefore(noeud, ancre.nextSibling);
  } else if (parent.firstChild !== noeud) {
    parent.insertBefore(noeud, parent.firstChild);
  }
}

register('E031', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    if (typeof css !== 'function' || typeof el !== 'function') return;
    css('recit-v2-e031', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const titre = document.getElementById('recit-point-title') || corps.querySelector('.recit-title');
    const contexte = document.getElementById('recit-context') || corps.querySelector('.recit-context');
    const timing = corps.querySelector('.recit-timing');

    const textePlein = [texteDe(titre), texteDe(contexte)].filter(Boolean).join(' ');
    const mots = motsDe(textePlein);
    const phrases = textePlein.split(/[.!?…]+/).map((partie) => partie.trim()).filter(Boolean);
    const motsTitre = motsDe(texteDe(titre));

    /* E031-09 — groupe étiqueté, déposé juste après .recit-timing. */
    let groupe = document.getElementById('v2-e031-mesures');
    if (!groupe) {
      groupe = el('div', 'recit-v2-e031-groupe');
      if (!estNoeud(groupe)) return;
      groupe.id = 'v2-e031-mesures';
      groupe.setAttribute('role', 'group');
      groupe.setAttribute('aria-label', 'Mesures de lecture de ce point');
    }
    apres(groupe, timing, corps);

    const mesure = (id, classe, texte, ancreId) => {
      let noeud = document.getElementById(id);
      if (!noeud) {
        noeud = el('p', `recit-v2-e031-readout ${classe}`);
        if (!estNoeud(noeud)) return null;
        noeud.id = id;
      }
      noeud.textContent = texte;
      apres(noeud, ancreId ? document.getElementById(ancreId) : null, groupe);
      return noeud;
    };

    let ancre = null;

    /* E031-01 — phrases et mots par phrase, lus dans le titre et le contexte. */
    if (mots.length && phrases.length) {
      const parPhrase = arrondi1(mots.length / phrases.length);
      mesure('v2-e031-phrases', 'recit-v2-e031-phrases',
        `Respiration syntaxique : ${phrases.length} ${accord(phrases.length, 'phrase', 'phrases')} · ${parPhrase} mots par phrase.`,
        ancre);
      ancre = 'v2-e031-phrases';
    }

    /* E031-02 — longueur moyenne des mots, calculée sur les mots réels. */
    if (mots.length) {
      const totalLettres = mots.reduce((somme, mot) => somme + lettres(mot), 0);
      const moyenne = arrondi1(totalLettres / mots.length);
      const qualificatif = moyenne < 5 ? 'court' : moyenne < 7 ? 'moyen' : 'long';
      mesure('v2-e031-lexique', 'recit-v2-e031-lexique',
        `Longueur lexicale : ≈ ${moyenne} caractères par mot (${qualificatif}).`,
        ancre);
      ancre = 'v2-e031-lexique';
    }

    /* E031-03 — part des mots d'au moins sept lettres, en pourcentage arrondi. */
    if (mots.length) {
      const longs = mots.filter((mot) => lettres(mot) >= 7).length;
      const pourcent = Math.round((longs / mots.length) * 100);
      const qualificatif = pourcent <= 15 ? 'faible' : pourcent <= 30 ? 'modérée' : 'élevée';
      mesure('v2-e031-longs', 'recit-v2-e031-longs',
        `Mots longs (≥ 7 lettres) : ${pourcent} % (${qualificatif}).`,
        ancre);
      ancre = 'v2-e031-longs';
    }

    /* E031-04 — rythme déduit des secondes réelles de .recit-timing et des mots
       du titre, seule source utilisée par readingSeconds() dans recit.js. */
    const found = texteDe(timing).match(/≈\s*(\d+)\s*s/);
    const secondes = found ? Number(found[1]) : 0;
    if (Number.isFinite(secondes) && secondes > 0 && motsTitre.length) {
      const rythme = arrondi1(motsTitre.length / secondes);
      mesure('v2-e031-rythme', 'recit-v2-e031-rythme',
        `Rythme affiché : ≈ ${rythme} mots par seconde d'après la durée du repère.`,
        ancre);
    }

    /* E031-05 — retour à la ligne naturel (amélioration progressive). */
    ajouteClasse(corps, 'recit-v2-e031-pretty');

    /* E031-06 — respiration entre paragraphes du corps. */
    ajouteClasse(corps, 'recit-v2-e031-respiration');

    /* E031-07 — mesure bornée appliquée aux paragraphes de mesure V2. */
    ajouteClasse(corps, 'recit-v2-e031-mesure');

    /* E031-08 — séparation visuelle des mesures et du récit. */
    ajouteClasse(corps, 'recit-v2-e031-separateur');

    /* E031-10 — mouvement réduit, lu une fois par rendu, attribut V2 propre. */
    let mouvement = 'normal';
    try { mouvement = reducedMotion && reducedMotion() ? 'reduce' : 'normal'; }
    catch { mouvement = 'normal'; }
    layout.setAttribute('data-v2-e031-motion', mouvement);
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
