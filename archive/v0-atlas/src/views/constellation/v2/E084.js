import { register } from './registry.js';

/* Lentille V2 E084 — diagnostic structurel du chemin de connexion (ère →
   repère → point) de la vue Constellation. Seconde passe : dix chantiers
   inédits, tous implémentés, sans réseau, sans source aléatoire, sans minuteur
   ni boucle d'animation propre. Préfixe exclusif : v2e084 (aucune collision
   avec la passe 1, qui utilisait e084-, constellation-e084 et data-e084-*). */
register('E084', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : panneau, table, marquage non coloré des
     états et repli « mouvement réduit ». Aucune information critique n'est
     portée par la seule couleur. */
  css('constellation-v2-e084', `
.v2e084-panel{margin-top:12px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);color:var(--ink-soft);font-size:9px;line-height:1.5}
.v2e084-titre{margin:0 0 6px;font-family:var(--serif);font-size:12px;font-weight:500;color:var(--gold-bright)}
.v2e084-table{border-collapse:collapse;width:100%;margin:6px 0;font-variant-numeric:tabular-nums}
.v2e084-table caption{text-align:left;padding:2px 0;color:var(--gold);font-weight:600}
.v2e084-table th,.v2e084-table td{border:1px solid var(--line);padding:2px 5px;text-align:left}
.v2e084-table thead th{color:var(--violet);text-transform:uppercase;letter-spacing:.04em}
.v2e084-note{margin:0 0 5px;color:var(--muted)}
.v2e084-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-edges line[data-v2e084-etat="passif"]{stroke-dasharray:3 2;opacity:.7}
.constellation-edges line[data-v2e084-etat="actif"]{stroke-dasharray:none}
.v2e084-still .v2e084-panel,.v2e084-still .v2e084-panel *{transition:none!important;animation:none!important}
@media (prefers-reduced-motion: reduce){.v2e084-panel,.v2e084-panel *{transition:none!important;animation:none!important}}
@media (max-width:620px){.v2e084-table{font-size:8px}}
`);

  const field = layout.querySelector('.constellation-field');
  const edges = layout.querySelector('.constellation-edges');
  const caption = layout.querySelector('.constellation-caption');

  /* Lecture défensive d'un libellé : aria-label, data-label, title, texte
     visible, puis repli explicite. Aucune information n'est inventée. */
  const libelle = noeud => {
    if (!noeud || typeof noeud.getAttribute !== 'function') return 'sans libellé';
    const aria = noeud.getAttribute('aria-label');
    if (aria && aria.trim()) return aria.trim();
    const donnees = noeud.dataset && noeud.dataset.label ? String(noeud.dataset.label).trim() : '';
    if (donnees) return donnees;
    const titre = noeud.getAttribute('title');
    if (titre && titre.trim()) return titre.trim();
    const texte = typeof noeud.textContent === 'string' ? noeud.textContent.trim() : '';
    return texte || 'sans libellé';
  };

  /* Rôle sémantique déduit de la classe du bouton, jamais de sa couleur. */
  const roleOf = noeud => {
    const classes = noeud && noeud.classList ? noeud.classList : null;
    if (classes && classes.contains('const-sun')) return 'ère';
    if (classes && classes.contains('const-planet')) return 'repère';
    if (classes && classes.contains('const-moon')) return 'point';
    return 'autre';
  };

  /* Fusion idempotente de jetons dans un attribut ARIA déjà présent. */
  const ajouterJetons = (noeud, attribut, jetons) => {
    if (!noeud || typeof noeud.getAttribute !== 'function' || typeof noeud.setAttribute !== 'function') return;
    const presents = (noeud.getAttribute(attribut) || '').split(/\s+/).filter(Boolean);
    jetons.forEach(jeton => { if (presents.indexOf(jeton) === -1) presents.push(jeton); });
    noeud.setAttribute(attribut, presents.join(' '));
  };

  /* Lecture des segments : coordonnées, relation, longueur et angle, le tout
     déterministe et sans recours à une source aléatoire. */
  const lireSegments = () => {
    if (!edges || typeof edges.querySelectorAll !== 'function') return [];
    return Array.from(edges.querySelectorAll('line')).map((ligne, index) => {
      const classes = ligne && ligne.classList ? ligne.classList : null;
      const estLune = !!(classes && classes.contains('is-moon'));
      const estActif = !!(classes && classes.contains('is-path'));
      const nombre = attr => {
        const brut = ligne && typeof ligne.getAttribute === 'function' ? ligne.getAttribute(attr) : null;
        const valeur = Number.parseFloat(brut);
        return Number.isFinite(valeur) ? valeur : 0;
      };
      const x1 = nombre('x1'), y1 = nombre('y1'), x2 = nombre('x2'), y2 = nombre('y2');
      const dx = x2 - x1, dy = y2 - y1;
      let angle = Math.atan2(dy, dx) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      return {
        ligne, index, estLune, estActif, x1, y1, x2, y2, dx, dy, angle,
        longueur: Math.sqrt(dx * dx + dy * dy),
        relation: estLune ? 'repère → point' : 'ère → repère',
      };
    });
  };

  /* Lecture des nœuds de la chaîne : rôle, référence stable, clé, libellé et
     position déclarée par la vue (variables --x / --y). */
  const lireNoeuds = () => {
    if (!field || typeof field.querySelectorAll !== 'function') return [];
    const comptes = { 'ère': 0, 'repère': 0, 'point': 0, 'autre': 0 };
    return Array.from(field.querySelectorAll('[data-const-key]')).map(noeud => {
      const role = roleOf(noeud);
      comptes[role] = (comptes[role] || 0) + 1;
      const prefixe = role === 'ère' ? 'E' : role === 'repère' ? 'R' : role === 'point' ? 'P' : 'X';
      const ref = `${prefixe}${comptes[role]}`;
      const x = Number.parseFloat(noeud.style && noeud.style.getPropertyValue('--x'));
      const y = Number.parseFloat(noeud.style && noeud.style.getPropertyValue('--y'));
      return {
        noeud, role, ref,
        cle: noeud.dataset && noeud.dataset.constKey ? String(noeud.dataset.constKey) : '—',
        libelle: libelle(noeud),
        x, y,
        position: Number.isFinite(x) && Number.isFinite(y),
        courant: noeud.getAttribute('aria-current') === 'true',
      };
    });
  };

  /* Égalité de positions avec tolérance : la vue écrit deux décimales, la
     marge couvre l'arrondi sans inventer de correspondance. */
  const memePoint = (px, py, x, y) =>
    Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(x) && Number.isFinite(y)
      && Math.abs(px - x) <= 0.02 && Math.abs(py - y) <= 0.02;

  const directions = ['Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest', 'Nord', 'Nord-Est'];
  const directionDe = angle => directions[Math.round((angle % 360) / 45) % 8];

  /* Conteneur V2, créé une seule fois, inséré avant la légende de la vue. */
  let panneau = layout.querySelector('#v2e084-panel');
  if (!panneau) {
    panneau = typeof ctx.el === 'function'
      ? ctx.el('section', 'v2e084-panel')
      : document.createElement('section');
    panneau.id = 'v2e084-panel';
    panneau.setAttribute('role', 'region');
    panneau.setAttribute('aria-labelledby', 'v2e084-titre');
  }

  /* Enfant du panneau, réutilisé s'il existe déjà (idempotence sans retrait). */
  const enfant = (tag, classe, id, texte) => {
    let noeud = panneau.querySelector('#' + id);
    if (!noeud) {
      noeud = typeof ctx.el === 'function'
        ? ctx.el(tag, classe, texte)
        : document.createElement(tag);
      noeud.id = id;
      if (classe && !noeud.className) noeud.className = classe;
      if (texte !== undefined) noeud.textContent = texte;
      panneau.appendChild(noeud);
    }
    return noeud;
  };

  const titre = enfant('h3', 'v2e084-titre', 'v2e084-titre', 'Chemin de connexion — diagnostic structurel (V2)');

  /* E084-01 — Glossaire du chemin en liste de définitions : ère, repère,
     point, segment, tracé et chaîne active sont définis à première occurrence
     dans un texte sémantique et indexable (<dt>/<dd>), jamais dans du JS. */
  const termes = [
    ['Ère', 'Contexte historique large, représenté par un soleil ; premier maillon de la chaîne.'],
    ['Repère', 'Événement daté d’une ère, représenté par une planète ; deuxième maillon.'],
    ['Point', 'Point vérifié d’un repère, représenté par une lune ; dernier maillon.'],
    ['Segment', 'Trait du tracé qui relie deux maillons consécutifs de la chaîne.'],
    ['Tracé', 'Ensemble des segments, décoratif et non porteur de date ni d’importance.'],
    ['Chaîne active', 'Séquence ère → repère → point actuellement sélectionnée.'],
  ];
  const glossaire = enfant('dl', 'v2e084-glossaire', 'v2e084-glossaire');
  if (!glossaire.childNodes.length) {
    termes.forEach(([terme, definition]) => {
      const dt = typeof ctx.el === 'function' ? ctx.el('dt', '', terme) : document.createElement('dt');
      const dd = typeof ctx.el === 'function' ? ctx.el('dd', '', definition) : document.createElement('dd');
      glossaire.appendChild(dt);
      glossaire.appendChild(dd);
    });
  }
  panneau.dataset.v2e084Glossaire = String(termes.length);

  /* E084-02 — Registre des nœuds : chaque bouton reçoit une référence stable
     (E1, R2, P1…) publiée en data-v2e084-ref ; une phrase relie la référence à
     la clé, au rôle et au libellé. Aucune information n'est perdue si un
     libellé manque : le repli reste explicite. */
  const registre = enfant('p', 'v2e084-note', 'v2e084-registre');
  const ecrireRegistre = liste => {
    if (!liste.length) {
      registre.textContent = 'Registre des nœuds : aucun nœud de chaîne détectable.';
      return;
    }
    registre.textContent = 'Registre des nœuds : '
      + liste.map(n => `${n.ref} = ${n.cle} (${n.role} : ${n.libelle})`).join(' ; ') + '.';
  };

  /* E084-03 — Table sémantique des segments : caption, en-têtes porteurs de
     scope="col" et ligne d'en-tête scope="row". Structure tabulaire réelle,
     différente de la liste ordonnée de la passe 1. */
  const table = enfant('table', 'v2e084-table', 'v2e084-table');
  let legende = table.querySelector('caption');
  if (!legende) {
    legende = document.createElement('caption');
    legende.textContent = 'Table des segments du chemin de connexion';
    table.appendChild(legende);
  }
  let thead = table.querySelector('thead');
  if (!thead) {
    thead = document.createElement('thead');
    const ligneHead = document.createElement('tr');
    ['N°', 'Relation', 'État', 'Longueur', 'Orientation'].forEach(texte => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = texte;
      ligneHead.appendChild(th);
    });
    thead.appendChild(ligneHead);
    table.appendChild(thead);
  }
  let tbody = table.querySelector('tbody');
  if (!tbody) {
    tbody = document.createElement('tbody');
    table.appendChild(tbody);
  }
  const ecrireTable = liste => {
    tbody.textContent = '';
    if (!liste.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.textContent = 'Aucun segment à tabuler.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    liste.forEach(seg => {
      if (seg.ligne && typeof seg.ligne.setAttribute === 'function') {
        seg.ligne.setAttribute('data-v2e084-index', String(seg.index + 1));
      }
      const tr = document.createElement('tr');
      const rang = document.createElement('th');
      rang.scope = 'row';
      rang.textContent = String(seg.index + 1);
      const relation = document.createElement('td');
      relation.textContent = seg.relation;
      const etat = document.createElement('td');
      etat.textContent = seg.estActif ? 'actif' : 'passif';
      const longueur = document.createElement('td');
      longueur.textContent = `${seg.longueur.toFixed(2)} u`;
      const orientation = document.createElement('td');
      orientation.textContent = directionDe(seg.angle);
      tr.append(rang, relation, etat, longueur, orientation);
      tbody.appendChild(tr);
    });
  };

  /* E084-04 — Graphe de connectivité : le degré de chaque nœud est le nombre
     d'extrémités de segments qui coïncident avec sa position. Nœuds isolés et
     degrés sont publiés en attributs et énoncés en français. */
  const graphe = enfant('p', 'v2e084-note', 'v2e084-graphe');
  const ecrireGraphe = (noeuds, segments) => {
    let isoles = 0;
    const detail = [];
    noeuds.forEach(n => {
      let degre = 0;
      segments.forEach(s => {
        if (memePoint(s.x1, s.y1, n.x, n.y)) degre += 1;
        if (memePoint(s.x2, s.y2, n.x, n.y)) degre += 1;
      });
      if (n.noeud && typeof n.noeud.setAttribute === 'function') {
        n.noeud.setAttribute('data-v2e084-degre', String(degre));
      }
      if (degre === 0) isoles += 1;
      detail.push(`${n.ref} : ${degre}`);
    });
    layout.dataset.v2e084Isoles = String(isoles);
    graphe.textContent = `Degrés du graphe — ${detail.join(' ; ') || 'aucun nœud'} ; `
      + `${isoles} nœud${isoles > 1 ? 's' : ''} isolé${isoles > 1 ? 's' : ''} sur ${noeuds.length}.`;
  };

  /* E084-05 — Test de continuité : présence du maillon ère → repère puis,
     quand des lunes existent, du maillon repère → point. Verdict nommé
     « continu », « rompu » ou « indéterminable », distinct de l'état vide
     de la passe 1 : un tracé non vide peut être rompu. */
  const continuite = enfant('p', 'v2e084-note', 'v2e084-continuite');
  const ecrireContinuite = (noeuds, segments) => {
    const actif = role => noeuds.find(n => n.role === role && n.courant && n.position);
    const soleil = actif('ère'), planete = actif('repère'), lune = actif('point');
    const aUnMaillon = (debut, fin) => segments.some(s =>
      memePoint(s.x1, s.y1, debut.x, debut.y) && memePoint(s.x2, s.y2, fin.x, fin.y));
    let verdict, detail;
    if (!soleil || !planete) {
      verdict = 'indeterminable';
      detail = 'ère ou repère actif introuvable.';
    } else {
      const maillon1 = aUnMaillon(soleil, planete);
      const aLunes = segments.some(s => s.estLune);
      const maillon2 = lune && aLunes ? aUnMaillon(planete, lune) : null;
      verdict = maillon1 && (maillon2 === null || maillon2) ? 'continu' : 'rompu';
      detail = `ère → repère ${maillon1 ? 'présent' : 'absent'}`
        + (maillon2 === null ? '' : ` ; repère → point ${maillon2 ? 'présent' : 'absent'}`) + '.';
    }
    layout.dataset.v2e084Continuite = verdict;
    continuite.textContent = `Continuité du chemin : ${verdict} — ${detail}`;
  };

  /* E084-06 — Orientations des segments : l'angle athan2 des composantes est
     projeté sur huit quadrants de 45°, publié en data-v2e084-orientation et
     résumé par une direction dominante déterministe (départage par l'ordre de
     la table des directions). Aucun tirage aléatoire. */
  const orientations = enfant('p', 'v2e084-note', 'v2e084-orientations');
  const ecrireOrientations = segments => {
    const comptes = Object.create(null);
    segments.forEach(s => {
      const d = directionDe(s.angle);
      comptes[d] = (comptes[d] || 0) + 1;
      if (s.ligne && typeof s.ligne.setAttribute === 'function') {
        s.ligne.setAttribute('data-v2e084-orientation', d);
      }
    });
    const entrees = Object.keys(comptes).map(d => `${d} ${comptes[d]}`);
    let dominante = '—';
    directions.forEach(d => {
      if (!comptes[d]) return;
      if (dominante === '—' || comptes[d] > comptes[dominante]) dominante = d;
    });
    layout.dataset.v2e084Orientation = dominante;
    orientations.textContent = `Orientations des segments : ${entrees.join(' ; ') || 'aucun segment'}. `
      + `Direction dominante : ${dominante} (référence : huit quadrants de 45°).`;
  };

  /* E084-07 — Journal des recomputations : liste ordonnée bornée à cinq
     entrées et région live dédiée, distincte de la description de la passe 1.
     Le journal est piloté par les clics, sans minuteur ni boucle d'animation. */
  let traceLive = layout.querySelector('#v2e084-trace-live');
  if (!traceLive) {
    traceLive = typeof ctx.el === 'function'
      ? ctx.el('p', 'v2e084-sr', '')
      : document.createElement('p');
    traceLive.id = 'v2e084-trace-live';
    traceLive.setAttribute('role', 'status');
    traceLive.setAttribute('aria-live', 'polite');
    traceLive.setAttribute('aria-atomic', 'true');
    layout.appendChild(traceLive);
  }
  const journal = enfant('ol', 'v2e084-journal', 'v2e084-journal');
  let sequence = 0;
  const dernier = journal.lastElementChild;
  if (dernier && typeof dernier.textContent === 'string') {
    const lu = Number.parseInt(dernier.textContent, 10);
    if (Number.isFinite(lu)) sequence = lu;
  }
  const ecrireEntree = (prefixe, segments, noeuds) => {
    sequence += 1;
    const cles = noeuds.filter(n => n.courant).map(n => n.ref).join('>') || 'vide';
    const ligne = `${String(sequence).padStart(2, '0')} — ${prefixe} : ${segments.length} segments, chaîne ${cles}.`;
    const item = typeof ctx.el === 'function' ? ctx.el('li', '', ligne) : document.createElement('li');
    journal.appendChild(item);
    while (journal.children.length > 5 && journal.firstChild) journal.removeChild(journal.firstChild);
    layout.dataset.v2e084Journal = String(journal.children.length);
    traceLive.textContent = ligne;
  };

  /* E084-08 — Bilan chiffré en trois faits : compte de segments rapporté au
     nombre minimum d'arêtes, longueur cumulée comparée à la diagonale du
     repère (référence de 141,4 unités), et nœuds reliés sur le total. */
  const bilan = enfant('p', 'v2e084-note', 'v2e084-bilan');
  const ecrireBilan = (segments, noeuds) => {
    const total = segments.reduce((somme, s) => somme + s.longueur, 0);
    const actifs = segments.filter(s => s.estActif).length;
    const reference = Math.max(0, noeuds.length - 1);
    const diagonale = Math.sqrt(100 * 100 + 100 * 100);
    const isoles = Number.parseInt(layout.dataset.v2e084Isoles || '0', 10) || 0;
    bilan.textContent = `Bilan — ${segments.length} segments relevés dont ${actifs} sur le tracé actif `
      + `(référence : ${reference} segments pour relier ${noeuds.length} nœuds) ; `
      + `longueur cumulée ${total.toFixed(2)} unités, soit ${(total / diagonale * 100).toFixed(0)} % `
      + `de la diagonale du repère (${diagonale.toFixed(1)} u) ; `
      + `${noeuds.length - isoles} nœuds reliés sur ${noeuds.length} (référence : ${noeuds.length}).`;
    layout.dataset.v2e084Bilan = total.toFixed(2);
  };

  /* E084-09 — Liaisons ARIA croisées non destructives : le champ annonce le
     panneau V2 via aria-details et la table via aria-controls, tandis que la
     table est décrite par le bilan. Les attributs existants sont préservés. */
  ajouterJetons(field, 'aria-details', [panneau.id]);
  ajouterJetons(field, 'aria-controls', [table.id]);
  ajouterJetons(table, 'aria-describedby', [bilan.id]);
  ajouterJetons(titre, 'aria-describedby', [glossaire.id]);

  /* E084-10 — État non coloré et mouvement réduit : les segments portent
     data-v2e084-etat, matérialisé en pointillés/solidaires par la feuille
     unique ; la préférence système, lue sans sonde propre, pilote la classe
     v2e084-still qui neutralise transitions et animations. */
  const marquerEtats = segments => {
    segments.forEach(s => {
      if (s.ligne && typeof s.ligne.setAttribute === 'function') {
        s.ligne.setAttribute('data-v2e084-etat', s.estActif ? 'actif' : 'passif');
      }
    });
  };
  let still = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { still = !!ctx.reducedMotion(); } catch (erreur) { still = false; }
  }
  if (still) {
    if (panneau.classList) panneau.classList.add('v2e084-still');
    layout.dataset.v2e084Motion = 'reduced';
  } else {
    if (panneau.classList) panneau.classList.remove('v2e084-still');
    layout.dataset.v2e084Motion = 'full';
  }

  /* Une seule passe de recalcul alimente tous les chantiers dynamiques. */
  const actualiser = prefixe => {
    const segments = lireSegments();
    const noeuds = lireNoeuds();
    noeuds.forEach(n => {
      if (n.noeud && typeof n.noeud.setAttribute === 'function') {
        n.noeud.setAttribute('data-v2e084-ref', n.ref);
      }
    });
    layout.dataset.v2e084Noeuds = String(noeuds.length);
    ecrireRegistre(noeuds);
    ecrireTable(segments);
    marquerEtats(segments);
    ecrireGraphe(noeuds, segments);
    ecrireContinuite(noeuds, segments);
    ecrireOrientations(segments);
    ecrireBilan(segments, noeuds);
    ecrireEntree(prefixe, segments, noeuds);
  };
  actualiser('État initial');

  /* Un unique écouteur délégué sur le champ, lié une seule fois, recalcule le
     diagnostic après chaque changement d'étape. Aucun minuteur, aucune boucle
     rAF : le module reste passif entre les interactions. */
  if (field && typeof field.addEventListener === 'function'
      && typeof field.getAttribute === 'function' && typeof field.setAttribute === 'function'
      && field.getAttribute('data-v2e084-bound') !== 'true') {
    field.setAttribute('data-v2e084-bound', 'true');
    field.addEventListener('click', event => {
      const cible = event && event.target && typeof event.target.closest === 'function'
        ? event.target.closest('[data-const-key]') : null;
      if (!cible || !field.contains(cible)) return;
      if (typeof layout.isConnected === 'boolean' && !layout.isConnected) return;
      actualiser('Recalcul');
    });
  }

  /* Insertion unique du panneau avant la légende, avec repli tolerant. */
  if (!panneau.parentNode) {
    if (caption && typeof caption.parentNode === 'object' && typeof layout.insertBefore === 'function') {
      layout.insertBefore(panneau, caption);
    } else if (typeof layout.appendChild === 'function') {
      layout.appendChild(panneau);
    }
  }
});
