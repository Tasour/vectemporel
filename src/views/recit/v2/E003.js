import { register } from './registry.js';

/*
 * Lentille V2 E003 — « Recherche et filtrage » (vue Récit).
 *
 * Dix chantiers neufs, distincts de la passe 1 : couverture, récapitulatif en
 * phrase, effacement global, profil du fil, mots-clés du point courant,
 * visibilité du point courant, sauts aux extrémités, indicateur de requête,
 * rangs des résultats et panneau d'indicateurs V2.
 *
 * Une seule feuille CSS (identifiant recit-v2-e003), classes `recit-v2-e003-*`, ids
 * `v2-e003-*` (jamais les ids `e003-*` de la passe 1, qui partage le même DOM).
 * Tout chiffre affiché est lu dans le DOM réel (status, kicker, champs, items).
 * Zéro sortie console, zéro appel réseau, zéro aléa, aucune injection de balisage. try/catch global,
 * gardes d'existence, idempotence : aucun attribut existant n'est écrasé.
 */

const MAX_MOTS = 6;
const LONGUEUR_MOT = 5;

/* État module : références du dernier rendu, jamais écrit ailleurs. */
let etat = null;

/* ---------- Utilitaires purs : aucun effet de bord ---------- */

function fold(value) {
  const texte = String(value == null ? '' : value);
  try {
    return typeof texte.normalize === 'function'
      ? texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      : texte.toLowerCase();
  } catch {
    return texte.toLowerCase();
  }
}

