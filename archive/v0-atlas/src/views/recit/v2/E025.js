import { register } from './registry.js';

/* V2 lentille E025 — Accessibilité ARIA et lecteurs d'écran (tour 2).
   Dix chantiers V2 neufs, distincts de ceux de la passe 1 (barre de
   progression, description du titre, annonce de lecture, repères media/body,
   clé de certitude, barre d'outils, évitement vers le titre, aide du fil,
   cap au focus du fil, notes et traçabilité). Ici : repère de recherche,
   aide par le statut réel, raison des commandes désactivées, millésime
   vocalisé, compte du fil, évitement vers le fil, statut nommé, cumul des
   filtres, crédit d'image comme note et description de la commande de lecture.
   Tous non destructifs : sans ce module la vue reste intégralement lisible.
   Préfixes : classes recit-v2-e025-, ids DOM v2-e025- (jamais e025- de la
   passe 1). Zéro réseau, zéro console, zéro aléa, aucun fichier partagé. */

let fabriquer = null; // ctx.el, mémorisé pour les helpers.

const CSS = `
/* [02] Aide à la recherche visible. */
.recit-v2-e025-note{margin:4px 0 0;color:var(--ink-soft,var(--muted-2,#9aa7b4));font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-v2-e025-search{margin-top:2px}

/* [05] Compte du fil, placé sous le titre du fil. */
.recit-thread .recit-v2-e025-thread{margin:0 0 6px}

/* [06] Lien d'évitement vers le point courant du fil. */
.recit-v2-e025-skip{position:absolute;left:-9999px;top:0;z-index:60;min-height:36px;padding:6px 12px;border:1px solid var(--gold,#e6b96f);border-radius:8px;background:rgba(12,16,24,.96);color:#f5e9d0;font:inherit;font-size:11px;cursor:pointer;transition:none}
.recit-v2-e025-skip:focus{left:8px;top:8px}
.recit-v2-e025-skip:focus-visible{outline:2px solid var(--gold-bright,#e6b96f);outline-offset:2px}

/* Notes réservées aux descriptions ARIA, masquées mais non aria-hidden. */
.recit-v2-e025-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
`;

/* Neutralise un chantier défaillant sans casser les autres ni le rendu. */
function essai(fn) {
  try { fn(); } catch { /* lentille best-effort */ }
}

/* Ajoute une référence sans écraser une description déjà posée. */
function ajouteDescr(noeud, id) {
  if (!noeud || typeof noeud.getAttribute !== 'function' || !id) return;
  const courant = noeud.getAttribute('aria-describedby') || '';
  if (courant.split(/\s+/).includes(id)) return;
  noeud.setAttribute('aria-describedby', (courant + ' ' + id).trim());
}

/* Conteneur des notes ARIA, sans id et donc hors du marquage diagnostics.
   Il vit dans .recit-body : ses enfants ne sont pas marqués non plus. */
function notesDe(corps) {
  let conteneur = corps.querySelector('.recit-v2-e025-notes');
  if (!conteneur) {
    conteneur = fabriquer('div', 'recit-v2-e025-notes recit-v2-e025-sr');
    corps.appendChild(conteneur);
  }
  return conteneur;
}

/* Note de description réutilisée d'un rendu à l'autre (idempotente). */
function noteCachee(conteneur, id, texte) {
  if (!conteneur) return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = fabriquer('p', 'recit-v2-e025-sr');
    noeud.id = id;
    conteneur.appendChild(noeud);
  } else if (noeud.parentNode !== conteneur) {
    conteneur.appendChild(noeud);
  }
  noeud.textContent = texte;
  return noeud;
}

