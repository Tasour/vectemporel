import { register } from './registry.js';

/* Lentille E080 — Mouvement et transitions appliqués au survol de la vue
   Constellation. Dix chantiers concrets et variés, tous locaux : montée en
   échelle, halo progressif, révélation animée de l'étiquette, pulsation du
   soleil, courbe d'accélération unifiée, durées graduées par type, miroir
   clavier, respect du mouvement réduit, mise en retrait des arêtes et retour
   réversible avec pastille textuelle. Aucun chantier n'appelle de setter du
   store : le survol reste un aperçu, le clic seul sélectionne.

   Contrat : register('E080', ctx => {...}) ; ctx = { viewId, stage, layout,
   css(id, rules), el(tag, cls, text), reducedMotion() } (registry.js). Une
   seule feuille ctx.css('constellation-e080', ...), ids DOM préfixés 'e080-'.
   Zéro réseau, zéro source aléatoire, zéro écriture dans la console, aucun
   minuteur ni boucle d'animation propre, aucune ressource distante. Greffon
   tolérant : chaque chantier est enveloppé, aucune exception ne sort. */

/* Sélecteur unique des nœuds survolables (soleils, planètes, lunes). */
const E080_NOEUDS = '.const-sun, .const-planet, .const-moon';

/* Exécution défensive : un chantier défaillant ne neutralise pas les autres. */
function safe(fn) {
  try { fn(); } catch (error) { /* silence voulu : aucune écriture dans la console */ }
}