/* Totaux lus dans le DOM : l'étape donne le total, le statut donne les affichés. */
function lireTotaux(layout) {
  const kicker = layout.querySelector('.view-kicker');
  const etape = kicker && /Étape\s+(\d+)\s*\/\s*(\d+)/.exec(kicker.textContent || '');
  const totalEtape = etape ? Math.max(0, Number(etape[2])) : 0;
  const statut = layout.querySelector('#c3a-status') || layout.querySelector('.c3a-status');
  const compte = statut && /(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/.exec(statut.textContent || '');
  const affiches = compte ? Math.max(0, Number(compte[1])) : 0;
  const totalStatut = compte ? Math.max(0, Number(compte[2])) : 0;
  return { affiches, total: totalEtape || totalStatut || 0 };
}

/* Critères actifs lus sur le champ et les boutons de la coque. */
function criteresActifs(layout) {
  const actifs = { recherche: '', types: [], certitudes: [] };
  const champ = layout.querySelector('#c3a-search') || layout.querySelector('.c3a-search');
  if (champ && typeof champ.value === 'string') actifs.recherche = champ.value.trim();
  const boutons = layout.querySelectorAll('.c3a-filter[aria-pressed="true"]');
  if (!boutons || typeof boutons.forEach !== 'function') return actifs;
  boutons.forEach((bouton) => {
    const fk = bouton.dataset ? (bouton.dataset.fk || '') : '';
    if (fk === 'c3a-kind-all' || fk === 'c3a-conf-all') return;
    const libelle = (bouton.textContent || '').trim();
    if (fk.indexOf('c3a-kind-') === 0) {
      actifs.types.push({ valeur: fk.slice('c3a-kind-'.length), libelle });
    } else if (fk.indexOf('c3a-conf-') === 0) {
      actifs.certitudes.push({ valeur: fk.slice('c3a-conf-'.length), libelle });
    }
  });
  return actifs;
}

/* Distribution des résultats réellement présents dans le fil. */
function profilDuFil(layout) {
  const items = Array.from(layout.querySelectorAll('.recit-thread-item'));
  const types = new Map();
  const confs = new Map();
  items.forEach((bouton) => {
    const type = (bouton.dataset && bouton.dataset.kind) || 'point';
    const conf = (bouton.dataset && bouton.dataset.confidence) || '—';
    types.set(type, (types.get(type) || 0) + 1);
    confs.set(conf, (confs.get(conf) || 0) + 1);
  });
  const formater = (carte) => {
    const entrees = Array.from(carte.entries())
      .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
      .map(([cle, valeur]) => cle + ' ' + valeur);
    return entrees.join(' · ') || '—';
  };
  return { types: formater(types), confs: formater(confs), nombre: items.length };
}

function texteRequete(champ) {
  const valeur = champ && typeof champ.value === 'string' ? champ.value : '';
  const nettoye = valeur.trim();
  const mots = nettoye ? nettoye.split(/\s+/).filter(Boolean).length : 0;
  return 'Recherche : ' + mots + ' mot(s) · ' + valeur.length + ' caractère(s).';
}

/* Insertion après une ancre, sans jamais réutiliser un id existant. */
function insererApres(ancrage, noeud, id, racine) {
  if (!ancrage || !ancrage.parentNode || !racine || typeof racine.querySelector !== 'function') return false;
  try { if (racine.querySelector('#' + id)) return false; } catch { return false; }
  ancrage.parentNode.insertBefore(noeud, ancrage.nextSibling);
  return true;
}

function poser(apres, noeud, id, racine, secours) {
  if (insererApres(apres, noeud, id, racine)) return noeud;
  if (secours && secours.parentNode && typeof secours.querySelector === 'function'
    && !secours.querySelector('#' + id)) secours.appendChild(noeud);
  return noeud;
}

/* ---------- Feuille unique ---------- */

const RULES = `
.recit-layout[data-v2-e003="on"] .recit-v2-e003-couverture{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px}
.recit-v2-e003-couverture-texte{color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums}
.recit-v2-e003-couverture-piste{flex:1 1 90px;min-width:60px;height:5px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden}
.recit-v2-e003-couverture-rempli{display:block;height:100%;background:var(--gold);transition:width .18s ease}
.recit-layout[data-v2-e003="on"] .recit-v2-e003-recap{margin:0 0 10px;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-layout[data-v2-e003="on"] .recit-v2-e003-ligne{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 10px}
.recit-v2-e003-bouton{min-height:36px;padding:4px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--muted);font:inherit;font-size:9px;cursor:pointer}
.recit-v2-e003-bouton:hover:not(:disabled){border-color:var(--gold);color:var(--ink)}
.recit-v2-e003-bouton:disabled{opacity:.4;cursor:not-allowed}
.recit-v2-e003-bouton:focus-visible,.recit-v2-e003-mot:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-v2-e003-req{color:var(--gold-bright);font-size:9px;font-variant-numeric:tabular-nums}
.recit-layout[data-v2-e003="on"] .recit-v2-e003-masque{margin:0 0 8px;padding:6px 9px;border:1px dashed var(--line-strong);border-radius:8px;color:var(--muted);font-size:9px;line-height:1.5}
.recit-layout[data-v2-e003="on"] .recit-v2-e003-profil{margin:0 0 8px;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-layout[data-v2-e003="on"] .recit-v2-e003-mots{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:0 0 10px}
.recit-v2-e003-mots-label{color:var(--muted-2);font-size:9px}
.recit-v2-e003-mot{min-height:36px;padding:4px 9px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--gold-bright);font:inherit;font-size:9px;cursor:pointer}
.recit-v2-e003-mot:hover{border-color:var(--gold);background:rgba(230,185,111,.1)}
.recit-v2-e003-rang{margin-left:5px;color:var(--muted-2);font-size:8px;font-variant-numeric:tabular-nums}
.recit-v2-e003-panel{display:block;margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-v2-e003-panel h2{margin:0 0 6px;color:var(--gold);font-size:12px;font-weight:600}
.recit-v2-e003-panel p{margin:0 0 4px;color:var(--muted);font-size:11px;line-height:1.45;font-variant-numeric:tabular-nums}
.recit-layout[data-v2-e003="on"].recit-v2-e003-sans-mouvement .recit-v2-e003-couverture-rempli{transition:none!important;animation:none!important}
`;

/* E003-01 — couverture visible des filtres (jauge textuelle) */

function ajouterCouverture(el, layout, totaux, apres, secours) {
  const pct = totaux.total > 0 ? Math.round((totaux.affiches / totaux.total) * 100) : 0;
  const bandeau = el('div', 'recit-v2-e003-couverture');
  bandeau.id = 'v2-e003-couverture';
  bandeau.appendChild(el('span', 'recit-v2-e003-couverture-texte',
    totaux.affiches + ' point(s) affiché(s) sur ' + totaux.total + ' · ' + pct + ' % du repère'));
  const piste = el('span', 'recit-v2-e003-couverture-piste');
  piste.setAttribute('aria-hidden', 'true');
  const remplissage = el('span', 'recit-v2-e003-couverture-rempli');
  remplissage.style.width = pct + '%';
  piste.appendChild(remplissage);
  bandeau.appendChild(piste);
  return { noeud: poser(apres, bandeau, 'v2-e003-couverture', layout, secours), remplissage, pct };
}

/* E003-02 — récapitulatif textuel des critères actifs */

function ajouterRecap(el, layout, actifs, totaux, apres, secours) {
  const morceaux = [];
  if (actifs.recherche) morceaux.push('recherche « ' + actifs.recherche + ' »');
  actifs.types.forEach((type) => morceaux.push('type ' + (type.libelle || type.valeur)));
  actifs.certitudes.forEach((conf) => morceaux.push('certitude ' + (conf.libelle || conf.valeur)));
  const phrase = 'Critères : ' + (morceaux.length ? morceaux.join(' · ') : 'aucun — tous les points du repère')
    + '. ' + totaux.affiches + ' point(s) affiché(s) sur ' + totaux.total + '.';
  const recap = el('p', 'recit-v2-e003-recap', phrase);
  recap.id = 'v2-e003-recap';
  recap.setAttribute('role', 'status');
  recap.setAttribute('aria-live', 'polite');
  return poser(apres, recap, 'v2-e003-recap', layout, secours);
}

/* E003-03 — effacement global des critères */

function effacerTout() {
  if (typeof document === 'undefined') return;
  const champ = document.getElementById('c3a-search');
  if (champ && typeof champ.value === 'string' && champ.value) {
    champ.value = '';
    try { champ.dispatchEvent(new Event('input', { bubbles: true })); } catch { /* sans effet */ }
  }
  ['c3a-kind-all', 'c3a-conf-all'].forEach((fk) => {
    try {
      const bouton = document.querySelector('[data-fk="' + fk + '"][aria-pressed="true"]');
      if (bouton && typeof bouton.click === 'function') bouton.click();
    } catch { /* filtre absent : on continue */ }
  });
}

function ajouterReset(el, ligne, actifs) {
  const deja = ligne.querySelector('#v2-e003-reset');
  if (deja) return deja;
  const bouton = el('button', 'recit-v2-e003-bouton', 'Tout effacer');
  bouton.id = 'v2-e003-reset';
  bouton.type = 'button';
  bouton.disabled = !(actifs.recherche || actifs.types.length || actifs.certitudes.length);
  bouton.setAttribute('aria-label', 'Effacer la recherche et tous les filtres du repère');
  bouton.addEventListener('click', effacerTout);
  ligne.appendChild(bouton);
  return bouton;
}

/* E003-04 — profil du fil courant */

function ajouterProfil(el, layout, profil, apres, secours) {
  const texte = 'Profil du fil : types ['
    + profil.types + '] · certitudes [' + profil.confs + '] sur ' + profil.nombre + ' point(s) affiché(s).';
  const noeud = el('p', 'recit-v2-e003-profil', texte);
  noeud.id = 'v2-e003-profil';
  return poser(apres, noeud, 'v2-e003-profil', layout, secours);
}

/* E003-05 — mots-clés du point courant comme raccourcis */

function chercherMot(mot) {
  if (typeof document === 'undefined') return;
  const champ = document.getElementById('c3a-search');
  if (!champ) return;
  champ.value = mot;
  try { champ.dispatchEvent(new Event('input', { bubbles: true })); } catch { /* sans effet */ }
  try { champ.focus(); } catch { /* focus refusé */ }
}

function ajouterMots(el, layout, titre, apres, secours) {
  const groupe = el('div', 'recit-v2-e003-mots');
  groupe.id = 'v2-e003-mots';
  groupe.appendChild(el('span', 'recit-v2-e003-mots-label', 'Chercher un mot du point :'));
  const vus = new Set();
  const brut = titre && (titre.textContent || '') ? titre.textContent : '';
  String(brut).split(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9]+/).forEach((mot) => {
    if (groupe.querySelectorAll('.recit-v2-e003-mot').length >= MAX_MOTS) return;
    if (mot.length < LONGUEUR_MOT || /^\d+$/.test(mot)) return;
    const cle = fold(mot);
    if (!cle || vus.has(cle)) return;
    vus.add(cle);
    const bouton = el('button', 'recit-v2-e003-mot', mot);
    bouton.type = 'button';
    bouton.setAttribute('aria-label', 'Chercher « ' + mot + ' » dans le repère');
    bouton.addEventListener('click', () => chercherMot(mot));
    groupe.appendChild(bouton);
  });
  if (groupe.querySelectorAll('.recit-v2-e003-mot').length === 0) {
    groupe.appendChild(el('span', 'recit-v2-e003-mots-label', 'aucun mot assez long dans ce point'));
  }
  return poser(apres, groupe, 'v2-e003-mots', layout, secours);
}

