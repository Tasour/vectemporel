import { register } from './registry.js';

/* V2 lentille E010 — Registre de lecture des données affichées (complément de
   la passe 1 « Données, traçabilité et provenance »). Dix chantiers V2 neufs,
   distincts de ceux de la passe 1 : ils ne reconstruisent ni la fiche de
   provenance, ni le tableau de bord du jeu, ni la répartition par type, ni le
   glossaire, ni le vérificateur de chaîne de la passe 1. Ici, chaque chiffre
   est relu dans le DOM réellement affiché (aria-label de la recherche, statut
   du fil, résumé de traçabilité, libellés du fil, crédit de l'image, légende)
   puis déposé dans un registre visible. Préfixes : classes recit-v2-e010-,
   ids DOM v2-e010- (jamais les ids e010- de la passe 1, qui tourne sur le même
   DOM). Zéro réseau, zéro console, zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* E010-01 — Châssis commun du registre de lecture (échelle du repère). */
.recit-v2-e010-registre{margin:14px 0;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:rgba(127,156,255,.035)}
.recit-v2-e010-h{margin:0 0 6px;color:var(--gold-bright);font-family:var(--serif);font-size:13px;font-weight:450}
.recit-v2-e010-note{margin:0 0 8px;color:var(--muted);font-size:9px;line-height:1.55}
.recit-v2-e010-list{margin:0;padding:0;list-style:none;display:grid;gap:5px}
.recit-v2-e010-item{margin:0;padding:6px 9px;border:1px solid var(--line);border-radius:7px;color:var(--ink-soft);font-size:9px;line-height:1.55;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}

/* E010-02 — Couverture du fil : proportion chiffrée mise en évidence. */
.recit-v2-e010-couverture{color:var(--gold-bright);font-weight:600}

/* E010-03 — Sélection active : critères relus dans le DOM. */
.recit-v2-e010-filtres{color:var(--muted)}

/* E010-04 — Décompte des références déclarées pour le point courant. */
.recit-v2-e010-refs{color:var(--gold-bright)}

/* E010-05 — Cohérence des références : état textuel, jamais la couleur seule. */
.recit-v2-e010-coherence[data-v2-e010-state="ok"]{border-left:2px solid var(--blue)}
.recit-v2-e010-coherence[data-v2-e010-state="divergence"]{border-left:2px solid var(--gold)}

/* E010-06 — Qualité des libellés du fil (troncatures). */
.recit-v2-e010-troncature{color:var(--muted)}

/* E010-07 — Provenance de l'image du repère. */
.recit-v2-e010-image{color:var(--ink-soft)}

/* E010-08 — Légende des symboles de certitude relue depuis la légende réelle. */
.recit-v2-e010-symboles{color:var(--ink);letter-spacing:.02em}

/* E010-09 — Vérificateur de compteurs : cible tactile et sortie d'état. */
.recit-v2-e010-verif{margin-top:8px;padding-top:8px;border-top:1px solid var(--line)}
.recit-v2-e010-verif-btn{min-height:36px;padding:5px 10px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer}
.recit-v2-e010-verif-btn:hover{border-color:var(--gold)}
.recit-v2-e010-verif-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-v2-e010-verif-readout{margin:6px 0 0;padding:7px 9px;border-left:2px solid var(--blue);background:rgba(8,11,16,.5);color:var(--ink-soft);font-size:9px;line-height:1.6;font-variant-numeric:tabular-nums}
.recit-v2-e010-verif[data-v2-e010-count="ok"] .recit-v2-e010-verif-readout{border-left-color:var(--gold)}

