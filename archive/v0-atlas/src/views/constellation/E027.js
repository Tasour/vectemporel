import { register } from './registry.js';

/* Lentille E027 — Diagnostic textuel appliqué aux lunes de la vue Constellation.
   Dix chantiers : type, confiance, verdict, sources, alerte, registre, synthèse,
   classement, note de lecture et bascule d'affichage. Zéro réseau, zéro aléa,
   aucun appel de débogage, aucune minuterie ni boucle d'animation propre.
   Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
register('E027', (ctx) => {
  /* Garde d'entrée : le layout est exigé avant toute insertion dans le DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'constellation') return;

  try {
    const layout = ctx.layout;
    const doc = layout.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    const creer = (tag, cls, texte) => {
      if (typeof ctx.el === 'function') return ctx.el(tag, cls, texte);
      const noeud = doc.createElement(tag);
      if (cls) noeud.className = cls;
      if (texte !== undefined) noeud.textContent = texte;
      return noeud;
    };

    /* Feuille de style unique de la lentille, identifiant réservé. */
    if (typeof ctx.css === 'function') {
      ctx.css('constellation-e027', `
        /* E027-01 — étiquette de type au-dessus de la lune. */
        .constellation-field .const-moon[data-e027-kind]::before {
          content: attr(data-e027-kind);
          position: absolute; bottom: calc(100% + 3px); left: 50%;
          transform: translateX(-50%); width: 104px;
          color: var(--gold); font-size: 7px; line-height: 1.15;
          text-align: center; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
          opacity: 0; pointer-events: none; transition: opacity .15s ease;
        }
        /* E027-10 — révélation des étiquettes quand la bascule est active. */
        .constellation-layout[data-e027-diag="on"] .constellation-field .const-moon[data-e027-kind]::before { opacity: 1; }
        /* E027-05 — alerte textuelle d'absence de source. */
        #e027-alertes { flex: 1 1 100%; margin: 0; color: var(--muted); font-size: 9px; line-height: 1.5; }
        #e027-alertes .e027-alerte { color: var(--gold-bright); }
        /* E027-06 — registre de diagnostic par lune. */
        #e027-register { flex: 1 1 100%; margin: 2px 0 0; padding-left: 18px; color: var(--ink-soft); font-size: 9px; line-height: 1.5; }
        /* E027-07 — synthèse agrégée du repère. */
        #e027-summary { flex: 1 1 100%; margin: 0; color: var(--gold); font-size: 9px; line-height: 1.5; }
        /* E027-08 — classement des lunes. */
        #e027-ranking { flex: 1 1 100%; margin: 0; padding-left: 18px; color: var(--muted); font-size: 9px; line-height: 1.5; }
        /* E027-09 — note de lecture. */
        #e027-legend { flex: 1 1 100%; margin: 0; color: var(--muted-2); font-size: 9px; line-height: 1.5; }
        /* E027-10 — bouton de bascule. */
        #e027-toggle {
          min-height: 36px; padding: 0 12px;
          border: 1px solid var(--line); border-radius: 8px;
          background: rgba(255,255,255,.03); color: var(--ink-soft);
          font-size: 9px; cursor: pointer;
        }
        #e027-toggle:hover { border-color: var(--gold); color: var(--gold-bright); }
        #e027-toggle:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .constellation-field .const-moon[data-e027-kind]::before { transition: none; }
        }
      `);
    }

    /* Seules les lunes du repère actif entrent dans le diagnostic. */
    const lunes = Array.from(layout.querySelectorAll('.const-moon'))
      .filter((m) => !m.dataset.constKey || m.dataset.constKey.indexOf('moon:') === 0);
    const caption = layout.querySelector('.constellation-caption') || layout;
    const ancrer = (noeud) => { caption.appendChild(noeud); return noeud; };
    const etats = lunes.map(() => ({}));

    /* Lecture strictement textuelle des données déjà présentes dans le balisage. */
    const lireType = (lune) => {
      const label = lune.getAttribute('data-label') || '';
      return label.split('·')[0].trim() || 'point';
    };
    const lireConfiance = (lune) => {
      const champs = [lune.getAttribute('title') || '', lune.getAttribute('aria-label') || ''];
      for (const champ of champs) {
        const trouve = champ.match(/confiance\s+([^,·;]+)/i);
        if (trouve) return trouve[1].trim();
      }
      return 'non précisée';
    };
    const BAREME = [
      ['certain', 'établi'],
      ['vérifié', 'vérifié'],
      ['probable', 'à confirmer'],
      ['disputed', 'contesté'],
      ['non documenté', 'non étayé'],
    ];
    const TOUS_VERDICTS = BAREME.map((entree) => entree[1]).concat('à qualifier');
    const verdictPour = (confiance) => {
      const valeur = (confiance || '').toLowerCase();
      for (const [mot, verdict] of BAREME) {
        if (valeur.indexOf(mot) >= 0) return verdict;
      }
      return 'à qualifier';
    };
    const lireSources = (lune) => {
      const label = lune.getAttribute('data-label') || '';
      const court = label.match(/·\s*(\d+)\s*src/i);
      if (court) return Number(court[1]);
      const titre = lune.getAttribute('title') || '';
      if (/aucune source associée/i.test(titre)) return 0;
      const long = titre.match(/(\d+)\s+source/i);
      return long ? Number(long[1]) : 0;
    };
    const accord = (n, singulier, pluriel) => `${n} ${n > 1 ? pluriel : singulier}`;
    const sourceLabel = (n) => (n ? accord(n, 'source', 'sources') : 'aucune source');

    /* E027-01 — Type de point extrait puis porté par la lune (calcul + attribut). */
    lunes.forEach((lune, i) => {
      const type = lireType(lune);
      etats[i].type = type;
      lune.setAttribute('data-e027-kind', type);
    });

    /* E027-02 — Confiance textualisée dans l'infobulle (calcul + attribut). */
    lunes.forEach((lune, i) => {
      const confiance = lireConfiance(lune);
      etats[i].confiance = confiance;
      lune.setAttribute('data-e027-confidence', confiance);
      const titre = lune.getAttribute('title') || '';
      if (titre.indexOf('diagnostic E027') < 0) {
        lune.setAttribute('title', `${titre}${titre ? ' · ' : ''}diagnostic E027 : confiance ${confiance}`);
      }
    });

    /* E027-03 — Verdict de fiabilité ajouté au libellé accessible. */
    lunes.forEach((lune, i) => {
      const verdict = verdictPour(etats[i].confiance || lireConfiance(lune));
      etats[i].verdict = verdict;
      lune.setAttribute('data-e027-verdict', verdict);
      const accessible = lune.getAttribute('aria-label') || '';
      if (accessible.indexOf('verdict E027') < 0) {
        lune.setAttribute('aria-label', `${accessible}${accessible ? ' · ' : ''}verdict E027 : ${verdict}`);
      }
    });

    /* E027-04 — Comptage des sources locales (calcul + deux attributs). */
    lunes.forEach((lune, i) => {
      const sources = lireSources(lune);
      etats[i].sources = sources;
      lune.setAttribute('data-e027-sources', String(sources));
      lune.setAttribute('data-e027-source-label', sourceLabel(sources));
    });

    /* E027-05 — Alerte textuelle ciblée pour les lunes sans source. */
    const sansSource = etats.map((etat, i) => (etat.sources === 0 ? i : -1)).filter((i) => i >= 0);
    lunes.forEach((lune, i) => {
      if (etats[i].sources === 0) lune.setAttribute('data-e027-alerte', 'sans source');
    });
    const alertes = creer('p', 'e027-alertes', '');
    alertes.id = 'e027-alertes';
    alertes.textContent = sansSource.length
      ? `Sans source associée : ${sansSource.map((i) => `lune ${i + 1}`).join(', ')}.`
      : 'Aucune lune sans source dans ce repère.';
    sansSource.forEach((i) => {
      alertes.appendChild(creer('span', 'e027-alerte', ` lune ${i + 1}`));
    });
    ancrer(alertes);

    /* E027-06 — Registre de diagnostic, une ligne textuelle par lune. */
    const registre = creer('ol', 'e027-register');
    registre.id = 'e027-register';
    if (!lunes.length) {
      registre.appendChild(creer('li', '', 'Aucune lune à diagnostiquer dans ce repère.'));
    } else {
      etats.forEach((etat, i) => {
        registre.appendChild(creer('li', '',
          `Lune ${i + 1} — ${etat.type} — confiance ${etat.confiance} — verdict ${etat.verdict} — ${sourceLabel(etat.sources)}.`));
      });
    }
    ancrer(registre);

    /* E027-07 — Synthèse agrégée du repère (calcul + nœud live). */
    const totaux = {};
    etats.forEach((etat) => {
      const cle = etat.verdict || 'à qualifier';
      totaux[cle] = (totaux[cle] || 0) + 1;
    });
    const totalSources = etats.reduce((somme, etat) => somme + (etat.sources || 0), 0);
    const parties = TOUS_VERDICTS
      .map((verdict) => [verdict, totaux[verdict] || 0])
      .filter((entree) => entree[1] > 0)
      .map(([verdict, n]) => `${n} ${verdict}`);
    const resume = creer('p', 'e027-summary', '');
    resume.id = 'e027-summary';
    resume.setAttribute('role', 'status');
    resume.textContent = lunes.length
      ? `Diagnostic : ${accord(lunes.length, 'lune', 'lunes')} — ${parties.join(' · ') || 'aucun verdict'} — ${accord(totalSources, 'source', 'sources')} au total.`
      : 'Diagnostic : aucune lune dans ce repère.';
    ancrer(resume);
    layout.dataset.e027Summary = String(lunes.length);

    /* E027-08 — Classement déterministe des lunes par degré de fiabilité. */
    const POIDS = {
      'établi': 4, 'vérifié': 3, 'à confirmer': 2,
      'contesté': 1, 'non étayé': 0, 'à qualifier': -1,
    };
    const ordre = etats.map((etat, i) => i).sort((a, b) => {
      const ecart = (POIDS[etats[b].verdict] ?? -1) - (POIDS[etats[a].verdict] ?? -1);
      return ecart !== 0 ? ecart : a - b; /* départage par index : aucun aléa */
    });
    ordre.forEach((index, rang) => {
      lunes[index].setAttribute('data-e027-rank', String(rang + 1));
    });
    const classement = creer('ol', 'e027-ranking');
    classement.id = 'e027-ranking';
    if (!ordre.length) {
      classement.appendChild(creer('li', '', 'Aucun classement possible.'));
    } else {
      ordre.forEach((index, rang) => {
        classement.appendChild(creer('li', '',
          `${rang + 1}. Lune ${index + 1} — ${etats[index].verdict} (${etats[index].type}).`));
      });
    }
    ancrer(classement);

    /* E027-09 — Note de lecture reliée à chaque lune par aria-describedby. */
    const note = creer('p', 'e027-legend',
      'Lecture du diagnostic E027 : le type nomme la nature du point ; la confiance est le mot déclaré dans la donnée ; '
      + 'le verdict traduit ce mot (établi, vérifié, à confirmer, contesté, non étayé) ; le compte de sources indique '
      + 'les références locales associées. Ces indications sont textuelles et ne remplacent pas le détail du point.');
    note.id = 'e027-legend';
    ancrer(note);
    lunes.forEach((lune) => {
      const deja = lune.getAttribute('aria-describedby') || '';
      if (deja.split(/\s+/).indexOf('e027-legend') < 0) {
        lune.setAttribute('aria-describedby', `${deja} e027-legend`.trim());
      }
    });

    /* E027-10 — Bascule d'affichage : écouteur, attribut d'état et CSS. */
    layout.setAttribute('data-e027-diag', 'off');
    const bouton = creer('button', 'e027-toggle', 'Afficher le diagnostic');
    bouton.id = 'e027-toggle';
    bouton.type = 'button';
    bouton.setAttribute('aria-pressed', 'false');
    bouton.addEventListener('click', () => {
      const actif = layout.getAttribute('data-e027-diag') === 'on';
      layout.setAttribute('data-e027-diag', actif ? 'off' : 'on');
      bouton.setAttribute('aria-pressed', actif ? 'false' : 'true');
      bouton.textContent = actif ? 'Afficher le diagnostic' : 'Masquer le diagnostic';
    });
    ancrer(bouton);
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    layout.dataset.e027Motion = reduit ? 'reduced' : 'full';
  } catch {
    /* Greffon tolérant : aucune exception ne remonte au moteur de rendu. */
    return;
  }
});
