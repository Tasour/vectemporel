import { register } from './registry.js';

/* V2 lentille E053 — Recherche et filtrage (complément de la passe 1).
   La passe 1 traite déjà : portée CSS, mesure du fil, indexage, champ de
   recherche, deux sélecteurs, réinitialisation, annonce, focus et mouvement
   réduit. La V2 propose donc dix chantiers neufs et distincts : compteur de
   critères, deux facettes, surlignage du terme, badge de filtrage, correspondances
   texte, cibles tactiles des filtres natifs, état actif non coloré, repère de
   zone active et confort de mouvement. Tous non destructifs : la vue reste
   intégralement lisible sans ce module. Préfixes : classes recit-v2-e053-,
   ids DOM v2-e053- (jamais les ids e053-/053- de la passe 1 qui tourne sur le
   même DOM). Zéro réseau, zéro console, zéro aléa, aucun fichier partagé touché. */

const CSS = `
/* E053-01 — Compteur de critères actifs. */
.recit-v2-e053-criteres{margin:2px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E053-02 — Facette par nature du fil. */
.recit-v2-e053-facette-kind{margin:2px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E053-03 — Facette par degré de certitude du fil. */
.recit-v2-e053-facette-conf{margin:2px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E053-04 — Surlignage du terme recherché dans les libellés du fil. */
.recit-layout .recit-v2-e053-mark{background:rgba(230,185,111,.22);color:var(--ink);border-radius:2px;padding:0 1px}

/* E053-05 — Badge de filtrage sur le titre du fil. */
.recit-layout .recit-v2-e053-badge{margin-left:6px;padding:1px 6px;border:1px solid var(--line-strong);border-radius:999px;color:var(--gold-bright);font-size:8px;letter-spacing:.06em;text-transform:uppercase}

/* E053-06 — Nombre de correspondances textuelles. */
.recit-v2-e053-correspondances{margin:2px 0 6px;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E053-07 — Cibles tactiles des filtres natifs. */
.recit-layout .recit-v2-e053-cibles .c3a-filter{min-height:36px}
.recit-layout .recit-v2-e053-cibles .c3a-reset{min-height:36px}
.recit-layout .recit-v2-e053-cibles .c3a-filter:focus-visible,
.recit-layout .recit-v2-e053-cibles .c3a-reset:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E053-08 — État actif des filtres non porté par la couleur seule. */
.recit-layout .recit-v2-e053-glyphe .c3a-filter[aria-pressed="true"]::before{content:"✓ ";font-weight:700}

/* E053-09 — Repère de la zone de recherche active. */
.recit-layout .recit-v2-e053-zone .c3a-tools:focus-within{box-shadow:0 0 0 1px var(--gold);border-radius:10px}

/* E053-10 — Confort : mouvement réduit du surlignage V2. */
.recit-layout .recit-v2-e053-mark{transition:background-color .18s linear}
.recit-layout[data-v2-e053-motion="reduce"] .recit-v2-e053-mark{transition:none}
@media (prefers-reduced-motion:reduce){.recit-layout .recit-v2-e053-mark{transition:none}}
`;

function garder(nom, faire) {
  try { faire(); } catch (_) { /* chantier neutralisé : le rendu reste intact */ }
}

