import { register } from './registry.js';

/* Lentille E057 — Diagnostic textuel appliqué au focus et à la tabulation de la
   vue Constellation. Dix chantiers concrets et variés (E057-01 … E057-10) :
   cartographie de l'ordre de Tab, registre ordonné, journal live, compteur de
   tabulations, détection de fuite, marquage du focus courant, cibles minimales
   mesurées, aide reliée au champ, bilan chiffré, idempotence et trace du mouvement.
   Une seule feuille, identifiant réservé constellation-e057 ; un seul register, ids e057-*.
   Zéro journalisation, zéro réseau, zéro aléa, zéro minuteur, zéro rAF propre,
   aucune règle d'import distant. Greffon tolérant : ctx.layout vérifié avant tout ajout DOM,
   toute anomalie locale est neutralisée sans exception. */

/* Sélecteur des candidats : boutons, liens, champs et éléments à tabindex. */
const CANDIDATS = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]';

/* E057-01 — Lecture défensive du libellé d'un arrêt : aria-label, data-label,
   title, texte visible, puis repli explicite. Aucune info n'est inventée. */
function libelleArret(noeud) {
  if (!noeud || typeof noeud.getAttribute !== 'function') return 'contrôle sans libellé';
  const aria = noeud.getAttribute('aria-label');
  if (aria && aria.trim()) return aria.trim();
  const donnees = noeud.dataset && noeud.dataset.label ? String(noeud.dataset.label).trim() : '';
  if (donnees) return donnees;
  const titre = noeud.getAttribute('title');
  if (titre && titre.trim()) return titre.trim();
  const texte = typeof noeud.textContent === 'string' ? noeud.textContent.trim() : '';
  if (texte) return texte;
  return 'contrôle sans libellé';
}

/* E057-01 — Énumération des vrais arrêts de Tab : on écarte le disabled,
   aria-hidden et les tabindex négatifs laissés par le roving tabindex. */
function arretsTab(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.from(root.querySelectorAll(CANDIDATS)).filter((noeud) => {
    if (noeud.hasAttribute('disabled') || noeud.getAttribute('aria-hidden') === 'true') return false;
    const ti = noeud.getAttribute('tabindex');
    if (ti !== null) {
      const n = Number.parseInt(ti, 10);
      if (Number.isFinite(n) && n < 0) return false;
    }
    return true;
  });
}

/* E057-09 — Nature textuelle d'un arrêt, déduite de ses classes et de sa balise. */
function typeArret(noeud) {
  if (!noeud || !noeud.tagName) return 'élément';
  const balise = String(noeud.tagName).toLowerCase();
  const classe = typeof noeud.className === 'string' ? noeud.className : '';
  if (/\bconst-sun\b/.test(classe)) return 'ère';
  if (/\bconst-planet\b/.test(classe)) return 'repère';
  if (/\bconst-moon\b/.test(classe)) return 'point vérifié';
  if (balise === 'a') return 'lien';
  if (balise === 'button') return 'bouton';
  return balise;
}

/* E057-09 — Accord singulier/pluriel réutilisé par le bilan chiffré. */
function pl(n, singulier, pluriel) {
  return `${n} ${n > 1 ? pluriel : singulier}`;
}

