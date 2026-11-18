import { register } from './registry.js';

/* Lentille E076 — Gestion de l'état appliquée au survol de la vue Constellation.
   Dix chantiers locaux, E076-01 … E076-10 : source de vérité unique, entrées
   déléguées, sorties avec garde de filiation, état initial explicite,
   déduplication des écritures, résolution par priorité, projection dérivée,
   région live, mode sobre et idempotence. Le DOM n'est qu'une projection d'un
   état explicite : aucun attribut n'est écrit directement depuis un gestionnaire.
   Zéro journalisation, zéro réseau, zéro aléa, zéro minuteur, zéro boucle
   d'animation propre. Greffon tolérant aux contextes partiels. */

register('E076', (ctx) => {
  /* E076-10 (garde) — sans layout exploitable, aucun ajout au DOM ni dans <head>. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (typeof document === 'undefined') return;
  const { viewId, layout, css, el } = ctx;
  if (typeof viewId === 'string' && viewId !== 'constellation') return;
  if (typeof css !== 'function' || typeof el !== 'function') return;
  if (typeof layout.setAttribute !== 'function' || typeof layout.appendChild !== 'function') return;

  try {
    /* E076-09 — préférence de mouvement lue une seule fois, figée en classe. */
    let sobre = false;
    try { sobre = !!(typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()); }
    catch { sobre = false; }

    /* E076-10 — nettoyage préalable : un second passage ne duplique rien. */
    const anciens = layout.querySelectorAll('[id^="e076-"]');
    if (anciens && typeof anciens.length === 'number') {
      Array.from(anciens).forEach((n) => {
        if (n && typeof n.remove === 'function') n.remove();
      });
    }

    /* E076-01 — source de vérité unique : trois revendications concurrentes
       (survol, focus, tactile) et un état projeté. Tant que la résolution
       n'a pas eu lieu, aucun attribut dérivé n'est touché. */
    /* E076-06 — ordre de priorité déterministe : le tactile l'emporte sur le
       focus clavier, qui l'emporte sur le survol, qui l'emporte sur le repos. */
    const PRIORITE = ['tactile', 'focus', 'survol'];
    const revendications = { survol: null, focus: null, tactile: null };
    const etat = { source: 'repos', cle: '' };
    let evenements = 0;
    let transitions = 0;
    let capable = false;
    try {
      capable = !!(typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    } catch { capable = false; }

    /* E076-01 / E076-06 / E076-07 / E076-08 / E076-09 — feuille unique, une
       règle commentée au chantier qu'elle dessert. */
    css('constellation-e076', `
      /* E076-01 — Miroir visuel de l'état source de vérité : toujours présent,
         toujours textuel, jamais porté par la seule couleur. */
      .constellation-layout { position: relative; }
      #e076-badge {
        position: absolute; top: 4px; left: 8px; z-index: 35;
        display: inline-flex; align-items: center; gap: 6px;
        min-width: 112px; min-height: 24px; padding: 3px 8px;
        border: 1px solid var(--line, #3a3f46); border-radius: 999px;
        background: var(--surface-2, rgba(12, 16, 22, .9));
        color: var(--muted, #8c8d91);
        font-size: 8px; font-weight: 600; letter-spacing: .08em;
        pointer-events: none;
        transition: opacity .14s ease, border-color .14s ease;
      }
      #e076-badge-source { color: var(--gold, #e6b96f); }
      #e076-badge-cle { font-variant-numeric: tabular-nums; opacity: .85; }

      /* E076-04 — État initial : au repos, l'étiquette s'efface sans disparaître. */
      .constellation-layout[data-e076-state="repos"] #e076-badge { opacity: .55; }

      /* E076-05 — Largeur minimale fixe : la déduplication des écritures ne
         provoque aucun décalage de mise en page d'un état à l'autre. */
      #e076-badge-source { flex: 0 0 56px; }

      /* E076-02 — Surlignage du nœud dont la revendication est retenue. */
      .constellation-layout .const-sun[data-e076-over],
      .constellation-layout .const-planet[data-e076-over],
      .constellation-layout .const-moon[data-e076-over] {
        outline: 2px solid var(--gold-bright, #f4d69e); outline-offset: 3px; z-index: 8;
      }

      /* E076-03 — Retour au repos : aucune ombre ni élévation résiduelle, la
         transformation native de la vue reste intacte. */
      .constellation-layout[data-e076-state="repos"] .constellation-field button { box-shadow: none; }

      /* E076-06 — Priorité visible : focus et tactile se distinguent du survol
         par une couleur d'accent, complétée par le texte de l'étiquette. */
      .constellation-layout[data-e076-state="focus"] #e076-badge-source,
      .constellation-layout[data-e076-state="tactile"] #e076-badge-source {
        color: var(--violet, #b28bdd);
      }
      .constellation-layout[data-e076-state="tactile"] #e076-badge {
        border-color: var(--violet, #b28bdd);
      }

      /* E076-07 — Projection dérivée : un seul libellé mis en avant, les autres
         s'estompent, exactement comme dans l'état projeté par appliquer(). */
      .constellation-field[data-e076-focus="1"] button[data-const-key]::after { opacity: .2; }
      .constellation-field[data-e076-focus="1"] button[data-const-key][data-e076-over]::after { opacity: 1; }

      /* E076-08 — Région live : message lisible, non dépendant d'une couleur. */
      .e076-readout {
        margin: 8px 0 0; color: var(--muted, #8c8d91);
        font-size: 9px; line-height: 1.45;
      }

      /* E076-09 — Mouvement réduit, contraste forcé et écran étroit. */
      .e076-sobre #e076-badge { transition: none; }
      @media (prefers-reduced-motion: reduce) {
        #e076-badge { transition: none !important; }
      }
      @media (forced-colors: active) {
        #e076-badge { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
        #e076-badge-source { color: Highlight; }
      }
      @media (max-width: 620px) {
        #e076-badge {
          top: auto; bottom: 6px; left: 50%;
          transform: translateX(-50%);
        }
      }

      /* E076-10 — Tous les sélecteurs sont préfixés e076-, donc sans collision
         avec une autre lentille ni avec le rendu de base. */
    `);

    const field = layout.querySelector('.constellation-field');
    if (!field || typeof field.querySelectorAll !== 'function') return;
    const noeuds = Array.from(field.querySelectorAll('button[data-const-key]'));
    if (!noeuds.length) return;

    if (sobre) layout.classList.add('e076-sobre');
    else layout.classList.remove('e076-sobre');
    layout.setAttribute('data-e076-capable', capable ? 'oui' : 'non');

    /* DOM dérivé : créé une seule fois, ensuite seulement mis à jour. */
    const badge = el('div', 'e076-badge');
    badge.id = 'e076-badge';
    badge.setAttribute('aria-hidden', 'true');
    const badgeSource = el('span', 'e076-badge-source');
    badgeSource.id = 'e076-badge-source';
    const badgeCle = el('span', 'e076-badge-cle');
    badgeCle.id = 'e076-badge-cle';
    badge.appendChild(badgeSource);
    badge.appendChild(badgeCle);
    layout.appendChild(badge);

    /* E076-08 — une seule région live, textuelle et atomique. */
    const readout = el('p', 'e076-readout');
    readout.id = 'e076-readout';
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
    layout.appendChild(readout);

    const direType = (node) => {
      if (node && node.classList) {
        if (node.classList.contains('const-sun')) return 'Ère';
        if (node.classList.contains('const-planet')) return 'Repère';
        if (node.classList.contains('const-moon')) return 'Point vérifié';
      }
      return 'Nœud';
    };

    const direLibelle = (node) => (node && node.dataset && node.dataset.label) ||
      (node && typeof node.getAttribute === 'function' && node.getAttribute('aria-label')) || 'Nœud';

    const direNom = (source) => ({
      repos: 'REPOS', survol: 'SURVOL', focus: 'FOCUS', tactile: 'TACTILE',
    }[source] || 'REPOS');

    const direPhrase = (source, node) => {
      if (!node) return 'État : repos. Survolez, focalisez ou touchez un nœud pour l’activer.';
      const cle = node.dataset && node.dataset.constKey ? `, clé ${node.dataset.constKey}` : '';
      const debut = `${direType(node)} · ${direLibelle(node)}${cle}`;
      if (source === 'survol') return `Survol actif : ${debut}.`;
      if (source === 'focus') return `Focus clavier actif : ${debut}.`;
      return `Sélection tactile active : ${debut}.`;
    };

    /* E076-05 — instrumentation déterministe : les événements reçus sont
       comptés à l'arrivée ; les transitions ne le sont que si l'état change. */
    const noterEvenement = () => {
      evenements += 1;
      layout.setAttribute('data-e076-evenements', String(evenements));
    };

    /* E076-07 — projection pure : résoudre l'état, puis dériver de lui seul
       tous les attributs et tous les textes, en une unique passe. */
    const appliquer = () => {
      let source = 'repos';
      let node = null;
      /* E076-06 — la résolution parcourt la file de priorité et s'arrête au
       premier revendicateur : jamais deux sources ne pilotent la vue. */
      for (const candidat of PRIORITE) {
        if (revendications[candidat]) { source = candidat; node = revendications[candidat]; break; }
      }
      const cle = node && node.dataset ? (node.dataset.constKey || '') : '';
      /* E076-05 — déduplication : sortie immédiate si la projection est déjà
       la même, sans aucune écriture DOM ni nouvelle annonce vocale. */
      if (etat.source === source && etat.cle === cle) return;
      etat.source = source;
      etat.cle = cle;
      transitions += 1;

      layout.setAttribute('data-e076-state', source);
      layout.setAttribute('data-e076-key', cle || 'aucun');
      layout.setAttribute('data-e076-transitions', String(transitions));

      noeuds.forEach((n) => n.removeAttribute('data-e076-over'));
      if (node) node.setAttribute('data-e076-over', 'true');
      if (source === 'focus') field.setAttribute('data-e076-focus', '1');
      else field.removeAttribute('data-e076-focus');

      badgeSource.textContent = direNom(source);
      badgeCle.textContent = cle || '—';
      readout.textContent = direPhrase(source, node);
    };

    const cibleDe = (event) => {
      const cible = event && event.target;
      if (!cible || cible.nodeType !== 1 || typeof cible.closest !== 'function') return null;
      const node = cible.closest('button[data-const-key]');
      return node && typeof field.contains === 'function' && field.contains(node) ? node : null;
    };

    /* E076-02 — entrées déléguées : un gestionnaire par source, aucun handler
       propre par nœud, quel que soit le nombre d'ères, repères et points. */
    field.addEventListener('pointerover', (event) => {
      noterEvenement();
      if (event && event.pointerType === 'touch') return;
      const node = cibleDe(event);
      if (!node) return;
      revendications.tactile = null;
      revendications.survol = node;
      appliquer();
    });

    field.addEventListener('focusin', (event) => {
      noterEvenement();
      const node = cibleDe(event);
      if (!node) return;
      revendications.focus = node;
      appliquer();
    });

    field.addEventListener('pointerdown', (event) => {
      noterEvenement();
      const tactile = !capable || (event && event.pointerType === 'touch');
      if (!tactile) return;
      const node = cibleDe(event);
      if (node) revendications.tactile = node;
      else {
        revendications.tactile = null;
        revendications.survol = null;
        revendications.focus = null;
      }
      appliquer();
    });

    /* E076-03 — sorties déléguées : la revendication n'est retirée que si elle
       porte sur le nœud quitté ; la garde de filiation évite le clignotement au
       passage entre un disque et son libellé. */
    field.addEventListener('pointerout', (event) => {
      noterEvenement();
      if (event && event.pointerType === 'touch') return;
      const node = cibleDe(event);
      if (!node) return;
      const suivant = event && event.relatedTarget;
      if (suivant && typeof node.contains === 'function' && node.contains(suivant)) return;
      if (revendications.survol === node) revendications.survol = null;
      appliquer();
    });

    field.addEventListener('focusout', (event) => {
      noterEvenement();
      const node = cibleDe(event);
      if (node && revendications.focus === node) revendications.focus = null;
      appliquer();
    });

    /* E076-04 — état initial explicite : le repos est projeté avant tout
       événement, avec une clé vide et le badge correspondant. */
    appliquer();
  } catch {
    /* Greffon tolérant : toute anomalie neutralise la lentille sans bruit. */
    return;
  }
});
