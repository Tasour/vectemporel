import { register } from './registry.js';

/* Lentille V2 E017 — Diagnostic textuel avancé des planètes de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, sous
   le préfixe exclusif v2e017. Le module ne lit que le texte déjà rendu par
   constellation.js : aucune donnée historique n'est inventée, aucun nœud
   existant n'est réécrit. Zéro réseau, zéro aléa, zéro minuteur, zéro rAF. */

register('E017', ctx => {
  /* Garde d'entrée : sans layout rendu ni fonction de style disponible, le
     greffon ne touche à aucun DOM et ne publie aucune mesure. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (layout.nodeType !== 1 || typeof layout.querySelectorAll !== 'function') return;

  const CSS_ID = 'constellation-v2-e017';
  const PANEL_ID = 'v2e017-panel';
  const TITLE_ID = 'v2e017-title';
  const LIVE_ID = 'v2e017-live';
  const LIST_ID = 'v2e017-list';

  const CSS = `
#${PANEL_ID}{margin:14px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--muted);font-family:inherit;font-size:9px;line-height:1.55;contain:layout style}
#${PANEL_ID} .v2e017-title{margin:0 0 6px;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:450}
#${PANEL_ID} .v2e017-live{margin:0 0 8px;color:var(--ink-soft);font-size:9px}
#${PANEL_ID} .v2e017-list{margin:0}
#${PANEL_ID} .v2e017-term{margin:2px 0 0;color:var(--gold-bright);font-weight:600}
#${PANEL_ID} .v2e017-def{margin:0 0 4px 12px;color:var(--muted-2);overflow-wrap:anywhere}
.constellation-layout.v2e017 .const-planet.v2e017-flag{outline:1px dashed var(--gold);outline-offset:2px}
.v2e017-steady #${PANEL_ID},.v2e017-steady #${PANEL_ID} *{transition:none!important;animation:none!important}
@media (prefers-reduced-motion:reduce){#${PANEL_ID},#${PANEL_ID} *,.constellation-layout.v2e017 .const-planet{transition:none!important;animation:none!important}}
`;

  /* Lecteurs et helpers partagés : aucun d'eux n'écrit dans la vue. */
  const lire = (noeud, nom) => (noeud && typeof noeud.getAttribute === 'function'
    ? (noeud.getAttribute(nom) || '') : '');
  const creer = (tag, cls, text) => {
    if (typeof ctx.el === 'function') return ctx.el(tag, cls, text);
    const noeud = document.createElement(tag);
    if (cls) noeud.className = cls;
    if (text !== undefined) noeud.textContent = text;
    return noeud;
  };
  const parties = (label) => {
    const sep = label.indexOf(' · ');
    if (sep < 0) return { annee: '', titre: '' };
    return { annee: label.slice(0, sep).trim(), titre: label.slice(sep + 3).trim() };
  };
  const marquer = (planete, code) => {
    planete.classList.add('v2e017-flag');
    const codes = lire(planete, 'data-v2e017-flags').split(' ').filter(Boolean);
    if (codes.indexOf(code) === -1) {
      codes.push(code);
      planete.setAttribute('data-v2e017-flags', codes.join(' '));
    }
  };

  const planetes = Array.from(layout.querySelectorAll('.const-planet[data-const-key^="planet:"]'));

  /* E017-01 — Conformité de l'attribut title avec data-label : le survol
     doit restituer exactement le libellé tooltip rendu par constellation.js. */
  let ecartsTitle = 0;
  planetes.forEach((planete) => {
    planete.removeAttribute('data-v2e017-flags');
    planete.classList.remove('v2e017-flag');
    const label = lire(planete, 'data-label');
    if (!label || lire(planete, 'title') !== label) {
      marquer(planete, 'title');
      ecartsTitle += 1;
    }
  });
  layout.dataset.v2e017TitleMismatch = String(ecartsTitle);

  /* E017-02 — Rang de l'aria-label face au numéro visible : le préfixe
     « Repère N : » doit suivre la numérotation 1, 2, 3… du texte du bouton. */
  let ecartsRang = 0;
  planetes.forEach((planete, index) => {
    const trouvé = /^Repère\s+(\d+)\s*:/.exec(lire(planete, 'aria-label'));
    if (!trouvé || trouvé[1] !== String(index + 1)) {
      marquer(planete, 'rang');
      ecartsRang += 1;
    }
  });
  layout.dataset.v2e017RankMismatch = String(ecartsRang);

  /* E017-03 — Unicité de l'état actif : au plus une planète peut porter
     is-active avec aria-current="true" ; tout désaccord est signalé. */
  let actifs = 0;
  let ecartsActif = 0;
  planetes.forEach((planete) => {
    const actif = planete.classList.contains('is-active');
    const courant = lire(planete, 'aria-current') === 'true';
    if (actif) actifs += 1;
    if (actif !== courant) {
      marquer(planete, 'actif');
      ecartsActif += 1;
    }
  });
  layout.dataset.v2e017Active = String(actifs);
  layout.dataset.v2e017ActiveMismatch = String(ecartsActif);

  /* E017-04 — Doublons de titres de repères : deux planètes portant le même
     titre rendent le diagnostic textuel ambigu, même si leurs clés diffèrent. */
  const titresVus = new Set();
  let doublonsTitre = 0;
  planetes.forEach((planete) => {
    const titre = parties(lire(planete, 'data-label')).titre;
    if (!titre) return;
    if (titresVus.has(titre)) {
      marquer(planete, 'titre-double');
      doublonsTitre += 1;
    } else {
      titresVus.add(titre);
    }
  });
  layout.dataset.v2e017TitleDup = String(doublonsTitre);

  /* E017-05 — Libellés trop longs pour l'infobulle : la rule ::after des
     planètes est limitée à 84 px en 7 px (constellation.js:80-85,136), soit
     environ 42 caractères ; au-delà, le titre est tronqué à l'écran. */
  const LIMITE = 42;
  let longs = 0;
  planetes.forEach((planete) => {
    if (lire(planete, 'data-label').length > LIMITE) {
      marquer(planete, 'long');
      longs += 1;
    }
  });
  layout.dataset.v2e017Long = String(longs);
  layout.dataset.v2e017LongLimit = String(LIMITE);

  /* E017-06 — Égalité exacte de l'année entre data-label et aria-label.
     La passe 1 testait seulement la présence ; ici l'année extraite après le
     dernier séparateur doit être strictement identique, suffixe inclus. */
  let ecartsAnnee = 0;
  planetes.forEach((planete) => {
    const annee = parties(lire(planete, 'data-label')).annee;
    const base = lire(planete, 'aria-label').replace(/,\s*repère sélectionné\s*$/i, '');
    const virgule = base.lastIndexOf(', ');
    const anneeAria = virgule < 0 ? '' : base.slice(virgule + 2).trim();
    if (!annee || annee !== anneeAria) {
      marquer(planete, 'annee');
      ecartsAnnee += 1;
    }
  });
  layout.dataset.v2e017YearMatch = String(ecartsAnnee);

  /* E017-07 — Suite croissante des clés globales planet:N : les repères
     étant filtrés par ère, leurs indices globaux doivent progresser. */
  let ecartsOrdre = 0;
  let precedent = -1;
  planetes.forEach((planete) => {
    const trouvé = /^planet:(\d+)$/.exec(lire(planete, 'data-const-key'));
    const indice = trouvé ? Number(trouvé[1]) : NaN;
    if (!Number.isFinite(indice) || indice <= precedent) {
      marquer(planete, 'ordre');
      ecartsOrdre += 1;
    }
    if (Number.isFinite(indice)) precedent = indice;
  });
  layout.dataset.v2e017Order = String(ecartsOrdre);

  /* E017-08 — Panneau V2 idempotent : une seule section, un titre, une
     région live et une liste de définitions textuelle, reconstruite à chaque
     passage sans laisser de doublon ni de constat périmé. */
  const panneaux = Array.from(layout.querySelectorAll('#' + PANEL_ID));
  panneaux.slice(1).forEach((noeud) => {
    if (noeud.parentNode) noeud.parentNode.removeChild(noeud);
  });
  let panneau = panneaux[0];
  if (!panneau) {
    panneau = creer('section', 'v2e017-panel');
    panneau.id = PANEL_ID;
    layout.appendChild(panneau);
  }
  panneau.setAttribute('aria-labelledby', TITLE_ID);
  let titre = panneau.querySelector('#' + TITLE_ID);
  if (!titre) {
    titre = creer('h3', 'v2e017-title', 'Diagnostic textuel avancé des planètes · V2');
    titre.id = TITLE_ID;
    panneau.insertBefore(titre, panneau.firstChild);
  }
  let live = panneau.querySelector('#' + LIVE_ID);
  if (!live) {
    live = creer('p', 'v2e017-live', '');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    panneau.appendChild(live);
  }
  let liste = panneau.querySelector('#' + LIST_ID);
  if (!liste) {
    liste = creer('dl', 'v2e017-list');
    liste.id = LIST_ID;
    panneau.appendChild(liste);
  }
  while (liste.firstChild) liste.removeChild(liste.firstChild);
  planetes.forEach((planete, index) => {
    const { annee, titre: intitule } = parties(lire(planete, 'data-label'));
    liste.appendChild(creer('dt', 'v2e017-term', `Repère ${index + 1}`));
    liste.appendChild(creer('dd', 'v2e017-def',
      `${annee || 'année absente'} — ${intitule || 'titre absent'}. `
      + `Clé ${lire(planete, 'data-const-key') || 'absente'}.`));
  });
  const signalées = planetes.filter((planete) => lire(planete, 'data-v2e017-flags')).length;
  live.textContent = `Diagnostic V2 : ${planetes.length} planète(s) · `
    + `${ecartsTitle} écart(s) title · ${ecartsRang} écart(s) de rang · `
    + `${ecartsActif} désaccord(s) d'état actif · ${actifs} planète(s) active(s) · `
    + `${doublonsTitre} titre(s) dupliqué(s) · ${longs} libellé(s) trop long(s) · `
    + `${ecartsAnnee} écart(s) d'année · ${ecartsOrdre} écart(s) d'ordre · `
    + `${signalées} planète(s) signalée(s).`;

  /* E017-09 — Restitution clavier V2 : au focus et à l'activation Entrée ou
     Espace d'une planète, la région live propre à la lentille restitue son
     année, son titre et ses écarts. Un seul écouteur par couche, posé en
     délégation ; l'activation native du bouton n'est pas empêchée. */
  const couche = layout.querySelector('.const-layer-planets');
  if (couche && !couche.dataset.v2e017Listener) {
    const annoncer = (planete, prefixe) => {
      if (!planete || !live.parentNode) return;
      const { annee, titre: intitule } = parties(lire(planete, 'data-label'));
      const codes = lire(planete, 'data-v2e017-flags');
      live.textContent = `${prefixe} · ${annee || 'année absente'} — `
        + `${intitule || 'titre absent'}. `
        + (codes ? `Points à revoir : ${codes.replace(/-/g, ' ')}.` : 'Aucun écart détecté.');
    };
    const cible = (evenement) => {
      const noeud = evenement && evenement.target && typeof evenement.target.closest === 'function'
        ? evenement.target.closest('.const-planet') : null;
      return noeud && couche.contains(noeud) ? noeud : null;
    };
    couche.addEventListener('focusin', (evenement) => {
      annoncer(cible(evenement), 'Planète en focus');
    });
    couche.addEventListener('keydown', (evenement) => {
      if (!evenement) return;
      const touche = evenement.key;
      if (touche !== 'Enter' && touche !== ' ' && touche !== 'Spacebar') return;
      annoncer(cible(evenement), 'Repère activé');
    });
    couche.dataset.v2e017Listener = '1';
  }

  /* E017-10 — Verdict agrégé, classe de portée et unique feuille de style :
     le booléen découle des sept mesures ; la préférence de mouvement réduit
     est lue avec repli, sans sonde propre ni animation. */
  const coherent = !ecartsTitle && !ecartsRang && !ecartsActif && actifs <= 1
    && !doublonsTitre && !longs && !ecartsAnnee && !ecartsOrdre;
  layout.classList.add('v2e017');
  layout.dataset.v2e017Verdict = coherent ? 'coherent' : 'a-revoir';
  let calme = false;
  try { calme = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion(); }
  catch { calme = false; }
  if (calme) layout.classList.add('v2e017-steady');
  else layout.classList.remove('v2e017-steady');
  css(CSS_ID, CSS);
});
