import { register } from './registry.js';

/* V2 — lentille E004, vue Récit, thème : navigation clavier (passe 2).
   Dix chantiers NEUFS, distincts de la passe 1 : focus des filtres, navigation
   dans les groupes, plan clavier, ancre de lecture, voisinage du point courant,
   repère visuel, explication des bornes, description de la recherche,
   réinitialisation clavier et récitation du point. Aucun chantier ne dispute
   une touche au routeur global : seules des touches qu'il ignore sont
   employées (Home/End/PageUp/PageDown hors du fil). Aucun réseau, aucun aléa, aucun
   écouteur global ; chaque chantier est isolé par sansRisque(). */

register('E004', (ctx) => {
  try {
    const { stage, layout, css, el, reducedMotion } = ctx;
    if (!stage || !layout || typeof css !== 'function' || typeof el !== 'function') return;
    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    /* Feuille unique, identifiant unique, toutes les classes ajoutées préfixées. */
    css('recit-v2-e004', `
.recit-v2-e004-status{min-height:13px;margin:8px 0 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-v2-e004-plan{margin:8px 0 12px;padding:8px 0 0;border-top:1px solid var(--line)}
.recit-v2-e004-plan-liste{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}
.recit-v2-e004-plan-item{margin:0}
.recit-v2-e004-bouton,.recit-v2-e004-plan-bouton{min-height:36px;padding:5px 10px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--gold-bright);font-size:9px;cursor:pointer}
.recit-v2-e004-bouton:hover,.recit-v2-e004-plan-bouton:hover{border-color:var(--gold);color:var(--ink)}
.recit-v2-e004-bouton[disabled]{opacity:.4;cursor:not-allowed}
.recit-v2-e004-voisinage{min-height:13px;margin:6px 0 0;color:var(--muted);font-size:9px;line-height:1.5}
.recit-v2-e004-courant{border-left:3px solid var(--gold-bright)!important;padding-left:6px!important}
.recit-v2-e004-focus:focus-visible{outline:2px dashed var(--gold-bright,#f3cf8b);outline-offset:2px;border-radius:6px}
@media (max-width:620px){
  .recit-v2-e004-bouton,.recit-v2-e004-plan-bouton{min-height:40px}
}
`);

    const sansRisque = (fonction) => {
      try { fonction(); } catch { /* silencieux : jamais de casse du rendu */ }
    };
    const cree = (tag, classe, texte, id) => {
      const noeud = el(tag, classe, texte);
      if (id) noeud.id = id;
      return noeud;
    };
    const apres = (reference, noeud) => {
      if (reference && reference.parentNode) reference.parentNode.insertBefore(noeud, reference.nextSibling);
    };
    const marque = (noeud) => {
      if (noeud && noeud.classList && typeof noeud.classList.add === 'function') {
        noeud.classList.add('recit-v2-e004-focus');
      }
    };
    const boutonAjoute = (classe, texte, id) => {
      const bouton = cree('button', `recit-v2-e004-bouton ${classe}`, texte, id);
      bouton.type = 'button';
      marque(bouton);
      return bouton;
    };
    const reduced = () => (typeof reducedMotion === 'function' ? reducedMotion() : false);
    const ameneFocus = (noeud) => {
      if (!noeud || typeof noeud.focus !== 'function') return;
      try { noeud.focus({ preventScroll: true }); } catch { noeud.focus(); }
      if (typeof noeud.scrollIntoView === 'function') {
        try {
          noeud.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
        } catch { /* défilement facultatif */ }
      }
    };
    const itemsFil = () => Array.from(corps.querySelectorAll('.recit-thread-item'));
    const groupes = () => Array.from(corps.querySelectorAll('.c3a-group'));
    const filtresDu = (groupe) => (groupe ? Array.from(groupe.querySelectorAll('.c3a-filter')) : []);
    const court = (texte, max) => {
      const valeur = String(texte || '').replace(/\s+/g, ' ').trim();
      return valeur.length > max ? `${valeur.slice(0, max - 1).trimEnd()}…` : valeur;
    };
    const existe = (id) => Boolean(document.getElementById(id));

    /* E004-01 — Compagnon de focus des filtres : groupe, libellé et état réels. */
    sansRisque(() => {
      if (existe('v2-e004-filtre-status')) return;
      const outils = corps.querySelector('#c3a-tools');
      const statut = cree('p', 'recit-v2-e004-status', '', 'v2-e004-filtre-status');
      apres(corps.querySelector('#c3a-status') || outils || corps.firstChild, statut);
      if (!corps.dataset.v2E004FocusFiltre) {
        corps.dataset.v2E004FocusFiltre = '1';
        corps.addEventListener('focusin', (evenement) => {
          const cible = evenement.target;
          if (!(cible instanceof Element) || !cible.classList.contains('c3a-filter')) return;
          const groupe = cible.closest('.c3a-group');
          const nomGroupe = groupe
            ? (groupe.getAttribute('aria-label') || court(groupe.querySelector('.c3a-group-label')?.textContent, 40) || 'Filtres')
            : 'Filtres';
          const total = filtresDu(groupe).length;
          const presse = cible.getAttribute('aria-pressed') === 'true' ? 'actif' : 'inactif';
          statut.textContent = `Filtre « ${court(cible.textContent, 48)} » · groupe ${nomGroupe} (${total} choix) · ${presse}.`;
        });
        corps.addEventListener('focusout', (evenement) => {
          const reste = evenement.relatedTarget instanceof Element
            && corps.contains(evenement.relatedTarget)
            && evenement.relatedTarget.classList.contains('c3a-filter');
          if (!reste) statut.textContent = '';
        });
      }
    });

    /* E004-02 — Navigation dans les groupes de filtres par touches non revendiquées. */
    sansRisque(() => {
      const touches = ['Home', 'End', 'PageUp', 'PageDown'];
      groupes().forEach((groupe) => {
        filtresDu(groupe).forEach((bouton) => {
          if (bouton.dataset.v2E004Nav) return;
          bouton.dataset.v2E004Nav = '1';
          marque(bouton);
          bouton.addEventListener('keydown', (evenement) => {
            if (!touches.includes(evenement.key)) return;
            const liste = filtresDu(bouton.closest('.c3a-group'));
            if (!liste.length) return;
            evenement.preventDefault();
            evenement.stopPropagation();
            const pos = liste.indexOf(bouton);
            const dernier = liste.length - 1;
            let cible;
            if (evenement.key === 'Home') cible = liste[0];
            else if (evenement.key === 'End') cible = liste[dernier];
            else if (evenement.key === 'PageDown') cible = liste[Math.min(dernier, Math.max(0, pos + 1))];
            else cible = liste[Math.max(0, Math.min(dernier, pos - 1))];
            liste.forEach((n) => { n.tabIndex = n === cible ? 0 : -1; });
            ameneFocus(cible);
          });
        });
      });
    });

    /* E004-03 — Plan clavier : zones atteignables et décomptes lus dans le DOM. */
    sansRisque(() => {
      if (existe('v2-e004-plan')) return;
      const recherche = corps.querySelector('#c3a-search');
      const statut = corps.querySelector('#c3a-status');
      const trace = corps.querySelector('.recit-trace summary');
      const actions = Array.from(corps.querySelectorAll('.recit-actions button:not([disabled])'));
      const nbFiltres = groupes().reduce((somme, g) => somme + filtresDu(g).length, 0);
      const nbPoints = itemsFil().length;
      const zones = [
        { label: 'Recherche', detail: '1 champ', cible: recherche },
        { label: 'Filtres', detail: `${nbFiltres} bouton(s)`, cible: filtresDu(groupes()[0])[0] },
        { label: 'Fil du repère', detail: `${nbPoints} point(s)`, cible: itemsFil()[0] },
        { label: 'Traçabilité', detail: trace ? '1 résumé' : 'absente', cible: trace },
        { label: 'Commandes', detail: `${actions.length} active(s)`, cible: actions[0] },
      ];
      const plan = cree('nav', 'recit-v2-e004-plan', undefined, 'v2-e004-plan');
      plan.setAttribute('aria-label', 'Plan de navigation clavier de la vue');
      const liste = cree('ol', 'recit-v2-e004-plan-liste');
      zones.forEach((zone) => {
        const item = cree('li', 'recit-v2-e004-plan-item');
        const bouton = boutonAjoute('recit-v2-e004-plan-bouton', `${zone.label} · ${zone.detail}`);
        bouton.addEventListener('click', () => ameneFocus(zone.cible));
        bouton.disabled = !zone.cible;
        item.appendChild(bouton);
        liste.appendChild(item);
      });
      plan.appendChild(liste);
      apres(statut || recherche || corps.firstChild, plan);
    });

    /* E004-04 — Ancre de retour au titre du point après une navigation dans le fil. */
    sansRisque(() => {
      if (existe('v2-e004-ancre')) return;
      const titre = document.getElementById('recit-point-title');
      const ancre = boutonAjoute('', 'Revenir au titre du point', 'v2-e004-ancre');
      ancre.disabled = !titre;
      ancre.addEventListener('click', () => ameneFocus(titre));
      const actions = corps.querySelector('.recit-actions');
      apres(actions || corps.querySelector('.recit-thread') || corps.firstChild, ancre);
    });

    /* E004-05 — Voisinage du point courant, dérivé de data-fk et du fil rendu. */
    sansRisque(() => {
      if (existe('v2-e004-voisinage')) return;
      const info = cree('p', 'recit-v2-e004-voisinage', '', 'v2-e004-voisinage');
      apres(corps.querySelector('.recit-thread') || corps.firstChild, info);
      const items = itemsFil();
      const pos = items.findIndex((item) => item.classList.contains('is-current'));
      if (pos < 0) {
        info.textContent = `${items.length} point(s) affiché(s) · aucun point courant dans le fil filtré.`;
      } else {
        const match = /^c3a-point-(\d+)$/.exec(items[pos].dataset.fk || '');
        const numero = match ? Number(match[1]) + 1 : pos + 1;
        const avant = pos > 0 ? court(items[pos - 1].textContent, 46) : '—';
        const apresPoint = pos < items.length - 1 ? court(items[pos + 1].textContent, 46) : '—';
        info.textContent = `Point courant ${numero} sur ${items.length} · précédent : ${avant} · suivant : ${apresPoint}.`;
      }
    });

    /* E004-06 — Repère visuel du point courant au clavier (classe préfixée dédiée). */
    sansRisque(() => {
      itemsFil().forEach((item) => {
        if (item.classList.contains('is-current')) item.classList.add('recit-v2-e004-courant');
      });
      const cibles = Array.from(corps.querySelectorAll(
        '.recit-actions button, .recit-thread-item, .recit-trace summary, .c3a-filter, #c3a-search'
      ));
      cibles.forEach(marque);
    });

    /* E004-07 — Explication textuelle des commandes désactivées aux extrémités. */
    sansRisque(() => {
      if (existe('v2-e004-bornes')) return;
      const precedent = corps.querySelector('.recit-actions button[data-fk="c3a-prev"]');
      const suivant = corps.querySelector('.recit-actions button[data-fk="c3a-next"]');
      const parties = [];
      if (precedent && precedent.disabled) parties.push('début du fil : point précédent indisponible');
      if (suivant && suivant.disabled) parties.push('fin du fil : point suivant indisponible');
      const texte = parties.length
        ? `${parties.join(' · ')}.`
        : 'Navigation entre les points disponible dans les deux sens.';
      const bornes = cree('p', 'recit-v2-e004-status', texte, 'v2-e004-bornes');
      apres(corps.querySelector('.recit-actions') || corps.firstChild, bornes);
    });

    /* E004-08 — Description du filtrage associée à la recherche (sans écraser). */
    sansRisque(() => {
      const recherche = corps.querySelector('#c3a-search');
      if (!recherche || existe('v2-e004-search-help')) return;
      const total = itemsFil().length;
      const aide = cree('p', 'recit-v2-e004-status',
        `La recherche filtre le fil du repère ; le résultat est annoncé dans le statut. ${total} point(s) dans ce repère.`,
        'v2-e004-search-help');
      apres(corps.querySelector('#c3a-status') || recherche, aide);
      const deja = String(recherche.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (!deja.includes('v2-e004-search-help')) {
        deja.push('v2-e004-search-help');
        recherche.setAttribute('aria-describedby', deja.join(' '));
      }
    });

    /* E004-09 — Réinitialisation clavier des filtres, pilotée par l'état DOM réel. */
    sansRisque(() => {
      if (existe('v2-e004-reset')) return;
      const outils = corps.querySelector('#c3a-tools');
      const recherche = corps.querySelector('#c3a-search');
      if (!outils) return;
      const bouton = boutonAjoute('', 'Réinitialiser les filtres', 'v2-e004-reset');
      const boutonsTous = groupes().map((g) => filtresDu(g)[0]).filter(Boolean);
      const actifs = () => {
        const rechercheActive = Boolean(recherche && recherche.value);
        const filtresActifs = groupes().some((g) => {
          const liste = filtresDu(g);
          return liste.length > 1 && liste[0].getAttribute('aria-pressed') !== 'true';
        });
        return rechercheActive || filtresActifs;
      };
      bouton.disabled = !actifs();
      bouton.addEventListener('click', () => {
        if (recherche && recherche.value) {
          recherche.value = '';
          recherche.dispatchEvent(new Event('input', { bubbles: true }));
        }
        boutonsTous.forEach((tous) => {
          if (tous.getAttribute('aria-pressed') !== 'true') tous.click();
        });
        bouton.disabled = true;
      });
      outils.appendChild(bouton);
    });

    /* E004-10 — Récitation du point courant vers la région live existante. */
    sansRisque(() => {
      if (existe('v2-e004-relire')) return;
      const titre = document.getElementById('recit-point-title');
      const conf = corps.querySelector('.recit-conf');
      const kicker = corps.querySelector('.view-kicker');
      const relire = boutonAjoute('', 'Réécouter le point courant', 'v2-e004-relire');
      relire.disabled = !titre;
      const sortie = cree('p', 'recit-v2-e004-status', '', 'v2-e004-relire-status');
      sortie.setAttribute('role', 'status');
      sortie.setAttribute('aria-live', 'polite');
      relire.addEventListener('click', () => {
        const message = [kicker?.textContent, titre?.textContent, conf?.textContent]
          .map((partie) => court(partie, 140)).filter(Boolean).join(' · ');
        sortie.textContent = message;
        const live = document.getElementById('atlas-recit-live');
        if (live) live.textContent = message;
      });
      const ancre = document.getElementById('v2-e004-ancre') || corps.querySelector('.recit-actions');
      apres(ancre, relire);
      apres(relire, sortie);
    });
  } catch { /* silencieux : la vue reste lisible sans cette lentille */ }
});
