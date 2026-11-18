import { register } from './registry.js';

/* Lentille E065 — Accessibilité ARIA et lecteurs d'écran (vue Récit).
 *
 * Dix chantiers indépendants E065-01 à E065-10, tous réels et distincts, tous
 * strictement additifs : sans ce module la vue reste intégralement lisible et
 * le fil reste construisable. Un seul register('E065', ...), un seul bloc CSS
 * injecté via css('recit-e065', ...) (cssOnce garantit l'idempotence), toutes
 * les classes créées préfixées recit-e065-, tous les ids DOM préfixés e065-
 * et uniques. Aucun appel réseau, aucune journalisation, aucun Math.random,
 * aucun fichier partagé modifié, aucune exception propagée.
 *
 * Détail des chantiers : UNIFIED_AUDIT/RECIT/views/E065.md.
 */

const CSS_ID = 'recit-e065';
const RACINE = 'recit-e065-root';

/* Bloc CSS unique. Aucune règle globale, aucune ressource distante, aucune
   police téléchargée : tout est porté par nos propres classes préfixées. */
const CSS = `
.recit-e065-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
.recit-e065-skip{position:fixed;left:8px;top:-90px;z-index:60;padding:9px 13px;border:1px solid var(--gold);border-radius:8px;background:rgba(12,12,12,.96);color:var(--gold-bright);font:600 13px/1.2 var(--sans);text-decoration:none;transition:top .16s linear}
.recit-e065-skip:focus-visible{top:10px;outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-e065-titre:focus{outline:2px solid var(--gold-bright);outline-offset:3px}
.recit-e065-conf{cursor:help}
.recit-e065-reduced .recit-e065-skip{transition:none}
@media (prefers-reduced-motion:reduce){.recit-e065-skip{transition:none}}
`;

/* Pose un attribut sans jamais lever (certains nœuds peuvent être figés). */
function attr(node, nom, valeur) {
  if (!node || typeof node.setAttribute !== 'function') return;
  try { node.setAttribute(nom, valeur); } catch { /* attribut facultatif */ }
}

/* Ajoute une classe sans jamais lever si le nœud est absent. */
function marquer(node, classe) {
  if (node && node.classList && typeof node.classList.add === 'function') {
    try { node.classList.add(classe); } catch { /* décor uniquement */ }
  }
}

/* Cherche un nœud, en renvoyant null plutôt que de lever. */
function qs(node, selecteur) {
  if (!node || typeof node.querySelector !== 'function') return null;
  try { return node.querySelector(selecteur); } catch { return null; }
}

/* Récupère ou crée un nœud identifié, de façon idempotente et non destructive. */
function getOrCreate(document, parent, id, tag, classe, texte, fabriquer) {
  if (!parent || typeof parent.appendChild !== 'function') return null;
  let node = null;
  try { node = document.getElementById(id); } catch { node = null; }
  if (node && node.parentNode !== parent) return null; /* unicité de l'id préservée */
  if (!node) {
    if (typeof fabriquer !== 'function') return null;
    node = fabriquer(tag, classe, texte);
    if (!node) return null;
    try { node.id = id; } catch { return null; }
    try { parent.appendChild(node); } catch { return null; }
  }
  return node;
}

/* Noms accessibles des commandes : le libellé visible reste contenu dans
   le nom (critère WCAG « Libellé dans le nom »), la flèche étant décorative. */
const NOMS_COMMANDES = {
  'c3a-prev': 'Point précédent',
  'c3a-next': 'Point suivant',
  'c3a-play': 'Lecture automatique',
  'c3a-restart': 'Recommencer depuis le premier point',
  'c3a-next-event': 'Repère suivant',
  'c3a-chrono': 'Ouvrir la chronologie',
};