/* E003-06 — visibilité du point courant dans le fil */

function ajouterVisibilite(el, layout, apres, secours) {
  const visible = Boolean(layout.querySelector(
    '.recit-thread-item.is-current, .recit-thread-item[aria-current="step"]'));
  const texte = visible
    ? 'Le point affiché est présent dans le fil filtré.'
    : 'Le point affiché est masqué par les filtres actifs : il n’apparaît pas dans le fil.';
  const noeud = el('p', 'recit-v2-e003-masque', texte);
  noeud.id = 'v2-e003-masque';
  noeud.setAttribute('role', 'status');
  noeud.setAttribute('aria-live', 'polite');
  return { noeud: poser(apres, noeud, 'v2-e003-masque', layout, secours), visible };
}

/* E003-07 — sauts rapides aux extrémités du fil */

function sauter(extremite) {
  const cur = etat;
  if (!cur || !cur.layout || !cur.layout.isConnected) return;
  const items = Array.from(cur.layout.querySelectorAll('.recit-thread-item'));
  if (!items.length) return;
  const cible = extremite === 'premier' ? items[0] : items[items.length - 1];
  try { cible.focus(); } catch { /* focus refusé */ }
}

function ajouterSauts(el, ligne) {
  const deja = ligne.querySelector('#v2-e003-saut-premier');
  if (deja) return { premier: deja, dernier: ligne.querySelector('#v2-e003-saut-dernier') };
  const premier = el('button', 'recit-v2-e003-bouton', '⤒ Premier résultat');
  premier.id = 'v2-e003-saut-premier';
  premier.type = 'button';
  premier.setAttribute('aria-label', 'Placer le focus sur le premier résultat affiché');
  premier.addEventListener('click', () => sauter('premier'));
  const dernier = el('button', 'recit-v2-e003-bouton', 'Dernier résultat ⤓');
  dernier.id = 'v2-e003-saut-dernier';
  dernier.type = 'button';
  dernier.setAttribute('aria-label', 'Placer le focus sur le dernier résultat affiché');
  dernier.addEventListener('click', () => sauter('dernier'));
  ligne.append(premier, dernier);
  return { premier, dernier };
}

