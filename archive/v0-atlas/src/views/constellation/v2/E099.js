import { register } from './registry.js';

/* Lentille V2 E099 — contrôles d'intégrité et filets de sécurité appliqués au
   champ d'étoiles de la vue Constellation. Seconde passe : dix chantiers
   inédits, tous implémentés, sans réseau, sans source aléatoire et sans
   minuteur ni boucle d'animation propre. Préfixe exclusif : v2e099. */
register('E099', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : annonce masquée, commande de repli,
     ré-ancrage des étiquettes et repli « mouvement réduit ». Aucune couleur
     n'est le seul vecteur d'information. */
  css('constellation-v2-e099', `
.v2e099-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e099-bouton{min-height:36px;padding:0 12px;border:1px solid var(--gold-bright,#f4d69e);border-radius:8px;background:var(--surface-2,rgba(7,10,14,.94));color:var(--gold-bright,#f4d69e);font-size:11px;cursor:pointer}
.v2e099-bouton:focus-visible{outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.v2e099-liste{margin-top:10px;padding:8px 12px;border:1px dashed var(--gold-bright,#f4d69e);border-radius:8px;color:var(--ink-soft,#cbd5e1);font-size:11px;line-height:1.55}
.v2e099-liste[hidden]{display:none!important}
.v2e099-liste-ordres{margin:0;padding-left:18px}
.v2e099-etiquette-droite::after{left:0;transform:none;text-align:left}
.v2e099-etiquette-gauche::after{left:auto;right:0;transform:none;text-align:right}
@media (prefers-reduced-motion: reduce){.v2e099-bouton,.v2e099-liste{transition:none!important}}
`);

  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.setAttribute !== 'function') return;

  const setAttr = (node, name, value) => {
    if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
  };
  const make = (tag, className, text) => typeof ctx.el === 'function'
    ? ctx.el(tag, className, text)
    : document.createElement(tag);
  const nombre = value => {
    const resultat = Number.parseFloat(value);
    return Number.isFinite(resultat) ? resultat : null;
  };
  const position = node => {
    if (!node || !node.style || typeof node.style.getPropertyValue !== 'function') {
      return { x: null, y: null };
    }
    return {
      x: nombre(node.style.getPropertyValue('--x')),
      y: nombre(node.style.getPropertyValue('--y'))
    };
  };
  const accord = (n, singulier, pluriel) => `${n} ${n > 1 ? pluriel : singulier}`;

  const config = [
    { cle: 'soleils', selecteur: '.const-layer-suns', bouton: '.const-sun', nom: 'Ère', groupe: 'Ères du champ d’étoiles' },
    { cle: 'reperes', selecteur: '.const-layer-planets', bouton: '.const-planet', nom: 'Repère', groupe: 'Repères du champ d’étoiles' },
    { cle: 'points', selecteur: '.const-layer-moons', bouton: '.const-moon', nom: 'Point vérifié', groupe: 'Points vérifiés du champ d’étoiles' }
  ];
  const couches = config.map(cfg => {
    const noeud = field.querySelector(cfg.selecteur);
    const noeuds = noeud && typeof noeud.querySelectorAll === 'function'
      ? Array.from(noeud.querySelectorAll(`button${cfg.bouton}`)) : [];
    return { ...cfg, noeud, noeuds };
  });
  const astres = couches.reduce((liste, couche) => liste.concat(couche.noeuds), []);

  /* E099-01 — Inventaire structuré des trois couches : chaque effectif est
     consigné séparément, avec un total, pour rendre la scène auditable sans
     compter visuellement les boutons. */
  let totalAstres = 0;
  couches.forEach(couche => {
    totalAstres += couche.noeuds.length;
    setAttr(field, `data-v2e099-${couche.cle}`, String(couche.noeuds.length));
  });
  setAttr(field, 'data-v2e099-total', String(totalAstres));

  /* E099-02 — Détection de chevauchement : une comparaison déterministe des
     variables --x/--y, deux à deux, signale les astres trop proches pour être
     distingués. Le seuil est fixe, aucun tirage n'est impliqué. */
  const points = astres.map(node => ({ node, ...position(node) }));
  const seuilX = 7;
  const seuilY = 7;
  let chevauchements = 0;
  points.forEach(point => setAttr(point.node, 'data-v2e099-chevauchement', 'non'));
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      if (a.x === null || a.y === null || b.x === null || b.y === null) continue;
      if (Math.abs(a.x - b.x) < seuilX && Math.abs(a.y - b.y) < seuilY) {
        chevauchements += 1;
        setAttr(a.node, 'data-v2e099-chevauchement', 'oui');
        setAttr(b.node, 'data-v2e099-chevauchement', 'oui');
      }
    }
  }
  setAttr(field, 'data-v2e099-chevauchements', String(chevauchements));

  /* E099-03 — Intégrité des libellés accessibles : un astre sans nom exploitable
     reçoit un libellé français déterministe, afin qu'aucun bouton ne soit
     annoncé « bouton » sans précision par un lecteur d'écran. */
  let libellesReplies = 0;
  couches.forEach(couche => {
    couche.noeuds.forEach((node, index) => {
      const source = [node.getAttribute('aria-label'), node.dataset && node.dataset.label,
        node.getAttribute('title')].filter(Boolean).join(' ').trim();
      if (source) {
        setAttr(node, 'data-v2e099-libelle', 'present');
        return;
      }
      setAttr(node, 'aria-label', `${couche.nom} ${index + 1} — libellé non fourni`);
      setAttr(node, 'data-v2e099-libelle', 'replie');
      libellesReplies += 1;
    });
  });
  setAttr(field, 'data-v2e099-libelles-replies', String(libellesReplies));

  /* E099-04 — Unicité des clés de focus : la vue mémorise le focus par
     data-const-key ; un doublon ferait restaurer le mauvais astre. Le premier
     est conservé, les suivants reçoivent une clé suffixée déterministe. */
  const vues = Object.create(null);
  let doubles = 0;
  astres.forEach((node, index) => {
    const cle = ((node.dataset && node.dataset.constKey) || '').trim();
    if (!cle) {
      setAttr(node, 'data-v2e099-cle', 'absente');
      return;
    }
    if (vues[cle]) {
      const unique = `${cle}-v2e099-${index + 1}`;
      setAttr(node, 'data-const-key', unique);
      vues[unique] = true;
      setAttr(node, 'data-v2e099-cle', 'dupliquee');
      doubles += 1;
    } else {
      vues[cle] = true;
      setAttr(node, 'data-v2e099-cle', 'unique');
    }
  });
  setAttr(field, 'data-v2e099-cles-dupliquees', String(doubles));

  /* E099-05 — Validation des arêtes vectorielles : chaque ligne doit porter
     quatre coordonnées finies. Une ligne incomplète est marquée, sans être
     supprimée, pour ne pas casser le rendu des autres liaisons. */
  const aretes = field.querySelector('.constellation-edges');
  let aretesInvalides = 0;
  if (aretes && typeof aretes.querySelectorAll === 'function') {
    const lignes = Array.from(aretes.querySelectorAll('line'));
    lignes.forEach((ligne, index) => {
      const x1 = nombre(ligne.getAttribute('x1'));
      const y1 = nombre(ligne.getAttribute('y1'));
      const x2 = nombre(ligne.getAttribute('x2'));
      const y2 = nombre(ligne.getAttribute('y2'));
      const valide = x1 !== null && y1 !== null && x2 !== null && y2 !== null;
      if (!valide) aretesInvalides += 1;
      setAttr(ligne, 'data-v2e099-index', String(index + 1));
      setAttr(ligne, 'data-v2e099-arete', valide ? 'valide' : 'invalide');
    });
    setAttr(aretes, 'data-v2e099-aretes', String(lignes.length));
  }
  setAttr(field, 'data-v2e099-aretes-invalides', String(aretesInvalides));

  /* E099-06 — Garde-fou d'état actif unique : une couche non vide doit
     exposer exactement un astre sélectionné. Zéro ou plusieurs actifs est
     signalé sur la couche, sans corriger le choix de l'utilisateur. */
  let actifsAnormaux = 0;
  couches.forEach(couche => {
    if (!couche.noeud || !couche.noeuds.length) return;
    const actifs = couche.noeuds.filter(node => node.classList
      && typeof node.classList.contains === 'function'
      && node.classList.contains('is-active')).length;
    const anomalie = actifs !== 1;
    if (anomalie) actifsAnormaux += 1;
    setAttr(couche.noeud, 'data-v2e099-actifs', String(actifs));
    setAttr(couche.noeud, 'data-v2e099-actif', anomalie ? 'anormal' : 'normal');
  });
  setAttr(field, 'data-v2e099-actifs-anormaux', String(actifsAnormaux));

  /* E099-07 — Cohérence des groupes : une couche peuplée doit rester un
     groupe nommé. Le repli n'écrase jamais un libellé existant posé par la
     vue, et une couche vide est laissée intacte. */
  let groupesReplis = 0;
  couches.forEach(couche => {
    if (!couche.noeud || !couche.noeuds.length) return;
    if (couche.noeud.getAttribute('role') !== 'group') {
      setAttr(couche.noeud, 'role', 'group');
      groupesReplis += 1;
    }
    const libelle = (couche.noeud.getAttribute('aria-label') || '').trim();
    if (libelle) {
      setAttr(couche.noeud, 'data-v2e099-groupe', 'present');
      return;
    }
    setAttr(couche.noeud, 'aria-label', couche.groupe);
    setAttr(couche.noeud, 'data-v2e099-groupe', 'replie');
    groupesReplis += 1;
  });
  setAttr(field, 'data-v2e099-groupes-replis', String(groupesReplis));

  /* E099-08 — Bilan d'intégrité annoncé : une région de statut unique, écrite
     une seule fois, résume les six contrôles précédents en français. L'annonce
     est distincte de celle de la passe 1, dédiée au suivi du focus. */
  const anomalies = chevauchements + libellesReplies + doubles
    + aretesInvalides + actifsAnormaux + groupesReplis;
  let bilan = layout.querySelector('#v2e099-bilan');
  if (!bilan) {
    bilan = make('p', 'v2e099-sr', '');
    bilan.id = 'v2e099-bilan';
    setAttr(bilan, 'role', 'status');
    setAttr(bilan, 'aria-live', 'polite');
    setAttr(bilan, 'aria-atomic', 'true');
    layout.appendChild(bilan);
  }
  if (bilan && typeof bilan.textContent === 'string') {
    bilan.textContent = `Contrôles d’intégrité du champ d’étoiles : ${accord(totalAstres, 'astre', 'astres')}, `
      + `${accord(chevauchements, 'chevauchement', 'chevauchements')}, `
      + `${libellesReplies} libellé${libellesReplies > 1 ? 's' : ''} replié${libellesReplies > 1 ? 's' : ''}, `
      + `${accord(doubles, 'clé dupliquée', 'clés dupliquées')}, `
      + `${accord(aretesInvalides, 'arête invalide', 'arêtes invalides')}, `
      + `${accord(actifsAnormaux, 'couche à état actif anormal', 'couches à état actif anormal')}, `
      + `${accord(groupesReplis, 'groupe replié', 'groupes repliés')}. `
      + `${anomalies ? `${accord(anomalies, 'anomalie signalée', 'anomalies signalées')}.` : 'Aucune anomalie signalée.'}`;
  }

  /* E099-09 — Liste textuelle de secours : un bouton de divulgation à commande
     explicite révèle un inventaire ordonné des astres. Utile quand la scène est
     dense : le contenu reste du texte réel, lisible sans mouvement ni couleur. */
  let panneau = layout.querySelector('#v2e099-liste');
  if (!panneau) {
    panneau = make('div', 'v2e099-liste', '');
    panneau.id = 'v2e099-liste';
    panneau.hidden = true;
    const bouton = make('button', 'v2e099-bouton', 'Afficher la liste textuelle des astres');
    bouton.type = 'button';
    bouton.id = 'v2e099-bouton';
    setAttr(bouton, 'aria-controls', panneau.id);
    setAttr(bouton, 'aria-expanded', 'false');
    bouton.addEventListener('click', () => {
      const ouvert = bouton.getAttribute('aria-expanded') === 'true';
      setAttr(bouton, 'aria-expanded', ouvert ? 'false' : 'true');
      bouton.textContent = ouvert
        ? 'Afficher la liste textuelle des astres'
        : 'Masquer la liste textuelle des astres';
      panneau.hidden = ouvert;
    });
    const liste = make('ol', 'v2e099-liste-ordres', '');
    couches.forEach(couche => {
      couche.noeuds.forEach((node, index) => {
        const libelle = [node.getAttribute('aria-label'), node.dataset && node.dataset.label,
          node.getAttribute('title')].filter(Boolean).join(' ').trim();
        liste.appendChild(make('li', '', `${couche.nom} ${index + 1} : ${libelle || 'sans libellé'}`));
      });
    });
    if (!liste.children.length) {
      liste.appendChild(make('li', '', 'Aucun astre à recenser dans ce champ.'));
    }
    panneau.appendChild(liste);
    if (typeof layout.insertBefore === 'function') layout.insertBefore(bouton, panneau);
    else layout.appendChild(bouton);
    layout.appendChild(panneau);
  }
  setAttr(field, 'data-v2e099-liste', 'disponible');

  /* E099-10 — Garde-fou de débordement d'étiquette : une étiquette large centrée
     sur un astre proche du bord sortait du champ. Le texte est ré-ancré vers
     l'intérieur, avec un marqueur donné à l'audit ; le repli « mouvement réduit »
     du CSS neutralise toute transition de ces nouveaux contrôles. */
  let etiquettesReancrées = 0;
  astres.forEach(node => {
    const x = position(node).x;
    if (x === null) return;
    if (x < 20) {
      node.classList.add('v2e099-etiquette-droite');
      setAttr(node, 'data-v2e099-etiquette', 'ancree-droite');
      etiquettesReancrées += 1;
    } else if (x > 80) {
      node.classList.add('v2e099-etiquette-gauche');
      setAttr(node, 'data-v2e099-etiquette', 'ancree-gauche');
      etiquettesReancrées += 1;
    } else {
      setAttr(node, 'data-v2e099-etiquette', 'centree');
    }
  });
  setAttr(field, 'data-v2e099-etiquettes-reancrées', String(etiquettesReancrées));
});
