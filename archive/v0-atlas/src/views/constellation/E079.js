import { register } from './registry.js';

/* Lentille E079 — Robustesse et garde-fous appliqués au survol de la vue
   Constellation. Dix chantiers concrets et variés, tous locaux : délai de grâce
   anti-vibrations, garde de connectivité, empilement de l'étiquette, miroir
   clavier, restriction au pointeur fin, purge à la sortie du champ, couplage
   au mouvement réduit, survol non destructif, survol unique et nettoyage sur
   pointercancel/blur. Zéro réseau, zéro aléa, zéro journalisation, aucun
   minuteur ni rAF propre. Greffon tolérant : aucune exception ne s'échappe. */

/* Sélecteur unique des nœuds survolables (soleils, planètes, lunes). */
const E079_SELECTEUR = '.const-sun, .const-planet, .const-moon';

register('E079', (ctx) => {
  /* Garde d'entrée : sans layout valide ni document, aucun ajout DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function'
      || typeof document === 'undefined') return;

  try {
    const layout = ctx.layout;
    const champ = layout.querySelector('.constellation-field');
    if (!champ || typeof champ.querySelectorAll !== 'function') return;

    const noeuds = Array.from(champ.querySelectorAll(E079_SELECTEUR));
    const faire = typeof ctx.el === 'function'
      ? ctx.el
      : (tag, cls, txt) => {
          const n = document.createElement(tag);
          if (cls) n.className = cls;
          if (txt !== undefined) n.textContent = txt;
          return n;
        };

    /* E079-05 — Capacité de survol déterminée une fois, sans minuteur : un
       pointeur grossier (tactile) n'entre jamais dans l'état de survol. */
    let pointeurFin = false;
    try {
      pointeurFin = !!(window.matchMedia
        && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    } catch {
      pointeurFin = false;
    }
    champ.setAttribute('data-e079-pointer', pointeurFin ? 'fine' : 'coarse');

    /* E079-07 — Décision de mouvement issue du contexte, pas d'une boucle. */
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();

    /* Feuille unique de la lentille : chaque règle porte l'étiquette du
       chantier qu'elle matérialise. Un seul appel ctx.css, id réservé. */
    if (typeof ctx.css === 'function') {
      ctx.css('constellation-e079', `
        /* E079-armed : classe posée côté JS, source de toutes les règles. */
        .constellation-field.e079-armed { position: relative; }

        /* E079-01 — Délai de grâce : le liseré n'atteint son plein effet
           qu'après 120 ms de présence. Un survol fugace ne clignote pas,
           sans aucun minuteur JS. */
        .e079-armed .const-sun,
        .e079-armed .const-planet,
        .e079-armed .const-moon {
          transition: box-shadow .16s ease .12s, border-color .16s ease .12s;
        }

        /* E079-03 — Étiquette du nœud survolé portée devant les autres avec
           un fond opaque : elle ne se confond plus avec les traits ni avec
           l'étiquette d'un voisin. */
        .e079-armed .const-sun[data-e079-hover="1"]::after,
        .e079-armed .const-planet[data-e079-hover="1"]::after,
        .e079-armed .const-moon[data-e079-hover="1"]::after {
          position: absolute;
          z-index: 9;
          padding: 1px 3px;
          border: 1px solid var(--line);
          border-radius: 3px;
          background: var(--surface-2);
        }

        /* E079-04 — Miroir clavier : :focus-visible reçoit exactement le
           même liseré que :hover, aucun retour n'est réservé à la souris. */
        .e079-armed .const-sun:focus-visible,
        .e079-armed .const-planet:focus-visible,
        .e079-armed .const-moon:focus-visible {
          box-shadow: 0 0 0 4px rgba(230, 185, 111, .28);
          outline: 2px solid var(--gold-bright);
          outline-offset: 2px;
        }

        /* E079-05 — Le liseré de survol n'est stylé que sur pointeur fin. */
        @media (hover: hover) and (pointer: fine) {
          .e079-armed .const-sun[data-e079-hover="1"],
          .e079-armed .const-planet[data-e079-hover="1"],
          .e079-armed .const-moon[data-e079-hover="1"] {
            box-shadow: 0 0 0 4px rgba(230, 185, 111, .28);
          }
        }

        /* E079-07 — Mouvement réduit : aucune transition de survol, le
           retour reste instantané. */
        .e079-armed[data-e079-motion="reduced"] .const-sun,
        .e079-armed[data-e079-motion="reduced"] .const-planet,
        .e079-armed[data-e079-motion="reduced"] .const-moon {
          transition: none !important;
        }

        /* E079-08 — Pastille de l'état de survol : information textuelle,
           jamais portée par la seule couleur. */
        #e079-status {
          display: inline-flex; align-items: center;
          min-height: 20px; padding: 2px 8px;
          border: 1px solid var(--line); border-radius: 999px;
          color: var(--muted); font-size: 9px;
          font-variant-numeric: tabular-nums;
        }
        @media (prefers-reduced-motion: reduce) {
          .e079-armed .const-sun,
          .e079-armed .const-planet,
          .e079-armed .const-moon { transition: none !important; }
        }
      `);
    }

    /* E079-01 — Activation de la feuille : la classe portant le délai de
       grâce n'est posée qu'après les gardes d'entrée. */
    champ.classList.add('e079-armed');
    champ.setAttribute('data-e079-motion', reduit ? 'reduced' : 'full');

    /* E079-08 — Pastille de statut, ajoutée une seule fois à la légende du
       bas de vue. role=status la rend vocalisée sans être un piège de focus. */
    let statut = layout.querySelector('#e079-status');
    if (!statut) {
      statut = faire('span', 'e079-status', 'Survol : aucun');
      statut.id = 'e079-status';
      statut.setAttribute('role', 'status');
      statut.setAttribute('aria-live', 'polite');
      statut.setAttribute('aria-atomic', 'true');
      const ancre = layout.querySelector('.constellation-caption') || layout;
      ancre.insertBefore(statut, ancre.firstChild);
    }

    /* E079-02 — Garde de connectivité : un nœud détaché par un re-render du
       shell ne doit jamais recevoir d'attribut de survol. Le marquage est
       observable via data-e079-guard. */
    const estValide = (node) => !!(
      node && node.isConnected && champ.isConnected && champ.contains(node)
    );
    noeuds.forEach((node) => {
      node.setAttribute('data-e079-guard', estValide(node) ? 'connected' : 'detached');
    });

    /* E079-09 — Concurrence de survol : on efface d'abord tous les marqueurs
       puis on n'en pose qu'un seul. L'état est déterministe, jamais cumulatif. */
    const effacerSurvol = () => {
      noeuds.forEach((n) => {
        if (n.isConnected) n.removeAttribute('data-e079-hover');
      });
      if (champ.isConnected) champ.removeAttribute('data-e079-active');
      if (statut && statut.isConnected) statut.textContent = 'Survol : aucun';
    };

    const marquerSurvol = (node) => {
      if (!estValide(node) || !pointeurFin) return;
      noeuds.forEach((n) => {
        if (n.isConnected) n.removeAttribute('data-e079-hover');
      });
      node.setAttribute('data-e079-hover', '1');
      champ.setAttribute('data-e079-active', '1');
      if (statut && statut.isConnected) {
        const nom = node.dataset.label
          || node.getAttribute('aria-label')
          || 'nœud';
        statut.textContent = `Survol : ${nom}`;
      }
    };

    /* E079-08 — Survol non destructif : les écouteurs n'écrivent que des
       attributs de présentation et ne déclenchent aucune sélection. Le rôle
       posé sur les nœuds documente cette frontière. */
    noeuds.forEach((node) => {
      if (!estValide(node)) return;
      node.setAttribute('data-e079-role', 'presentation');
      node.addEventListener('pointerenter', () => marquerSurvol(node));
    });

    /* E079-06 — Purge à la sortie du champ : aucun survol ne reste « collé »
       quand le pointeur quitte la constellation. */
    champ.addEventListener('pointerleave', effacerSurvol);

    /* E079-10 — Sortie sûre : pointercancel (capture perdue) et blur de la
       fenêtre libèrent l'état, avec les mêmes gardes de connectivité. */
    champ.addEventListener('pointercancel', effacerSurvol);
    const fenetre = layout.ownerDocument && layout.ownerDocument.defaultView;
    if (fenetre && typeof fenetre.addEventListener === 'function') {
      fenetre.addEventListener('blur', effacerSurvol);
    }
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
