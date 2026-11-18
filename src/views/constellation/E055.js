import { register } from './registry.js';

/* Lentille E055 — adaptabilité responsive du focus et de la tabulation de la vue
   Constellation. Dix chantiers indépendants, tous dérivés du DOM existant : une
   sonde de largeur, trois régimes, une feuille unique, des paliers de focus, une
   cible tactile, un guide, un marquage, deux raccourcis clavier et une annonce
   vive. Aucun fichier partagé n'est modifié ; le greffon reste tolérant. */

const INSTALLE = new WeakSet();
const FENETRES = new WeakSet();
const RAFRAICHISSEURS = new WeakMap();
let courant = null;

const LARGEUR_PLANCHER = 320;
const LARGEUR_PLAFOND = 2400;
const SEUIL_COMPACT = 620;
const SEUIL_LARGE = 1000;

const GROUPES = [
  { cle: 'ere', nom: 'ères', calque: '.const-layer-suns' },
  { cle: 'repere', nom: 'repères', calque: '.const-layer-planets' },
  { cle: 'point', nom: 'points vérifiés', calque: '.const-layer-moons' },
];

/* Largeur bornée, lue une seule fois par passe : aucune mesure périodique. */
function largeurMesuree(layout) {
  try {
    const brut = layout && typeof layout.clientWidth === 'number' ? layout.clientWidth : 0;
    if (!Number.isFinite(brut) || brut <= 0) return SEUIL_LARGE;
    return Math.max(LARGEUR_PLANCHER, Math.min(LARGEUR_PLAFOND, Math.round(brut)));
  } catch {
    return SEUIL_LARGE;
  }
}

/* Trois régimes déterministes, sans état caché ni tirage aléatoire. */
function regimeDe(largeur) {
  if (largeur <= SEUIL_COMPACT) return 'compact';
  if (largeur < SEUIL_LARGE) return 'moyen';
  return 'large';
}

/* Feuille unique : toutes les règles sont conditionnées à data-e055-ready. */
const CSS = `
  .constellation-layout[data-e055-ready='1'] .constellation-field button {
    outline: 2px solid transparent;
    outline-offset: 2px;
  }
  .constellation-layout[data-e055-ready='1'] .constellation-field button:focus-visible {
    outline-style: solid;
    outline-color: var(--gold-bright);
  }
  .constellation-layout[data-e055-ready='1'] .constellation-field button[data-e055-anneau='2']:focus-visible { outline-width: 2px; outline-offset: 2px; }
  .constellation-layout[data-e055-ready='1'] .constellation-field button[data-e055-anneau='3']:focus-visible { outline-width: 3px; outline-offset: 3px; }
  @supports not selector(:focus-visible) {
    .constellation-layout[data-e055-ready='1'] .constellation-field button:focus { outline-style: solid; outline-color: var(--gold-bright); }
  }
  .constellation-layout[data-e055-ready='1'][data-e055-mode='compact'] .constellation-field button[data-e055-tactile='1']::before {
    content: '';
    position: absolute;
    left: 50%; top: 50%;
    width: 44px; height: 44px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    pointer-events: auto;
  }
  .constellation-layout[data-e055-ready='1'] .e055-guide { margin: 12px 0 0; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255,255,255,.02); color: var(--ink-soft); font-size: 9px; line-height: 1.55; }
  .constellation-layout[data-e055-ready='1'] .e055-guide-titre { margin: 0 0 6px; color: var(--gold-bright); font-family: var(--serif); font-size: 11px; font-weight: 500; }
  .constellation-layout[data-e055-ready='1'] .e055-guide-desc { margin: 0 0 8px; color: var(--muted); }
  .constellation-layout[data-e055-ready='1'] .e055-guide-liste { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px 12px; margin: 0; padding-left: 18px; }
  .constellation-layout[data-e055-ready='1'] .e055-guide-item { padding: 2px 0; color: var(--ink); }
  .constellation-layout[data-e055-ready='1'] .e055-metrics { margin: 6px 0 0; color: var(--muted); font-variant-numeric: tabular-nums; }
  .constellation-layout[data-e055-ready='1'] .e055-status { margin: 4px 0 0; color: var(--ink-soft); }
  @media (max-width: 620px) {
    .constellation-layout[data-e055-ready='1'] .e055-guide-liste { grid-template-columns: 1fr; }
    .constellation-layout[data-e055-ready='1'] .e055-guide { padding: 8px 10px; }
  }
  .constellation-layout[data-e055-motion='reduce'][data-e055-ready='1'] .constellation-field button { transition: none !important; }
  @media (prefers-reduced-motion: reduce) {
    .constellation-layout[data-e055-ready='1'] .constellation-field button { transition: none !important; }
  }
`;

