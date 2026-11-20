import { register } from './registry.js';

/*
 * Lentille V2 E079 — « Transitions et mouvement » (vue Récit).
 *
 * Dix chantiers neufs, distincts de ceux de la passe 1 (qui traitait déjà la
 * transition de largeur de la barre, le fondu du point, le sens de parcours,
 * le survol du fil, le marqueur courant, le témoin de lecture auto, le fondu
 * du média, la barre de temps, le retour tactile des boutons et la note
 * mouvement). La V2 se concentre sur le RYTHME et les REPÈRES chiffrés du
 * mouvement : cadence par point, échelle de durée, règle de position du fil,
 * compteur de points visités, indicateur de défilement, arrivée de la pastille
 * de certitude, halo de focus des commandes, progression en paliers, panneau
 * d'indicateurs et confort mouvement réduit.
 *
 * Tout chiffre affiché est dérivé du DOM réel (kicker, timing, largeur de
 * remplissage, items du fil, position de défilement). Une seule feuille de
 * styles, injectée une seule fois, classes `recit-v2-e079-*`, ids `v2-e079-*`
 * (jamais les ids `e079-*` de la passe 1 qui tourne sur le même DOM).
 * Zéro console, zéro réseau, zéro aléa. try/catch global, gardes d'existence,
 * idempotence : aucun attribut existant n'est écrasé.
 */

const NOMBRE_PALIERS = 10;

/* État module : persistent entre deux rendus, jamais écrit ailleurs. */
let memoire = {
  cle: null,
  index: null,
  visites: new Set(),
  changements: 0,
  corps: null,
  scrollPrecedent: null,
  sens: 'repos',
};

/* ---------- Utilitaires purs : aucun effet de bord ---------- */

function lireEtape(layout) {
  const kicker = layout.querySelector('.view-kicker');
  const trouve = kicker && /Étape\s+(\d+)\s*\/\s*(\d+)/i.exec(kicker.textContent || '');
  if (!trouve) return { index: null, total: null };
  return { index: parseInt(trouve[1], 10), total: parseInt(trouve[2], 10) };
}

function lireSecondes(layout) {
  const timing = layout.querySelector('.recit-timing');
  const trouve = timing && /≈\s*(\d+)\s*s/i.exec(timing.textContent || '');
  if (!trouve) return null;
  const valeur = parseInt(trouve[1], 10);
  return Number.isFinite(valeur) && valeur > 0 ? valeur : null;
}

function lirePourcentage(layout, etape) {
  const remplissage = layout.querySelector('.recit-progress > span')
    || layout.querySelector('.recit-progress span');
  const largeur = remplissage && remplissage.style
    ? String(remplissage.style.width || '') : '';
  const trouve = /^(\d+(?:\.\d+)?)%$/.exec(largeur);
  if (trouve) {
    const pct = Math.round(parseFloat(trouve[1]));
    if (Number.isFinite(pct)) return Math.max(0, Math.min(100, pct));
  }
  /* Repli : ratio de l'étape, lui aussi issu du DOM (kicker). */
  if (etape.index !== null && etape.total !== null && etape.total > 0) {
    return Math.max(0, Math.min(100, Math.round((etape.index / etape.total) * 100)));
  }
  return 0;
}

function cleDuPoint(layout) {
  const meta = layout.querySelector('.recit-meta');
  if (meta && (meta.textContent || '').trim()) {
    return (meta.textContent || '').split(' · ')[0].trim();
  }
  const titre = layout.querySelector('#recit-point-title');
  return titre ? (titre.textContent || '').trim() : '';
}

function dejaPresent(id, racine) {
  try { if (typeof document !== 'undefined' && document.getElementById(id)) return true; }
  catch { /* document indisponible */ }
  try { if (racine && typeof racine.querySelector === 'function' && racine.querySelector('#' + id)) return true; }
  catch { /* sélecteur invalide */ }
  return false;
}

function insererApres(ancre, noeud, id, racine, secours) {
  if (!noeud || !id || dejaPresent(id, racine)) return null;
  if (!ancre || !ancre.parentNode) {
    if (secours && secours.parentNode && typeof secours.appendChild === 'function') {
      secours.appendChild(noeud);
      return noeud;
    }
    return null;
  }
  ancre.parentNode.insertBefore(noeud, ancre.nextSibling);
  return noeud;
}

