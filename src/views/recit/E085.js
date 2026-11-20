import { register } from './registry.js';

/* Lentille E085 — Accessibilité ARIA et lecteurs d'écran.
   Dix chantiers indépendants (E085-01 … E085-10), tous additifs et non
   destructifs : aucun texte, aucun libellé ni aucun contrôle d'origine n'est
   retiré. Sans JavaScript, la vue Récit reste intégralement lisible.
   Une seule feuille de styles préfixée, un seul enregistrement. */

/* Crée (ou réutilise) un texte réservé aux lecteurs d'écran. Le nœud vit dans
   <body> : il survit aux reconstructions du DOM du récit et garantit que toute
   référence aria-describedby reste résolue d'un rendu à l'autre. */
function srTexte(el, id, texte) {
  if (typeof document === 'undefined' || !document.body) return null;
  let noeud = document.getElementById(id);
  if (!noeud || typeof noeud.textContent === 'undefined') {
    noeud = el('span', 'sr-only recit-e085-sr', texte);
    noeud.id = id;
    document.body.appendChild(noeud);
  } else {
    noeud.textContent = texte;
  }
  return noeud;
}

/* Ajoute un identifiant à aria-describedby sans écraser les valeurs déjà
   présentes (notamment « recit-context » posé par la vue d'origine). */
function ajouterDescription(noeud, id) {
  if (!noeud || typeof noeud.getAttribute !== 'function') return;
  const tokens = (noeud.getAttribute('aria-describedby') || '')
    .split(/\s+/).filter(Boolean);
  if (tokens.indexOf(id) === -1) {
    tokens.push(id);
    noeud.setAttribute('aria-describedby', tokens.join(' '));
  }
}

/* Lit la position « Étape x / y » depuis le bandeau de la vue. */
function lirePosition(racine) {
  const kicker = racine.querySelector('.view-kicker');
  const trouve = kicker && /(\d+)\s*\/\s*(\d+)/.exec(kicker.textContent || '');
  if (!trouve) return null;
  return { courant: Number(trouve[1]), total: Number(trouve[2]) };
}

