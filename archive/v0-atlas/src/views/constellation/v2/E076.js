import { register } from './registry.js';

/* Lentille V2 E076 — Observation et pilotage de l'état du survol de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   déterministes, sans réseau ni source aléatoire ni minuteur. Préfixe exclusif
   des identifiants, classes, attributs et clés globales : v2e076. */
register('E076', (ctx) => {
  /* Garde d'entrée obligatoire : sans layout exploitable, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (typeof document === 'undefined') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  try { installerV2(ctx); } catch { return; }
});

/* L'installation est isolée dans une fonction de niveau supérieur : le corps
   du register reste une garde courte et toute anomalie est neutralisée. */
function installerV2(ctx) {
  const layout = ctx.layout;
  const css = ctx.css;
  const el = ctx.el;

  css('constellation-v2-e076', `
      /* Miroirs textuels de l'état : présents dès le rendu, jamais portés par
         la seule couleur, et tous préfixés v2e076. */
      .v2e076-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
      .constellation-layout{position:relative}
      #v2e076-bloc{position:absolute;top:4px;right:8px;z-index:36;display:flex;flex-direction:column;align-items:flex-end;gap:3px;pointer-events:none;font-size:9px}
      #v2e076-signature{padding:2px 6px;border:1px dashed var(--line,#3a3f46);border-radius:6px;background:var(--surface-2,rgba(12,16,22,.9));color:var(--muted,#8c8d91);font-variant-numeric:tabular-nums}
      #v2e076-direction{padding:1px 6px;border-radius:6px;color:var(--gold-bright,#f4d69e)}
      #v2e076-historique{max-width:230px;margin:0;color:var(--muted,#8c8d91);line-height:1.4;text-align:right}
      .v2e076-readout{margin:8px 0 0;color:var(--muted,#8c8d91);font-size:9px;line-height:1.5}
      .constellation-field [data-v2e076-nearest="oui"]{outline:2px dashed var(--gold,#e6b96f);outline-offset:4px}
      #v2e076-gel{position:absolute;right:8px;bottom:6px;z-index:37;min-height:36px;min-width:36px;padding:0 12px;border:1px solid var(--gold,#e6b96f);border-radius:8px;background:var(--surface-2,rgba(12,16,22,.9));color:var(--gold-bright,#f4d69e);font-size:11px;cursor:pointer}
      #v2e076-gel:focus-visible{outline:3px solid var(--gold-bright,#f4d69e);outline-offset:3px}
      .constellation-layout[data-v2e076-gel="oui"] #v2e076-gel{border-width:2px;border-style:solid}
      @media (prefers-reduced-motion:reduce){#v2e076-bloc *{transition:none!important}}
      @media (forced-colors:active){#v2e076-signature,#v2e076-gel{border:1px solid CanvasText;background:Canvas;color:CanvasText}}
      @media (max-width:620px){#v2e076-bloc{top:auto;bottom:48px;left:8px;right:auto;align-items:flex-start}#v2e076-historique{max-width:62vw;text-align:left}}
  `);

  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.querySelectorAll !== 'function') return;
  const noeuds = Array.from(field.querySelectorAll('button[data-const-key]'));
  if (!noeuds.length) return;

  /* E076-10 — Cycle de vie des écouteurs : les gestionnaires déposés par un
     rendu précédent sont révoqués avant toute nouvelle inscription, et les
     nœuds dérivés déjà présents sont retirés. Un second passage ne duplique
     ni les réactions ni le balisage. */
  const CLE_ECOUTES = '__v2e076_ecoutes';
  const inscriptions = [];
  const precedentes = (typeof window !== 'undefined' && window[CLE_ECOUTES]) || null;
  if (precedentes && Array.isArray(precedentes.inscriptions)) {
    precedentes.inscriptions.forEach((item) => {
      try {
        if (item.cible && typeof item.cible.removeEventListener === 'function') {
          item.cible.removeEventListener(item.type, item.fn, item.phase);
        }
      } catch { /* anomalie ignorée sans bruit */ }
    });
  }
  const residus = layout.querySelectorAll('[id^="v2e076-"]');
  if (residus && typeof residus.length === 'number') {
    Array.from(residus).forEach((n) => { if (n && typeof n.remove === 'function') n.remove(); });
  }
  const enregistrer = (cible, type, fn, phase) => {
    if (!cible || typeof cible.addEventListener !== 'function') return;
    cible.addEventListener(type, fn, phase);
    inscriptions.push({ cible, type, fn, phase });
  };
  if (typeof window !== 'undefined') window[CLE_ECOUTES] = { inscriptions };

  /* État courant et revendications : valeurs partagées par la projection et
     par les chantiers d'entrée, jamais écrites directement par un gestionnaire. */
  const PRIORITE = ['tactile', 'focus', 'survol'];
  const revendications = { survol: null, focus: null, tactile: null };
  let etat = { source: 'repos', cle: '', noeud: null };
  let gel = false;

  const cleDe = (noeud) => (noeud && noeud.dataset ? noeud.dataset.constKey || '' : '');
  const libelleDe = (noeud) => (noeud && noeud.dataset && noeud.dataset.label) ||
    (noeud && typeof noeud.getAttribute === 'function' && noeud.getAttribute('aria-label')) || 'Nœud';

  /* E076-01 — Signature d'état déterministe : empreinte FNV-1a sur 32 bits de
     la paire (source, clé), calculée sans graine aléatoire ni horodatage. La
     projection complète dérive de cette seule paire tous les miroirs DOM. */
  const signature = (source, cle) => {
    const chaine = `${source}|${cle}`;
    let empreinte = 2166136261;
    for (let i = 0; i < chaine.length; i += 1) {
      empreinte ^= chaine.charCodeAt(i);
      empreinte = Math.imul(empreinte, 16777619) >>> 0;
    }
    return empreinte.toString(36).toUpperCase().padStart(6, '0');
  };
  const appliquer = () => {
    let source = 'repos';
    let noeud = null;
    for (const candidat of PRIORITE) {
      if (revendications[candidat]) { source = candidat; noeud = revendications[candidat]; break; }
    }
    const cle = cleDe(noeud);
    const avant = etat;
    const direction = directionDe(avant, { source, cle });
    if (avant.source === source && avant.cle === cle) {
      layout.setAttribute('data-v2e076-direction', 'stable');
      dirNoeud.textContent = `${SIGNES.stable} ${MOTS.stable}`;
      return;
    }
    etat = { source, cle, noeud };
    const empreinte = signature(source, cle);
    sigNoeud.textContent = empreinte;
    layout.setAttribute('data-v2e076-signature', empreinte);
    layout.setAttribute('data-v2e076-source', source);
    layout.setAttribute('data-v2e076-cle', cle || 'aucun');
    layout.setAttribute('data-v2e076-direction', direction);
    dirNoeud.textContent = `${SIGNES[direction] || SIGNES.stable} ${MOTS[direction] || MOTS.stable}`;
    historique.unshift({ source, cle, direction });
    if (historique.length > TAILLE_HISTORIQUE) historique.length = TAILLE_HISTORIQUE;
    ecrireHistorique();
    const h0 = historique[0];
    const h1 = historique[1];
    const h2 = historique[2];
    if (h0 && h1 && h2 && h0.cle && h0.cle === h2.cle && h1.cle !== h0.cle) oscill += 1;
    else oscill = 0;
    if (oscill >= 3) { versVerrou = h0.cle; oscill = 0; }
    layout.setAttribute('data-v2e076-alternances', String(oscill));
    layout.setAttribute('data-v2e076-hysterese', versVerrou ? 'verrou' : 'libre');
    live.textContent = direMessage(source, noeud, direction);
  };
  const bloc = el('div', 'v2e076-bloc');
  bloc.id = 'v2e076-bloc';
  const sigNoeud = el('span', 'v2e076-signature');
  sigNoeud.id = 'v2e076-signature';
  sigNoeud.setAttribute('aria-hidden', 'true');
  bloc.appendChild(sigNoeud);

  /* E076-02 — Fil d'historique borné : au plus six états, du plus récent au
     plus ancien, conservés dans un tampon annulaire explicitement plafonné. */
  const TAILLE_HISTORIQUE = 6;
  const historique = [];
  const histNoeud = el('p', 'v2e076-historique');
  histNoeud.id = 'v2e076-historique';
  const ecrireHistorique = () => {
    histNoeud.textContent = historique.length
      ? historique.map((entree, index) => `${index + 1}. ${entree.source} · ${entree.cle || 'aucun'}`).join('  |  ')
      : 'Aucune transition.';
  };
  bloc.appendChild(histNoeud);

  /* E076-03 — Direction de transition : entrée, sortie, déplacement ou
     stabilité, déduite de la comparaison des deux états projetés successifs. */
  const SIGNES = { stable: '•', entree: '↑', sortie: '↓', deplacement: '↔' };
  const MOTS = { stable: 'Stable', entree: 'Entrée', sortie: 'Sortie', deplacement: 'Déplacement' };
  const directionDe = (avant, apres) => {
    if (!avant || (avant.source === apres.source && avant.cle === apres.cle)) return 'stable';
    if (avant.source === 'repos') return 'entree';
    if (apres.source === 'repos') return 'sortie';
    return 'deplacement';
  };
  const dirNoeud = el('span', 'v2e076-direction');
  dirNoeud.id = 'v2e076-direction';
  dirNoeud.setAttribute('aria-hidden', 'true');
  dirNoeud.textContent = `${SIGNES.stable} ${MOTS.stable}`;
  bloc.appendChild(dirNoeud);
  layout.appendChild(bloc);

  /* E076-04 — Arbitrage spatial par proximité : sur déplacement de pointeur
     fin, le nœud retenu est le plus proche du curseur dans un rayon de 28 px,
     ce qui départage disques voisins et libellés sans gestionnaire par nœud. */
  let capable = false;
  try {
    capable = !!(typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  } catch { capable = false; }
  layout.setAttribute('data-v2e076-capable', capable ? 'oui' : 'non');
  const poserSurvol = (noeud) => {
    const cle = cleDe(noeud);
    if (versVerrou && versVerrou !== cle) return false;
    revendications.tactile = null;
    revendications.survol = noeud;
    return true;
  };
  let dernierX = -1;
  let dernierY = -1;
  enregistrer(field, 'pointermove', (event) => {
    if (!capable || gel || !event || event.pointerType === 'touch') return;
    const x = event.clientX;
    const y = event.clientY;
    if (x === dernierX && y === dernierY) return;
    dernierX = x;
    dernierY = y;
    let meilleur = null;
    let distance = 28 * 28;
    for (const noeud of noeuds) {
      let rect = null;
      try { rect = noeud.getBoundingClientRect(); } catch { continue; }
      if (!rect || (!rect.width && !rect.height)) continue;
      const dx = x - (rect.left + rect.width / 2);
      const dy = y - (rect.top + rect.height / 2);
      const d = dx * dx + dy * dy;
      if (d < distance) { distance = d; meilleur = noeud; }
    }
    if (!meilleur || !poserSurvol(meilleur)) return;
    noeuds.forEach((n) => n.removeAttribute('data-v2e076-nearest'));
    meilleur.setAttribute('data-v2e076-nearest', 'oui');
    field.setAttribute('data-v2e076-proche', cleDe(meilleur));
    appliquer();
  });

  /* E076-05 — Désertion globale du champ : un seul pointerleave remet tout à
     zéro (revendications, verrou, alternances et nœud proche), sans écouteur
     de sortie par nœud. Le focus et le tactile alimentent les mêmes canaux. */
  const nettoyer = () => {
    revendications.survol = null;
    revendications.focus = null;
    revendications.tactile = null;
    versVerrou = '';
    oscill = 0;
    noeuds.forEach((n) => n.removeAttribute('data-v2e076-nearest'));
    field.removeAttribute('data-v2e076-proche');
    layout.setAttribute('data-v2e076-alternances', '0');
    layout.setAttribute('data-v2e076-hysterese', 'libre');
  };
  enregistrer(field, 'pointerleave', () => {
    if (gel) return;
    nettoyer();
    appliquer();
  });
  enregistrer(field, 'focusin', (event) => {
    if (gel) return;
    const cible = event && event.target;
    const noeud = cible && cible.nodeType === 1 && typeof cible.closest === 'function'
      ? cible.closest('button[data-const-key]') : null;
    if (!noeud || typeof field.contains !== 'function' || !field.contains(noeud)) return;
    revendications.focus = noeud;
    appliquer();
  });
  enregistrer(field, 'focusout', (event) => {
    if (gel) return;
    const cible = event && event.target;
    const noeud = cible && cible.nodeType === 1 && typeof cible.closest === 'function'
      ? cible.closest('button[data-const-key]') : null;
    if (noeud && revendications.focus === noeud) revendications.focus = null;
    appliquer();
  });
  enregistrer(field, 'pointerdown', (event) => {
    if (gel) return;
    const tactile = !capable || (event && event.pointerType === 'touch');
    if (!tactile) return;
    const cible = event && event.target;
    const noeud = cible && cible.nodeType === 1 && typeof cible.closest === 'function'
      ? cible.closest('button[data-const-key]') : null;
    if (noeud && typeof field.contains === 'function' && field.contains(noeud)) {
      if (versVerrou && cleDe(noeud) !== versVerrou) versVerrou = '';
      revendications.tactile = noeud;
    } else {
      nettoyer();
    }
    appliquer();
  });

  /* E076-06 — Cartographie typologique : chaque nœud reçoit un rang ordinal
     (ère 1, repère 2, point 3) et le champ expose le compte de chaque type. */
  const TYPES = { 'const-sun': 'ere', 'const-planet': 'repere', 'const-moon': 'point' };
  const RANGS = { ere: 1, repere: 2, point: 3, autre: 0 };
  const typeDe = (noeud) => {
    if (!noeud || !noeud.classList) return 'autre';
    for (const classe in TYPES) {
      if (Object.prototype.hasOwnProperty.call(TYPES, classe) && noeud.classList.contains(classe)) {
        return TYPES[classe];
      }
    }
    return 'autre';
  };
  const comptes = { ere: 0, repere: 0, point: 0, autre: 0 };
  noeuds.forEach((noeud) => {
    const type = typeDe(noeud);
    comptes[type] += 1;
    noeud.setAttribute('data-v2e076-rang', String(RANGS[type]));
    noeud.setAttribute('data-v2e076-type', type);
  });
  field.setAttribute('data-v2e076-nb-ere', String(comptes.ere));
  field.setAttribute('data-v2e076-nb-repere', String(comptes.repere));
  field.setAttribute('data-v2e076-nb-point', String(comptes.point));
  field.setAttribute('data-v2e076-nb-autre', String(comptes.autre));

  /* E076-07 — Hystérésis anti-oscillation : après trois alternances entre deux
     clés, la dernière est verrouillée ; le survol d'une autre clé est ignoré
     jusqu'à la sortie du champ ou à une action tactile. Le verrou est exposé
     en attribut textuel, jamais porté par la seule couleur. */
  let versVerrou = '';
  let oscill = 0;
  layout.setAttribute('data-v2e076-alternances', '0');
  layout.setAttribute('data-v2e076-hysterese', 'libre');

  /* E076-08 — Interrupteur de gel : une bascule indépendante exposée avec
     aria-pressed ; gelées, les revendications sont mémorisées mais la
     projection reste immobile jusqu'à la reprise. */
  const live = el('p', 'v2e076-readout');
  live.id = 'v2e076-live';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  layout.appendChild(live);
  const direMessage = (source, noeud, direction) => {
    if (source === 'repos') {
      return 'État : repos. Le suivi reprend dès qu’un nœud est survolé, focalisé ou touché.';
    }
    const cle = cleDe(noeud);
    const morceau = `${typeDe(noeud)} · ${libelleDe(noeud)}${cle ? `, clé ${cle}` : ''}`;
    const prefixe = source === 'survol' ? 'Survol' : source === 'focus' ? 'Focus clavier' : 'Sélection tactile';
    return `${prefixe} : ${morceau}. Transition : ${MOTS[direction] || MOTS.stable}.`;
  };
  const bouton = el('button', 'v2e076-gel', 'Geler le suivi');
  bouton.id = 'v2e076-gel';
  bouton.type = 'button';
  bouton.setAttribute('aria-pressed', 'false');
  bouton.setAttribute('aria-label', 'Geler ou reprendre le suivi de l’état du survol');
  bouton.addEventListener('click', () => {
    gel = !gel;
    bouton.setAttribute('aria-pressed', gel ? 'true' : 'false');
    bouton.textContent = gel ? 'Reprendre le suivi' : 'Geler le suivi';
    layout.setAttribute('data-v2e076-gel', gel ? 'oui' : 'non');
    if (gel) {
      live.textContent = 'Suivi gelé : l’état affiché reste figé jusqu’à la reprise.';
    } else {
      appliquer();
      live.textContent = 'Suivi repris : l’état affiché reflète de nouveau les revendications enregistrées.';
    }
  });
  layout.appendChild(bouton);

  /* E076-09 — Description du modèle rattachée au champ : un paragraphe lu par
     les technologies d'association explique que survol, focus et tactile
     déposent une revendication et qu'une seule source est projetée. */
  const aide = el('p', 'v2e076-sr', 'Survol, focus clavier et tactile déposent une revendication. Une seule source est retenue et son état est annoncé dans la région de statut. Le bouton Geler fige provisoirement l’affichage.');
  aide.id = 'v2e076-aide';
  layout.appendChild(aide);
  const deja = field.getAttribute('aria-describedby') || '';
  field.setAttribute('aria-describedby', deja ? `${deja} ${aide.id}` : aide.id);

  /* Projection initiale : l'état de repos est publié avant tout événement. */
  layout.setAttribute('data-v2e076-gel', 'non');
  appliquer();
}
