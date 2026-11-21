import { register } from './registry.js';

/* V2 lentille E077 — Contraste et perception (complément de la passe 1).
   Dix chantiers V2 neufs, distincts de ceux de la passe 1 (barre d'outils,
   filtres actifs, crédit/légende d'image, titre, glyphe de type, point courant,
   bandes du fil, boutons désactivés, état de lecture, bandeau de statut). Ici :
   perceptibilité des canaux encore muets — progression, durée, repère d'étape,
   chapeau, commandes actives, certitude dans le fil, état vide, traçabilité,
   légende et image absente. Tous non destructifs : sans ce module, la vue reste
   intégralement lisible. Préfixes : classes `recit-v2-e077-`, ids DOM
   `v2-e077-` (jamais les ids `e077-` de la passe 1 qui tourne sur le même DOM),
   attributs `data-v2-e077-`. Zéro réseau, zéro console, zéro aléa, aucune
   animation JavaScript, aucun fichier partagé modifié. */

const CSS = `
/* Socle — jetons locaux V2, distincts des jetons --e077-* de la passe 1. */
.recit-v2-e077-root{
  --v2-e077-encre:#f5f1e8;
  --v2-e077-doux:#cfc8bb;
  --v2-e077-or:#ffd990;
  --v2-e077-ligne:rgba(255,255,255,.28);
  --v2-e077-fond:rgba(255,255,255,.07);
}

/* E077-01 — barre de progression contrastée et progression chiffrée. */
.recit-v2-e077-progress{height:4px;box-shadow:inset 0 0 0 1px var(--v2-e077-ligne)}
.recit-v2-e077-progress>span{background:var(--v2-e077-or);box-shadow:inset -2px 0 0 rgba(255,255,255,.85),0 0 6px rgba(255,217,144,.45)}
.recit-v2-e077-readout{margin:6px 0 0;color:var(--v2-e077-doux);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-v2-e077-readout::before{content:"↗ ";color:var(--v2-e077-or)}

/* E077-02 — durée de lecture détachée du texte technique environnant. */
.recit-v2-e077-timing{color:var(--v2-e077-encre);border-left:2px solid var(--v2-e077-or);padding-left:8px;font-variant-numeric:tabular-nums}

/* E077-03 — repère d'étape en pastille contrastée. */
.recit-v2-e077-kicker{display:inline-block;padding:3px 9px;border:1px solid var(--v2-e077-ligne);border-left:3px solid var(--v2-e077-or);border-radius:6px;background:var(--v2-e077-fond);color:var(--v2-e077-encre);letter-spacing:.06em;font-variant-numeric:tabular-nums}

/* E077-04 — chapeau du premier point mis en exergue. */
.recit-v2-e077-context{border-left:3px solid var(--v2-e077-or);background:var(--v2-e077-fond);padding:8px 12px;border-radius:0 6px 6px 0;color:var(--v2-e077-encre)}

/* E077-05 — commandes actives : contraste et focus renforcés (pas les [disabled]). */
.recit-v2-e077-actions button:not([disabled]){border-color:var(--v2-e077-ligne);color:var(--v2-e077-encre)}
.recit-v2-e077-actions button:not([disabled]):hover{background:var(--v2-e077-fond);border-color:var(--v2-e077-or)}
.recit-v2-e077-actions button:not([disabled]):focus-visible{outline:2px solid var(--v2-e077-or);outline-offset:2px}

/* E077-06 — certitude dans le fil : glyphe ajouté à l'étiquette de type. */
.recit-v2-e077-fil .recit-thread-item[data-v2-e077-thread-conf="verifie"] .thread-kind::after{content:" ✓";color:var(--v2-e077-or)}
.recit-v2-e077-fil .recit-thread-item[data-v2-e077-thread-conf="certain"] .thread-kind::after{content:" ■";color:var(--v2-e077-doux)}
.recit-v2-e077-fil .recit-thread-item[data-v2-e077-thread-conf="probable"] .thread-kind::after{content:" ◐";color:var(--v2-e077-doux)}
.recit-v2-e077-fil .recit-thread-item[data-v2-e077-thread-conf="disputed"] .thread-kind::after{content:" ≈";color:var(--v2-e077-or)}

/* E077-07 — état vide du fil : cadre et repère de lecture. */
.recit-v2-e077-vide{border-color:var(--v2-e077-or);background:var(--v2-e077-fond)}
.recit-v2-e077-vide::before{content:"∅ ";color:var(--v2-e077-or)}
.recit-v2-e077-vide p{color:var(--v2-e077-encre)}
.recit-v2-e077-vide .c3a-reset{border-color:var(--v2-e077-or);color:var(--v2-e077-encre);min-height:36px}

/* E077-08 — traçabilité et sources : contraste et filet latéral. */
.recit-v2-e077-trace{border-left:2px solid var(--v2-e077-ligne);padding-left:10px;color:var(--v2-e077-doux)}
.recit-v2-e077-trace summary{color:var(--v2-e077-encre)}
.recit-v2-e077-sources{border-left:2px solid var(--v2-e077-ligne);padding-left:10px;color:var(--v2-e077-doux)}

/* E077-09 — légende : contraste et repères de lecture par paragraphe. */
.recit-v2-e077-legende{color:var(--v2-e077-doux)}
.recit-v2-e077-legende p{position:relative;padding-left:14px}
.recit-v2-e077-legende p::before{content:"›";position:absolute;left:0;color:var(--v2-e077-or)}

/* E077-10 — image absente : placeholder contrasté et repéré. */
.recit-v2-e077-media-vide{display:flex;align-items:center;justify-content:center;border:1px dashed var(--v2-e077-ligne);background:rgba(0,0,0,.18);color:var(--v2-e077-doux);text-align:center;padding:12px}
.recit-v2-e077-media-vide::before{content:"▧";color:var(--v2-e077-or);margin-right:8px}
`;

