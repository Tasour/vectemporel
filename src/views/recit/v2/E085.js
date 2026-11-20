import { register } from './registry.js';

/* V2 lentille E085 — Accessibilité ARIA et lecteurs d'écran (complément).
   Dix chantiers V2 neufs et distincts de la passe 1 : lien d'évitement, média
   nommé, résumé audible visible, compte du fil, commandes indisponibles,
   cibles tactiles, focus visible, état de lecture, type de point rattaché au
   titre et mouvement réduit. Tout est additif et non destructif : sans ce
   module la vue Récit reste intégralement lisible. Une seule feuille, un seul
   enregistrement. Préfixes : classes recit-v2-e085-, ids v2-e085- (jamais les
   ids e085- de la passe 1, qui tourne sur le même DOM). Zéro réseau, zéro
   console, zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* E085-01 — Lien d'évitement vers le point courant. */
.recit-v2-e085-skip{position:absolute;left:-9999px;top:8px;z-index:60;min-height:36px;padding:8px 12px;border:1px solid var(--gold);border-radius:8px;background:rgba(12,12,14,.96);color:var(--gold-bright);font-size:11px;line-height:1.4;text-decoration:none}
.recit-v2-e085-skip:focus,.recit-v2-e085-skip:focus-visible{left:8px}

/* E085-03 — Résumé audible visible du point courant. */
.recit-v2-e085-recap{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums;transition:opacity .18s linear}

/* E085-04 — Descripteur du fil, masqué visuellement. */
.recit-v2-e085-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* E085-06 — Cibles tactiles conformes des filtres et du résumé. */
.recit-layout .recit-v2-e085-cibles .c3a-filter,
.recit-layout .recit-v2-e085-cibles .c3a-reset,
.recit-layout .recit-v2-e085-cibles .recit-trace summary{min-height:36px}

