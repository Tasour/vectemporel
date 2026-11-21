import { register } from './registry.js';

/* Lentille V2 E075 — adaptabilité contextuelle avancée de l'ampoule de survol
   de la vue Constellation. Seconde passe : dix chantiers inédits, tous
   implémentés, sans réseau, sans source aléatoire, sans minuteur ni boucle
   d'animation propre. Préfixe exclusif : v2e075 — aucune collision avec la
   passe 1, qui utilisait e075-, constellation-e075 et __e075_*. */
register('E075', ctx => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM, y compris
     la feuille unique injectée dans <head>. Greffon tolérant aux ctx partiels. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.layout.querySelector !== 'function') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille. Le pilote géométrique ne s'applique qu'à
     partir de 621 px pour laisser la barre basse de la passe 1 régner sur les
     écrans étroits. Aucune information n'est portée par la seule couleur :
     le bec est une forme, l'état des bascules est un attribut et un contour. */
  css('constellation-v2-e075', `
    .v2e075-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
    .v2e075-bec{position:absolute;left:50%;width:0;height:0;transform:translateX(-50%);border-left:6px solid transparent;border-right:6px solid transparent;pointer-events:none}
    .v2e075-bec[data-v2e075-bec="bas"]{top:100%;border-top:6px solid var(--gold,#e6b96f)}
    .v2e075-bec[data-v2e075-bec="haut"]{bottom:100%;border-bottom:6px solid var(--gold,#e6b96f)}
    @media (min-width:621px){
      .v2e075-pilote .e075-tip{left:var(--v2e075-x,var(--e075-x,50%));top:var(--v2e075-y,var(--e075-y,8%))}
    }
    .v2e075-epingle .e075-tip{opacity:1!important;visibility:visible!important}
    .v2e075-commandes{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 0;align-items:center}
    .v2e075-btn{min-height:36px;min-width:36px;padding:6px 10px;border:1px solid var(--gold,#e6b96f);border-radius:8px;background:var(--surface-2,#10161f);color:var(--gold-bright,#f4d69e);font-size:10px;cursor:pointer}
    .v2e075-btn:focus-visible{outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px}
    .v2e075-btn[aria-pressed="true"]{border-style:double;border-width:3px;font-weight:700}
    .v2e075-legend{display:flex;flex-wrap:wrap;gap:12px;margin:6px 0 0;padding:0;list-style:none;font-size:10px;color:var(--ink-soft,#d7d1c6)}
    .v2e075-legend li{display:flex;align-items:center;gap:5px}
    .v2e075-legend li::before{content:"";width:8px;height:8px;flex:0 0 auto;border:1px solid currentColor}
    .v2e075-legend li.v2e075-ere::before{border-radius:50%}
    .v2e075-legend li.v2e075-repere::before{border-radius:2px;transform:rotate(45deg)}
    .v2e075-legend li.v2e075-point::before{width:5px;height:5px;border-radius:50%;background:currentColor}
    .v2e075-dense .e075-tip{font-size:8px;max-width:min(190px,36%)}
    .v2e075-dense .e075-tip-kind{display:none}
    .v2e075-tout button[data-const-key]::after{opacity:1!important}
    .v2e075-etat{margin:6px 0 0;color:var(--muted,#8c8d91);font-size:9px;line-height:1.45}
    .v2e075-sobre .v2e075-bec,.v2e075-sobre .v2e075-btn{transition:none}
    @media (prefers-reduced-motion:reduce){.v2e075-btn,.v2e075-bec{transition:none!important}}
    @media (forced-colors:active){.v2e075-btn{border:1px solid CanvasText;color:CanvasText;background:Canvas}.v2e075-btn[aria-pressed="true"]{outline:2px solid Highlight}.v2e075-legend li::before{border-color:CanvasText}}
  `);

  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.querySelectorAll !== 'function') return;
  const noeuds = Array.from(field.querySelectorAll('button[data-const-key]'));
  if (!noeuds.length) return;

  const creer = (tag, classe, texte) => typeof ctx.el === 'function'
    ? ctx.el(tag, classe, texte) : document.createElement(tag);
  const natureDe = (node) => {
    if (!node || !node.classList) return 'Nœud';
    if (node.classList.contains('const-sun')) return 'Ère';
    if (node.classList.contains('const-planet')) return 'Repère';
    if (node.classList.contains('const-moon')) return 'Point vérifié';
    return 'Nœud';
  };
  const labelDe = (node) => (node && node.dataset && node.dataset.label) ||
    (node && typeof node.getAttribute === 'function' && node.getAttribute('aria-label')) || 'Nœud';
  const valeurDe = (node, nom, repli) => {
    if (!node || !node.style || typeof node.style.getPropertyValue !== 'function') return repli;
    const valeur = Number.parseFloat(node.style.getPropertyValue(nom));
    return Number.isFinite(valeur) ? valeur : repli;
  };
  const rangDe = (node) => {
    const index = noeuds.indexOf(node);
    return index < 0 ? '—' : `${index + 1} / ${noeuds.length}`;
  };
  const ajouterId = (node, id) => {
    if (!node || typeof node.getAttribute !== 'function' || typeof node.setAttribute !== 'function') return;
    const ids = (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (ids.indexOf(id) === -1) {
      ids.push(id);
      node.setAttribute('aria-describedby', ids.join(' '));
    }
  };
  const retirerId = (node, id) => {
    if (!node || typeof node.getAttribute !== 'function' || typeof node.setAttribute !== 'function') return;
    const ids = (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    const reste = ids.filter((value) => value !== id);
    if (reste.length) node.setAttribute('aria-describedby', reste.join(' '));
    else node.removeAttribute('aria-describedby');
  };

  let epingle = false;
  let dernierDecrit = null;
  let etatLive = null;
  let masquerAmpoule = () => {};

  /* E075-01 — Bec directionnel : un triangle CSS unique, enfant de l'ampoule
     existante, dont l'attribut d'orientation est piloté par le côté choisi. */
  const tip = layout.querySelector('#e075-tip');
  let bec = null;
  if (tip && typeof tip.appendChild === 'function') {
    bec = creer('span', 'v2e075-bec', '');
    bec.id = 'v2e075-bec';
    bec.setAttribute('aria-hidden', 'true');
    bec.setAttribute('data-v2e075-bec', 'bas');
    tip.appendChild(bec);
  }

  /* E075-02 — Côté automatique haut/bas : la latitude du nœud décide si
     l'ampoule se place au-dessus ou au-dessous, sans heurter les bords. */
  const coteEtY = (node, y) => {
    const cote = y < 42 ? 'bas' : 'haut';
    const brut = cote === 'bas' ? y + 7 : y - 8;
    const borne = Math.max(4, Math.min(94, brut));
    if (tip && tip.style && typeof tip.style.setProperty === 'function') {
      tip.style.setProperty('--v2e075-y', `${borne.toFixed(2)}%`);
    }
    field.setAttribute('data-v2e075-cote', cote);
    if (bec && typeof bec.setAttribute === 'function') {
      bec.setAttribute('data-v2e075-bec', cote === 'bas' ? 'haut' : 'bas');
    }
    return cote;
  };
  if (field.classList && typeof field.classList.add === 'function') {
    field.classList.add('v2e075-pilote');
  }

  /* E075-03 — Bornage géométrique : une lecture unique des deux rectangles
     ramène le centre de l'ampoule dans le champ, en pixels, avec repli en
     pourcentage si la géométrie est indisponible. */
  const xBorne = (node, x) => {
    let valeur = `${Math.max(14, Math.min(86, x)).toFixed(2)}%`;
    if (tip && tip.style && typeof tip.style.setProperty === 'function'
        && typeof field.getBoundingClientRect === 'function'
        && typeof tip.getBoundingClientRect === 'function') {
      try {
        const cadre = field.getBoundingClientRect();
        const ampoule = tip.getBoundingClientRect();
        if (Number.isFinite(cadre.width) && Number.isFinite(ampoule.width)
            && cadre.width > 0 && ampoule.width > 0) {
          const ecart = Math.max(0, cadre.width / 2 - ampoule.width / 2 - 4);
          const relatif = (x / 100) * cadre.width - cadre.width / 2;
          const borne = Math.max(-ecart, Math.min(ecart, relatif));
          valeur = `${(cadre.width / 2 + borne).toFixed(1)}px`;
        }
      } catch {
        valeur = `${Math.max(14, Math.min(86, x)).toFixed(2)}%`;
      }
      tip.style.setProperty('--v2e075-x', valeur);
    }
    return valeur;
  };

  /* E075-04 — Description accessible enrichie : un paragraphe masqué porte
     nature, libellé, rang et modalité, et est relié au nœud visé par un
     aria-describedby non destructif, retiré à la sortie. */
  let desc = layout.querySelector('#v2e075-desc');
  if (!desc) {
    desc = creer('p', 'v2e075-sr', '');
    desc.id = 'v2e075-desc';
    desc.setAttribute('role', 'tooltip');
    layout.appendChild(desc);
  }
  const decrire = (node, genre, texte, modalite) => {
    if (!desc || typeof desc.textContent !== 'string') return;
    desc.textContent = `${genre} : ${texte} — ${rangDe(node)}${modalite ? `, ${modalite}` : ''}.`;
    ajouterId(node, desc.id);
    if (dernierDecrit && dernierDecrit !== node) retirerId(dernierDecrit, desc.id);
    dernierDecrit = node;
  };

  /* E075-05 — Épinglage : une bascule indépendante (aria-pressed) maintient
     l'ampoule visible, avec une région live dédiée à son propre état. */
  let pin = layout.querySelector('#v2e075-pin');
  if (!pin && field.parentNode && typeof field.parentNode.insertBefore === 'function') {
    pin = creer('button', 'v2e075-btn', 'Épingler l’ampoule');
    pin.id = 'v2e075-pin';
    pin.type = 'button';
    pin.setAttribute('aria-pressed', 'false');
    if (tip && tip.id) pin.setAttribute('aria-controls', tip.id);
    field.parentNode.insertBefore(pin, field);
  }
  etatLive = layout.querySelector('#v2e075-etat');
  if (!etatLive) {
    etatLive = creer('p', 'v2e075-etat', '');
    etatLive.id = 'v2e075-etat';
    etatLive.setAttribute('role', 'status');
    etatLive.setAttribute('aria-live', 'polite');
    etatLive.setAttribute('aria-atomic', 'true');
    layout.appendChild(etatLive);
  }
  if (pin && typeof pin.addEventListener === 'function') {
    pin.addEventListener('click', () => {
      epingle = !epingle;
      pin.setAttribute('aria-pressed', epingle ? 'true' : 'false');
      if (field.classList && typeof field.classList.toggle === 'function') {
        field.classList.toggle('v2e075-epingle', epingle);
      }
      etatLive.textContent = epingle
        ? 'Ampoule épinglée : elle reste affichée jusqu’au prochain clic.'
        : 'Ampoule libérée : elle suit à nouveau le survol et le focus.';
      if (!epingle) masquerAmpoule();
    });
  }

  /* E075-06 — Légende des natures : trois entrées textuelles, un glyphe de
     forme distinct et le décompte calculé une seule fois sur les nœuds. */
  const comptes = { sun: 0, planet: 0, moon: 0 };
  noeuds.forEach((node) => {
    if (!node || !node.classList) return;
    if (node.classList.contains('const-sun')) comptes.sun += 1;
    else if (node.classList.contains('const-planet')) comptes.planet += 1;
    else if (node.classList.contains('const-moon')) comptes.moon += 1;
  });
  let legende = layout.querySelector('#v2e075-legend');
  if (!legende && field.parentNode && typeof field.parentNode.insertBefore === 'function') {
    legende = creer('ul', 'v2e075-legend', '');
    legende.id = 'v2e075-legend';
    legende.setAttribute('aria-label', 'Légende des natures avec décompte');
    const entrees = [
      ['v2e075-ere', `Ère — ${comptes.sun}`],
      ['v2e075-repere', `Repère — ${comptes.planet}`],
      ['v2e075-point', `Point vérifié — ${comptes.moon}`]
    ];
    entrees.forEach(([classe, texte]) => {
      const item = creer('li', classe, texte);
      if (legende && typeof legende.appendChild === 'function') legende.appendChild(item);
    });
    field.parentNode.insertBefore(legende, field);
  }

  /* E075-07 — Aide contextuelle de largeur : un texte réel, masqué, relié au
     champ sans écraser la note déjà posée par la vue. */
  let aide = layout.querySelector('#v2e075-help');
  if (!aide) {
    aide = creer('p', 'v2e075-sr', '');
    aide.id = 'v2e075-help';
    layout.appendChild(aide);
  }
  let etroit = false;
  try {
    etroit = !!(typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(max-width: 620px)').matches);
  } catch {
    etroit = false;
  }
  aide.textContent = etroit
    ? 'Écran étroit : l’ampoule s’affiche en barre basse ; touchez un nœud pour lire son libellé.'
    : 'Écran large : survolez ou focalisez un nœud pour lire sa nature et son libellé.';
  const decrits = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (decrits.indexOf(aide.id) === -1) {
    decrits.push(aide.id);
    field.setAttribute('aria-describedby', decrits.join(' '));
  }

  /* E075-08 — Mode dense : au-delà de seize nœuds, l'ampoule elle-même se
     compacte et la ligne de nature s'efface, sans toucher aux libellés. */
  if (noeuds.length > 16) {
    field.setAttribute('data-v2e075-dense', 'oui');
    if (field.classList && typeof field.classList.add === 'function') {
      field.classList.add('v2e075-dense');
    }
  } else {
    field.removeAttribute('data-v2e075-dense');
    if (field.classList && typeof field.classList.remove === 'function') {
      field.classList.remove('v2e075-dense');
    }
  }

  /* E075-09 — Toutes les étiquettes : seconde bascule indépendante qui force
     les libellés natifs de tous les nœuds à rester lisibles en même temps. */
  let tout = layout.querySelector('#v2e075-tout');
  if (!tout && field.parentNode && typeof field.parentNode.insertBefore === 'function') {
    tout = creer('button', 'v2e075-btn', 'Afficher toutes les étiquettes');
    tout.id = 'v2e075-tout';
    tout.type = 'button';
    tout.setAttribute('aria-pressed', 'false');
    field.parentNode.insertBefore(tout, field);
  }
  if (tout && typeof tout.addEventListener === 'function') {
    tout.addEventListener('click', () => {
      const actif = tout.getAttribute('aria-pressed') !== 'true';
      tout.setAttribute('aria-pressed', actif ? 'true' : 'false');
      if (field.classList && typeof field.classList.toggle === 'function') {
        field.classList.toggle('v2e075-tout', actif);
      }
      etatLive.textContent = actif
        ? 'Étiquettes : toutes affichées simultanément.'
        : 'Étiquettes : affichage courant restauré.';
    });
  }

  /* E075-10 — Mouvement réduit : la préférence fournie par le contexte fige
     les nouveaux éléments, avec un repli media query et contraste forcé. */
  let sobre = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { sobre = !!ctx.reducedMotion(); } catch { sobre = false; }
  }
  if (sobre) {
    field.setAttribute('data-v2e075-sobre', 'oui');
    if (field.classList && typeof field.classList.add === 'function') {
      field.classList.add('v2e075-sobre');
    }
  } else {
    field.removeAttribute('data-v2e075-sobre');
    if (field.classList && typeof field.classList.remove === 'function') {
      field.classList.remove('v2e075-sobre');
    }
  }

  /* Câblage délégué commun aux chantiers 01 à 04 : un seul jeu d'écouteurs,
     partagé entre survol, tap et focus, alimente les mêmes fonctions. */
  const forcerCacher = () => {
    if (tip && typeof tip.setAttribute === 'function') {
      tip.setAttribute('data-e075-tip', '0');
      if (tip.classList && typeof tip.classList.remove === 'function') {
        tip.classList.remove('e075-tap');
      }
    }
    field.removeAttribute('data-e075-focus');
    field.removeAttribute('data-v2e075-cote');
    noeuds.forEach((node) => node.removeAttribute('data-e075-over'));
    if (bec && typeof bec.setAttribute === 'function') {
      bec.setAttribute('data-v2e075-bec', 'bas');
    }
    retirerId(dernierDecrit, desc ? desc.id : 'v2e075-desc');
    dernierDecrit = null;
  };
  const cacher = () => { if (!epingle) forcerCacher(); };
  masquerAmpoule = forcerCacher;

  const cibleDe = (event) => {
    const cible = event && event.target;
    if (!cible || cible.nodeType !== 1 || typeof cible.closest !== 'function') return null;
    const node = cible.closest('button[data-const-key]');
    return node && field.contains(node) ? node : null;
  };

  const montrer = (node, modalite) => {
    if (!node || noeuds.indexOf(node) < 0) return;
    if (!tip || typeof tip.setAttribute !== 'function') return;
    const genre = natureDe(node);
    const texte = labelDe(node);
    const kind = layout.querySelector('#e075-tip-kind');
    const libelle = layout.querySelector('#e075-tip-label');
    if (kind && typeof kind.textContent === 'string') kind.textContent = genre;
    if (libelle && typeof libelle.textContent === 'string') libelle.textContent = texte;
    coteEtY(node, valeurDe(node, '--y', 50));
    xBorne(node, valeurDe(node, '--x', 50));
    tip.setAttribute('data-e075-tip', '1');
    noeuds.forEach((other) => other.removeAttribute('data-e075-over'));
    node.setAttribute('data-e075-over', 'true');
    field.setAttribute('data-e075-focus', '1');
    field.setAttribute('data-v2e075-modalite', modalite);
    decrire(node, genre, texte, modalite);
  };

  field.addEventListener('pointerover', (event) => {
    if (event && event.pointerType === 'touch') return;
    const node = cibleDe(event);
    if (node) montrer(node, 'survol');
  });
  field.addEventListener('pointerout', (event) => {
    if (event && event.pointerType === 'touch') return;
    const node = cibleDe(event);
    if (!node) return;
    const suivant = event && event.relatedTarget;
    if (suivant && typeof node.contains === 'function' && node.contains(suivant)) return;
    cacher();
  });
  field.addEventListener('pointerdown', (event) => {
    const node = cibleDe(event);
    if (node && (!event || event.pointerType === 'touch')) montrer(node, 'tactile');
    else if (!node) cacher();
  });
  field.addEventListener('focusin', (event) => {
    const node = cibleDe(event);
    if (node) montrer(node, 'clavier');
  });
  field.addEventListener('focusout', (event) => {
    if (cibleDe(event)) cacher();
  });
});