register('E057', (ctx) => {
  /* Garde d'entrée : sans layout exploitable, aucun DOM, aucune feuille. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  const el = ctx.el;
  const css = typeof ctx.css === 'function' ? ctx.css : null;
  const doc = layout.ownerDocument || (typeof document === 'undefined' ? null : document);

  try {
    if (typeof ctx.viewId === 'string' && ctx.viewId !== 'constellation') return;

    let reduit = false;
    try { reduit = !!(typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()); }
    catch { reduit = false; }

    /* E057-10 — Idempotence : reprise des nœuds e057-* d'un rendu précédent
       avant toute création, puis trace du mode de mouvement sur le layout. */
    Array.from(layout.querySelectorAll('[id^="e057-"]')).forEach((n) => {
      if (n && typeof n.remove === 'function') n.remove();
    });
    layout.dataset.e057Motion = reduit ? 'reduced' : 'full';
    layout.dataset.e057Vue = ctx.viewId || 'constellation';

    /* E057-01 — Cartographie textuelle de l'ordre de Tab : chaque arrêt reçoit
       son rang ; le layout porte la séquence complète des libellés. */
    const arrets = arretsTab(layout);
    const cartographie = arrets.map((noeud, i) => `${i + 1}. « ${libelleArret(noeud)} »`).join(' · ');
    layout.dataset.e057Ordre = cartographie || 'aucun arrêt de Tab';
    arrets.forEach((noeud, i) => {
      noeud.setAttribute('data-e057-rang', String(i + 1));
      noeud.setAttribute('data-e057-stop', 'oui');
    });

    /* Panneau unique de diagnostic textuel, enfant direct du layout. */
    const panneau = el('section', 'e057-panel');
    panneau.id = 'e057-diagnostic';
    panneau.setAttribute('aria-labelledby', 'e057-titre');
    const titre = el('h3', 'e057-titre',
      `Diagnostic du focus et de la tabulation — ${pl(arrets.length, 'arrêt', 'arrêts')}`);
    titre.id = 'e057-titre';
    panneau.appendChild(titre);

    /* E057-02 — Registre ordonné des arrêts : liste numérotée, type, libellé
       et clé de données pour chaque point d'entrée du Tab. */
    const registre = el('ol', 'e057-registre');
    registre.id = 'e057-registre';
    if (!arrets.length) {
      registre.appendChild(el('li', 'e057-ligne e057-vide', 'Aucun arrêt de Tab dans cette vue.'));
    }
    arrets.forEach((noeud, i) => {
      const ligne = el('li', 'e057-ligne');
      ligne.appendChild(el('span', 'e057-num', String(i + 1).padStart(2, '0')));
      ligne.appendChild(el('span', 'e057-type', typeArret(noeud)));
      ligne.appendChild(el('span', 'e057-libelle', libelleArret(noeud)));
      const cle = noeud.dataset && noeud.dataset.constKey ? noeud.dataset.constKey : '—';
      ligne.appendChild(el('span', 'e057-cle', cle));
      registre.appendChild(ligne);
    });
    panneau.appendChild(registre);

    /* E057-03 — Journal live : chaque changement de focus est verbalé avec
       rang, type et libellé dans une région status / aria-live. */
    const journal = el('p', 'e057-readout e057-journal',
      arrets.length
        ? `Diagnostic prêt : ${pl(arrets.length, 'arrêt', 'arrêts')} de Tab à parcourir.`
        : 'Diagnostic prêt : aucun arrêt de Tab.');
    journal.id = 'e057-journal';
    journal.setAttribute('role', 'status');
    journal.setAttribute('aria-live', 'polite');
    journal.setAttribute('aria-atomic', 'true');
    panneau.appendChild(journal);

    /* E057-04 — Compteur de tabulations : incrémenté sur chaque touche Tab,
       avec direction, et neutralisé dès que le layout est déconnecté. */
    const compteur = el('p', 'e057-readout e057-compteur', 'Tabulations : 0 · sens : —');
    compteur.id = 'e057-compteur';
    panneau.appendChild(compteur);
    let nbTab = 0;
    if (doc && doc.addEventListener) {
      doc.addEventListener('keydown', (event) => {
        if (!event || event.key !== 'Tab') return;
        if (!layout.isConnected) return;
        nbTab += 1;
        compteur.textContent = `Tabulations : ${nbTab} · sens : ${event.shiftKey ? 'arrière' : 'avant'}`;
      }, true);
    }

    /* E057-05 — Détecteur textuel de fuite : focusout compare la cible entrante
       au layout et consigne « interne » ou « externe » sans aucun minuteur. */
    const fuite = el('p', 'e057-readout e057-fuite', 'Focus : à l’intérieur de la vue (état initial).');
    fuite.id = 'e057-fuite';
    panneau.appendChild(fuite);
    layout.addEventListener('focusout', (event) => {
      const suivant = event && event.relatedTarget;
      const interne = !!(suivant && typeof layout.contains === 'function' && layout.contains(suivant));
      layout.dataset.e057Fuite = interne ? 'interne' : 'externe';
      fuite.textContent = interne
        ? 'Focus : parcours interne à la constellation.'
        : 'Focus : sortie de la vue constellation constatée.';
    });
    /* Remise à zéro du diagnostic de fuite dès que le focus revient. */
    layout.addEventListener('focusin', () => {
      layout.dataset.e057Fuite = 'interne';
      fuite.textContent = 'Focus : à l’intérieur de la vue constellation.';
    });

    /* E057-06 — Marquage textuel du contrôle focalisé : attribut data-e057-focus
       posé sur l'arrêt courant, libellé affiché dans un badge, anneau en CSS. */
    const courant = el('p', 'e057-readout e057-courant', 'Focus courant : aucun.');
    courant.id = 'e057-courant';
    panneau.appendChild(courant);
    layout.addEventListener('focusin', (event) => {
      const cible = event && event.target;
      if (!cible || cible.nodeType !== 1 || typeof cible.getAttribute !== 'function') return;
      arrets.forEach((n) => n.removeAttribute('data-e057-focus'));
      if (!layout.contains(cible)) return;
      const rang = cible.getAttribute('data-e057-rang') || '?';
      cible.setAttribute('data-e057-focus', 'oui');
      layout.dataset.e057Courant = libelleArret(cible);
      courant.textContent = `Focus courant : ${rang}. « ${libelleArret(cible)} » (${typeArret(cible)}).`;
      journal.textContent = `Focus ${rang} sur ${arrets.length} : « ${libelleArret(cible)} » (${typeArret(cible)}).`;
    });

    /* E057-07 — Cible clavier minimale : mesure réelle des arrêts et bilan
       textuel de ceux qui passent sous 24 px (aucune position n'est modifiée). */
    const cibles = el('p', 'e057-readout e057-cibles', 'Cibles sous 24 px : mesure en cours.');
    cibles.id = 'e057-cibles';
    panneau.appendChild(cibles);
    let petits = 0;
    arrets.forEach((noeud) => {
      if (typeof noeud.getBoundingClientRect !== 'function') return;
      const r = noeud.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24)) {
        petits += 1;
        noeud.setAttribute('data-e057-sous-taille', 'oui');
      }
    });
    layout.dataset.e057Petits = String(petits);
    cibles.textContent = `Cibles sous 24 px : ${petits} sur ${arrets.length}.`;

    /* E057-08 — Aide textuelle de tabulation reliée au champ via aria-describedby :
       on complète la description existante sans jamais l'écraser. */
    const aide = el('p', 'e057-aide',
      'Tab : parcourir ères, repères, points et commandes · Maj+Tab : sens inverse · Entrée : activer · Échap : fermer le détail.');
    aide.id = 'e057-aide';
    panneau.appendChild(aide);
    const field = layout.querySelector('.constellation-field');
    if (field && typeof field.getAttribute === 'function') {
      const deja = field.getAttribute('aria-describedby') || '';
      if (!/(^|\s)e057-aide(\s|$)/.test(deja)) {
        field.setAttribute('aria-describedby', `${deja} e057-aide`.trim());
      }
    }

    /* E057-09 — Bilan chiffré : arrêts, étiquetage et répartition ères / repères
       / points calculés depuis le DOM, aucune valeur codée en dur. */
    const avecLabel = arrets.filter((n) => n.getAttribute('aria-label') || (n.dataset && n.dataset.label)).length;
    const sansLabel = arrets.length - avecLabel;
    const nb = (selecteur) => layout.querySelectorAll(selecteur).length;
    const bilan = el('p', 'e057-readout e057-bilan');
    bilan.id = 'e057-bilan';
    bilan.setAttribute('role', 'status');
    bilan.setAttribute('aria-live', 'polite');
    bilan.setAttribute('aria-atomic', 'true');
    bilan.textContent = `${pl(arrets.length, 'arrêt de Tab', 'arrêts de Tab')} · ${pl(avecLabel, 'étiqueté', 'étiquetés')} · ${pl(sansLabel, 'sans libellé', 'sans libellé')} · ${pl(nb('.const-sun'), 'ère', 'ères')} / ${pl(nb('.const-planet'), 'repère', 'repères')} / ${pl(nb('.const-moon'), 'point vérifié', 'points vérifiés')}.`;
    panneau.appendChild(bilan);

    /* Feuille unique du greffon : chaque chantier CSS porte son commentaire. */
    if (css) {
      css('constellation-e057', `
        .e057-panel { margin-top: 14px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255,255,255,.02); color: var(--ink-soft); font-size: 9px; line-height: 1.55; }
        .e057-titre { margin: 0 0 6px; font-family: var(--serif); font-size: 12px; font-weight: 500; color: var(--gold-bright); }
        .e057-readout { margin: 0 0 5px; color: var(--muted); font-variant-numeric: tabular-nums; }
        .e057-registre { margin: 0 0 8px; padding-left: 20px; list-style: decimal-leading-zero; }
        .e057-ligne { display: grid; grid-template-columns: 3ch 12ch minmax(0, 1fr) 12ch; gap: 2px 8px; padding: 2px 0; }
        .e057-num { color: var(--gold); font-variant-numeric: tabular-nums; }
        .e057-type { color: var(--violet); }
        .e057-libelle { color: var(--ink); }
        .e057-cle { color: var(--muted-2); text-align: right; }
        .e057-vide { color: var(--muted); font-style: italic; }
        /* E057-06 — Anneau textuel de l'arrêt marqué, distinct de l'état is-active. */
        .constellation-layout [data-e057-focus="oui"] { outline: 2px dashed var(--gold-bright); outline-offset: 3px; }
        /* E057-07 — Cible clavier minimale de 24 px, sans déplacer les nœuds. */
        .constellation-layout [data-e057-stop] { min-width: 24px; min-height: 24px; }
        .e057-aide { margin: 4px 0 0; color: var(--muted-2); }
        @media (prefers-reduced-motion: reduce) {
          .e057-panel * { transition: none !important; animation: none !important; }
        }
        @media (max-width: 620px) {
          .e057-ligne { grid-template-columns: 3ch minmax(0, 1fr); }
        }
      `);
    }

    /* Insertion ordonnée : le panneau précède la légende pour rester adjacent
       au champ visuel, sans toucher aux fichiers partagés de la vue. */
    const caption = layout.querySelector('.constellation-caption');
    if (caption && typeof caption.parentNode === 'object' && typeof layout.insertBefore === 'function') {
      layout.insertBefore(panneau, caption);
    } else if (typeof layout.appendChild === 'function') {
      layout.appendChild(panneau);
    }
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