/* ---------- Feuille unique ---------- */

const RULES = `
/* E079-01 — cadence de lecture chiffrée. */
.recit-v2-e079-cadence{margin:6px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
/* E079-02 — échelle qualitative de durée. */
.recit-v2-e079-echelle{margin:3px 0 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-v2-e079-echelle strong{color:var(--gold-bright);font-weight:600}
/* E079-03 — règle de position dans le fil. */
.recit-v2-e079-regle{display:flex;flex-wrap:wrap;gap:2px;align-items:center;margin:6px 0 0}
.recit-v2-e079-seg{display:block;width:8px;height:4px;border-radius:2px;background:rgba(255,255,255,.12)}
.recit-v2-e079-seg.is-franchi{background:var(--gold)}
.recit-v2-e079-seg.is-here{height:8px;background:var(--gold-bright)}
.recit-v2-e079-regle-texte{margin:3px 0 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
/* E079-04 — compteur de points visités. */
.recit-v2-e079-visites{margin-left:8px;color:var(--muted-2);font-size:9px;font-variant-numeric:tabular-nums}
/* E079-05 — indicateur de défilement du panneau. */
.recit-v2-e079-scroll{margin-left:8px;color:var(--muted-2);font-size:9px;font-variant-numeric:tabular-nums}
/* E079-06 — arrivée glissée de la pastille de certitude. */
@keyframes recit-v2-e079-conf-in{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
.recit-v2-e079-conf{animation:recit-v2-e079-conf-in 400ms ease-out both}
/* E079-07 — halo de focus animé des commandes. */
@keyframes recit-v2-e079-halo{0%,100%{box-shadow:0 0 0 0 rgba(230,185,111,.35)}50%{box-shadow:0 0 0 4px rgba(230,185,111,.09)}}
.recit-v2-e079-halo:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px;animation:recit-v2-e079-halo 1.2s ease-in-out infinite}
/* E079-08 — progression en paliers. */
.recit-v2-e079-paliers{display:flex;gap:2px;margin:6px 0 0}
.recit-v2-e079-palier{display:block;flex:1 1 0;height:3px;border-radius:2px;background:rgba(255,255,255,.1)}
.recit-v2-e079-palier.is-allume{background:var(--gold)}
.recit-v2-e079-palier-texte{margin:3px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
/* E079-09 — panneau d'indicateurs V2. */
.recit-v2-e079-panel{display:block;margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-v2-e079-panel h2{margin:0 0 6px;color:var(--gold);font-size:12px;font-weight:600}
.recit-v2-e079-panel p{margin:0 0 4px;color:var(--muted);font-size:11px;line-height:1.45;font-variant-numeric:tabular-nums}
.recit-v2-e079-synthese{color:var(--ink-soft)!important}
/* E079-10 — confort mouvement réduit V2. */
.recit-v2-e079-sans-mouvement .recit-v2-e079-conf,
.recit-v2-e079-sans-mouvement .recit-v2-e079-halo:focus-visible{animation:none!important}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e079-conf,
  .recit-v2-e079-halo:focus-visible{animation:none!important}
}
@media (max-width:620px){
  .recit-v2-e079-visites,.recit-v2-e079-scroll{display:block;margin:4px 0 0}
}
`;

/* ---------- E079-01 — cadence de lecture chiffrée ---------- */

function ajouterCadence(el, layout, secondes, etape, timing, secours) {
  if (secondes === null || etape.total === null || etape.total <= 0) return null;
  const parPoint = Math.round(secondes / etape.total);
  const paragraphe = el('p', 'recit-v2-e079-cadence',
    'Cadence : ≈ ' + parPoint + ' s par point sur ' + etape.total + ' point(s) du repère.');
  paragraphe.id = 'v2-e079-cadence';
  return insererApres(timing, paragraphe, 'v2-e079-cadence', layout, secours);
}

/* ---------- E079-02 — échelle qualitative de durée ---------- */