register('E053', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;

  /* Ajoute une classe sans jamais écraser les autres classes du nœud. */
  function ajouteClasse(noeud, nom) {
    if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
  }

  /* Dépose (ou réutilise) un paragraphe visible, à un emplacement stable. */
  function placeParagraphe(id, classe, parent, ancre, texte) {
    if (!parent || typeof parent.insertBefore !== 'function') return null;
    let noeud = document.getElementById(id);
    if (!noeud) {
      noeud = el('p', 'recit-v2-e053-readout ' + classe);
      noeud.id = id;
    }
    noeud.textContent = texte;
    const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
    if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
      parent.insertBefore(noeud, cible);
    }
    return noeud;
  }

  const normaliser = (s) => String(s || '').toLocaleLowerCase('fr');

  /* Nombre de filtres réellement actifs : boutons pressés hors « Tous » et
     recherche non vide. Les boutons « Tous » portent un data-fk en -all. */
  function criteresActifs(corps) {
    const presses = Array.from(corps.querySelectorAll('.c3a-filter[aria-pressed="true"]'));
    const actifs = presses.filter((b) => String(b.dataset.fk || '').indexOf('-all') < 0).length;
    const recherche = String((corps.querySelector('#c3a-search') || {}).value || '').trim();
    return { actifs, recherche, total: actifs + (recherche ? 1 : 0) };
  }

  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e053', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const statut = corps.querySelector('#c3a-status');
    const outils = corps.querySelector('.c3a-tools');
    const fil = corps.querySelector('.recit-thread');
    const titreFil = fil ? fil.querySelector('.recit-thread-title') : null;

    /* E053-01 — Compteur de critères actifs, lu sur l'état réel des contrôles. */
    garder('E053-01', () => {
      const { total } = criteresActifs(corps);
      placeParagraphe('v2-e053-criteres', 'recit-v2-e053-criteres', corps, statut,
        `Critères actifs : ${total}.`);
    });

    /* E053-02 — Facette par nature : comptage des data-kind du fil affiché. */
    garder('E053-02', () => {
      const items = Array.from(corps.querySelectorAll('.c3a-thread-item'));
      if (!items.length) return;
      const comptes = {};
      items.forEach((item) => {
        const cle = item.getAttribute('data-kind') || 'point';
        comptes[cle] = (comptes[cle] || 0) + 1;
      });
      const parties = Object.keys(comptes).sort().map((cle) => `${cle} ${comptes[cle]}`);
      const ancre = document.getElementById('v2-e053-criteres') || statut;
      placeParagraphe('v2-e053-facette-kind', 'recit-v2-e053-facette-kind', corps, ancre,
        `Répartition par type : ${parties.join(' · ')}.`);
    });

    /* E053-03 — Facette par certitude : comptage des data-confidence du fil. */
    garder('E053-03', () => {
      const items = Array.from(corps.querySelectorAll('.c3a-thread-item'));
      if (!items.length) return;
      const comptes = {};
      items.forEach((item) => {
        const cle = item.getAttribute('data-confidence') || '—';
        comptes[cle] = (comptes[cle] || 0) + 1;
      });
      const parties = Object.keys(comptes).sort().map((cle) => `${cle} ${comptes[cle]}`);
      const ancre = document.getElementById('v2-e053-facette-kind')
        || document.getElementById('v2-e053-criteres') || statut;
      placeParagraphe('v2-e053-facette-conf', 'recit-v2-e053-facette-conf', corps, ancre,
        `Répartition par certitude : ${parties.join(' · ')}.`);
    });

    /* E053-04 — Surlignage du terme recherché dans les nœuds texte des items. */
    garder('E053-04', () => {
      const champ = corps.querySelector('#c3a-search');
      const terme = String((champ && champ.value) || '').trim();
      if (!terme) return;
      const bas = normaliser(terme);
      const items = Array.from(corps.querySelectorAll('.c3a-thread-item'));
      items.forEach((item) => {
        if (item.querySelector('.recit-v2-e053-mark')) return; /* déjà traité : idempotent */
        Array.from(item.childNodes).forEach((noeud) => {
          if (noeud.nodeType !== 3) return; /* texte uniquement, jamais les attrs */
          const brut = noeud.nodeValue || '';
          let restant = brut;
          const frag = document.createDocumentFragment();
          let idx = normaliser(restant).indexOf(bas);
          while (idx >= 0) {
            frag.appendChild(document.createTextNode(restant.slice(0, idx)));
            const marque = el('mark', 'recit-v2-e053-mark');
            marque.textContent = restant.slice(idx, idx + terme.length);
            frag.appendChild(marque);
            restant = restant.slice(idx + terme.length);
            idx = normaliser(restant).indexOf(bas);
          }
          if (frag.childNodes.length) item.replaceChild(frag, noeud);
        });
      });
    });

    /* E053-05 — Badge « filtré / complet » posé sur le titre du fil. */
    garder('E053-05', () => {
      if (!fil || !titreFil) return;
      const { actifs, recherche } = criteresActifs(corps);
      const filtre = actifs > 0 || recherche.length > 0;
      fil.setAttribute('data-v2-e053-filtre', filtre ? 'oui' : 'non');
      let badge = document.getElementById('v2-e053-badge');
      if (!badge) {
        badge = el('span', 'recit-v2-e053-badge');
        badge.id = 'v2-e053-badge';
        titreFil.appendChild(badge);
      }
      badge.textContent = filtre ? 'filtré' : 'complet';
    });

    /* E053-06 — Correspondances du terme dans le fil réellement affiché. */
    garder('E053-06', () => {
      const champ = corps.querySelector('#c3a-search');
      const terme = String((champ && champ.value) || '').trim();
      if (!terme) return;
      const bas = normaliser(terme);
      const items = Array.from(corps.querySelectorAll('.c3a-thread-item'));
      const compte = items.filter((item) => normaliser(item.textContent).indexOf(bas) >= 0).length;
      const ancre = document.getElementById('v2-e053-facette-conf')
        || document.getElementById('v2-e053-facette-kind')
        || document.getElementById('v2-e053-criteres') || statut;
      placeParagraphe('v2-e053-correspondances', 'recit-v2-e053-correspondances', corps, ancre,
        `« ${terme} » figure dans ${compte} point(s) du fil affiché.`);
    });

    /* E053-07 — Cibles tactiles ≥ 36 px des filtres natifs. */
    garder('E053-07', () => {
      ajouteClasse(corps, 'recit-v2-e053-cibles');
    });

    /* E053-08 — État actif des filtres doublé d'un glyphe, pas d'une couleur seule. */
    garder('E053-08', () => {
      ajouteClasse(corps, 'recit-v2-e053-glyphe');
    });

    /* E053-09 — Repère visuel de la zone de recherche en cours d'utilisation. */
    garder('E053-09', () => {
      ajouteClasse(corps, 'recit-v2-e053-zone');
      if (outils && !outils.hasAttribute('data-v2-e053-zone')) {
        outils.setAttribute('data-v2-e053-zone', 'on');
      }
    });

    /* E053-10 — Confort : mouvement réduit du surlignage, lu une fois par rendu. */
    garder('E053-10', () => {
      const reduit = typeof reducedMotion === 'function' && reducedMotion();
      layout.setAttribute('data-v2-e053-motion', reduit ? 'reduce' : 'normal');
    });
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