register('E080', (ctx) => {
  /* Garde d'entrée : sans layout valide ni document, aucun ajout DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function'
      || typeof document === 'undefined') return;

  safe(() => {
    const layout = ctx.layout;
    const champ = layout.querySelector('.constellation-field');
    if (!champ || typeof champ.querySelectorAll !== 'function') return;

    const noeuds = Array.from(champ.querySelectorAll(E080_NOEUDS));
    if (!noeuds.length) return;

    /* Fabrique DOM du contexte, avec repli local et tolérant. */
    const faire = typeof ctx.el === 'function'
      ? ctx.el
      : (tag, cls, txt) => {
          const n = document.createElement(tag);
          if (cls) n.className = cls;
          if (txt !== undefined) n.textContent = txt;
          return n;
        };

    /* E080-08 — Décision de mouvement lue une seule fois depuis le contexte,
       jamais par une boucle d'animation ni une sonde répétée. */
    const reduit = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();

    /* Capacité de survol fin : un pointeur grossier n'entre jamais dans un
       état d'animation « collant » après un tap (garde de fond). */
    let pointeurFin = false;
    try {
      pointeurFin = !!(window.matchMedia
        && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    } catch {
      pointeurFin = false;
    }

    /* E080-05 / E080-06 — Feuille unique de la lentille. Chaque règle porte
       l'étiquette du chantier qu'elle matérialise. Un seul appel ctx.css, id
       réservé, aucune ressource distante. */
    if (typeof ctx.css === 'function') {
      ctx.css('constellation-e080', `
        /* E080-05 — Courbe d'accélération unifiée et durées de référence. */
        .constellation-field.e080-motion {
          --e080-ease: cubic-bezier(.2, .8, .2, 1);
          --e080-dur-sun: 220ms;
          --e080-dur-planet: 180ms;
          --e080-dur-moon: 140ms;
          position: relative;
        }
        /* E080-06 — Durée graduée par type : le soleil, plus massif, répond
           le plus lentement, la lune le plus vite. */
        .e080-motion .const-sun { --e080-dur: var(--e080-dur-sun); }
        .e080-motion .const-planet { --e080-dur: var(--e080-dur-planet); }
        .e080-motion .const-moon { --e080-dur: var(--e080-dur-moon); }

        /* E080-01 — Montée en échelle au survol. La translation d'origine
           (-50%, -50%) est conservée : le nœud grandit sur place, sans
           déplacer la géométrie ni les arêtes SVG. */
        .e080-motion .const-sun,
        .e080-motion .const-planet,
        .e080-motion .const-moon {
          transform: translate(-50%, -50%);
          transition: transform var(--e080-dur, 180ms) var(--e080-ease, ease),
                      box-shadow var(--e080-dur, 180ms) var(--e080-ease, ease),
                      filter var(--e080-dur, 180ms) var(--e080-ease, ease);
          will-change: transform;
        }
        .e080-motion .const-sun:hover,
        .e080-motion .const-planet:hover,
        .e080-motion .const-moon:hover {
          transform: translate(-50%, -50%) scale(1.16);
        }

        /* E080-02 — Halo lumineux progressif : l'intensité du liseré et du
           diffuse monte avec la même courbe que l'échelle. Aucune information
           n'est portée par la seule couleur (voir E080-10). */
        .e080-motion .const-sun:hover {
          box-shadow: 0 0 0 3px rgba(230, 185, 111, .22), 0 0 18px rgba(230, 185, 111, .45);
          filter: brightness(1.12);
        }
        .e080-motion .const-planet:hover {
          box-shadow: 0 0 0 3px rgba(230, 185, 111, .18), 0 0 14px rgba(230, 185, 111, .35);
        }
        .e080-motion .const-moon:hover {
          box-shadow: 0 0 0 3px rgba(178, 139, 221, .25), 0 0 12px rgba(178, 139, 221, .5);
        }

        /* E080-03 — Révélation animée de l'étiquette. Celle de la lune
           apparaît en fondu avec une légère montée ; celles du soleil et de la
           planète passent en doré. La translation d'origine est préservée. */
        .e080-motion .const-sun::after,
        .e080-motion .const-planet::after,
        .e080-motion .const-moon::after {
          transition: opacity var(--e080-dur, 180ms) var(--e080-ease, ease),
                      color var(--e080-dur, 180ms) var(--e080-ease, ease),
                      transform var(--e080-dur, 180ms) var(--e080-ease, ease);
        }
        .e080-motion .const-sun:hover::after,
        .e080-motion .const-planet:hover::after { color: var(--gold-bright); }
        .e080-motion .const-moon:hover::after {
          opacity: 1;
          transform: translateX(-50%) translateY(-2px);
        }

        /* E080-04 — Pulsation du soleil survolé : keyframes CSS déterministes
           (aucun hasard, aucune boucle JS). L'anneau reste masqué au repos. */
        @keyframes e080-pulse {
          0%   { transform: scale(.92); opacity: .55; }
          50%  { transform: scale(1.18); opacity: .12; }
          100% { transform: scale(.92); opacity: .55; }
        }
        .e080-motion .const-sun::before {
          content: '';
          position: absolute; inset: -5px;
          border: 1px solid var(--gold-bright, #e7b96a);
          border-radius: 50%;
          opacity: 0;
          pointer-events: none;
        }
        .e080-motion[data-e080-motion="full"] .const-sun:hover::before {
          animation: e080-pulse 1.5s ease-in-out infinite;
        }

        /* E080-07 — Miroir clavier : :focus-visible reçoit exactement la
           même échelle, le même halo et la même révélation que :hover. */
        .e080-motion .const-sun:focus-visible,
        .e080-motion .const-planet:focus-visible,
        .e080-motion .const-moon:focus-visible {
          transform: translate(-50%, -50%) scale(1.16);
          outline: 2px solid var(--gold-bright, #e7b96a);
          outline-offset: 2px;
        }
        .e080-motion .const-sun:focus-visible {
          box-shadow: 0 0 0 3px rgba(230, 185, 111, .22), 0 0 18px rgba(230, 185, 111, .45);
        }
        .e080-motion .const-planet:focus-visible {
          box-shadow: 0 0 0 3px rgba(230, 185, 111, .18), 0 0 14px rgba(230, 185, 111, .35);
        }
        .e080-motion .const-moon:focus-visible {
          box-shadow: 0 0 0 3px rgba(178, 139, 221, .25), 0 0 12px rgba(178, 139, 221, .5);
        }
        .e080-motion .const-moon:focus-visible::after {
          opacity: 1;
          transform: translateX(-50%) translateY(-2px);
        }
        .e080-motion[data-e080-motion="full"] .const-sun:focus-visible::before {
          animation: e080-pulse 1.5s ease-in-out infinite;
        }

        /* E080-09 — Mise en retrait animée des arêtes qui ne font pas partie
           du chemin actif : le survol met le chemin en avant par une simple
           transition d'opacité, sans toucher à la géométrie SVG. */
        .e080-motion .constellation-edges line {
          transition: opacity var(--e080-dur-planet, 180ms) var(--e080-ease, ease);
        }
        .e080-motion[data-e080-path="1"] .constellation-edges line:not(.is-path) {
          opacity: .3;
        }

        /* E080-08 — Mouvement réduit : aucune transition, aucune pulsation.
           Le retour est instantané et la media-query fait foi même si le
           contexte n'a pas pu renseigner la préférence. */
        .e080-motion[data-e080-motion="reduced"] .const-sun,
        .e080-motion[data-e080-motion="reduced"] .const-planet,
        .e080-motion[data-e080-motion="reduced"] .const-moon,
        .e080-motion[data-e080-motion="reduced"] .constellation-edges line {
          transition: none !important;
          animation: none !important;
        }
        .e080-motion[data-e080-motion="reduced"] .const-sun::before { animation: none !important; }
        @media (prefers-reduced-motion: reduce) {
          .e080-motion .const-sun,
          .e080-motion .const-planet,
          .e080-motion .const-moon,
          .e080-motion .constellation-edges line { transition: none !important; animation: none !important; }
          .e080-motion .const-sun::before { animation: none !important; }
        }

        /* E080-10 — Pastille de statut textuelle : l'état du mouvement est
           vocalisé et visible, jamais porté par la seule couleur. */
        .constellation-layout #e080-status {
          display: inline-flex; align-items: center;
          min-height: 20px; padding: 2px 8px;
          border: 1px solid var(--line, #2a2836); border-radius: 999px;
          color: var(--muted-2, #9a94ad); font-size: 9px;
          font-variant-numeric: tabular-nums;
        }
      `);
    }

    /* E080-05 / E080-06 — Armement : la classe n'est posée qu'après les
       gardes d'entrée et l'injection de la feuille unique. */
    champ.classList.add('e080-motion');
    champ.setAttribute('data-e080-motion', reduit ? 'reduced' : 'full');
    champ.setAttribute('data-e080-pointer', pointeurFin ? 'fine' : 'coarse');

    /* E080-10 — Création unique de la pastille de statut. role=status la
       rend vocalisée sans devenir un piège de focus. */
    const reposTexte = reduit
      ? 'Mouvement réduit : transitions désactivées'
      : 'Mouvement : au repos';
    let statut = layout.querySelector('#e080-status');
    if (!statut) {
      statut = faire('span', 'e080-status', reposTexte);
      statut.id = 'e080-status';
      statut.setAttribute('role', 'status');
      statut.setAttribute('aria-live', 'polite');
      statut.setAttribute('aria-atomic', 'true');
      const ancre = layout.querySelector('.constellation-caption') || layout;
      ancre.insertBefore(statut, ancre.firstChild);
    }

    /* Validité d'un nœud : présent, connecté et toujours dans le champ. */
    const valide = (node) => !!(
      node && node.nodeType === 1 && node.isConnected
      && champ.isConnected && champ.contains(node)
    );

    const libelle = (node) => {
      const cle = node.getAttribute('data-const-key') || '';
      return node.getAttribute('data-label') || cle || 'un nœud';
    };

    const ecrireStatut = (texte) => {
      if (statut && statut.isConnected) statut.textContent = texte;
    };

    /* E080-01..04 — Entrée : on pose les marqueurs de programme (le rendu
       visuel est, lui, assuré par :hover/:focus-visible en CSS). Le survol
       n'écrit aucun état applicatif : ni selectEra, ni selectEvent, ni set. */
    const survoler = (event) => {
      safe(() => {
        const cible = event && event.target && event.target.closest
          ? event.target.closest(E080_NOEUDS) : null;
        if (!valide(cible) || !pointeurFin) return;
        champ.setAttribute('data-e080-hover', cible.getAttribute('data-const-key') || '1');
        champ.setAttribute('data-e080-path', '1');
        ecrireStatut(reduit
          ? `Mouvement réduit : ${libelle(cible)}`
          : `Mouvement : survol de ${libelle(cible)}`);
      });
    };

    /* E080-09 / E080-10 — Sortie : retirer les marqueurs laisse les
       transitions CSS rejouer vers l'état de base (retour réversible). */
    const quitter = (event) => {
      safe(() => {
        const suivant = event && event.relatedTarget && event.relatedTarget.closest
          ? event.relatedTarget.closest(E080_NOEUDS) : null;
        if (valide(suivant) && pointeurFin) {
          champ.setAttribute('data-e080-hover', suivant.getAttribute('data-const-key') || '1');
          champ.setAttribute('data-e080-path', '1');
          ecrireStatut(reduit
            ? `Mouvement réduit : ${libelle(suivant)}`
            : `Mouvement : survol de ${libelle(suivant)}`);
          return;
        }
        champ.removeAttribute('data-e080-hover');
        champ.removeAttribute('data-e080-path');
        ecrireStatut(reposTexte);
      });
    };

    /* E080-10 — Délégation sur le champ : une seule paire d'écouteurs pour
       tous les nœuds, même ceux ajoutés par un rendu ultérieur. */
    if (typeof champ.addEventListener === 'function') {
      champ.addEventListener('pointerover', survoler);
      champ.addEventListener('pointerout', quitter);
      champ.addEventListener('pointerleave', quitter);
      champ.addEventListener('pointercancel', quitter);
    }
    const win = layout.ownerDocument && layout.ownerDocument.defaultView;
    if (win && typeof win.addEventListener === 'function') {
      win.addEventListener('blur', quitter);
    }
  });
});