function ajouterEchelle(el, layout, secondes, ancre, secours) {
  if (secondes === null) return null;
  const libelle = secondes < 30 ? 'courte' : (secondes < 90 ? 'moyenne' : 'longue');
  const paragraphe = el('p', 'recit-v2-e079-echelle', '');
  paragraphe.id = 'v2-e079-echelle';
  paragraphe.appendChild(document.createTextNode('Durée estimée : ' + secondes + ' s — lecture '));
  paragraphe.appendChild(el('strong', '', libelle));
  paragraphe.appendChild(document.createTextNode('.'));
  return insererApres(ancre, paragraphe, 'v2-e079-echelle', layout, secours);
}

/* ---------- E079-03 — règle de position dans le fil ---------- */

function ajouterRegle(el, layout, fil, titreFil, items, secours) {
  if (!fil || !items.length) return null;
  const courant = items.findIndex((item) => item.classList.contains('is-current')
    || item.getAttribute('aria-current') === 'step');
  const regle = el('div', 'recit-v2-e079-regle');
  regle.id = 'v2-e079-regle';
  regle.setAttribute('aria-hidden', 'true');
  items.forEach((_, i) => {
    regle.appendChild(el('span', 'recit-v2-e079-seg'
      + (i < courant ? ' is-franchi' : '')
      + (i === courant ? ' is-here' : '')));
  });
  const ancre = titreFil || fil;
  if (!ancre || !ancre.parentNode) return null;
  ancre.parentNode.insertBefore(regle, ancre.nextSibling);
  const texte = el('p', 'recit-v2-e079-regle-texte',
    'Fil : ' + items.length + ' point(s) · position '
    + (courant >= 0 ? (courant + 1) + ' / ' + items.length : '—') + '.');
  texte.id = 'v2-e079-regle-texte';
  insererApres(regle, texte, 'v2-e079-regle-texte', layout, secours);
  return texte;
}

/* ---------- E079-04 — compteur de points visités ---------- */

function mettreAJourMemoire(layout, etape, cle) {
  if (etape.index === null) return;
  if (memoire.cle !== cle) {
    /* Nouveau repère : la série de visites repart de zéro. */
    memoire.visites = new Set([etape.index]);
    memoire.changements = 0;
  } else {
    if (memoire.index !== null && memoire.index !== etape.index) memoire.changements += 1;
    memoire.visites.add(etape.index);
  }
  memoire.cle = cle;
  memoire.index = etape.index;
}

function ajouterVisites(el, layout, meta, timing, secours) {
  const hote = meta || timing;
  if (!hote || dejaPresent('v2-e079-visites', layout)) return null;
  const chip = el('span', 'recit-v2-e079-visites',
    'Points visités : ' + memoire.visites.size + ' · changements : ' + memoire.changements + '.');
  chip.id = 'v2-e079-visites';
  hote.appendChild(chip);
  return chip;
}

/* ---------- E079-05 — indicateur de défilement du panneau ---------- */

function installerScroll(el, layout, corps, meta, timing) {
  const hote = meta || timing;
  if (!corps || !hote || dejaPresent('v2-e079-scroll', layout)) return null;
  const chip = el('span', 'recit-v2-e079-scroll', 'Défilement : ' + memoire.sens + '.');
  chip.id = 'v2-e079-scroll';
  hote.appendChild(chip);
  if (!corps.dataset || !corps.dataset.v2E079Scroll) {
    try {
      if (corps.dataset) corps.dataset.v2E079Scroll = '1';
      memoire.corps = corps;
      memoire.scrollPrecedent = Number(corps.scrollTop) || 0;
      corps.addEventListener('scroll', () => {
        try {
          const courant = Number(corps.scrollTop) || 0;
          const delta = courant - memoire.scrollPrecedent;
          memoire.scrollPrecedent = courant;
          memoire.sens = delta > 1 ? 'bas' : (delta < -1 ? 'haut' : 'repos');
          if (typeof document === 'undefined') return;
          const cible = document.getElementById('v2-e079-scroll');
          if (cible) cible.textContent = 'Défilement : ' + memoire.sens + '.';
          const indicateur = document.getElementById('v2-e079-ind-sens');
          if (indicateur) indicateur.textContent = 'Défilement : ' + memoire.sens + '.';
        } catch { /* défilement non observable : on garde le dernier état */ }
      }, { passive: true });
    } catch { /* écoute impossible : le libellé statique reste lisible */ }
  }
  return chip;
}

