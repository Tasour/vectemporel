import { register } from './registry.js';

/* Lentille V2 E096 — gestion de l'état du champ d'étoiles. Seconde passe :
   dix chantiers inédits, tous implémentés, sans réseau, sans source aléatoire
   et sans minuteur ni boucle d'animation propre. Préfixe exclusif : v2e096
   (aucune collision avec la passe 1). */

/* État conservé entre les rendus, ventilé par portée (pays affiché). Les
   changements ne sont observés que lors d'une passe : aucun minuteur, aucune
   boucle d'animation, aucune sonde propre. */
const etatsParPortee = new Map();
const LIMITE_JOURNAL = 8;
const NOMS_COUCHES = { ere: 'ère', repere: 'repère', point: 'point' };

/* Normalisation stable (accents, casse, séparateurs) pour la clé de portée. */
const normaliser = value => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* Empreinte FNV-1a 32 bits : déterministe et reproductible, sans aléa. */
const empreinteDe = value => {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};

const etatDe = scope => {
  let etat = etatsParPortee.get(scope);
  if (!etat) {
    etat = {
      empreinte: null,
      horloge: 0,
      journal: [],
      premierVu: new Map(),
      selection: null,
      serie: 0,
      passage: 0,
    };
    etatsParPortee.set(scope, etat);
  }
  return etat;
};