/* Paragraphe de synthèse visible, déposé ou réutilisé après une ancre. */
function placeNote(id, classe, parent, ancre, texte) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  const classes = ['recit-v2-e025-note', classe].filter(Boolean).join(' ');
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = fabriquer('p', classes);
    noeud.id = id;
  }
  noeud.textContent = texte;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (nodeParentDiffer(noeud, parent) || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

function nodeParentDiffer(noeud, parent) {
  return noeud.parentNode !== parent;
}

register('E025', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e025', CSS); /* un seul appel, toutes les règles du module. */
    fabriquer = el || ((tag, classe, texte) => {
      const noeud = document.createElement(tag);
      if (classe) noeud.className = classe;
      if (texte !== undefined) noeud.textContent = texte;
      return noeud;
    });

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;
    const notes = notesDe(corps);

    /* E025-01 — Repère de recherche sur le bloc de filtres. */
    essai(() => {
      const outils = layout.querySelector('.c3a-tools');
      if (!outils || outils.hasAttribute('role')) return;
      outils.setAttribute('role', 'search');
      outils.setAttribute('aria-label', 'Recherche et filtres du repère');
    });

    /* E025-02 — Aide à la recherche dérivée du statut réellement affiché. */
    essai(() => {
      const outils = layout.querySelector('.c3a-tools');
      const recherche = document.getElementById('c3a-search') || layout.querySelector('.c3a-search');
      const statut = document.getElementById('c3a-status') || layout.querySelector('.c3a-status');
      if (!outils || !recherche || !statut) return;
      const mesures = /(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i.exec(statut.textContent || '');
      if (!mesures) return;
      const requete = typeof recherche.value === 'string' ? recherche.value.trim() : '';
      const texte = `Recherche : ${mesures[1]} point(s) affiché(s) sur ${mesures[2]}`
        + (requete ? ` pour « ${requete} »` : '') + '.';
      if (placeNote('v2-e025-search-help', 'recit-v2-e025-search', outils, recherche, texte)) {
        ajouteDescr(recherche, 'v2-e025-search-help');
      }
    });

    /* E025-03 — Raison des commandes désactivées, lue depuis data-fk. */
    essai(() => {
      const actions = layout.querySelector('.recit-actions');
      if (!actions) return;
      actions.querySelectorAll('button[disabled]').forEach((bouton, rang) => {
        const fk = bouton.getAttribute('data-fk') || '';
        let motif;
        if (fk === 'c3a-prev' || fk === 'c3a-restart') motif = 'Premier point du repère : cette commande est sans effet.';
        else if (fk === 'c3a-next') motif = 'Dernier point du repère : cette commande est sans effet.';
        else if (fk === 'c3a-next-event') motif = 'Aucun repère suivant dans la séquence.';
        else {
          const kicker = layout.querySelector('.view-kicker');
          const etapes = kicker ? /Étape\s+(\d+)\s*\/\s*(\d+)/i.exec(kicker.textContent || '') : null;
          motif = etapes ? `Indisponible à l'étape ${etapes[1]} sur ${etapes[2]}.`
            : 'Commande momentanément indisponible.';
        }
        const id = `v2-e025-motif-${rang + 1}`;
        if (noteCachee(notes, id, motif)) ajouteDescr(bouton, id);
      });
    });

    /* E025-04 — Millésime vocalisé sans l'abréviation « av. J.-C. ». */
    essai(() => {
      const meta = layout.querySelector('.recit-meta');
      if (!meta || meta.hasAttribute('aria-label')) return;
      const texte = (meta.textContent || '').replace(/\s+/g, ' ').trim();
      if (!/av\.\s*J\.-C\./i.test(texte)) return;
      meta.setAttribute('aria-label', texte.replace(/av\.\s*J\.-C\./gi, 'avant Jésus-Christ'));
    });

    /* E025-05 — Compte du fil annoncé sur la liste, pas sur le nav. */
    essai(() => {
      const fil = document.getElementById('c3a-thread') || layout.querySelector('.recit-thread-list');
      const nav = layout.querySelector('.recit-thread');
      if (!fil || !nav) return;
      const items = Array.from(fil.querySelectorAll('.recit-thread-item'));
      if (!items.length) return;
      const rang = items.findIndex((n) => n.classList && n.classList.contains('is-current'));
      const titre = nav.querySelector('.recit-thread-title');
      const texte = rang >= 0
        ? `Fil : ${items.length} points affichés, point ${rang + 1} en cours.`
        : `Fil : ${items.length} points affichés.`;
      if (placeNote('v2-e025-thread-count', 'recit-v2-e025-thread', nav, titre, texte)) {
        ajouteDescr(fil, 'v2-e025-thread-count');
      }
    });

    /* E025-06 — Lien d'évitement vers le point courant du fil. */
    essai(() => {
      if (layout.querySelector('#v2-e025-skip-thread')) return;
      const bouton = fabriquer('button', 'recit-v2-e025-skip', 'Aller au point courant du fil');
      bouton.type = 'button';
      bouton.id = 'v2-e025-skip-thread';
      bouton.addEventListener('click', () => {
        try {
          const courant = layout.querySelector('.recit-thread-item.is-current')
            || layout.querySelector('.recit-thread-item');
          if (!courant) return;
          const reduit = typeof reducedMotion === 'function' && reducedMotion();
          try { courant.focus({ preventScroll: reduit }); } catch { courant.focus(); }
        } catch { /* focalisation best-effort */ }
      });
      corps.insertBefore(bouton, corps.firstChild);
    });

    /* E025-07 — Statut de filtrage explicitement nommé et atomique. */
    essai(() => {
      const statut = document.getElementById('c3a-status') || layout.querySelector('.c3a-status');
      if (!statut) return;
      if (!statut.hasAttribute('aria-label')) statut.setAttribute('aria-label', 'Résultats du filtrage du fil');
      if (!statut.hasAttribute('aria-atomic')) statut.setAttribute('aria-atomic', 'true');
    });

    /* E025-08 — Cumul des filtres décrit sur chaque groupe. */
    essai(() => {
      const outils = layout.querySelector('.c3a-tools');
      if (!outils) return;
      const groupes = Array.from(outils.querySelectorAll('.c3a-group'));
      if (!groupes.length) return;
      const n = groupes.length;
      const texte = `Les ${n} groupe${n > 1 ? 's' : ''} de filtres se cumulent entre eux et avec la recherche.`;
      if (noteCachee(notes, 'v2-e025-group-help', texte)) {
        groupes.forEach((groupe) => ajouteDescr(groupe, 'v2-e025-group-help'));
      }
    });

    /* E025-09 — Crédit d'image identifié comme note distincte. */
    essai(() => {
      const credit = layout.querySelector('.recit-media-credit');
      if (!credit || credit.hasAttribute('role')) return;
      credit.setAttribute('role', 'note');
      credit.setAttribute('aria-label', "Crédit et licence de l'illustration");
    });

    /* E025-10 — Description permanente de la commande de lecture. */
    essai(() => {
      const play = layout.querySelector('.recit-play');
      if (!play) return;
      const titre = (play.getAttribute('title') || '').trim();
      const actif = play.getAttribute('aria-pressed') === 'true';
      const texte = `Lecture automatique : ${actif ? 'activée' : 'désactivée'}.`
        + (titre ? ` ${titre}.` : '');
      if (noteCachee(notes, 'v2-e025-play-help', texte)) ajouteDescr(play, 'v2-e025-play-help');
    });
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