/* E010-10 — Confort : mouvement réduit des lectures V2. */
.recit-v2-e010-readout{transition:opacity .2s linear}
.recit-layout[data-v2-e010-motion="reduce"] .recit-v2-e010-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e010-readout{transition:none}}
@media (max-width:620px){.recit-v2-e010-registre{padding:8px}}
`;

register('E010', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    if (typeof css !== 'function' || typeof el !== 'function') return;
    css('recit-v2-e010', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps || typeof corps.querySelector !== 'function') return;

    const mk = (tag, classe, texte) => el(tag, classe || undefined, texte);

    /* getOrCreate : id unique préfixé, garde anti-doublon, repositionnement
       stable, aucun throw (le try/catch global reste le dernier filet). */
    const getOrCreate = (id, tag, classe, parent, ancre) => {
      if (!parent || typeof parent.insertBefore !== 'function') return null;
      let noeud = document.getElementById(id);
      if (!noeud || noeud.parentNode !== parent) {
        noeud = mk(tag, classe);
        noeud.id = id;
      }
      const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
      if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
        try { parent.insertBefore(noeud, cible); } catch { return null; }
      }
      return noeud;
    };
    const setTexte = (noeud, texte) => { if (noeud) noeud.textContent = texte; };

    /* Châssis du registre, inséré juste après le statut du fil. */
    const ancre = corps.querySelector('#c3a-status') || corps.querySelector('.recit-timing');
    const registre = getOrCreate('v2-e010-registre', 'section', 'recit-v2-e010-registre', corps, ancre);
    if (!registre) return;
    registre.setAttribute('aria-labelledby', 'v2-e010-registre-title');
    let titre = document.getElementById('v2-e010-registre-title');
    if (!titre || titre.parentNode !== registre) {
      titre = mk('h2', 'recit-v2-e010-h', 'Registre de lecture des données affichées');
      titre.id = 'v2-e010-registre-title';
      registre.appendChild(titre);
    }
    let note = document.getElementById('v2-e010-registre-note');
    if (!note || note.parentNode !== registre) {
      note = mk('p', 'recit-v2-e010-note', 'Chiffres relus dans le DOM affiché : aucun nombre n’est inventé.');
      note.id = 'v2-e010-registre-note';
      registre.appendChild(note);
    }
    let liste = document.getElementById('v2-e010-registre-list');
    if (!liste || liste.parentNode !== registre) {
      liste = mk('ul', 'recit-v2-e010-list');
      liste.id = 'v2-e010-registre-list';
      liste.setAttribute('aria-label', 'Lectures chiffrées des données affichées');
      registre.appendChild(liste);
    }
    /* Chaque lecture est un <li> visible, réutilisé par id, jamais masqué. */
    const li = (id, classe, texte) => {
      const noeud = getOrCreate(id, 'li', `recit-v2-e010-readout recit-v2-e010-item ${classe || ''}`.trim(), liste, null);
      setTexte(noeud, texte);
      return noeud;
    };

    const search = corps.querySelector('#c3a-search');
    const statut = corps.querySelector('#c3a-status');
    const trace = corps.querySelector('.recit-trace');
    const sansSource = corps.querySelector('.recit-sources');
    const legende = corps.querySelector('.recit-legend');
    /* Le crédit image vit dans .recit-media, frère de .recit-body sous layout. */
    const credit = layout.querySelector('.recit-media-credit');
    const sansImage = layout.querySelector('.media-empty');
    const fil = corps.querySelector('#c3a-thread') || corps.querySelector('.recit-thread-list');

    /* E010-01 — Échelle du repère, lue dans l'aria-label du champ de recherche. */
    if (search) {
      const libelle = search.getAttribute('aria-label') || '';
      const trouve = libelle.match(/(\d+)\s+points?\s+de\s+ce\s+repère/i);
      li('v2-e010-echelle', 'recit-v2-e010-echelle', trouve
        ? `Échelle du repère : ${parseInt(trouve[1], 10)} point(s) dans le jeu de données local.`
        : 'Échelle du repère : non déterminée.');
    } else {
      li('v2-e010-echelle', 'recit-v2-e010-echelle', 'Échelle du repère : non déterminée.');
    }

    /* E010-02 — Couverture du fil, lue dans #c3a-status (N affichés sur M). */
    let affiches = null;
    let totalRepere = null;
    if (statut) {
      const trouve = (statut.textContent || '').match(/(\d+)\s+point\(s\)\s+affiché\(s\)\s+sur\s+(\d+)/i);
      if (trouve) {
        affiches = parseInt(trouve[1], 10);
        totalRepere = parseInt(trouve[2], 10);
      }
    }
    if (affiches !== null && totalRepere !== null) {
      const pourcent = totalRepere > 0 ? Math.round((affiches / totalRepere) * 100) : 0;
      li('v2-e010-couverture', 'recit-v2-e010-couverture',
        `Fil affiché : ${affiches} point(s) sur ${totalRepere} (${pourcent} % du repère).`);
    } else {
      li('v2-e010-couverture', 'recit-v2-e010-couverture', 'Fil affiché : proportion non déterminée.');
    }

    /* E010-03 — Sélection active relue sur les boutons aria-pressed et la recherche. */
    const morceaux = [];
    if (search && search.value && search.value.trim()) {
      morceaux.push(`recherche « ${search.value.trim()} »`);
    }
    Array.from(corps.querySelectorAll('.c3a-group[role="group"]')).forEach((groupe) => {
      const actif = groupe.querySelector('.c3a-filter[aria-pressed="true"]');
      if (!actif) return;
      const libelle = (actif.textContent || '').trim();
      if (/^Tous\b|^Toutes\b/i.test(libelle)) return; /* bouton « tout », pas un filtre */
      const nom = (groupe.getAttribute('aria-label') || '').trim();
      morceaux.push(nom ? `${nom} = ${libelle}` : libelle);
    });
    li('v2-e010-filtres', 'recit-v2-e010-filtres', morceaux.length
      ? `Sélection active : ${morceaux.join(' · ')}.`
      : 'Aucun filtre actif sur ce repère.');

    /* E010-04 — Décompte des références du point courant, lu dans le résumé. */
    let referencesDeclarees = 0;
    if (trace) {
      const resume = trace.querySelector('summary');
      const trouve = resume && (resume.textContent || '').match(/(\d+)\s+référence\(s\)/i);
      if (trouve) referencesDeclarees = parseInt(trouve[1], 10);
      li('v2-e010-refs', 'recit-v2-e010-refs',
        `Références du point : ${referencesDeclarees} déclarée(s) dans la traçabilité.`);
    } else if (sansSource) {
      li('v2-e010-refs', 'recit-v2-e010-refs', 'Références du point : aucune référence déclarée.');
    } else {
      li('v2-e010-refs', 'recit-v2-e010-refs', 'Références du point : état non déterminé.');
    }

    /* E010-05 — Cohérence entre références déclarées et identifiants listés. */
    let identifiants = [];
    if (trace) {
      const paragraphe = trace.querySelector('p');
      const bruts = ((paragraphe && paragraphe.textContent) || '').match(/SRC[- ][0-9]+/gi) || [];
      identifiants = [...new Set(bruts.map((id) => id.replace(/\s+/g, '-').toUpperCase()))];
    }
    const coherent = trace
      ? identifiants.length === referencesDeclarees
      : referencesDeclarees === 0;
    const noeudCoherence = li('v2-e010-coherence', 'recit-v2-e010-coherence',
      `Cohérence des références : ${referencesDeclarees} déclarée(s), ${identifiants.length} identifiant(s) distinct(s) — ${coherent ? 'cohérent' : 'divergence à vérifier'}.`);
    if (noeudCoherence) noeudCoherence.setAttribute('data-v2-e010-state', coherent ? 'ok' : 'divergence');

    /* E010-06 — Qualité des libellés du fil : troncatures visibles. */
    let tronques = 0;
    let totalFil = 0;
    if (fil) {
      const boutons = Array.from(fil.querySelectorAll('.recit-thread-item'));
      totalFil = boutons.length;
      tronques = boutons.filter((b) => /…\s*$/.test((b.textContent || ''))).length;
    }
    li('v2-e010-troncature', 'recit-v2-e010-troncature', totalFil
      ? `Libellés du fil : ${tronques} tronqué(s) sur ${totalFil}.`
      : 'Libellés du fil : aucun point affiché.');

    /* E010-07 — Provenance de l'image du repère, lue dans le crédit affiché. */
    let imageTexte;
    if (credit && (credit.textContent || '').trim()) {
      imageTexte = `Provenance de l’image : ${credit.textContent.trim()}.`;
    } else if (sansImage) {
      imageTexte = `Provenance de l’image : ${sansImage.textContent.trim()}`;
    } else {
      imageTexte = 'Provenance de l’image : non renseignée dans ce repère.';
    }
    li('v2-e010-image', 'recit-v2-e010-image', imageTexte);

    /* E010-08 — Symboles de certitude relus dans la légende réelle. */
    const paires = [];
    if (legende) {
      const textes = Array.from(legende.querySelectorAll('p'))
        .map((p) => p.textContent || '').join(' ');
      const regex = /([✓■◐≈])\s+([A-Za-zÀ-ÿ]+)/g;
      let trouve;
      while ((trouve = regex.exec(textes)) !== null) {
        paires.push(`${trouve[1]} = ${trouve[2]}`);
      }
    }
    li('v2-e010-symboles', 'recit-v2-e010-symboles', paires.length
      ? `Symboles de certitude : ${paires.join(' · ')}.`
      : 'Symboles de certitude : légende non disponible.');

    /* E010-09 — Vérificateur de compteurs : contrôle rejouable, sans réseau. */
    const verif = getOrCreate('v2-e010-verif', 'div', 'recit-v2-e010-verif', registre, liste);
    if (verif) {
      let bouton = document.getElementById('v2-e010-verif-button');
      if (!bouton || bouton.parentNode !== verif) {
        bouton = mk('button', 'recit-v2-e010-verif-btn', 'Vérifier les compteurs');
        bouton.id = 'v2-e010-verif-button';
        verif.appendChild(bouton);
      }
      bouton.type = 'button';
      if (bouton.dataset.v2E010Bound !== '1') {
        bouton.dataset.v2E010Bound = '1';
        bouton.addEventListener('click', () => {
          const s = corps.querySelector('#c3a-status');
          const m = s && (s.textContent || '').match(/(\d+)\s+point\(s\)\s+affiché\(s\)\s+sur\s+(\d+)/i);
          const annonces = m
            ? { n: parseInt(m[1], 10), total: parseInt(m[2], 10) }
            : null;
          const listeFil = corps.querySelector('#c3a-thread') || corps.querySelector('.recit-thread-list');
          const boutonsFil = listeFil ? listeFil.querySelectorAll('.recit-thread-item').length : 0;
          const champ = corps.querySelector('#c3a-search');
          const m2 = champ && (champ.getAttribute('aria-label') || '').match(/(\d+)\s+points?\s+de\s+ce\s+repère/i);
          const annonceTotal = m2 ? parseInt(m2[1], 10) : null;
          const ok = Boolean(annonces)
            && boutonsFil === annonces.n
            && (annonceTotal === null || annonceTotal === annonces.total);
          const detail = annonces
            ? `boutons du fil ${boutonsFil}, affichés annoncés ${annonces.n}, total annoncé ${annonces.total}${annonceTotal !== null ? `, total de la recherche ${annonceTotal}` : ''}`
            : `boutons du fil ${boutonsFil}, statut du fil illisible`;
          const sortie = document.getElementById('v2-e010-verif-readout');
          if (sortie) {
            sortie.textContent = `Compteurs ${ok ? 'cohérents' : 'divergents'} : ${detail}. Contrôle relu dans le DOM affiché.`;
          }
          verif.setAttribute('data-v2-e010-count', ok ? 'ok' : 'divergent');
        });
      }
      let sortie = document.getElementById('v2-e010-verif-readout');
      if (!sortie || sortie.parentNode !== verif) {
        sortie = mk('p', 'recit-v2-e010-verif-readout');
        sortie.id = 'v2-e010-verif-readout';
        verif.appendChild(sortie);
      }
      sortie.setAttribute('role', 'status');
      sortie.setAttribute('aria-live', 'polite');
      sortie.textContent = 'Compteurs non encore vérifiés. Lancez le contrôle.';
      verif.removeAttribute('data-v2-e010-count');
    }

    /* E010-10 — Mouvement réduit : attribut propre à la V2, jamais écrasé. */
    if (reducedMotion && typeof reducedMotion === 'function' && reducedMotion()) {
      layout.setAttribute('data-v2-e010-motion', 'reduce');
    } else {
      layout.setAttribute('data-v2-e010-motion', 'normal');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