register('E096', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : marqueurs de changement, fiche repliable,
     région live et repli « mouvement réduit ». Aucune couleur n'est le seul
     vecteur d'information. */
  css('constellation-v2-e096', `
.v2e096-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e096-changed{outline:2px dashed var(--gold-bright);outline-offset:2px}
.v2e096-incoherent{outline:2px double var(--gold-bright);outline-offset:2px}
.v2e096-fiche{margin:8px 0 0;border:1px solid var(--gold);border-radius:8px;background:var(--surface-2);color:inherit}
.v2e096-fiche>summary{min-height:36px;display:flex;align-items:center;padding:6px 12px;cursor:pointer;color:var(--gold-bright);font-size:12px}
.v2e096-fiche>summary:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px}
.v2e096-fiche-corps{padding:4px 12px 10px;font-size:11px;line-height:1.5}
.v2e096-fiche-corps p,.v2e096-fiche-corps li{margin:2px 0}
.v2e096-calm .v2e096-changed,.v2e096-calm .v2e096-incoherent{outline-style:solid}
@media (prefers-reduced-motion: reduce){.v2e096-fiche *{transition:none!important}}
`);

  const creer = (tag, className, text) => {
    const noeud = typeof ctx.el === 'function'
      ? ctx.el(tag, className, text)
      : document.createElement(tag);
    if (text !== undefined && noeud.textContent !== text) noeud.textContent = text;
    return noeud;
  };

  const couches = [
    { nom: 'ere', classe: 'const-layer-suns' },
    { nom: 'repere', classe: 'const-layer-planets' },
    { nom: 'point', classe: 'const-layer-moons' },
  ];
  const coucheDe = nom => couches.filter(couche => couche.nom === nom)[0];

  /* E096-01 — Portée du champ et état persistant par pays. Le titre de la vue
     sert de clé : changer de pays réinitialise l'historique au lieu de
     contaminer la synthèse avec des ères étrangères. */
  const titre = layout.querySelector('.constellation-title');
  const portee = normaliser(titre ? titre.textContent : '') || 'sans-titre';
  const etat = etatDe(portee);
  etat.passage += 1;
  const passage = etat.passage;
  layout.dataset.v2e096Portee = portee;
  layout.dataset.v2e096Passage = String(passage);

  /* Lecture préparatoire : clés actives et effectifs, depuis le DOM déjà rendu.
     La lentille n'interprète pas le store et ne modifie aucune sélection. */
  const lire = () => {
    const resultat = { ere: null, repere: null, point: null, noeuds: {} };
    couches.forEach(couche => {
      const coucheDom = layout.querySelector(`.${couche.classe}`);
      const noeuds = coucheDom
        ? Array.from(coucheDom.querySelectorAll('button[data-const-key]')) : [];
      resultat.noeuds[couche.nom] = noeuds;
      const actif = noeuds.filter(noeud => noeud.classList.contains('is-active'))[0];
      resultat[couche.nom] = actif ? actif.dataset.constKey : null;
    });
    return resultat;
  };
  const lu = lire();
  const etatTexte = `${lu.ere || '-'}|${lu.repere || '-'}|${lu.point || '-'}`;
  const empreinte = empreinteDe(etatTexte);
  const precedente = etat.empreinte;
  const change = precedente !== null && precedente !== empreinte;

  /* Réinitialisation locale des marqueurs : chaque passe part d'un champ
     propre, ce qui rend les chantiers 05 et 08 idempotents. */
  couches.forEach(couche => {
    const coucheDom = layout.querySelector(`.${couche.classe}`);
    if (!coucheDom) return;
    delete coucheDom.dataset.v2e096Diff;
    delete coucheDom.dataset.v2e096Keycheck;
    coucheDom.classList.remove('v2e096-changed', 'v2e096-incoherent');
  });

  /* E096-02 — Empreinte d'état déterministe. Les clés `data-const-key` des
     actifs sont hachées (FNV-1a) en une signature courte, adressable en un
     seul attribut, distincte du simple texte sérialisé. */
  layout.dataset.v2e096Empreinte = empreinte;
  layout.dataset.v2e096Etat = etatTexte;

  /* E096-03 — Horloge logique de changement. Le compteur n'avance que quand
     l'empreinte diffère de la passe précédente : il mesure les états distincts
     observés, et non le nombre de rendus. */
  if (change) etat.horloge += 1;
  etat.empreinte = empreinte;
  layout.dataset.v2e096Horloge = String(etat.horloge);

  /* E096-04 — Journal circulaire borné des empreintes. Les huit dernières
     signatures sont conservées et un marqueur signale le retour à un état
     déjà vu, sans table croissante ni source aléatoire. */
  if (etat.journal[etat.journal.length - 1] !== empreinte) {
    etat.journal.push(empreinte);
    if (etat.journal.length > LIMITE_JOURNAL) etat.journal.shift();
  }
  const revisit = etat.journal.slice(0, -1).indexOf(empreinte) !== -1;
  layout.dataset.v2e096Journal = etat.journal.join('>');
  layout.dataset.v2e096Revisit = revisit ? '1' : '0';

  /* E096-05 — Différentiel de sélection entre passes, par couche. Une région
     live distincte n'annonce que les changements réels : les passes stables
     restent silencieuses, contrairement à l'annonce systématique de la passe 1. */
  let changeLive = layout.querySelector('#v2e096-change-live');
  if (!changeLive) {
    changeLive = creer('p', 'v2e096-sr', '');
    changeLive.id = 'v2e096-change-live';
    changeLive.setAttribute('role', 'status');
    changeLive.setAttribute('aria-live', 'polite');
    changeLive.setAttribute('aria-atomic', 'true');
    layout.appendChild(changeLive);
  }
  if (etat.selection) {
    const changes = couches
      .filter(couche => etat.selection[couche.nom] !== lu[couche.nom])
      .map(couche => couche.nom);
    const texteDiff = changes.length ? changes.join(',') : 'aucun';
    layout.dataset.v2e096Diff = texteDiff;
    changes.forEach(nom => {
      const coucheDom = layout.querySelector(`.${coucheDe(nom).classe}`);
      if (!coucheDom) return;
      coucheDom.dataset.v2e096Diff = '1';
      coucheDom.classList.add('v2e096-changed');
    });
    if (changes.length && changeLive) {
      changeLive.textContent = `Changement d’état : ${changes.map(nom => NOMS_COUCHES[nom]).join(', ')} — passage ${passage}, horloge ${etat.horloge}.`;
    }
  } else {
    layout.dataset.v2e096Diff = 'initial';
  }
  etat.selection = { ere: lu.ere, repere: lu.repere, point: lu.point };

  /* E096-06 — Série de stabilité consécutive : nombre de passes partageant la
     même empreinte. Remise à zéro au premier changement, lisible en attribut. */
  if (precedente === null || change) etat.serie = 0;
  else etat.serie += 1;
  layout.dataset.v2e096Serie = String(etat.serie);

  /* E096-07 — Âge de l'état : nombre de changements depuis sa première
     apparition dans cette portée. Une table locale mémorise l'horloge de
     première vue, sans horodatage système ni minuteur. */
  if (!etat.premierVu.has(empreinte)) etat.premierVu.set(empreinte, etat.horloge);
  layout.dataset.v2e096Age = String(etat.horloge - etat.premierVu.get(empreinte));

  /* E096-08 — Cohérence hiérarchique inter-couches : le libellé de la couche
     des points doit nommer le repère actif. Un point sans repère ou un libellé
     divergent est signalé, jamais réparé, et reste visible par un contour. */
  const couchePlanets = layout.querySelector('.const-layer-planets');
  const coucheMoons = layout.querySelector('.const-layer-moons');
  const planeteActive = couchePlanets && couchePlanets.querySelector('button.is-active');
  const lunes = coucheMoons ? coucheMoons.querySelectorAll('button') : [];
  let hierarchie = 'non-verifiable';
  if (lunes.length) {
    if (!planeteActive) hierarchie = 'incoherent';
    else {
      const titreRepere = String(planeteActive.dataset.label || '')
        .split('·').slice(1).join('·').trim();
      const libelle = coucheMoons.getAttribute('aria-label') || '';
      hierarchie = (titreRepere && libelle.indexOf(titreRepere) !== -1)
        ? 'coherent' : 'incoherent';
    }
  } else if (planeteActive) {
    hierarchie = 'coherent';
  }
  layout.dataset.v2e096Hierarchie = hierarchie;
  if (hierarchie === 'incoherent') {
    if (coucheMoons) coucheMoons.classList.add('v2e096-incoherent');
    if (couchePlanets) couchePlanets.classList.add('v2e096-incoherent');
  }

  /* E096-09 — Intégrité des clés : unicité et contiguïté des indices par
     couche. Les repères utilisent des clés globales (trous légitimes), donc
     seule l'unicité y est contrôlée ; ères et points exigent la contiguïté. */
  let doublons = 0;
  let trous = 0;
  couches.forEach(couche => {
    const coucheDom = layout.querySelector(`.${couche.classe}`);
    if (!coucheDom) return;
    const noeuds = Array.from(coucheDom.querySelectorAll('button[data-const-key]'));
    const indices = noeuds.map(noeud => {
      const found = /:(\d+)$/.exec(noeud.dataset.constKey || '');
      return found ? parseInt(found[1], 10) : -1;
    });
    const uniques = new Set(indices.filter(indice => indice >= 0));
    const dup = indices.length - uniques.size;
    let trou = 0;
    if (couche.nom !== 'repere' && indices.length && indices.every(indice => indice >= 0)) {
      const min = Math.min.apply(null, indices);
      const max = Math.max.apply(null, indices);
      trou = Math.max(0, (max - min + 1) - uniques.size);
    }
    doublons += Math.max(0, dup);
    trous += trou;
    coucheDom.dataset.v2e096Keycheck = (dup === 0 && trou === 0) ? 'ok' : 'anomalie';
  });
  layout.dataset.v2e096Doublons = String(doublons);
  layout.dataset.v2e096Trous = String(trous);

  /* E096-10 — Fiche d'état indexable : un panneau natif <details>, réutilisé
     et vidé à chaque passe, porte du texte sémantique réel (paragraphe et
     liste). L'état est lisible sans outil développeur et sans JavaScript. */
  let fiche = layout.querySelector('#v2e096-fiche');
  if (!fiche) {
    fiche = creer('details', 'v2e096-fiche', '');
    fiche.id = 'v2e096-fiche';
    fiche.dataset.v2e096Fiche = '1';
    const resume = creer('summary', '', 'Fiche d’état de la constellation');
    resume.textContent = 'Fiche d’état de la constellation';
    fiche.appendChild(resume);
    const corps = creer('div', 'v2e096-fiche-corps', '');
    fiche.appendChild(corps);
    const legende = layout.querySelector('.constellation-caption');
    if (legende) legende.appendChild(fiche);
    else layout.appendChild(fiche);
  }
  const corps = fiche.querySelector('.v2e096-fiche-corps') || fiche.lastElementChild;
  if (corps) {
    while (corps.firstChild) corps.removeChild(corps.firstChild);
    const resumeText = creer('p', '',
      `Chemin : ère ${lu.ere || '—'} › repère ${lu.repere || '—'} › point ${lu.point || '—'}. `
      + `Empreinte ${empreinte}, horloge ${etat.horloge}, stabilité ${etat.serie} passe(s), `
      + `différence ${layout.dataset.v2e096Diff || '—'}, hiérarchie ${hierarchie}.`);
    corps.appendChild(resumeText);
    const liste = creer('ul', '', '');
    couches.forEach(couche => {
      const item = creer('li', '',
        `${NOMS_COUCHES[couche.nom]} : ${lu[couche.nom] || 'aucun actif'}, `
        + `${lu.noeuds[couche.nom].length} élément(s).`);
      liste.appendChild(item);
    });
    corps.appendChild(liste);
  }

  /* Repli « mouvement réduit » : la préférence est lue depuis le contexte,
     sans sonde propre. Les contours restent visibles : le mouvement n'est
     jamais le seul vecteur d'information. */
  let calme = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { calme = !!ctx.reducedMotion(); } catch (error) { calme = false; }
  }
  if (calme) layout.classList.add('v2e096-calm');
  else layout.classList.remove('v2e096-calm');
});
