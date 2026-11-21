import { register } from './registry.js';

/* Lentille V2 E077 — fiche de diagnostic textuel enrichie au survol et au
   focus de la vue Constellation. Seconde passe : dix chantiers inédits, tous
   implémentés, sans réseau, sans source aléatoire et sans minuteur ni boucle
   d'animation propre. Préfixe exclusif : v2e077 (aucune collision avec la
   passe 1, dont les identifiants et la feuille sont décrits dans le rapport). */
register('E077', ctx => {
  /* Garde d'entrée : sans contexte ni layout courant, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Chaque chantier est isolé : une anomalie locale n'empêche pas les autres. */
  const safe = (fn) => { try { fn(); } catch { /* neutralisé sans bruit */ } };

  const creer = (tag, className, text) => typeof ctx.el === 'function'
    ? ctx.el(tag, className, text) : document.createElement(tag);
  const lire = (node) => node
    ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : '';
  const coords = (node) => {
    const x = parseFloat(node.style.getPropertyValue('--x'));
    const y = parseFloat(node.style.getPropertyValue('--y'));
    return {
      x: Number.isFinite(x) ? x : 50,
      y: Number.isFinite(y) ? y : 50,
    };
  };
  const distance = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  /* Feuille unique de la lentille : lecture persistante, bascule, rapport,
     texte masqué et repli « mouvement réduit ». Aucune couleur n'est le seul
     vecteur d'information. */
  css('constellation-v2-e077', `
.v2e077-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e077-lecture{margin:6px 0 0;font-size:9px;line-height:1.55;color:var(--muted-2);font-variant-numeric:tabular-nums}
.v2e077-bascule{min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:9px;cursor:pointer}
.v2e077-bascule:focus-visible{outline:3px solid var(--gold-bright);outline-offset:3px}
.v2e077-rapport[hidden]{display:none}
.v2e077-rapport{margin:6px 0 0;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:9px;line-height:1.55;color:var(--muted-2)}
.v2e077-calm .v2e077-bascule{transition:none}
@media (prefers-reduced-motion: reduce){.v2e077-bascule{transition:none}}
`);

  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.addEventListener !== 'function') return;
  const noeuds = Array.from(field.querySelectorAll('.const-sun, .const-planet, .const-moon'));
  if (!noeuds.length) return;

  const soleils = noeuds.filter((node) => node.classList.contains('const-sun'));
  const planetes = noeuds.filter((node) => node.classList.contains('const-planet'));
  const lunes = noeuds.filter((node) => node.classList.contains('const-moon'));

  const cible = (target) => {
    if (!target || target.nodeType !== 1 || typeof target.closest !== 'function') return null;
    const node = target.closest('.const-sun, .const-planet, .const-moon');
    return node && field.contains(node) ? node : null;
  };

  const visites = new Map();
  const noter = (node) => {
    const compte = (visites.get(node) || 0) + 1;
    visites.set(node, compte);
    node.dataset.v2e077Visites = String(compte);
    let total = 0;
    visites.forEach((valeur) => { total += valeur; });
    layout.dataset.v2e077VisitesTotal = String(total);
  };

  const ficheTexte = (node) => {
    const etat = node.dataset.v2e077Selection === 'selectionne'
      ? 'sélectionné' : 'non sélectionné';
    const echelle = node.dataset.v2e077Echelle
      ? `échelle ${node.dataset.v2e077Echelle}` : 'échelle sans objet';
    return `${node.dataset.v2e077Ref || '—'} · ${etat} · filiation `
      + `${node.dataset.v2e077Filiation || '—'} · ${echelle} · libellé `
      + `${node.dataset.v2e077Lisibilite || '—'} · vu `
      + `${node.dataset.v2e077Visites || '0'} fois`;
  };

  let traiter = () => {};
  let majRapport = () => {};

  /* E077-01 — Référence canonique déterministe déduite de la clé du nœud. */
  safe(() => {
    const prefixes = { sun: 'ÈRE', planet: 'REP', moon: 'PT' };
    noeuds.forEach((node) => {
      const type = node.classList.contains('const-sun') ? 'sun'
        : node.classList.contains('const-moon') ? 'moon' : 'planet';
      const cle = node.dataset.constKey || '';
      const trouvee = cle.match(/^(sun|planet|moon):(\d+)$/);
      const numero = trouvee ? trouvee[2] : (lire(node) || '?');
      node.dataset.v2e077Type = type;
      node.dataset.v2e077Ref = `${prefixes[type]} ${String(numero).padStart(2, '0')}`;
    });
    layout.dataset.v2e077Refs = String(noeuds.length);
  });

  /* E077-02 — État de sélection consigné en texte, jamais par la seule couleur. */
  safe(() => {
    noeuds.forEach((node) => {
      const selectionne = node.classList.contains('is-active')
        || node.getAttribute('aria-current') === 'true';
      node.dataset.v2e077Selection = selectionne ? 'selectionne' : 'ordinaire';
    });
    const total = noeuds.filter((node) =>
      node.dataset.v2e077Selection === 'selectionne').length;
    layout.dataset.v2e077Selectionnes = String(total);
  });

  /* E077-03 — Chaîne de filiation hiérarchique par proximité déterministe. */
  safe(() => {
    const plusProche = (node, liste) => {
      const origine = coords(node);
      let meilleur = null;
      let minimum = Infinity;
      liste.forEach((candidat) => {
        const ecart = distance(origine, coords(candidat));
        if (ecart < minimum) { minimum = ecart; meilleur = candidat; }
      });
      return meilleur;
    };
    noeuds.forEach((node) => {
      let chaine;
      if (node.classList.contains('const-sun')) {
        chaine = node.dataset.v2e077Ref || 'ÈRE ?';
      } else if (node.classList.contains('const-planet')) {
        const ere = plusProche(node, soleils);
        chaine = `${ere ? ere.dataset.v2e077Ref : 'ÈRE ?'} › ${node.dataset.v2e077Ref || 'REP ?'}`;
      } else {
        const repere = plusProche(node, planetes);
        const ere = repere ? plusProche(repere, soleils) : null;
        chaine = `${ere ? ere.dataset.v2e077Ref : 'ÈRE ?'} › `
          + `${repere ? repere.dataset.v2e077Ref : 'REP ?'} › `
          + `${node.dataset.v2e077Ref || 'PT ?'}`;
      }
      node.dataset.v2e077Filiation = chaine;
    });
    layout.dataset.v2e077Hierarchie = `${soleils.length}:${planetes.length}:${lunes.length}`;
  });

  /* E077-04 — Échelle temporelle des repères, ramenée au siècle. */
  safe(() => {
    const romain = (nombre) => {
      const valeurs = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'],
        [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'],
        [5, 'V'], [4, 'IV'], [1, 'I'],
      ];
      let reste = nombre;
      let sortie = '';
      valeurs.forEach(([valeur, symbole]) => {
        while (reste >= valeur) { sortie += symbole; reste -= valeur; }
      });
      return sortie || String(nombre);
    };
    planetes.forEach((node) => {
      const source = node.dataset.label || node.getAttribute('aria-label') || '';
      const avjc = /av\. J\.-C\./i.test(source) || /avant/i.test(source);
      const trouvee = source.match(/(\d+)/);
      let echelle = 'année illisible';
      if (trouvee) {
        const annee = parseInt(trouvee[1], 10);
        const siecle = avjc
          ? Math.max(1, Math.ceil(annee / 100))
          : Math.floor((annee - 1) / 100) + 1;
        echelle = `${romain(Math.max(1, siecle))} siècle${avjc ? ' av. J.-C.' : ''}`;
      }
      node.dataset.v2e077Echelle = echelle;
      node.dataset.v2e077Annee = trouvee
        ? `${avjc ? '-' : ''}${trouvee[1]}` : '?';
    });
    layout.dataset.v2e077Echelles = String(planetes.length);
  });

  /* E077-05 — Indice de lisibilité du libellé : longueur et classe de taille. */
  safe(() => {
    noeuds.forEach((node) => {
      const libelle = node.dataset.label || node.getAttribute('aria-label') || lire(node);
      const caracteres = libelle.length;
      const mots = libelle.split(/\s+/).filter(Boolean).length;
      const classe = caracteres <= 12 ? 'court' : caracteres <= 30 ? 'moyen' : 'long';
      node.dataset.v2e077Lisibilite = `${caracteres}:${mots}:${classe}`;
    });
    layout.dataset.v2e077Longueurs = noeuds
      .map((node) => node.dataset.v2e077Lisibilite || '0:0:court').join('|');
  });

  /* E077-06 — Compteur de visites par nœud, incrémenté sans minuteur. */
  safe(() => {
    noeuds.forEach((node) => {
      visites.set(node, 0);
      node.dataset.v2e077Visites = '0';
    });
    layout.dataset.v2e077VisitesTotal = '0';
  });

  /* E077-07 — Bandeau de lecture courante persistant et délégation du survol. */
  safe(() => {
    const conteneur = layout.querySelector('.constellation-caption') || field;
    let lecture = layout.querySelector('#v2e077-lecture');
    if (!lecture) {
      lecture = creer('p', 'v2e077-lecture',
        'Fiche de lecture : survolez ou focalisez un nœud.');
      lecture.id = 'v2e077-lecture';
      conteneur.appendChild(lecture);
    }
    field.addEventListener('mouseover', (event) => {
      const node = cible(event.target);
      if (node) traiter(node, 'survol');
    });
    layout.dataset.v2e077Bandeau = '1';
  });

  /* E077-08 — Bascale « fiche détaillée » : bouton indépendant à aria-pressed. */
  safe(() => {
    if (layout.querySelector('#v2e077-bascule')) return;
    const conteneur = layout.querySelector('.constellation-caption') || field;
    const bouton = creer('button', 'v2e077-bascule', 'Afficher la fiche détaillée');
    bouton.id = 'v2e077-bascule';
    bouton.type = 'button';
    bouton.setAttribute('aria-pressed', 'false');
    bouton.setAttribute('aria-controls', 'v2e077-rapport');
    bouton.addEventListener('click', () => {
      const rapport = layout.querySelector('#v2e077-rapport');
      const ouvert = bouton.getAttribute('aria-pressed') !== 'true';
      bouton.setAttribute('aria-pressed', ouvert ? 'true' : 'false');
      bouton.textContent = ouvert
        ? 'Masquer la fiche détaillée' : 'Afficher la fiche détaillée';
      if (rapport) rapport.hidden = !ouvert;
      layout.dataset.v2e077Ouvert = ouvert ? '1' : '0';
      const annonce = layout.querySelector('#v2e077-annonce');
      if (annonce) annonce.textContent = ouvert
        ? 'Fiche détaillée affichée.' : 'Fiche détaillée masquée.';
    });
    conteneur.appendChild(bouton);
  });

  /* E077-09 — Fiche détaillée et classement déterministe des consultations. */
  safe(() => {
    const conteneur = layout.querySelector('.constellation-caption') || field;
    let rapport = layout.querySelector('#v2e077-rapport');
    if (!rapport) {
      rapport = creer('div', 'v2e077-rapport');
      rapport.id = 'v2e077-rapport';
      rapport.hidden = true;
      rapport.setAttribute('aria-label', 'Fiche détaillée des nœuds de la constellation');
      rapport.appendChild(creer('p', '', ''));
      rapport.appendChild(creer('p', '', ''));
      conteneur.appendChild(rapport);
    }
    majRapport = () => {
      const paragraphes = rapport.querySelectorAll('p');
      if (paragraphes.length < 2) return;
      const lignes = noeuds.map((node) =>
        `${node.dataset.v2e077Ref || '—'} (${node.dataset.v2e077Filiation || '—'}) : `
        + `${node.dataset.v2e077Visites || '0'} visite(s)`);
      paragraphes[0].textContent = `Fiche détaillée — ${lignes.join(' · ')}.`;
      const ordre = noeuds.slice().sort((a, b) =>
        (Number(b.dataset.v2e077Visites) || 0) - (Number(a.dataset.v2e077Visites) || 0)
        || String(a.dataset.v2e077Ref || '').localeCompare(String(b.dataset.v2e077Ref || '')));
      const haut = ordre.slice(0, 3).map((node) =>
        `${node.dataset.v2e077Ref || '—'} (${node.dataset.v2e077Visites || '0'})`);
      paragraphes[1].textContent = `Nœuds les plus consultés : ${haut.join(', ') || 'aucun'}.`;
    };
    majRapport();
  });

  /* E077-10 — Moteur de diagnostic : annonce live dédiée, miroir clavier,
     rafraîchissement du rapport et repli « mouvement réduit ». */
  let derniereAnnonce = '';
  traiter = (node, origine) => {
    if (!node || !node.isConnected) return;
    noter(node);
    const lecture = layout.querySelector('#v2e077-lecture');
    if (lecture) {
      lecture.textContent = `Fiche de lecture — ${ficheTexte(node)}. Origine : ${origine}.`;
    }
    layout.dataset.v2e077Courant = node.dataset.v2e077Ref || '';
    majRapport();
    const annonce = layout.querySelector('#v2e077-annonce');
    const ref = node.dataset.v2e077Ref || '';
    if (annonce && ref && ref !== derniereAnnonce) {
      derniereAnnonce = ref;
      annonce.textContent = `Fiche ${ref} : ${ficheTexte(node)}.`;
    }
  };
  safe(() => {
    let annonce = layout.querySelector('#v2e077-annonce');
    if (!annonce) {
      annonce = creer('p', 'v2e077-sr', '');
      annonce.id = 'v2e077-annonce';
      annonce.setAttribute('role', 'status');
      annonce.setAttribute('aria-live', 'polite');
      annonce.setAttribute('aria-atomic', 'true');
      layout.appendChild(annonce);
    }
    field.addEventListener('focusin', (event) => {
      const node = cible(event.target);
      if (node) traiter(node, 'clavier');
    });
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    layout.classList.toggle('v2e077-calm', !!reduit);
    layout.dataset.v2e077Motion = reduit ? 'reduced' : 'full';
  });
});
