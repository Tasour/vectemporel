import { register } from './registry.js';

/* Lentille E004 — vue Récit, thème : navigation clavier.
   Dix chantiers indépendants, greffés sans détruire le rendu de recit.js.
   Aucun écouteur global, aucune journalisation, aucun réseau, aucun aléa.
   Chaque chantier est isolé : une défaillance locale n'empêche pas les autres. */

const LIBELLES_CERTITUDE = Object.freeze({
  'vérifié': 'Vérifié',
  'certain': 'Certain',
  'probable': 'Probable',
  'disputed': 'Contesté',
});

/* Dernier contrôle réellement focalisé dans la vue, conservé entre deux rendus
   complets du DOM opérés par la coque. */
let derniereCleFocus = null;

function sansRisque(fonction) {
  try { fonction(); } catch { /* silencieux : jamais de casse du rendu */ }
}

register('E004', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (!stage || !layout || typeof css !== 'function' || typeof el !== 'function') return;
  const corps = layout.querySelector('.recit-body');
  if (!corps) return;

  /* Feuille unique, identifiant unique, toutes les classes préfixées. */
  css('recit-e004', `
.recit-e004-skip{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
.recit-e004-skip-bouton{min-height:30px;padding:4px 9px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--muted);font-size:9px;cursor:pointer}
.recit-e004-skip-bouton:hover{border-color:var(--gold);color:var(--ink)}
.recit-e004-help{margin:16px 0 0;padding:8px 0 0;border-top:1px solid var(--line);color:var(--muted);font-size:9px}
.recit-e004-help-summary{min-height:30px;display:flex;align-items:center;cursor:pointer;color:var(--gold-bright)}
.recit-e004-help-intro{margin:6px 0;line-height:1.5}
.recit-e004-help-list{margin:6px 0 0;padding-left:18px;line-height:1.6}
.recit-e004-help-item{margin:2px 0}
.recit-e004-focus{min-height:12px;margin:6px 0 0;color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums}
.recit-e004-goto{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0 0;color:var(--muted);font-size:9px}
.recit-e004-goto-label{display:inline-flex;align-items:center;gap:6px}
.recit-e004-goto-input{width:5.5em;min-height:30px;padding:3px 6px;border:1px solid var(--line);border-radius:6px;background:rgba(255,255,255,.03);color:var(--ink);font:inherit;font-size:11px}
.recit-e004-goto-button{min-height:30px;padding:3px 9px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--gold-bright);font-size:9px;cursor:pointer}
.recit-e004-goto-status{flex:1 1 100%;min-height:11px;margin:0}
.recit-e004-actions-help{margin:8px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5}
.recit-e004-focusable:focus-visible{outline:3px solid var(--gold-bright,#f3cf8b);outline-offset:2px;border-radius:6px}
@media (max-width:620px){
  .recit-e004-skip-bouton,.recit-e004-goto-input,.recit-e004-goto-button{min-height:36px}
}
`);

  const cree = (tag, classe, texte, id) => {
    const n = el(tag, classe, texte);
    if (id) n.id = id;
    return n;
  };
  const apres = (reference, node) => {
    if (reference && reference.parentNode) reference.parentNode.insertBefore(node, reference.nextSibling);
  };
  const marque = (node) => {
    if (node && node.classList && typeof node.classList.add === 'function') {
      node.classList.add('recit-e004-focusable');
    }
  };
  const itemsFil = () => Array.from(corps.querySelectorAll('.recit-thread-item'));
  const certitude = (valeur) => LIBELLES_CERTITUDE[valeur] || valeur || '—';
  const ameneFocus = (node) => {
    if (!node || typeof node.focus !== 'function') return;
    try { node.focus({ preventScroll: true }); } catch { node.focus(); }
    if (typeof node.scrollIntoView === 'function') {
      try {
        node.scrollIntoView({
          block: 'nearest',
          behavior: reducedMotion() ? 'auto' : 'smooth',
        });
      } catch { /* défilement facultatif */ }
    }
  };

  /* E004-01 — Aide mémoire des raccourcis, construite depuis le DOM rendu. */
  sansRisque(() => {
    if (document.getElementById('e004-help')) return;
    const panneau = cree('details', 'recit-e004-help', undefined, 'e004-help');
    const resume = cree('summary', 'recit-e004-help-summary', 'Raccourcis clavier');
    panneau.appendChild(resume);
    panneau.appendChild(cree('p', 'recit-e004-help-intro',
      'Touches relevées sur les commandes affichées et dans la légende de cette vue.'));
    const liste = cree('ul', 'recit-e004-help-list', undefined, 'e004-help-list');
    const vu = new Set();
    const ajoute = (touche, action) => {
      const cle = `${touche}|${action}`;
      if (vu.has(cle)) return;
      vu.add(cle);
      liste.appendChild(cree('li', 'recit-e004-help-item', `${action} : ${touche}`));
    };
    const commandes = Array.from(corps.querySelectorAll('[aria-keyshortcuts]'));
    commandes.forEach((commande) => {
      const touches = commande.getAttribute('aria-keyshortcuts') || '';
      const action = String(commande.textContent || '').trim().replace(/\s+/g, ' ') || 'Commande';
      touches.split(/\s+/).filter(Boolean).forEach((touche) => ajoute(touche, action));
    });
    ajoute('Page précédente / Page suivante', 'Parcourir le fil par pages de cinq points');
    ajoute('?', 'Ouvrir l’aide clavier générale');
    ajoute('Échap', 'Fermer une fenêtre ou revenir au monde');
    panneau.appendChild(liste);
    marque(resume);
    corps.appendChild(panneau);
  });

  /* E004-02 — Évitement : saut direct au point courant du fil. */
  sansRisque(() => {
    if (document.getElementById('e004-skip-thread')) return;
    let barre = document.getElementById('e004-skip');
    if (!barre) {
      barre = cree('div', 'recit-e004-skip', undefined, 'e004-skip');
      corps.insertBefore(barre, corps.firstChild);
    }
    const bouton = cree('button', 'recit-e004-skip-bouton', 'Aller au fil du repère', 'e004-skip-thread');
    bouton.type = 'button';
    bouton.addEventListener('click', () => {
      const items = itemsFil();
      if (!items.length) return;
      const cible = items.find((item) => item.classList.contains('is-current')) || items[0];
      items.forEach((item) => { item.tabIndex = item === cible ? 0 : -1; });
      ameneFocus(cible);
    });
    marque(bouton);
    barre.appendChild(bouton);
  });

  /* E004-03 — Évitement : saut direct aux commandes du récit. */
  sansRisque(() => {
    if (document.getElementById('e004-skip-actions')) return;
    let barre = document.getElementById('e004-skip');
    if (!barre) {
      barre = cree('div', 'recit-e004-skip', undefined, 'e004-skip');
      corps.insertBefore(barre, corps.firstChild);
    }
    const bouton = cree('button', 'recit-e004-skip-bouton', 'Aller aux commandes', 'e004-skip-actions');
    bouton.type = 'button';
    bouton.addEventListener('click', () => {
      const cible = Array.from(corps.querySelectorAll('.recit-actions button')).find((b) => !b.disabled);
      if (cible) ameneFocus(cible);
    });
    marque(bouton);
    barre.appendChild(bouton);
  });

  /* E004-04 — Compagnon visuel du point focalisé dans le fil. */
  sansRisque(() => {
    const fil = corps.querySelector('.recit-thread');
    if (!fil || document.getElementById('e004-focus')) return;
    const info = cree('p', 'recit-e004-focus', '', 'e004-focus');
    apres(fil, info);
    if (fil.dataset.e004FocusLie) return;
    fil.dataset.e004FocusLie = '1';
    fil.addEventListener('focusin', (evenement) => {
      const cible = evenement.target instanceof Element ? evenement.target.closest('.recit-thread-item') : null;
      if (!cible) return;
      const match = /^c3a-point-(\d+)$/.exec(cible.dataset.fk || '');
      const numero = match ? Number(match[1]) + 1 : null;
      const total = itemsFil().length;
      info.textContent = numero
        ? `Point ${numero} sur ${total} · ${cible.dataset.kind || 'point'} · ${certitude(cible.dataset.confidence)}.`
        : `Point du fil · ${certitude(cible.dataset.confidence)}.`;
    });
    fil.addEventListener('focusout', (evenement) => {
      const reste = evenement.relatedTarget instanceof Element && fil.contains(evenement.relatedTarget);
      if (!reste) info.textContent = '';
    });
  });

  /* E004-05 — Parcours paginé du fil avec Page précédente / Page suivante. */
  sansRisque(() => {
    const fil = corps.querySelector('.recit-thread');
    if (!fil || fil.dataset.e004PagerLie) return;
    fil.dataset.e004PagerLie = '1';
    fil.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'PageDown' && evenement.key !== 'PageUp') return;
      const items = itemsFil();
      if (!items.length) return;
      evenement.preventDefault();
      const pos = items.indexOf(document.activeElement);
      const pas = 5;
      let cible;
      if (pos < 0) cible = evenement.key === 'PageDown' ? items[0] : items[items.length - 1];
      else {
        const delta = evenement.key === 'PageDown' ? pas : -pas;
        cible = items[Math.min(items.length - 1, Math.max(0, pos + delta))];
      }
      items.forEach((item) => { item.tabIndex = item === cible ? 0 : -1; });
      ameneFocus(cible);
    });
  });

  /* E004-06 — Échap dans la recherche locale efface le terme saisi. */
  sansRisque(() => {
    const recherche = document.getElementById('c3a-search');
    if (!recherche || recherche.dataset.e004EchapLie) return;
    recherche.dataset.e004EchapLie = '1';
    recherche.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'Escape' || !recherche.value) return;
      evenement.preventDefault();
      evenement.stopPropagation();
      recherche.value = '';
      recherche.dispatchEvent(new Event('input', { bubbles: true }));
      ameneFocus(recherche);
    });
  });

  /* E004-07 — Saut direct à un point par son numéro, sans quitter le clavier. */
  sansRisque(() => {
    if (document.getElementById('e004-goto')) return;
    const totalInitial = itemsFil().length;
    const bloc = cree('div', 'recit-e004-goto', undefined, 'e004-goto');
    const etiquette = cree('label', 'recit-e004-goto-label', `Aller au point n° (1 à ${totalInitial})`);
    const champ = cree('input', 'recit-e004-goto-input', undefined, 'e004-goto-input');
    champ.type = 'number';
    champ.min = '1';
    champ.max = String(totalInitial);
    champ.step = '1';
    champ.inputMode = 'numeric';
    champ.setAttribute('aria-label', `Numéro du point à atteindre, entre 1 et ${totalInitial}`);
    etiquette.appendChild(champ);
    const bouton = cree('button', 'recit-e004-goto-button', 'Aller au point', 'e004-goto-button');
    bouton.type = 'button';
    const statut = cree('span', 'recit-e004-goto-status', '', 'e004-goto-status');
    const vaAuPoint = () => {
      const items = itemsFil();
      const numero = Number.parseInt(champ.value, 10);
      if (!Number.isFinite(numero) || numero < 1 || numero > items.length) {
        statut.textContent = `Saisissez un numéro entre 1 et ${items.length}.`;
        return;
      }
      statut.textContent = `Point ${numero} sur ${items.length} : ${String(items[numero - 1].textContent || '').trim()}.`;
      items[numero - 1].click();
    };
    bouton.addEventListener('click', vaAuPoint);
    champ.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'Enter') return;
      evenement.preventDefault();
      vaAuPoint();
    });
    marque(champ);
    marque(bouton);
    bloc.append(etiquette, bouton, statut);
    const ancre = document.getElementById('e004-focus') || corps.querySelector('.recit-thread');
    apres(ancre, bloc);
  });

  /* E004-08 — Reprise du focus mémorisé après reconstruction du DOM. */
  sansRisque(() => {
    if (!stage.dataset.e004MemoireFocus) {
      stage.dataset.e004MemoireFocus = '1';
      stage.addEventListener('focusin', (evenement) => {
        const cible = evenement.target;
        if (!(cible instanceof Element)) return;
        const cle = (cible.dataset && cible.dataset.fk) || cible.id || '';
        if (cle && !cle.startsWith('e004-')) derniereCleFocus = cle;
      });
    }
    const actif = document.activeElement;
    if (derniereCleFocus && (!actif || actif === document.body)
      && /^[A-Za-z0-9_-]+$/.test(derniereCleFocus)) {
      const cible = stage.querySelector(`[data-fk="${derniereCleFocus}"]`);
      if (cible && !cible.disabled) {
        try { cible.focus({ preventScroll: true }); } catch { cible.focus(); }
      }
      derniereCleFocus = null;
    }
  });

  /* E004-09 — Anneau de focus visible et uniforme sur tous les contrôles. */
  sansRisque(() => {
    const cibles = Array.from(corps.querySelectorAll(
      '.recit-actions button, .recit-thread-item, .recit-trace summary, .c3a-filter, #c3a-search'
    ));
    cibles.forEach((node) => marque(node));
  });

  /* E004-10 — Description clavier des commandes, annoncée aux lecteurs d'écran. */
  sansRisque(() => {
    const actions = corps.querySelector('.recit-actions');
    if (!actions) return;
    const boutons = Array.from(actions.querySelectorAll('button'));
    if (!boutons.length) return;
    let aide = document.getElementById('e004-actions-help');
    if (!aide) {
      aide = cree('p', 'recit-e004-actions-help',
        'Commandes accessibles au clavier : Tab pour parcourir, Maj+Tab pour revenir en arrière, Entrée ou Espace pour activer.',
        'e004-actions-help');
      apres(actions, aide);
    }
    boutons.forEach((bouton) => {
      const deja = String(bouton.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (!deja.includes('e004-actions-help')) {
        deja.push('e004-actions-help');
        bouton.setAttribute('aria-describedby', deja.join(' '));
      }
      if (!bouton.getAttribute('title')) {
        bouton.title = 'Accessible au clavier : Tab pour atteindre, Entrée ou Espace pour activer.';
      }
    });
  });
});