/* E085-07 — Focus visible renforcé sur tous les contrôles. */
.recit-layout .recit-v2-e085-focus :is(button,a,input,summary,[tabindex]):focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E085-10 — Mouvement réduit : aucune transition sur le résumé. */
.recit-layout[data-v2-e085-motion="reduce"] .recit-v2-e085-recap{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e085-recap{transition:none}}
`;

/* Ajoute une classe sans jamais écraser les classes déjà portées. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Enrichit aria-describedby par fusion de jetons : préserve recit-context,
   e085-position et tout autre identifiant déjà posé par la coque ou la passe 1. */
function ajouterDescription(noeud, id) {
  if (!noeud || typeof noeud.getAttribute !== 'function') return;
  const jetons = (noeud.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (jetons.indexOf(id) === -1) {
    jetons.push(id);
    noeud.setAttribute('aria-describedby', jetons.join(' '));
  }
}

/* Position « Étape X / Y » lue dans le bandeau réel, sans chiffre inventé. */
function lirePosition(racine) {
  const kicker = racine && typeof racine.querySelector === 'function'
    ? racine.querySelector('.view-kicker') : null;
  const trouve = kicker && /(\d+)\s*\/\s*(\d+)/.exec(kicker.textContent || '');
  if (!trouve) return null;
  return { courant: Number(trouve[1]), total: Number(trouve[2]) };
}

/* Crée ou actualise un texte masqué réservé aux lecteurs d'écran. */
function srV2(el, id, texte, parent) {
  if (!parent || typeof parent.appendChild !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud || typeof noeud.textContent === 'undefined') {
    noeud = el('span', 'recit-v2-e085-sr', texte);
    noeud.id = id;
  } else {
    noeud.textContent = texte;
  }
  if (noeud.parentNode !== parent) parent.appendChild(noeud);
  return noeud;
}

/* Dépose (ou réutilise) un paragraphe juste après une ancre stable. */
function apresV2(el, id, classe, parent, ancre, texte, tag) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud || typeof noeud.textContent === 'undefined') {
    noeud = el(tag || 'p', classe, texte);
    noeud.id = id;
  } else {
    noeud.textContent = texte;
  }
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

register('E085', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout
      || typeof layout.querySelector !== 'function'
      || typeof css !== 'function' || typeof el !== 'function') return;
    css('recit-v2-e085', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;
    ajouteClasse(layout, 'recit-v2-e085');

    /* Repères du DOM, tous facultatifs. */
    const titre = document.getElementById('recit-point-title') || corps.querySelector('.recit-title');
    const kicker = corps.querySelector('.view-kicker');
    const conf = corps.querySelector('.recit-conf');
    const timing = corps.querySelector('.recit-timing');
    const media = layout.querySelector('.recit-media');
    const image = media && media.querySelector('img');
    const mediaVide = media && media.querySelector('.media-empty');
    const fil = corps.querySelector('.recit-thread');
    const listeFil = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');
    const actions = corps.querySelector('.recit-actions');
    const boutons = actions ? Array.from(actions.querySelectorAll('button')) : [];
    const lecture = actions ? actions.querySelector('.recit-play') : null;

    const pos = lirePosition(corps);
    const confTexte = conf ? (conf.textContent || '').trim() : '';
    const titreTexte = titre ? (titre.textContent || '').trim() : '';
    const typeTexte = kicker
      ? (kicker.textContent || '').split('·').slice(1).join('·').trim() : '';

    /* E085-01 — Lien d'évitement : cible vérifiée dans le DOM rendu. */
    if (titre && titre.id && !document.getElementById('v2-e085-skip')) {
      const lien = el('a', 'recit-v2-e085-skip', 'Aller au point courant');
      lien.id = 'v2-e085-skip';
      lien.setAttribute('href', `#${titre.id}`);
      if (typeof corps.insertBefore === 'function') corps.insertBefore(lien, corps.firstChild);
    }

    /* E085-02 — Média nommé : l'étiquette vient de l'alt réel ou du texte
       « aucune image » déjà présent ; aucun attribut de l'image n'est touché. */
    if (media && typeof media.setAttribute === 'function') {
      const libelle = image && image.alt
        ? `Illustration du repère : ${image.alt}`
        : (mediaVide ? (mediaVide.textContent || '').trim() : 'Illustration du repère');
      media.setAttribute('role', 'group');
      media.setAttribute('aria-roledescription', 'média du repère');
      media.setAttribute('aria-label', libelle || 'Média du repère');
      ajouteClasse(media, 'recit-v2-e085-media');
    }

    /* E085-03 — Résumé audible visible, assemblé depuis position, type,
       certitude et titre réels. */
    if (pos && titre) {
      const morceaux = [`Point ${pos.courant} sur ${pos.total}`];
      if (typeTexte) morceaux.push(typeTexte);
      if (confTexte) morceaux.push(confTexte);
      const resume = `${morceaux.join(' · ')} — ${titreTexte}`.trim();
      apresV2(el, 'v2-e085-recap', 'recit-v2-e085-recap', corps,
        timing || kicker, resume, 'p');
    }

    /* E085-04 — Compte des points réellement affichés dans le fil, rattaché
       à la liste par aria-describedby sans écraser son libellé d'origine. */
    if (listeFil && typeof listeFil.setAttribute === 'function') {
      const items = Array.from(listeFil.querySelectorAll('.c3a-thread-item, .recit-thread-item'));
      if (items.length) {
        const surTotal = pos ? ` sur ${pos.total}` : '';
        const pluriel = items.length > 1 ? 's' : '';
        srV2(el, 'v2-e085-fil-compte',
          `Fil : ${items.length} point${pluriel}${surTotal} affiché${pluriel}.`,
          fil || corps);
        ajouterDescription(listeFil, 'v2-e085-fil-compte');
      }
    }

    /* E085-05 — Commandes indisponibles : une mention masquée est ajoutée aux
       seuls boutons réellement disabled, sans retirer leur libellé. */
    boutons.forEach((bouton) => {
      if (!bouton.disabled || typeof bouton.hasAttribute !== 'function') return;
      if (bouton.hasAttribute('data-v2-e085-indispo')) return;
      const note = el('span', 'recit-v2-e085-sr', ' (indisponible)');
      bouton.appendChild(note);
      bouton.setAttribute('data-v2-e085-indispo', '1');
    });

    /* E085-06 — Cibles tactiles des filtres, de la réinitialisation et du
       résumé de traçabilité portées à 36 px minimum. */
    ajouteClasse(corps, 'recit-v2-e085-cibles');

    /* E085-07 — Focus visible sur l'ensemble des contrôles de la vue. */
    ajouteClasse(corps, 'recit-v2-e085-focus');

    /* E085-08 — État de la lecture automatique lu sur aria-pressed et exposé
       dans une région de statut dédiée, distincte de #atlas-recit-live. */
    if (lecture && typeof lecture.getAttribute === 'function') {
      const actif = lecture.getAttribute('aria-pressed') === 'true';
      const etat = apresV2(el, 'v2-e085-play-etat', 'recit-v2-e085-sr', actions, lecture,
        actif ? 'Lecture automatique en cours.' : 'Lecture automatique en pause.', 'p');
      if (etat && typeof etat.setAttribute === 'function') {
        etat.setAttribute('role', 'status');
        etat.setAttribute('aria-live', 'polite');
        etat.setAttribute('aria-atomic', 'true');
      }
    }

    /* E085-09 — Type de point rattaché au titre : la fusion conserve les
       descripteurs de la passe 1 et le recit-context de la coque. */
    if (titre && typeTexte && typeof titre.setAttribute === 'function') {
      srV2(el, 'v2-e085-type', `Type de point : ${typeTexte}.`, corps);
      ajouterDescription(titre, 'v2-e085-type');
    }

    /* E085-10 — Mouvement réduit lu une fois par rendu. */
    if (typeof layout.setAttribute === 'function') {
      const reduit = !!(reducedMotion && typeof reducedMotion === 'function' && reducedMotion());
      layout.setAttribute('data-v2-e085-motion', reduit ? 'reduce' : 'normal');
    }
  } catch (_) {
    /* Une lentille défaillante ne doit jamais casser le rendu du récit. */
  }
});