/* ---------- E079-06 — arrivée glissée de la pastille de certitude ---------- */

function animerCertitude(layout, confs) {
  let compte = 0;
  confs.forEach((pastille) => {
    if (!pastille.classList || pastille.classList.contains('recit-v2-e079-conf')) return;
    pastille.classList.add('recit-v2-e079-conf');
    compte += 1;
  });
  return compte;
}

/* ---------- E079-07 — halo de focus animé des commandes ---------- */

function animerCommandes(actions) {
  let compte = 0;
  actions.forEach((bouton) => {
    if (!bouton.classList || bouton.classList.contains('recit-v2-e079-halo')) return;
    bouton.classList.add('recit-v2-e079-halo');
    compte += 1;
  });
  return compte;
}

/* ---------- E079-08 — progression en paliers ---------- */

function ajouterPaliers(el, layout, pct, progress, secours) {
  if (!progress || dejaPresent('v2-e079-paliers', layout)) return null;
  const allumes = Math.max(0, Math.min(NOMBRE_PALIERS,
    Math.round((pct / 100) * NOMBRE_PALIERS)));
  const bandeau = el('div', 'recit-v2-e079-paliers');
  bandeau.id = 'v2-e079-paliers';
  bandeau.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < NOMBRE_PALIERS; i += 1) {
    bandeau.appendChild(el('span', 'recit-v2-e079-palier'
      + (i < allumes ? ' is-allume' : '')));
  }
  insererApres(progress, bandeau, 'v2-e079-paliers', layout, secours);
  const texte = el('p', 'recit-v2-e079-palier-texte',
    'Progression : ' + pct + ' % · palier ' + allumes + ' / ' + NOMBRE_PALIERS + '.');
  texte.id = 'v2-e079-palier-texte';
  insererApres(document.getElementById('v2-e079-paliers') || progress,
    texte, 'v2-e079-palier-texte', layout, secours);
  return texte;
}

/* ---------- E079-09 — panneau d'indicateurs V2 ---------- */

const CHAMPS = [
  ['cadence', 'Cadence : —'],
  ['duree', 'Durée : —'],
  ['echelle', 'Échelle : —'],
  ['progression', 'Progression : —'],
  ['fil', 'Fil : —'],
  ['visites', 'Points visités : —'],
  ['sens', 'Défilement : —'],
  ['mouvement', 'Mouvement : —'],
];

function ajouterPanneau(el, stage) {
  if (!stage || typeof stage.appendChild !== 'function') return null;
  const ancien = document.getElementById('v2-e079-indicateurs');
  if (ancien && ancien.parentNode) {
    try { ancien.parentNode.removeChild(ancien); } catch { /* déjà détaché */ }
  }
  const panneau = el('section', 'recit-v2-e079-panel');
  panneau.id = 'v2-e079-indicateurs';
  panneau.setAttribute('data-recitv2-diagnostic', '');
  panneau.setAttribute('aria-label', 'Indicateurs V2 des transitions et du mouvement du récit');
  panneau.appendChild(el('h2', '', 'E079 V2 — Transitions et mouvement · indicateurs'));
  const synthese = el('p', 'recit-v2-e079-synthese', 'Synthèse : —');
  synthese.id = 'v2-e079-synthese';
  synthese.setAttribute('role', 'status');
  synthese.setAttribute('aria-live', 'polite');
  panneau.appendChild(synthese);
  const noeuds = {};
  CHAMPS.forEach(([cle, texte]) => {
    const ligne = el('p', '', texte);
    ligne.id = 'v2-e079-ind-' + cle;
    panneau.appendChild(ligne);
    noeuds[cle] = ligne;
  });
  stage.appendChild(panneau);
  return noeuds;
}