/* Ajoute une classe sans jamais retirer ni remplacer une classe existante. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
    && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Pose un attribut sans écraser une valeur existante portée par la coque. */
function poseAttribut(noeud, nom, valeur) {
  if (noeud && typeof noeud.getAttribute === 'function'
    && typeof noeud.setAttribute === 'function'
    && noeud.getAttribute(nom) === null) noeud.setAttribute(nom, valeur);
}

/* Dépose (ou réutilise) un paragraphe visible, à un emplacement stable. */
function placeParagraphe(doc, fabrique, id, classe, parent, ancre, texte) {
  if (!parent || typeof parent.insertBefore !== 'function'
    || !doc || typeof doc.getElementById !== 'function') return null;
  let noeud = doc.getElementById(id);
  if (!noeud) {
    noeud = fabrique('p', classe);
    noeud.id = id;
  }
  noeud.textContent = texte;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

/* Traduction de data-confidence en jeton ASCII, sans toucher à l'attribut source. */
function jetonConfiance(valeur) {
  const t = String(valeur || '');
  if (t === 'vérifié' || t === 'verifie') return 'verifie';
  if (t === 'certain') return 'certain';
  if (t === 'probable') return 'probable';
  if (t === 'disputed' || t === 'contesté' || t === 'conteste') return 'disputed';
  return 'autre';
}

register('E077', (ctx) => {
  const { layout, css, el } = ctx;
  try {
    if (typeof document === 'undefined' || !layout
      || typeof layout.querySelector !== 'function') return;

    /* Un seul appel CSS, toutes les règles du module. */
    css('recit-v2-e077', CSS);

    /* Socle : jetons locaux et ancrage des règles V2. */
    ajouteClasse(layout, 'recit-v2-e077-root');

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    /* E077-01 — progression lue dans la largeur réelle de la barre. */
    const progression = corps.querySelector('.recit-progress');
    const remplissage = corps.querySelector('.recit-progress > span');
    const kicker = corps.querySelector('.view-kicker');
    if (progression) {
      ajouteClasse(progression, 'recit-v2-e077-progress');
      let pct = null;
      if (remplissage && remplissage.style && remplissage.style.width) {
        const trouvé = remplissage.style.width.match(/(\d+(?:\.\d+)?)\s*%/);
        if (trouvé) {
          const valeur = Math.round(parseFloat(trouvé[1]));
          if (Number.isFinite(valeur)) pct = valeur;
        }
      }
      if (pct !== null) {
        placeParagraphe(document, el, 'v2-e077-progression', 'recit-v2-e077-readout',
          corps, kicker, `Progression : ${pct} % du repère parcourus.`);
      }
    }

    /* E077-02 — durée de lecture détachée du bloc technique. */
    const timing = corps.querySelector('.recit-timing');
    if (timing) ajouteClasse(timing, 'recit-v2-e077-timing');

    /* E077-03 — kicker en pastille contrastée. */
    if (kicker) ajouteClasse(kicker, 'recit-v2-e077-kicker');

    /* E077-04 — chapeau du premier point, s'il est présent. */
    const contexte = document.getElementById('recit-context') || corps.querySelector('.recit-context');
    if (contexte) ajouteClasse(contexte, 'recit-v2-e077-context');

    /* E077-05 — seules les commandes actives voient leur contraste renforcé. */
    const actions = corps.querySelector('.recit-actions');
    if (actions) ajouteClasse(actions, 'recit-v2-e077-actions');

    /* E077-06 — certitude lue sur data-confidence, jamais codée en dur. */
    const fil = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');
    if (fil) {
      ajouteClasse(fil, 'recit-v2-e077-fil');
      const items = fil.querySelectorAll('.recit-thread-item');
      if (items && typeof items.forEach === 'function') {
        items.forEach((item) => {
          if (item && typeof item.getAttribute === 'function'
            && typeof item.setAttribute === 'function') {
            const jeton = jetonConfiance(item.getAttribute('data-confidence'));
            if (jeton !== 'autre') poseAttribut(item, 'data-v2-e077-thread-conf', jeton);
          }
        });
      }
    }

    /* E077-07 — état vide du fil : seul le nœud .c3a-empty est ciblé. */
    const vide = corps.querySelector('.c3a-empty');
    if (vide) ajouteClasse(vide, 'recit-v2-e077-vide');

    /* E077-08 — traçabilité : le compte est dérivé du texte réel du résumé. */
    const trace = corps.querySelector('.recit-trace');
    if (trace) {
      ajouteClasse(trace, 'recit-v2-e077-trace');
      const resume = trace.querySelector('summary');
      if (resume && typeof resume.textContent !== 'undefined') {
        const trouvé = (resume.textContent || '').match(/(\d+)\s*référence/i);
        if (trouvé) poseAttribut(trace, 'data-v2-e077-refs', trouvé[1]);
      }
    }
    const sources = corps.querySelector('.recit-sources');
    if (sources) ajouteClasse(sources, 'recit-v2-e077-sources');

    /* E077-09 — légende : repères sur les paragraphes existants. */
    const legende = corps.querySelector('.recit-legend');
    if (legende) ajouteClasse(legende, 'recit-v2-e077-legende');

    /* E077-10 — image absente : le placeholder est repéré s'il existe. */
    const mediaVide = layout.querySelector('.recit-media .media-empty');
    if (mediaVide) ajouteClasse(mediaVide, 'recit-v2-e077-media-vide');
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
