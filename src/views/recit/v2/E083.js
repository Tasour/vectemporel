import { register } from './registry.js';

/* V2 lentille E083 — Bilan et lisibilité du filtrage (complément de la passe 1).
   La passe 1 apporte les contrôles (recherche, nature, certitude, raz,
   annonce, focus, mouvement) ; cette V2 ajoute dix chantiers neufs et
   distincts : lectures chiffrées dérivées du DOM réel et lisibilité des
   contrôles de filtre déjà présents dans la coque. Tout chiffre affiché est
   recalculé depuis textContent ou les attributs data-* des items du fil.
   Classes recit-v2-e083-*, ids v2-e083-* (jamais 083-* de la passe 1).
   Zéro réseau, zéro console, zéro aléa ; enrichissement non destructif. */

const CSS = `
/* E083-01 — Portée V2 : cadrage de la lentille sur la vue Récit. */
.recit-layout.recit-v2-e083 .recit-body{position:relative}

/* E083-02 — Bilan de couverture chiffré. */
.recit-v2-e083-couverture{margin:2px 0;color:var(--muted);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E083-03 — Répartition des types dans le fil. */
.recit-v2-e083-types{margin:2px 0;color:var(--muted);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E083-04 — Répartition des certitudes dans le fil. */
.recit-v2-e083-certitudes{margin:2px 0;color:var(--muted);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E083-05 — Critères actifs en clair. */
.recit-v2-e083-criteres{margin:2px 0;color:var(--muted);font-size:10px;line-height:1.5}

/* E083-06 — Position du point courant dans le fil affiché. */
.recit-v2-e083-position{margin:2px 0;color:var(--muted);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E083-07 — État actif des filtres lisible sans dépendance à la couleur. */
.recit-v2-e083 .c3a-filter[aria-pressed="true"]::after{content:" \\2713";font-weight:700;margin-left:2px}
.recit-v2-e083 .c3a-filter[aria-pressed="false"]::after{content:""}

/* E083-08 — Cibles tactiles et focus visible des contrôles de recherche. */
.recit-v2-e083 .c3a-filter{min-height:36px}
.recit-v2-e083 .c3a-search{min-height:36px}
.recit-v2-e083 .c3a-tools :focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E083-09 — Panneau de synthèse groupé et navigable. */
.recit-v2-e083-bilan{margin:6px 0 10px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-v2-e083-bilan-titre{margin:0 0 4px;color:var(--muted-2);font-size:9px;letter-spacing:.1em;text-transform:uppercase}
.recit-v2-e083-bilan > p{margin:2px 0}

/* E083-10 — Repli responsive et mouvement réduit des lectures chiffrées. */
.recit-v2-e083-readout{transition:opacity .2s linear}
.recit-layout[data-v2-e083-motion="reduce"] .recit-v2-e083-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e083-readout{transition:none}}
@media (max-width:620px){.recit-v2-e083-bilan{padding:6px 8px}}
`;