function remplir(noeuds, donnees, sys) {
  if (!noeuds) return;
  const poser = (cle, texte) => {
    const noeud = noeuds[cle];
    if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
  };
  poser('cadence', 'Cadence : ' + (donnees.cadence === null ? '—' : '≈ ' + donnees.cadence + ' s par point'));
  poser('duree', 'Durée : ' + (donnees.secondes === null ? '—' : donnees.secondes + ' s estimées'));
  poser('echelle', 'Échelle : ' + (donnees.echelle || '—'));
  poser('progression', 'Progression : ' + donnees.pct + ' % (palier '
    + donnees.allumes + ' / ' + NOMBRE_PALIERS + ')');
  poser('fil', 'Fil : ' + donnees.items + ' point(s), position '
    + (donnees.courant >= 0 ? (donnees.courant + 1) + ' / ' + donnees.items : '—'));
  poser('visites', 'Points visités : ' + donnees.visites + ' · changements : ' + donnees.changements);
  poser('sens', 'Défilement : ' + memoire.sens);
  poser('mouvement', 'Mouvement : ' + (sys ? 'réduit (V2)' : 'complet (V2)'));

  const synthese = document.getElementById('v2-e079-synthese');
  if (synthese) {
    synthese.textContent = 'Synthèse : ' + donnees.items + ' point(s) au fil, '
      + (donnees.secondes === null ? 'durée non annoncée'
        : donnees.secondes + ' s estimées, cadence ≈ ' + donnees.cadence + ' s/point')
      + ', progression ' + donnees.pct + ' %, '
      + donnees.visites + ' point(s) visité(s).';
  }
}

/* -------------------------------------------------------------------------- *
 * Point d'entrée unique.
 * -------------------------------------------------------------------------- */
register('E079', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { stage, layout, css, el, reducedMotion } = ctx;
    if (typeof css !== 'function' || typeof el !== 'function') return;
    if (!layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e079', RULES);

    const sys = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
    layout.dataset.v2E079Motion = sys ? 'reduce' : 'normal';
    layout.dataset.v2E079 = 'on';
    layout.classList.toggle('recit-v2-e079-sans-mouvement', sys);

    const corps = layout.querySelector('.recit-body');
    const timing = layout.querySelector('.recit-timing');
    const meta = layout.querySelector('.recit-meta');
    const fil = layout.querySelector('.recit-thread')
      || layout.querySelector('#c3a-thread');
    const titreFil = layout.querySelector('.recit-thread-title');
    const progress = layout.querySelector('.recit-progress');
    const confs = Array.from(layout.querySelectorAll('.recit-conf'));
    const actions = Array.from(layout.querySelectorAll('.recit-actions button'));
    const items = Array.from(layout.querySelectorAll('.recit-thread-item'));
    const etape = lireEtape(layout);
    const secondes = lireSecondes(layout);
    const pct = lirePourcentage(layout, etape);
    const cle = cleDuPoint(layout);
    const courant = items.findIndex((item) => item.classList.contains('is-current')
      || item.getAttribute('aria-current') === 'step');
    const allumes = Math.max(0, Math.min(NOMBRE_PALIERS,
      Math.round((pct / 100) * NOMBRE_PALIERS)));

    /* État de parcours mis à jour avant la lecture des panneaux. */
    mettreAJourMemoire(layout, etape, cle);

    /* Chantier 01 et 02 : cadence puis échelle de durée. */
    const cadenceNode = ajouterCadence(el, layout, secondes, etape, timing, corps);
    const echelle = ajouterEchelle(el, layout, secondes,
      cadenceNode || timing, corps);

    /* Chantiers 03 à 05 : règle du fil, visites et défilement. */
    ajouterRegle(el, layout, fil, titreFil, items, corps);
    ajouterVisites(el, layout, meta, timing, corps);
    installerScroll(el, layout, corps, meta, timing);

    /* Chantiers 06 à 08 : pastille, halo de focus et paliers. */
    animerCertitude(layout, confs);
    animerCommandes(actions);
    ajouterPaliers(el, layout, pct, progress, corps);

    /* Chantier 09 et 10 : panneau d'indicateurs puis synthèse chiffrée. */
    const noeuds = ajouterPanneau(el, stage);
    const parPoint = secondes !== null && etape.total !== null && etape.total > 0
      ? Math.round(secondes / etape.total) : null;
    remplir(noeuds, {
      cadence: parPoint,
      secondes,
      echelle: secondes === null ? ''
        : (secondes < 30 ? 'courte' : (secondes < 90 ? 'moyenne' : 'longue')),
      pct,
      allumes,
      items: items.length,
      courant,
      visites: memoire.visites.size,
      changements: memoire.changements,
    }, sys);
  } catch {
    /* Greffon neutralisé silencieusement : la vue reste lisible et utilisable. */
  }
});
