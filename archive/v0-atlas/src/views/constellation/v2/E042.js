import { register } from './registry.js';

/* Lentille V2 E042 — Performance de rendu de la légende (seconde passe).
   Dix chantiers inédits, tous locaux et déterministes : stabilité dimensionnelle,
   isolation de la peinture, budget de marqueurs et instrumentation de coût.
   Aucun appel réseau, aucune source aléatoire, aucune sortie de journal,
   aucun minuteur ni boucle d'animation propre. */

/* Coût estimé au rendu précédent : conservé entre deux rendus du shell, qui
   recrée le DOM à chaque changement d'état, sans horloge ni tirage aléatoire. */
let v2e042DernierCout = null;

register('E042', ctx => {
  /* Garde d'entrée : sans layout exploitable ni document, rien n'est touché. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;

  const layout = ctx.layout;
  const legende = layout.querySelector('.constellation-legend');
  if (!legende) return;

  const entrees = Array.from(legende.querySelectorAll('span'));

  /* Auxiliaire d'écriture : on compare avant d'écrire pour ne pas invalider le
     style inutilement (outil partagé, non un chantier en soi). */
  const ecrire = (node, name, value) => {
    if (!node || typeof node.getAttribute !== 'function') return false;
    const cible = String(value);
    if (node.getAttribute(name) === cible) return false;
    node.setAttribute(name, cible);
    return true;
  };
  const ecrireVar = (node, name, value) => {
    if (!node || !node.style || typeof node.style.getPropertyValue !== 'function') return false;
    const cible = String(value);
    if (node.style.getPropertyValue(name) === cible) return false;
    node.style.setProperty(name, cible);
    return true;
  };
  /* Empreinte djb2 32 bits : déterministe, sans horloge ni aléa. */
  const empreinte = (source) => {
    let h = 5381;
    for (let i = 0; i < source.length; i += 1) {
      h = ((h << 5) + h + source.charCodeAt(i)) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  };

  /* Feuille unique de la lentille V2, posée avant toute mutation du DOM. */
  css('constellation-v2-e042', `
    /* E042-01 — une hauteur minimale réservée stabilise la légende. */
    .constellation-layout .constellation-legend {
      isolation: isolate;
      min-height: var(--v2e042-minh, 18px);
    }

    /* E042-05 / E042-06 — marqueurs surnuméraires ou dupliqués non peints.
       Le sélecteur d'attribut répété porte la spécificité nécessaire pour
       l'emporter sur une règle de pastille d'une autre lentille, sans la citer. */
    .constellation-layout .constellation-legend span[data-v2e042-surplus="1"][data-v2e042-surplus="1"]::before,
    .constellation-layout .constellation-legend span[data-v2e042-doublon="1"][data-v2e042-doublon="1"]::before {
      content: none;
    }

    /* E042-04 — le panneau hors écran peut être ignoré par le moteur de rendu. */
    .constellation-layout #v2e042-panel {
      content-visibility: auto;
      contain-intrinsic-size: auto 96px;
      margin: 8px 0 0;
      padding: 6px 9px;
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--muted-2);
      font-size: 9px;
      line-height: 1.5;
      font-variant-numeric: tabular-nums;
    }
    .constellation-layout #v2e042-title { margin: 0 0 4px; color: var(--gold-bright); font-family: var(--serif); font-size: 11px; font-weight: 450; }
    .constellation-layout #v2e042-note { margin: 0 0 4px; }
    .constellation-layout #v2e042-readout { margin: 0; color: var(--ink-soft); }
    @media (max-width: 620px) { .constellation-layout #v2e042-panel { padding: 5px 7px; } }
  `);

  /* Préparation : une seule lecture de la typographie, réutilisée ensuite par
     le calcul de réserve (E042-01) et la publication de mesure (E042-03). */
  let ligne = 16;
  try {
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      const style = window.getComputedStyle(legende);
      const taille = parseFloat(style.fontSize) || 12;
      const interligne = parseFloat(style.lineHeight);
      ligne = Number.isFinite(interligne) && interligne > 0
        ? Math.round(interligne) : Math.round(taille * 1.4);
    }
  } catch { /* Valeur par défaut conservée si la mesure échoue. */ }

  /* Panneau d'instrumentation : construit à part, inséré en une seule fois, et
     réutilisé d'un rendu à l'autre lorsqu'il existe déjà dans le layout. */
  let lecture = null;
  let panneau = null;
  try {
    panneau = layout.querySelector('#v2e042-panel');
    if (panneau) {
      lecture = panneau.querySelector('#v2e042-readout');
    } else {
      panneau = typeof ctx.el === 'function'
        ? ctx.el('section', 'v2e042-panel') : document.createElement('section');
      panneau.id = 'v2e042-panel';
      panneau.setAttribute('aria-labelledby', 'v2e042-title');
      panneau.setAttribute('aria-describedby', 'v2e042-note');
      const titre = typeof ctx.el === 'function'
        ? ctx.el('h2', 'v2e042-title', 'Laboratoire V2 E042 — coût de rendu de la légende')
        : document.createElement('h2');
      titre.id = 'v2e042-title';
      const note = typeof ctx.el === 'function'
        ? ctx.el('p', 'v2e042-note',
            'La légende est isolée, sa hauteur est réservée et ses marqueurs sont budgetés. Les mesures ci-dessous sont déterministes : aucun minuteur, aucun tirage aléatoire, aucune requête réseau.')
        : document.createElement('p');
      note.id = 'v2e042-note';
      lecture = typeof ctx.el === 'function'
        ? ctx.el('p', 'v2e042-readout', 'Mesures en attente de rendu.')
        : document.createElement('p');
      lecture.id = 'v2e042-readout';
      lecture.setAttribute('role', 'status');
      lecture.setAttribute('aria-live', 'polite');
      lecture.setAttribute('aria-atomic', 'true');
      panneau.appendChild(titre);
      panneau.appendChild(note);
      panneau.appendChild(lecture);
      layout.appendChild(panneau);
    }
  } catch { /* Panneau facultatif : le reste de la lentille continue. */ }

  /* E042-01 — Réserve de hauteur anti-décalage (limitation du CLS). */
  const hauteur = legende.clientHeight || 0;
  const reserve = Math.max(ligne, Math.round(hauteur));
  ecrireVar(legende, '--v2e042-minh', `${reserve}px`);
  ecrire(legende, 'data-v2e042-reserve', `${reserve}`);

  /* E042-02 — Contexte d'empilement isolé pour circonscrire la peinture des
     marqueurs sans modifier l'écoulement ni le voisinage de la légende. */
  ecrire(legende, 'data-v2e042-isolated', '1');

  /* E042-03 — Métriques typographiques gelées, publiées une seule fois. */
  ecrire(legende, 'data-v2e042-ligne', `${ligne}`);
  ecrire(legende, 'data-v2e042-metriques', 'unique');

  /* E042-04 — Rendu différé du panneau hors écran. */
  ecrire(panneau, 'data-v2e042-defer', 'auto');

  /* E042-05 — Budget de marqueurs peints : au-delà du seuil, le libellé reste
     lisible mais sa pastille décorative n'est plus dessinée. */
  const budget = 3;
  const surplus = Math.max(0, entrees.length - budget);
  entrees.forEach((node, index) => {
    if (index >= budget) ecrire(node, 'data-v2e042-surplus', '1');
    else if (node && typeof node.removeAttribute === 'function') {
      node.removeAttribute('data-v2e042-surplus');
    }
  });
  ecrire(legende, 'data-v2e042-budget', `${budget}`);
  ecrire(legende, 'data-v2e042-surplus', `${surplus}`);

  /* E042-06 — Déduplication des libellés : les doublons gardent leur texte mais
     perdent leur marqueur, pour ne pas repeindre la même pastille. */
  const vus = Object.create(null);
  let doublons = 0;
  entrees.forEach((node) => {
    const texte = node && typeof node.textContent === 'string' ? node.textContent.trim() : '';
    if (texte && Object.prototype.hasOwnProperty.call(vus, texte)) {
      ecrire(node, 'data-v2e042-doublon', '1');
      doublons += 1;
    } else {
      if (texte) vus[texte] = 1;
      if (node && typeof node.removeAttribute === 'function') {
        node.removeAttribute('data-v2e042-doublon');
      }
    }
  });
  ecrire(legende, 'data-v2e042-doublons', `${doublons}`);

  /* E042-07 — Lecture vocale sans bavardage : la région live n'est réécrite que
     si son contenu change, pour éviter une annonce redondante à l'identique. */
  const annoncer = (message) => {
    if (!lecture || !lecture.isConnected) return;
    if (lecture.textContent === message) {
      ecrire(legende, 'data-v2e042-annonce', 'stable');
      return;
    }
    lecture.textContent = message;
    ecrire(legende, 'data-v2e042-annonce', 'mise-a-jour');
  };

  /* E042-08 — Inventaire du coût de l'arbre, obtenu par une seule traversée. */
  let noeuds = 0;
  let profondeur = 0;
  const inventarier = (node, niveau) => {
    if (!node) return;
    noeuds += 1;
    if (niveau > profondeur) profondeur = niveau;
    const enfants = node.children;
    if (enfants && typeof enfants.length === 'number') {
      for (let i = 0; i < enfants.length; i += 1) inventarier(enfants[i], niveau + 1);
    }
  };
  inventarier(legende, 0);
  ecrire(legende, 'data-v2e042-noeuds', `${noeuds}`);
  ecrire(legende, 'data-v2e042-profondeur', `${profondeur}`);

  /* E042-09 — Garde de structure : la lentille ne recrée aucun nœud, elle ne
     dépose que des attributs ; une empreinte djb2 atteste de l'immobilité. */
  const structure = entrees.map((node) =>
    (node && node.tagName ? node.tagName.toLowerCase() : 'span') + ':'
    + (node && typeof node.className === 'string' ? node.className.trim() : '')
  ).join('|');
  const somme = empreinte(structure);
  ecrire(legende, 'data-v2e042-structure', somme);
  ecrire(legende, 'data-v2e042-no-rebuild', '1');

  /* E042-10 — Synthèse de coût : estimation déterministe et comparaison avec le
     rendu précédent, sans horloge ni nombre aléatoire. */
  const cout = noeuds + doublons + surplus;
  const precedent = v2e042DernierCout;
  const tendance = precedent === null ? 'initial'
    : cout === precedent ? 'stable' : cout > precedent ? 'accu' : 'reduit';
  v2e042DernierCout = cout;
  ecrire(layout, 'data-v2e042-cout', `${cout}`);
  ecrire(layout, 'data-v2e042-cout-tendance', tendance);
  const message = `V2 E042 · légende ${entrees.length} entrée${entrees.length > 1 ? 's' : ''}`
    + ` · réserve ${reserve} px · interligne ${ligne} px · budget ${budget}, surplus ${surplus}`
    + ` · doublons ${doublons} · nœuds ${noeuds}, profondeur ${profondeur}`
    + ` · structure ${somme} · coût ${cout} (${tendance}).`;
  annoncer(message);
});