/* E003-08 — indicateur de requête (mots et caractères) */

function installerRequete(el, ligne, champ) {
  const deja = ligne.querySelector('#v2-e003-req');
  if (deja) return deja;
  const noeud = el('span', 'recit-v2-e003-req', texteRequete(champ));
  noeud.id = 'v2-e003-req';
  noeud.setAttribute('role', 'status');
  noeud.setAttribute('aria-live', 'polite');
  ligne.appendChild(noeud);
  if (champ && !champ.dataset.v2e003Req) {
    champ.dataset.v2e003Req = '1';
    champ.addEventListener('input', () => {
      const frais = document.getElementById('c3a-search');
      const cible = document.getElementById('v2-e003-req');
      if (frais && cible) cible.textContent = texteRequete(frais);
    });
  }
  return noeud;
}

/* E003-09 — rang des résultats affichés */

function ajouterRangs(el, layout, items) {
  let comptes = 0;
  items.forEach((bouton, index) => {
    if (bouton.querySelector('.recit-v2-e003-rang')) return;
    const rang = el('span', 'recit-v2-e003-rang', (index + 1) + '/' + items.length);
    rang.setAttribute('aria-hidden', 'true');
    bouton.appendChild(rang);
    comptes += 1;
  });
  return comptes;
}

/* E003-10 — panneau d'indicateurs V2 (tiroir diagnostic) */

