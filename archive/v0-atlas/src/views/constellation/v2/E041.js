import { register } from './registry.js';

/* Lentille V2 E041 — accessibilité clavier avancée de la légende de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e041 (aucune collision avec la passe 1). */
register('E041', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : texte masqué, reflet textuel de l'état,
     et repli « mouvement réduit ». Aucune couleur n'est le seul vecteur
     d'information : le reflet est un texte lisible, pas une pastille. */
  css('constellation-v2-e041', `
.v2e041-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e041-reflet{display:inline-block;margin-left:6px;font-size:9px;color:var(--muted);font-variant-numeric:tabular-nums;transition:opacity .15s ease}
.v2e041-calm .v2e041-reflet{transition:none}
@media (prefers-reduced-motion: reduce){.v2e041-reflet{transition:none!important}}
`);

  const legend = layout.querySelector('.constellation-legend');
  if (!legend) return;
  const entrees = Array.from(legend.querySelectorAll('.legend-sun, .legend-planet, .legend-moon'));
  if (!entrees.length) return;
  const doc = legend.ownerDocument || document;

  /* Création tolérante : ctx.el quand il est fourni, sinon le DOM natif. */
  const creer = (tag, className, text) => {
    if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* Noms d'origine figés avant toute insertion de badge : les libellés de
     recherche et d'annonce ne doivent jamais inclure le reflet ajouté plus bas. */
  const noms = entrees.map((entree, index) => {
    const brut = (entree.textContent || '').trim();
    return brut || `Entrée de légende ${index + 1}`;
  });
  const normaliser = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const indexDe = node => entrees.indexOf(node);
  const total = entrees.length;
  const modulo = value => ((value % total) + total) % total;

  /* Roving V2 : déplace le focus et tient le tabindex cohérent avec la
     convention de la passe 1, sans réécrire ses marqueurs data-e041-index. */
  const allerA = index => {
    const cible = entrees[modulo(index)];
    if (!cible) return;
    entrees.forEach((entree, i) => {
      entree.setAttribute('tabindex', i === modulo(index) ? '0' : '-1');
      entree.setAttribute('aria-current', i === modulo(index) ? 'true' : 'false');
    });
    if (typeof cible.focus === 'function') cible.focus({ preventScroll: true });
  };

  /* Zone de statut partagée par les annonces V2 (chantiers 06 à 09). */
  let live = layout.querySelector('#v2e041-live');
  if (!live) {
    live = creer('p', 'v2e041-sr', '');
    live.id = 'v2e041-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    layout.appendChild(live);
  }
  const annoncer = texte => { if (live) live.textContent = texte; };

  /* E041-01 — Figure et glossaire textuel intégral de la légende. */
  legend.setAttribute('aria-roledescription', 'légende de la constellation');
  let glossaire = layout.querySelector('#v2e041-glossaire');
  if (!glossaire) {
    glossaire = creer('dl', 'v2e041-sr');
    glossaire.id = 'v2e041-glossaire';
    const paires = [
      ['Ère', 'un anneau doré sur le cercle extérieur représente une ère.'],
      ['Repère', 'un disque bordé représente un repère de l’ère active.'],
      ['Point vérifié', 'un petit anneau violet marque un point vérifié du repère.'],
    ];
    paires.forEach(([terme, definition]) => {
      glossaire.appendChild(creer('dt', '', terme));
      glossaire.appendChild(creer('dd', '', definition));
    });
    layout.appendChild(glossaire);
  }
  legend.setAttribute('aria-describedby', 'v2e041-glossaire');
  legend.setAttribute('data-v2e041-figure', 'vrai');

  /* E041-02 — Position canonique de chaque entrée (posinset / setsize). */
  entrees.forEach((entree, index) => {
    entree.setAttribute('aria-posinset', String(index + 1));
    entree.setAttribute('aria-setsize', String(total));
    entree.setAttribute('data-v2e041-pos', `${index + 1}/${total}`);
  });

  /* E041-03 — Reflet textuel de la sélection courante, déduit des nœuds
     .is-active déjà présents dans la scène (aucune valeur codée en dur). */
  const actifs = [
    layout.querySelector('.const-sun.is-active'),
    layout.querySelector('.const-planet.is-active'),
    layout.querySelector('.const-moon.is-active'),
  ];
  entrees.forEach((entree, index) => {
    if (layout.querySelector(`#v2e041-reflet-${index}`)) return;
    const noeud = actifs[index];
    const valeur = noeud ? (noeud.textContent || '').trim() : '';
    const reflet = creer('span', 'v2e041-reflet', valeur ? `· sélection ${valeur}` : '· sélection courante');
    reflet.id = `v2e041-reflet-${index}`;
    entree.appendChild(reflet);
    entree.setAttribute('data-v2e041-reflet', valeur || 'courante');
  });

  /* E041-04 — Description visuelle par symbole (forme + couleur en mots),
     reliée à chaque entrée sans écraser l'aria-describedby de la passe 1. */
  const visuels = [
    'Forme : anneau doré. Couleur : or. Ce n’est pas la couleur seule qui porte le sens.',
    'Forme : disque bordé. Couleur : bleu. La bordure distingue le repère.',
    'Forme : petit anneau. Couleur : violet. L’anneau distingue le point vérifié.',
  ];
  entrees.forEach((entree, index) => {
    let visuel = layout.querySelector(`#v2e041-visuel-${index}`);
    if (!visuel) {
      visuel = creer('span', 'v2e041-sr', visuels[index] || '');
      visuel.id = `v2e041-visuel-${index}`;
      layout.appendChild(visuel);
    }
    const decrits = (entree.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (decrits.indexOf(visuel.id) === -1) decrits.push(visuel.id);
    entree.setAttribute('aria-describedby', decrits.join(' '));
  });

  /* E041-05 — Parcours vertical par Flèche haut / Flèche bas, axe inédit
     ajouté aux flèches horizontales de la passe 1. */
  /* E041-06 — Recherche par initiale, sans tampon ni minuteur. */
  /* E041-07 — Échap : sortie du groupe, focus rendu à la scène. */
  /* E041-08 — Entrée / Espace : activation vers le nœud visuel correspondant. */
  /* E041-09 — Touche « ? » : annonce intégrale de la légende. */
  legend.addEventListener('keydown', event => {
    if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const cible = event.target;
    if (!cible || cible.nodeType !== 1 || typeof cible.matches !== 'function') return;
    if (!cible.matches('.legend-sun, .legend-planet, .legend-moon')) return;
    const depuis = indexDe(cible);
    if (depuis < 0) return;
    const key = event.key || '';

    /* Parcours vertical cyclique (E041-05). */
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      allerA(depuis + (key === 'ArrowDown' ? 1 : -1));
      return;
    }

    /* Recherche par initiale (E041-06). */
    if (key.length === 1 && /^[a-zà-ÿ]$/iu.test(key)) {
      const lettre = normaliser(key);
      let trouve = -1;
      for (let pas = 1; pas <= total; pas++) {
        const candidat = modulo(depuis + pas);
        if (normaliser(noms[candidat]).startsWith(lettre)) { trouve = candidat; break; }
      }
      if (trouve < 0) return;
      event.preventDefault();
      event.stopPropagation();
      allerA(trouve);
      annoncer(`Recherche par initiale : ${noms[trouve]} (${trouve + 1} sur ${total}).`);
      return;
    }

    /* Sortie explicite (E041-07). */
    if (key === 'Escape' || key === 'Esc') {
      event.preventDefault();
      event.stopPropagation();
      const champ = layout.querySelector('.constellation-field')
        || layout.querySelector('.constellation-back');
      if (champ && typeof champ.focus === 'function') champ.focus({ preventScroll: true });
      annoncer('Sortie de la légende : focus rendu à la constellation.');
      return;
    }

    /* Activation vers le nœud visuel (E041-08). */
    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      event.stopPropagation();
      const noeud = actifs[depuis];
      if (noeud && typeof noeud.focus === 'function') {
        noeud.focus({ preventScroll: true });
        annoncer(`Activation : focus porté sur ${noms[depuis]} de la constellation.`);
      } else {
        annoncer(`${noms[depuis]} : aucun élément actif à ce jour.`);
      }
      return;
    }

    /* Annonce intégrale (E041-09). */
    if (key === '?' || key === 'F1') {
      event.preventDefault();
      event.stopPropagation();
      annoncer(`Légende complète : ${noms.join(' ; ')}. ${total} symboles.`);
    }
  }, true);

  /* E041-10 — Déclaration non destructive des touches, aide V2 et mouvement réduit. */
  entrees.forEach(entree => {
    const jetons = (entree.getAttribute('aria-keyshortcuts') || '').split(/\s+/).filter(Boolean);
    ['ArrowUp', 'ArrowDown', 'Escape', 'Enter', 'Space', '?'].forEach(jeton => {
      if (jetons.indexOf(jeton) === -1) jetons.push(jeton);
    });
    entree.setAttribute('aria-keyshortcuts', jetons.join(' '));
    entree.setAttribute('data-v2e041-keys', jetons.join(' '));
  });

  /* Aide V2 masquée, rattachée sans écraser l'aide de la passe 1 ; le mode
     de mouvement réduit est tracé sur la légende (voir E041-10). */
  let aide = layout.querySelector('#v2e041-help');
  if (!aide) {
    aide = creer('p', 'v2e041-sr',
      'Légende V2 : haut et bas parcourent les symboles, une lettre saute au symbole voulu, Échap rend le focus à la constellation, Entrée ou Espace rejoint le symbole visuel, là ? relit toute la légende.');
    aide.id = 'v2e041-help';
    layout.appendChild(aide);
  }
  entrees.forEach(entree => {
    const decrits = (entree.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (decrits.indexOf(aide.id) === -1) decrits.push(aide.id);
    entree.setAttribute('aria-describedby', decrits.join(' '));
  });
  let reduit = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduit = !!ctx.reducedMotion(); } catch (error) { reduit = false; }
  }
  if (reduit) legend.classList.add('v2e041-calm');
  else legend.classList.remove('v2e041-calm');
});