register('E065', (ctx) => {
  if (!ctx) return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  const racine = (layout && typeof layout.querySelector === 'function')
    ? layout
    : (stage && typeof stage.querySelector === 'function' ? qs(stage, '.recit-layout') : null);
  if (!racine || typeof racine.querySelector !== 'function') return;

  const doc = racine.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.getElementById !== 'function') return;
  const fabriquer = (tag, classe, texte) => (typeof el === 'function' ? el(tag, classe, texte) : null);
  const corps = qs(racine, '.recit-body') || racine;

  /* Un seul bloc CSS pour toute la lentille. */
  if (typeof css === 'function') {
    try { css(CSS_ID, CSS); } catch { /* rendu préservé coûte que coûte */ }
  }
  marquer(racine, RACINE);
  if (typeof reducedMotion === 'function' && reducedMotion()) marquer(racine, 'recit-e065-reduced');

  /* --- E065-01 : barre de progression sémantique ------------------------- */
  const progression = qs(corps, '.recit-progress');
  if (progression) {
    const kicker = qs(corps, '.view-kicker');
    const texteKicker = kicker ? String(kicker.textContent || '') : '';
    const m = /Étape\s+(\d+)\s*\/\s*(\d+)/i.exec(texteKicker);
    let courant = m ? Number(m[1]) : 0;
    let total = m ? Number(m[2]) : 0;
    if (!total) {
      const items = racine.querySelectorAll('.recit-thread-item');
      total = items.length;
      const courantNoeud = qs(racine, '.recit-thread-item[aria-current="step"], .recit-thread-item.is-current');
      if (courantNoeud) courant = Array.prototype.indexOf.call(items, courantNoeud) + 1;
    }
    if (total > 0 && courant > 0) {
      attr(progression, 'role', 'progressbar');
      attr(progression, 'aria-label', 'Progression du récit');
      attr(progression, 'aria-valuemin', '0');
      attr(progression, 'aria-valuemax', String(total));
      attr(progression, 'aria-valuenow', String(Math.min(courant, total)));
      attr(progression, 'aria-valuetext', `Point ${Math.min(courant, total)} sur ${total}`);
    }
  }

  /* --- E065-02 : barre d'outils nommée et noms accessibles des commandes -- */
  const actions = qs(corps, '.recit-actions');
  if (actions) {
    attr(actions, 'role', 'toolbar');
    attr(actions, 'aria-label', 'Commandes de lecture du récit');
    attr(actions, 'aria-orientation', 'horizontal');
    const boutons = actions.querySelectorAll('button');
    Array.prototype.forEach.call(boutons, (bouton) => {
      const clef = bouton.dataset && bouton.dataset.fk ? bouton.dataset.fk : '';
      const nom = NOMS_COMMANDES[clef]
        || String(bouton.textContent || '').trim().replace(/^[\s←→↺↗▶❚]+|[\s←→↺↗▶❚]+$/g, '');
      if (nom) attr(bouton, 'aria-label', nom);
    });
  }

  /* --- E065-03 : langue déclarée pour la synthèse vocale ------------------ */
  attr(racine, 'lang', 'fr');
  attr(racine, 'dir', 'ltr');

  /* --- E065-04 : certitude annoncée sans ambiguïté ------------------------ */
  const confiance = qs(corps, '.recit-conf');
  if (confiance) {
    const brut = String(confiance.textContent || '').trim();
    const libelle = brut.replace(/^\S+\s*/, '') || brut;
    const gloss = confiance.getAttribute('title') || '';
    const nom = libelle
      ? `Certitude : ${libelle}${gloss ? '. ' + gloss : '.'}`
      : 'Certitude non précisée pour ce point.';
    marquer(confiance, 'recit-e065-conf');
    attr(confiance, 'role', 'img');
    attr(confiance, 'aria-label', nom);
  }

  /* --- E065-05 : lien d'évitement vers le point courant ------------------- */
  if (typeof fabriquer === 'function') {
    const titre = qs(corps, '#recit-point-title, .recit-title');
    if (titre && !doc.getElementById('e065-skip')) {
      const lien = fabriquer('a', 'recit-e065-skip', 'Aller au point courant');
      if (lien) {
        try {
          lien.id = 'e065-skip';
          lien.href = '#recit-point-title';
          attr(lien, 'aria-label', 'Aller directement au point courant');
          if (typeof corps.insertBefore === 'function') corps.insertBefore(lien, corps.firstChild);
          else corps.appendChild(lien);
        } catch { /* lien facultatif */ }
      }
    }
    if (titre) marquer(titre, 'recit-e065-titre');
  }

  /* --- E065-06 : légende structurée et nommée ----------------------------- */
  const legend = qs(corps, '.recit-legend');
  if (legend) {
    attr(legend, 'role', 'note');
    const legendeTitre = getOrCreate(doc, legend, 'e065-legend-title', 'p',
      'recit-e065-sr', 'Légende et aides à la lecture.', fabriquer);
    if (legendeTitre) attr(legend, 'aria-labelledby', 'e065-legend-title');
    else attr(legend, 'aria-label', 'Légende et aides à la lecture');
  }

  /* --- E065-07 : estimation de lecture étiquetée -------------------------- */
  const timing = qs(corps, '.recit-timing');
  if (timing) {
    const texte = String(timing.textContent || '').trim();
    attr(timing, 'role', 'note');
    attr(timing, 'aria-label', texte ? `Estimation de lecture. ${texte}` : 'Estimation de lecture non disponible.');
  }

  /* --- E065-08 : image décrite par sa légende et son crédit --------------- */
  const media = qs(racine, '.recit-media');
  if (media) {
    const image = qs(media, 'img');
    const caption = qs(media, '.media-caption');
    const credit = qs(media, '.recit-media-credit');
    const parties = [caption, credit]
      .map((n) => (n ? String(n.textContent || '').trim() : ''))
      .filter(Boolean);
    if (image && parties.length) {
      const desc = getOrCreate(doc, media, 'e065-media-desc', 'p', 'recit-e065-sr',
        `Légende et crédit de l’image : ${parties.join(' · ')}.`, fabriquer);
      if (desc) attr(image, 'aria-describedby', 'e065-media-desc');
    }
  }

  /* --- E065-09 : consigne clavier pour la recherche ----------------------- */
  const recherche = qs(corps, '#c3a-search, .c3a-search');
  if (recherche && typeof fabriquer === 'function') {
    const parent = recherche.parentNode || corps;
    const indice = getOrCreate(doc, parent, 'e065-search-hint', 'span', 'recit-e065-sr',
      'Astuce : saisissez un terme pour filtrer les points de ce repère. La recherche est locale et ne quitte pas cet appareil.',
      fabriquer);
    if (indice) attr(recherche, 'aria-describedby', 'e065-search-hint');
  }

  /* --- E065-10 : statut de lecture automatique annoncé -------------------- */
  if (typeof fabriquer === 'function') {
    const statut = getOrCreate(doc, corps, 'e065-play-status', 'p', 'recit-e065-sr',
      'Lecture automatique non activée.', fabriquer);
    if (statut) {
      attr(statut, 'role', 'status');
      attr(statut, 'aria-live', 'polite');
      attr(statut, 'aria-atomic', 'true');
      const boutonLecture = qs(corps, '.recit-play, [data-fk="c3a-play"]');
      if (boutonLecture) {
        const pressé = boutonLecture.getAttribute('aria-pressed') === 'true';
        statut.textContent = pressé
          ? 'Lecture automatique activée : les points défilent automatiquement.'
          : 'Lecture automatique non activée.';
        if (!boutonLecture.dataset || boutonLecture.dataset.e065Bound !== '1') {
          if (boutonLecture.dataset) boutonLecture.dataset.e065Bound = '1';
          try {
            boutonLecture.addEventListener('click', () => {
              const actif = boutonLecture.getAttribute('aria-pressed') === 'true';
              statut.textContent = actif
                ? 'Lecture automatique activée : les points défilent automatiquement.'
                : 'Lecture automatique désactivée.';
            });
          } catch { /* annonce facultative */ }
        }
      }
    }
  }
});