const CHAMPS = [
  ['total', 'Points du repère : —'],
  ['affiches', 'Points affichés : —'],
  ['masques', 'Points masqués par les filtres : —'],
  ['couverture', 'Couverture : —'],
  ['criteres', 'Critères actifs : —'],
  ['recherche', 'Recherche : —'],
  ['profil', 'Profil du fil : —'],
  ['courant', 'Rang du point courant : —'],
  ['visibilite', 'Point courant dans le fil : —'],
  ['mouvement', 'Mouvement : —'],
];

function ajouterIndicateurs(el, stage) {
  const ancien = document.getElementById('v2-e003-indicateurs');
  if (ancien && ancien.parentNode) {
    try { ancien.parentNode.removeChild(ancien); } catch { /* déjà détaché */ }
  }
  const panneau = el('section', 'recit-v2-e003-panel');
  panneau.id = 'v2-e003-indicateurs';
  panneau.setAttribute('data-recitv2-diagnostic', '');
  panneau.setAttribute('aria-label', 'Indicateurs V2 de la recherche et du filtrage du récit');
  panneau.appendChild(el('h2', '', 'E003 V2 — Recherche et filtrage · indicateurs'));
  const noeuds = {};
  CHAMPS.forEach(([cle, texte]) => {
    const ligne = el('p', '', texte);
    ligne.id = 'v2-e003-ind-' + cle;
    panneau.appendChild(ligne);
    noeuds[cle] = ligne;
  });
  stage.appendChild(panneau);
  return noeuds;
}

function mesurer() {
  const cur = etat;
  if (!cur || !cur.refs || !cur.refs.ind || !cur.donnees) return;
  const d = cur.donnees;
  const poser = (cle, texte) => {
    const noeud = cur.refs.ind[cle];
    if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
  };
  const noms = [];
  if (d.actifs.recherche) noms.push('recherche');
  d.actifs.types.forEach((t) => noms.push('type ' + (t.libelle || t.valeur)));
  d.actifs.certitudes.forEach((c) => noms.push('certitude ' + (c.libelle || c.valeur)));
  poser('total', 'Points du repère : ' + d.totaux.total + '.');
  poser('affiches', 'Points affichés : ' + d.totaux.affiches + '.');
  poser('masques', 'Points masqués par les filtres : '
    + Math.max(0, d.totaux.total - d.totaux.affiches) + '.');
  poser('couverture', 'Couverture : ' + d.pct + ' % du repère (jauge ' + d.pct + ' %).');
  poser('criteres', 'Critères actifs : ' + noms.length + ' (' + (noms.join(' · ') || 'aucun') + ').');
  poser('recherche', d.texteRequete);
  poser('profil', 'Profil du fil : types [' + d.profil.types + '] · certitudes [' + d.profil.confs + '].');
  poser('courant', 'Rang du point courant : '
    + (d.courantIndex >= 0 ? (d.courantIndex + 1) + ' / ' + d.items.length : '—') + '.');
  poser('visibilite', 'Point courant dans le fil : ' + (d.visible ? 'oui' : 'non') + '.');
  poser('mouvement', 'Mouvement : ' + (cur.sys ? 'réduit (système)' : 'complet')
    + ' · jauge ' + (cur.sys ? 'sans transition' : 'avec transition') + '.');
}