register('E083', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e083', CSS);

    const corps = layout.querySelector('.recit-body') || layout;
    if (!corps) return;
    const statut = document.getElementById('c3a-status');

    /* Ajoute une classe sans jamais écraser les autres du nœud. */
    const ajouteClasse = (noeud, nom) => {
      if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
    };

    /* E083-09 — panneau réutilisé, inséré juste après le statut de la coque. */
    const panneau = () => {
      let pan = document.getElementById('v2-e083-bilan');
      if (!pan) {
        pan = el('div', 'recit-v2-e083-bilan');
        pan.id = 'v2-e083-bilan';
        pan.setAttribute('role', 'group');
        pan.setAttribute('aria-label', 'Bilan du fil et du filtrage');
        const titre = el('p', 'recit-v2-e083-bilan-titre', 'Bilan du fil');
        pan.appendChild(titre);
      }
      const ancre = statut && statut.parentNode === corps ? statut.nextSibling : null;
      if (pan.parentNode !== corps || (ancre && pan.nextSibling !== ancre)) {
        corps.insertBefore(pan, ancre);
      }
      return pan;
    };

    /* Dépose (ou réutilise) un paragraphe visible de synthèse dans le panneau. */
    const ecrire = (id, classe, texte) => {
      const pan = panneau();
      if (!pan) return;
      let noeud = document.getElementById(id);
      if (!noeud) {
        noeud = el('p', `recit-v2-e083-readout ${classe}`);
        noeud.id = id;
        pan.appendChild(noeud);
      }
      noeud.textContent = texte;
    };

    const items = () => Array.from(document.querySelectorAll('#c3a-thread .recit-thread-item'));

    /* E083-01 — portée locale posée une seule fois par rendu. */
    ajouteClasse(layout, 'recit-v2-e083');
    layout.setAttribute('data-v2-e083', 'on');

    /* E083-02 — couverture lue dans le statut réel de la coque. */
    if (statut) {
      const trouvé = (statut.textContent || '').match(/(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i);
      if (trouvé) {
        const affiches = parseInt(trouvé[1], 10);
        const total = parseInt(trouvé[2], 10);
        const pourcent = total > 0 ? Math.round((affiches / total) * 100) : 0;
        ecrire('v2-e083-couverture', 'recit-v2-e083-couverture',
          `Couverture du fil : ${affiches} point${affiches > 1 ? 's' : ''} affiché${affiches > 1 ? 's' : ''} sur ${total} (${pourcent} %).`);
      }
    }

    /* E083-03 — répartition des types lue sur data-kind des items du fil. */
    const liste = items();
    if (liste.length) {
      const comptes = new Map();
      liste.forEach((it) => {
        const cle = it.getAttribute('data-kind') || 'point';
        comptes.set(cle, (comptes.get(cle) || 0) + 1);
      });
      const parties = Array.from(comptes, ([cle, nb]) => `${cle} ×${nb}`);
      ecrire('v2-e083-types', 'recit-v2-e083-types',
        `Types dans le fil : ${parties.join(' · ')}.`);
    } else {
      ecrire('v2-e083-types', 'recit-v2-e083-types', 'Types dans le fil : aucun point affiché.');
    }

    /* E083-04 — répartition des certitudes lue sur data-confidence. */
    if (liste.length) {
      const comptes = new Map();
      liste.forEach((it) => {
        const cle = it.getAttribute('data-confidence') || '—';
        comptes.set(cle, (comptes.get(cle) || 0) + 1);
      });
      const etiquette = (cle) => (cle === 'disputed' ? 'contesté' : cle);
      const parties = Array.from(comptes, ([cle, nb]) => `${etiquette(cle)} ×${nb}`);
      ecrire('v2-e083-certitudes', 'recit-v2-e083-certitudes',
        `Certitudes dans le fil : ${parties.join(' · ')}.`);
    } else {
      ecrire('v2-e083-certitudes', 'recit-v2-e083-certitudes', 'Certitudes dans le fil : aucun point affiché.');
    }

    /* E083-05 — critères actifs lus dans le champ et les boutons pressés. */
    const recherche = ((document.getElementById('c3a-search') || {}).value || '').trim();
    const presses = Array.from(document.querySelectorAll('.recit-layout .c3a-filter[aria-pressed="true"]'));
    const actifs = presses
      .filter((bouton) => !((bouton.getAttribute('data-fk') || '').indexOf('-all') >= 0
        || (bouton.getAttribute('data-fk') || '').indexOf('-all-') >= 0))
      .filter((bouton) => !/^Tous les types$|^Toutes$/.test((bouton.textContent || '').trim()))
      .map((bouton) => (bouton.textContent || '').trim());
    const criteres = [];
    if (recherche) criteres.push(`recherche « ${recherche} »`);
    actifs.forEach((valeur) => criteres.push(valeur));
    ecrire('v2-e083-criteres', 'recit-v2-e083-criteres',
      criteres.length ? `Critères actifs : ${criteres.join(' · ')}.` : 'Critères actifs : aucun ; fil complet.');

    /* E083-06 — position du point courant parmi les items réellement affichés. */
    const position = liste.findIndex((it) => it.classList
      && (it.classList.contains('is-current') || it.getAttribute('aria-current') === 'step'));
    if (position >= 0) {
      ecrire('v2-e083-position', 'recit-v2-e083-position',
        `Point courant : n°${position + 1} du fil sur ${liste.length} affiché${liste.length > 1 ? 's' : ''}.`);
    } else {
      ecrire('v2-e083-position', 'recit-v2-e083-position',
        liste.length ? `Point courant : aucun dans le fil (${liste.length} affichés).` : 'Point courant : fil vide.');
    }

    /* E083-07 — l'état actif est aussi porté par un texte (✓ en CSS), pas
       seulement par la couleur ; les attributs aria-* de la coque sont intacts. */
    /* E083-08 — cibles ≥ 36 px et contour de focus pris en charge par le CSS. */
    /* E083-09 — le panneau groupé a déjà été créé par ecrire() ci-dessus. */
    panneau();

    /* E083-10 — mouvement réduit lu une fois par rendu ; repli en media query. */
    if (typeof reducedMotion === 'function' && reducedMotion()) {
      layout.setAttribute('data-v2-e083-motion', 'reduce');
    } else {
      layout.setAttribute('data-v2-e083-motion', 'normal');
    }
  } catch (_) {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