register('E085', (ctx) => {
  try {
    const { stage, layout, css, el, reducedMotion } = ctx;
    if (typeof document === 'undefined') return;
    const racine = (layout && typeof layout.querySelector === 'function')
      ? layout
      : (stage && typeof stage.querySelector === 'function' ? stage : null);
    if (!racine) return;

    /* Transition de la barre uniquement si le mouvement est autorisé. */
    const transition = (reducedMotion && reducedMotion())
      ? ''
      : '.recit-e085-progress>span{transition:width .2s ease}';

    /* Une seule feuille, une seule fois, toutes les règles préfixées. */
    css('recit-e085', `
.recit-e085-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.recit-e085-conf{cursor:default}
${transition}`);

    if (layout && layout.classList) layout.classList.add('recit-e085');

    /* Repères du DOM, tous facultatifs. */
    const corps = racine.querySelector('.recit-body');
    const progression = racine.querySelector('.recit-progress');
    const titre = racine.querySelector('#recit-point-title')
      || racine.querySelector('.recit-title');
    const conf = racine.querySelector('.recit-conf');
    const fil = racine.querySelector('.recit-thread');
    const titreFil = racine.querySelector('.recit-thread-title');
    const listeFil = racine.querySelector('.recit-thread-list')
      || racine.querySelector('#c3a-thread');
    const actions = racine.querySelector('.recit-actions');
    const trace = racine.querySelector('.recit-trace');
    const resumeTrace = trace && trace.querySelector('summary');
    const sources = racine.querySelector('.recit-sources');
    const legende = racine.querySelector('.recit-legend');
    const image = racine.querySelector('.recit-media img');
    const legendeImage = racine.querySelector('.media-caption');
    const creditImage = racine.querySelector('.recit-media-credit');

    const pos = lirePosition(racine);
    const positionTexte = pos
      ? `Point ${pos.courant} sur ${pos.total}`
      : 'Point courant du récit';
    const confTexte = conf && (conf.textContent || '').trim();

    /* E085-10 — Guide global créé en premier : les autres chantiers y
       renvoient par aria-describedby. */
    srTexte(el, 'e085-guide',
      'Vue Récit : un point affiché à la fois. Le titre est le point courant ; '
      + 'le fil permet de choisir un point ; les commandes situent sous le titre ; '
      + 'la traçabilité et la légende terminent le contenu. '
      + 'Clavier : flèche gauche et flèche droite changent de point, Espace met '
      + 'la lecture en pause ou la reprend, Entrée ouvre le détail, Début et Fin '
      + 'vont aux extrémités du fil.');

    /* E085-01 — Région nommée pour le corps du récit. */
    if (corps && typeof corps.setAttribute === 'function') {
      if (!corps.hasAttribute('data-e085-corps')) {
        corps.setAttribute('data-e085-corps', '1');
        corps.setAttribute('role', 'region');
        corps.setAttribute('aria-roledescription', 'lecture guidée');
        corps.setAttribute('aria-label', 'Récit guidé — point courant');
      }
      ajouterDescription(corps, 'e085-guide');
    }

    /* E085-02 — Barre de progression sémantique. */
    if (progression && typeof progression.setAttribute === 'function') {
      progression.setAttribute('role', 'progressbar');
      progression.setAttribute('aria-valuemin', '0');
      if (pos) {
        progression.setAttribute('aria-valuemax', String(pos.total));
        progression.setAttribute('aria-valuenow', String(pos.courant));
        progression.setAttribute('aria-valuetext', positionTexte);
      }
      if (progression.classList) progression.classList.add('recit-e085-progress');
      const span = progression.querySelector('span');
      if (span && typeof span.setAttribute === 'function') {
        span.setAttribute('aria-hidden', 'true');
      }
    }

    /* E085-03 — Chip de certitude étiqueté : le symbole seul est ambigu. */
    if (conf && typeof conf.setAttribute === 'function') {
      conf.setAttribute('role', 'img');
      const libelle = confTexte ? confTexte.replace(/^[^\s]+\s*/, '') : '';
      conf.setAttribute('aria-label', libelle
        ? `Niveau de certitude : ${libelle}`
        : 'Niveau de certitude : non précisé');
      if (conf.classList) conf.classList.add('recit-e085-conf');
    }

    /* E085-04 — Descripteur de position rattaché au titre, sans écraser
       « recit-context » déjà posé par la vue au premier point. */
    if (titre && typeof titre.setAttribute === 'function') {
      srTexte(el, 'e085-position',
        `${positionTexte}${confTexte ? `, ${confTexte}` : ''}`);
      ajouterDescription(titre, 'e085-position');
    }

    /* E085-05 — Titre du fil promu sous-titre, aide clavier du fil. */
    if (titreFil && typeof titreFil.setAttribute === 'function') {
      titreFil.setAttribute('role', 'heading');
      titreFil.setAttribute('aria-level', '2');
    }
    if (listeFil && typeof listeFil.setAttribute === 'function') {
      srTexte(el, 'e085-fil-aide',
        'Fil des points : utilisez les flèches haut et bas pour parcourir '
        + 'les points affichés, Début et Fin pour aller aux extrémités, '
        + 'Entrée pour sélectionner le point sur lequel vous êtes.');
      ajouterDescription(listeFil, 'e085-fil-aide');
    }

    /* E085-06 — Groupe nommé de commandes et aide clavier. */
    if (actions && typeof actions.setAttribute === 'function') {
      actions.setAttribute('role', 'group');
      actions.setAttribute('aria-label', 'Commandes de navigation du récit');
      srTexte(el, 'e085-actions-aide',
        'Flèche gauche : point précédent. Flèche droite : point suivant. '
        + 'Espace : pause ou reprise de la lecture automatique.');
      ajouterDescription(actions, 'e085-actions-aide');
    }

    /* E085-07 — Statut de traçabilité explicite pour les lecteurs d'écran. */
    if (sources && typeof sources.setAttribute === 'function') {
      sources.setAttribute('role', 'note');
      sources.setAttribute('aria-label',
        'Traçabilité : aucune source attachée à ce point');
    }
    if (resumeTrace && typeof resumeTrace.setAttribute === 'function') {
      const resumeTexte = (resumeTrace.textContent || '').trim();
      resumeTrace.setAttribute('aria-label', resumeTexte
        ? `${resumeTexte}. Appuyez sur Entrée pour afficher les identifiants locaux.`
        : 'Afficher la traçabilité de ce point');
    }

    /* E085-08 — Titre de la légende pour la navigation par titres. */
    if (legende && typeof legende.insertBefore === 'function'
        && !document.getElementById('e085-legende-titre')) {
      const titreLegende = el('p', 'recit-e085-sr recit-e085-legende-titre',
        'Légende et raccourcis clavier');
      titreLegende.id = 'e085-legende-titre';
      titreLegende.setAttribute('role', 'heading');
      titreLegende.setAttribute('aria-level', '2');
      legende.insertBefore(titreLegende, legende.firstChild);
    }

    /* E085-09 — L'image décrite par sa légende et son crédit visibles. */
    if (image && typeof image.setAttribute === 'function') {
      const refs = [];
      if (legendeImage) {
        if (!legendeImage.id) legendeImage.id = 'e085-media-caption';
        refs.push(legendeImage.id);
      }
      if (creditImage) {
        if (!creditImage.id) creditImage.id = 'e085-media-credit';
        refs.push(creditImage.id);
      }
      if (refs.length) image.setAttribute('aria-describedby', refs.join(' '));
    }
  } catch (_) {
    /* Une lentille défaillante ne doit jamais casser le rendu du récit. */
    return;
  }
});