/* -------------------------------------------------------------------------- *
 * Point d'entrée unique.
 * -------------------------------------------------------------------------- */
register('E003', (ctx) => {
  try {
    if (!ctx || !ctx.stage || !ctx.layout || typeof document === 'undefined') return;
    const { stage, layout, css, el, reducedMotion } = ctx;
    if (typeof css !== 'function' || typeof el !== 'function') return;
    if (typeof layout.querySelector !== 'function') return;
    css('recit-v2-e003', RULES);

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const sys = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
    layout.dataset.v2E003 = 'on';
    layout.classList.toggle('recit-v2-e003-sans-mouvement', sys);

    const totaux = lireTotaux(layout);
    const actifs = criteresActifs(layout);
    const profil = profilDuFil(layout);
    const items = Array.from(layout.querySelectorAll('.recit-thread-item'));
    const pct = totaux.total > 0 ? Math.round((totaux.affiches / totaux.total) * 100) : 0;
    const statut = layout.querySelector('#c3a-status') || layout.querySelector('.c3a-status');
    const outils = layout.querySelector('#c3a-tools') || layout.querySelector('.c3a-tools');
    const champ = layout.querySelector('#c3a-search') || layout.querySelector('.c3a-search');
    const fil = layout.querySelector('.recit-thread');
    const titre = layout.querySelector('#recit-point-title') || layout.querySelector('.recit-title');

    etat = {
      stage, layout, el, sys,
      refs: {},
      donnees: {
        totaux, actifs, profil, items, pct,
        texteRequete: texteRequete(champ),
        courantIndex: items.findIndex((bouton) =>
          bouton.getAttribute('aria-current') === 'step' || bouton.classList.contains('is-current')),
        visible: false,
      },
    };

    /* Chantiers 01 à 03 : couverture, récapitulatif et effacement global. */
    const couverture = ajouterCouverture(el, layout, totaux, statut, corps);
    const recap = ajouterRecap(el, layout, actifs, totaux,
      couverture.noeud.parentNode ? couverture.noeud : statut, corps);

    const ligne = el('div', 'recit-v2-e003-ligne');
    ligne.id = 'v2-e003-ligne';
    if (!insererApres(outils, ligne, 'v2-e003-ligne', layout) && corps.parentNode) {
      if (!corps.querySelector('#v2-e003-ligne')) corps.appendChild(ligne);
    }
    ajouterReset(el, ligne, actifs);
    installerRequete(el, ligne, champ);
    ajouterSauts(el, ligne);

    /* Chantiers 04 à 07 : profil, mots-clés, visibilité et sauts. */
    const ancreFil = fil || statut;
    const visibilite = ajouterVisibilite(el, layout, ancreFil, corps);
    ajouterProfil(el, layout, profil, visibilite.noeud.parentNode ? visibilite.noeud : ancreFil, corps);
    ajouterMots(el, layout, titre,
      layout.querySelector('#v2-e003-profil') || visibilite.noeud, corps);
    etat.donnees.visible = visibilite.visible;

    /* Chantiers 08 et 09 : indicateur de requête (posé plus haut) et rangs. */
    ajouterRangs(el, layout, items);

    /* Chantier 10 : panneau d'indicateurs puis synthèse chiffrée. */
    etat.refs.ind = ajouterIndicateurs(el, stage);
    etat.refs.couverture = couverture.noeud;
    etat.refs.recap = recap;
    mesurer();
  } catch {
    /* Greffon neutralisé silencieusement : la vue reste lisible et utilisable. */
  }
});
