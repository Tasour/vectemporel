import { register } from './registry.js';

/* V2 lentille E063 — Tableau de bord de la recherche et du filtrage (complément de la passe 1).
   La passe 1 traite déjà la mesure du fil, l'indexage, le champ de recherche, les deux filtres,
   la réinitialisation, l'annonce, les cibles et le mouvement réduit. La V2 propose donc dix
   chantiers neufs : répartition par type, par certitude, matrice croisée, taux d'affichage,
   longueur de requête, récapitulatif des critères, raccourci « / », repère non coloré des
   filtres actifs, cibles tactiles des contrôles natifs et confort de lecture des mesures.
   Tout chiffre affiché est dérivé du DOM réel, jamais inventé. Préfixes : classes
   recit-v2-e063-, ids DOM v2-e063- (jamais les ids e063- de la passe 1, qui tourne sur le
   même DOM). Zéro réseau, zéro console, zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* E063-01 — Tableau de bord et répartition des points affichés par type. */
.recit-v2-e063-board{margin:8px 0 10px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.03)}
.recit-v2-e063-readout{margin:2px 0;color:var(--muted);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-v2-e063-board .recit-v2-e063-readout:first-child{margin-top:0}

/* E063-02 — Répartition des points affichés par certitude. */
.recit-v2-e063-conf{color:var(--ink-soft)}

/* E063-03 — Matrice type × certitude lue sur les attributs des items. */
.recit-v2-e063-croise{color:var(--muted-2)}

/* E063-04 — Taux d'affichage calculé depuis le statut natif #c3a-status. */
.recit-v2-e063-taux{color:var(--ink-soft);font-weight:600}

/* E063-05 — Longueur de la requête lue sur #c3a-search. */
.recit-v2-e063-longueur{color:var(--muted-2)}

/* E063-06 — Récapitulatif des critères actifs réellement pressés. */
.recit-v2-e063-filtres{color:var(--ink-soft)}

/* E063-07 — Aide visible au raccourci de focalisation de la recherche. */
.recit-v2-e063-astuce{color:var(--muted-2);font-style:italic}

/* E063-08 — Repère non coloré des filtres actifs (soulignement + graisse). */
.recit-v2-e063-marquage .c3a-filter[aria-pressed="true"]{border-bottom:2px solid currentColor;text-decoration:underline;text-underline-offset:3px;font-weight:700}

/* E063-09 — Cibles tactiles et focus des contrôles de filtrage natifs. */
.recit-v2-e063-cibles .c3a-filter{min-width:36px;min-height:36px;padding:6px 8px}
.recit-v2-e063-cibles .c3a-reset,
.recit-v2-e063-cibles .c3a-search{min-height:36px}
.recit-v2-e063-cibles .c3a-filter:focus-visible,
.recit-v2-e063-cibles .c3a-reset:focus-visible,
.recit-v2-e063-cibles .c3a-search:focus-visible{outline:2px solid var(--gold-bright,#e6b96f);outline-offset:2px}

/* E063-10 — Mouvement réduit et repli responsive des mesures V2. */
.recit-v2-e063-readout{transition:color .2s linear}
.recit-layout[data-v2-e063-motion="reduce"] .recit-v2-e063-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e063-readout{transition:none}}
@media (max-width:620px){.recit-v2-e063-board{padding:6px 8px}.recit-v2-e063-readout{font-size:11px}}
`;

/* Ajoute une classe sans jamais écraser les autres classes du nœud. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Dépose (ou réutilise) un paragraphe de synthèse visible dans le tableau de bord. */
function assure(parent, id, classe) {
  if (!parent || typeof parent.appendChild !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = el('p', 'recit-v2-e063-readout ' + classe);
    noeud.id = id;
  }
  if (noeud.parentNode !== parent) parent.appendChild(noeud);
  return noeud;
}

/* Comptage brut des valeurs, toutes issues d'attributs du DOM. */
function compte(valeurs) {
  const resultat = {};
  valeurs.forEach((valeur) => { resultat[valeur] = (resultat[valeur] || 0) + 1; });
  return resultat;
}

/* Formate un comptage en texte stable : ordre connu d'abord, puis ordre alphabétique. */
function formate(compteurs, ordre) {
  const cles = Object.keys(compteurs);
  cles.sort((a, b) => {
    const ia = ordre.indexOf(a);
    const ib = ordre.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, 'fr');
  });
  return cles.map((cle) => cle + ' ' + compteurs[cle]).join(' · ');
}

register('E063', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e063', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps || typeof corps.insertBefore !== 'function') return;

    const statut = document.getElementById('c3a-status') || corps.querySelector('.c3a-status');
    const recherche = document.getElementById('c3a-search') || corps.querySelector('.c3a-search');
    const fil = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list, .c3a-thread');
    const items = fil && typeof fil.querySelectorAll === 'function'
      ? Array.from(fil.querySelectorAll('.recit-thread-item, .c3a-thread-item')) : [];
    const ordreTypes = ['récit', 'figure', 'lieu', 'audit', 'point'];
    const ordreCertitudes = ['vérifié', 'certain', 'probable', 'contesté', 'verified', 'disputed'];

    /* Conteneur unique, réutilisé par id et replace juste après le statut natif. */
    let board = document.getElementById('v2-e063-board');
    if (!board) {
      board = el('div', 'recit-v2-e063-board');
      board.id = 'v2-e063-board';
    }
    const ancre = statut && statut.parentNode === corps ? statut.nextSibling : null;
    if (board.parentNode !== corps || (ancre && board.nextSibling !== ancre)) {
      corps.insertBefore(board, ancre);
    }

    /* E063-01 — répartition des points affichés par type (data-kind). */
    {
      const p = assure(board, 'v2-e063-types', 'recit-v2-e063-types');
      if (p) {
        p.textContent = items.length
          ? 'Répartition des points affichés par type : ' + formate(compte(items.map((it) => it.getAttribute('data-kind') || 'point')), ordreTypes) + '.'
          : 'Répartition des points affichés par type : aucun point.';
      }
    }

    /* E063-02 — répartition des points affichés par certitude (data-confidence). */
    {
      const p = assure(board, 'v2-e063-conf', 'recit-v2-e063-conf');
      if (p) {
        p.textContent = items.length
          ? 'Répartition par certitude : ' + formate(compte(items.map((it) => it.getAttribute('data-confidence') || 'non renseignée')), ordreCertitudes) + '.'
          : 'Répartition par certitude : aucun point.';
      }
    }

    /* E063-03 — matrice croisée type × certitude, lue sur les mêmes items. */
    {
      const croise = {};
      items.forEach((it) => {
        const type = it.getAttribute('data-kind') || 'point';
        const certitude = it.getAttribute('data-confidence') || 'non renseignée';
        const cle = type + ' · ' + certitude;
        croise[cle] = (croise[cle] || 0) + 1;
      });
      const p = assure(board, 'v2-e063-croise', 'recit-v2-e063-croise');
      if (p) {
        p.textContent = Object.keys(croise).length
          ? 'Type × certitude : ' + formate(croise, []) + '.'
          : 'Type × certitude : aucune combinaison affichée.';
      }
    }

    /* E063-04 — taux d'affichage calculé depuis le texte réel de #c3a-status. */
    if (statut) {
      const found = (statut.textContent || '').match(/(\d+)\s+point\(s\)\s+affiché\(s\)\s+sur\s+(\d+)/i);
      if (found) {
        const affiches = parseInt(found[1], 10);
        const total = parseInt(found[2], 10);
        const pct = total > 0 ? Math.round((affiches / total) * 100) : 0;
        const p = assure(board, 'v2-e063-taux', 'recit-v2-e063-taux');
        if (p) p.textContent = 'Taux d’affichage : ' + affiches + ' point(s) sur ' + total + ', soit ' + pct + ' % du fil.';
      }
    }

    /* E063-05 — longueur de la requête lue sur #c3a-search (recours au DOM, pas au hasard). */
    if (recherche) {
      const requete = recherche.value || '';
      const p = assure(board, 'v2-e063-longueur', 'recit-v2-e063-longueur');
      if (p) {
        p.textContent = requete.length
          ? 'Requête saisie : ' + requete.length + ' caractère(s) · « ' + requete.trim() + ' ».'
          : 'Requête saisie : aucune (0 caractère).';
      }
    }

    /* E063-06 — récapitulatif des critères réellement actifs (aria-pressed + recherche). */
    {
      const presses = Array.from(corps.querySelectorAll('.c3a-filter[aria-pressed="true"]'));
      const criteres = presses.map((b) => (b.textContent || '').trim()).filter(Boolean);
      const requete = recherche ? (recherche.value || '').trim() : '';
      if (requete) criteres.unshift('recherche « ' + requete + ' »');
      const p = assure(board, 'v2-e063-criteres', 'recit-v2-e063-filtres');
      if (p) {
        p.textContent = criteres.length
          ? 'Critères actifs : ' + criteres.join(' · ') + '.'
          : 'Critères actifs : aucun filtre applicable.';
      }
    }

    /* E063-07 — raccourci « / » pour focaliser la recherche, annoncé sans écraser d'attribut. */
    if (recherche) {
      if (!recherche.hasAttribute('aria-keyshortcuts')) recherche.setAttribute('aria-keyshortcuts', '/');
      const astuce = assure(board, 'v2-e063-astuce', 'recit-v2-e063-astuce');
      if (astuce) astuce.textContent = 'Raccourci : la touche « / » place le curseur dans la recherche.';
      if (layout && !layout.dataset.v2E063Shortcut) {
        layout.dataset.v2E063Shortcut = 'on';
        layout.addEventListener('keydown', (ev) => {
          if (!ev || ev.key !== '/' || ev.altKey || ev.ctrlKey || ev.metaKey) return;
          const cible = ev.target;
          if (cible && (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA' || cible.isContentEditable)) return;
          if (typeof ev.preventDefault === 'function') ev.preventDefault();
          if (typeof recherche.focus === 'function') recherche.focus({ preventScroll: true });
        });
      }
    }

    /* E063-08 — repère non coloré des filtres actifs (aucune info portée par la couleur seule). */
    ajouteClasse(corps, 'recit-v2-e063-marquage');

    /* E063-09 — cibles tactiles ≥ 36 px et focus visible sur les contrôles natifs. */
    ajouteClasse(corps, 'recit-v2-e063-cibles');

    /* E063-10 — mouvement réduit lu une fois par rendu, sans écraser d'attribut existant. */
    if (reducedMotion && typeof reducedMotion === 'function' && reducedMotion()) {
      layout.setAttribute('data-v2-e063-motion', 'reduce');
    } else {
      layout.setAttribute('data-v2-e063-motion', 'normal');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