register('E055', (ctx) => {
  /* Contrat : ctx.layout est exigé avant la moindre insertion dans le DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  const layout = ctx.layout;

  try {
    if (INSTALLE.has(layout)) return;
    const faire = typeof ctx.el === 'function' ? ctx.el : null;
    const css = typeof ctx.css === 'function' ? ctx.css : null;
    if (!faire || !css) return;
    const doc = layout.ownerDocument || (typeof document === 'undefined' ? null : document);
    if (!doc) return;
    const win = doc.defaultView || null;
    const head = layout.querySelector('.constellation-head');
    const caption = layout.querySelector('.constellation-caption');
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() === true;
    const cibles = Array.from(layout.querySelectorAll('.constellation-field button'));

    let largeur = SEUIL_LARGE;
    let regime = 'large';
    let metrique = null;

    /* E055-01 — sonde de largeur bornée et écouteur de redimensionnement unique. */
    function ecrireLargeur() {
      if (courant !== layout) return;
      largeur = largeurMesuree(layout);
      if (layout.dataset) layout.dataset.e055Largeur = String(largeur);
    }
    courant = layout;
    ecrireLargeur();
    RAFRAICHISSEURS.set(layout, () => {
      ecrireLargeur();
      appliquerRegime();
      appliquerAnneau();
      appliquerTactile();
      ecrireMetique();
    });
    if (win && typeof win.addEventListener === 'function' && !FENETRES.has(win)) {
      FENETRES.add(win);
      win.addEventListener('resize', () => {
        try {
          const action = RAFRAICHISSEURS.get(courant);
          if (typeof action === 'function') action();
        } catch {
          return; /* tolérance : un redimensionnement inattendu est ignoré */
        }
      });
    }

    /* E055-02 — classification en trois régimes et bandeau chiffré mis à jour. */
    metrique = faire('p', 'e055-metrics', 'Mesure de tabulation en cours.');
    metrique.id = 'e055-metrics';
    if (caption && typeof caption.insertBefore === 'function') caption.insertBefore(metrique, caption.firstChild);
    else if (typeof layout.appendChild === 'function') layout.appendChild(metrique);

    function ecrireMetique() {
      if (!metrique || !metrique.dataset) return;
      const details = GROUPES.map((groupe) => (
        `${groupe.nom} ${cibles.filter((noeud) => noeud.dataset && noeud.dataset.e055Groupe === groupe.cle).length}`
      )).join(' · ');
      metrique.textContent = `Régime ${regime} · ${cibles.length} cible${cibles.length > 1 ? 's' : ''} · ${details} · seuils ${SEUIL_COMPACT}/${SEUIL_LARGE} px`;
      metrique.dataset.e055Cibles = String(cibles.length);
      metrique.dataset.e055Groupes = String(GROUPES.length);
      metrique.dataset.e055Regime = regime;
    }
    function appliquerRegime() {
      if (!layout.dataset) return;
      regime = regimeDe(largeur);
      layout.dataset.e055Mode = regime;
      layout.dataset.e055Seuils = `${SEUIL_COMPACT}/${SEUIL_LARGE}`;
      ecrireMetique();
    }
    appliquerRegime();

    /* E055-03 — feuille CSS unique, activation atomique et repli mouvement réduit. */
    css('constellation-e055', CSS);
    if (reduit && layout.dataset) layout.dataset.e055Motion = 'reduce';

    /* E055-04 — anneau de focus à trois paliers porté par chaque cible. */
    function appliquerAnneau() {
      const palier = regime === 'compact' ? '3' : '2';
      cibles.forEach((bouton) => {
        if (bouton && bouton.dataset) bouton.dataset.e055Anneau = palier;
      });
    }
    appliquerAnneau();

    /* E055-05 — surface tactile de 44 px réservée au régime compact. */
    function appliquerTactile() {
      const etat = regime === 'compact' ? '1' : '0';
      cibles.forEach((bouton) => {
        if (bouton && bouton.dataset) bouton.dataset.e055Tactile = etat;
      });
    }
    appliquerTactile();

    /* E055-06 — guide de tabulation visible, replié en une colonne sur mobile. */
    const guide = faire('section', 'e055-guide');
    guide.id = 'e055-guide';
    guide.setAttribute('aria-labelledby', 'e055-guide-titre');
    const titreGuide = faire('h3', 'e055-guide-titre', 'Tabulation de la constellation');
    titreGuide.id = 'e055-guide-titre';
    const descriptionGuide = faire('p', 'e055-guide-desc',
      'Tab parcourt les trois groupes dans l’ordre. Début et Fin rejoignent la première et la dernière cible ; les flèches gauche et droite restent dans le groupe, les flèches haut et bas changent de groupe.');
    descriptionGuide.id = 'e055-guide-desc';
    const listeGuide = faire('ol', 'e055-guide-liste');
    listeGuide.id = 'e055-guide-liste';
    GROUPES.forEach((groupe, index) => {
      const item = faire('li', 'e055-guide-item',
        `${index + 1}. ${groupe.nom} — cibles regroupées dans leur calque`);
      item.dataset.e055Groupe = groupe.cle;
      listeGuide.appendChild(item);
    });
    guide.append(titreGuide, descriptionGuide, listeGuide);
    if (head && typeof head.after === 'function') head.after(guide);
    else if (typeof layout.appendChild === 'function') layout.appendChild(guide);

    /* E055-07 — marquage des calques et des cibles, rattachement au guide. */
    GROUPES.forEach((groupe, index) => {
      const calque = layout.querySelector(groupe.calque);
      if (!calque || !calque.dataset) return;
      calque.dataset.e055Groupe = groupe.cle;
      calque.dataset.e055Rang = String(index + 1);
      const libelle = calque.getAttribute('aria-label');
      if (libelle) calque.setAttribute('aria-label',
        `${libelle} · groupe ${index + 1} sur ${GROUPES.length} de la tabulation`);
    });
    cibles.forEach((bouton, index) => {
      if (!bouton || !bouton.setAttribute || !bouton.dataset) return;
      bouton.dataset.e055Tab = String(index + 1);
      const calque = typeof bouton.closest === 'function' ? bouton.closest('.const-layer') : null;
      if (calque && calque.dataset) bouton.dataset.e055Groupe = calque.dataset.e055Groupe || '';
      bouton.setAttribute('aria-keyshortcuts', 'Home End ArrowLeft ArrowRight ArrowUp ArrowDown');
      if (!bouton.hasAttribute('aria-describedby')) bouton.setAttribute('aria-describedby', 'e055-guide-desc');
    });
    ecrireMetique();

    /* E055-08 — raccourcis Début et Fin sur l'ensemble des cibles. */
    layout.addEventListener('keydown', (evenement) => {
      if (!evenement || (evenement.key !== 'Home' && evenement.key !== 'End')) return;
      if (!cibles.length) return;
      const cible = evenement.key === 'Home' ? cibles[0] : cibles[cibles.length - 1];
      if (!cible || typeof cible.focus !== 'function') return;
      evenement.preventDefault();
      cible.focus({ preventScroll: true });
    });

    /* E055-09 — flèches latérales intra-groupe, flèches verticales inter-groupes. */
    layout.addEventListener('keydown', (evenement) => {
      if (!evenement || evenement.altKey || evenement.ctrlKey || evenement.metaKey) return;
      const cle = evenement.key;
      if (cle !== 'ArrowLeft' && cle !== 'ArrowRight' && cle !== 'ArrowUp' && cle !== 'ArrowDown') return;
      const origine = evenement.target && typeof evenement.target.closest === 'function'
        ? evenement.target.closest('.constellation-field button[data-e055-tab]') : null;
      if (!origine || !layout.contains(origine) || !origine.dataset) return;
      let cible = null;
      if (cle === 'ArrowLeft' || cle === 'ArrowRight') {
        const memeGroupe = cibles.filter((noeud) => noeud.dataset && noeud.dataset.e055Groupe === origine.dataset.e055Groupe);
        const position = memeGroupe.indexOf(origine);
        cible = cle === 'ArrowRight' ? memeGroupe[position + 1] : memeGroupe[position - 1];
      } else {
        const index = GROUPES.findIndex((groupe) => groupe.cle === origine.dataset.e055Groupe);
        const voisin = GROUPES[cle === 'ArrowDown' ? index + 1 : index - 1];
        if (voisin) cible = cibles.find((noeud) => noeud.dataset && noeud.dataset.e055Groupe === voisin.cle) || null;
      }
      if (!cible || typeof cible.focus !== 'function') return;
      evenement.preventDefault();
      cible.focus({ preventScroll: true });
    });

    /* E055-10 — région live : annonce du groupe, du rang et du régime au focus. */
    const status = faire('p', 'e055-status', 'Tab pour entrer dans la constellation.');
    status.id = 'e055-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    if (caption && typeof caption.appendChild === 'function') caption.appendChild(status);
    else if (typeof layout.appendChild === 'function') layout.appendChild(status);
    layout.addEventListener('focusin', (evenement) => {
      const cible = evenement && evenement.target && typeof evenement.target.closest === 'function'
        ? evenement.target.closest('.constellation-field button[data-e055-tab]') : null;
      if (!cible || !layout.contains(cible) || !cible.dataset) return;
      const groupe = GROUPES.find((item) => item.cle === cible.dataset.e055Groupe);
      status.textContent = `${groupe ? groupe.nom : 'cible'} : élément ${cible.dataset.e055Tab} sur ${cibles.length} · régime ${regime} · largeur mesurée ${largeur} px`;
    });

    /* E055-03 (fin) — les règles ne s'activent qu'après toutes les mutations. */
    if (layout.dataset) layout.dataset.e055Ready = '1';
  } catch {
    return; /* greffon tolérant : neutralisé sans interrompre le rendu */
  }
});
