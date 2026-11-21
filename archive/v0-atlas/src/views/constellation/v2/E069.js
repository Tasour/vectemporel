import { register } from './registry.js';

/* Lentille V2 E069 — contrôle qualité des métriques chiffrées de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle d'animation
   propre. Domaine : la fiabilité des nombres, traitée sous un angle neuf :
   normalisation décimale, marge d'incertitude, valeurs sentinelles, précision
   déclarée, groupement des milliers, audit de divergence, complétude, mesure
   référencée, répartition textuelle et tableau de bord qualité.
   Préfixe exclusif : v2e069 (aucune collision avec la passe 1). */

const IDS = ['v2e069-live', 'v2e069-qualite', 'v2e069-qualite-titre'];

/* Lecture décimale tolérante : virgule française, espaces insécables,
   suffixe « % » ou « px » acceptés ; toute autre forme donne le repli. */
function decimal(valeur, repli) {
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : repli;
  if (valeur === null || valeur === undefined) return repli;
  const texte = String(valeur)
    .replace(/[\u00a0\u202f\u2009\s]/g, '')
    .replace(/%$/, '')
    .replace(/px$/i, '')
    .replace(',', '.');
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(texte)) return repli;
  const nombre = Number(texte);
  return Number.isFinite(nombre) ? nombre : repli;
}

/* Entier positif ou nul, tronqué de façon déterministe. */
function entier(valeur, repli) {
  const nombre = decimal(valeur, NaN);
  return Number.isFinite(nombre) ? Math.max(0, Math.trunc(nombre)) : repli;
}

/* Arrondi au plus proche avec un nombre de décimales déclaré. */
function arrondi(valeur, precision) {
  if (!Number.isFinite(valeur)) return 0;
  const facteur = Math.pow(10, precision);
  return Math.round((valeur + Number.EPSILON) * facteur) / facteur;
}

/* Groupement des milliers par espace insécable fine (usage français). */
function grouper(valeur) {
  return String(entier(valeur, 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

/* Un seul nœud par identifiant, réutilisé si la lentille est rejouée. */
function un(ctx, id, balise, classe, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = typeof ctx.el === 'function' ? ctx.el(balise, classe) : document.createElement(balise);
  }
  const doublons = document.querySelectorAll(`[id="${id}"]`);
  for (let i = 1; i < doublons.length; i += 1) doublons[i].remove();
  noeud.id = id;
  if (classe) noeud.className = classe;
  if (noeud.parentElement !== parent) parent.appendChild(noeud);
  return noeud;
}

register('E069', ctx => {
  /* Garde d'entrée : sans contexte, sans layout ou sans document, rien n'est ajouté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.css !== 'function' || typeof ctx.layout.querySelector !== 'function') return;

  const layout = ctx.layout;
  const field = layout.querySelector('.constellation-field');
  const creer = (balise, classe, texte) => typeof ctx.el === 'function'
    ? ctx.el(balise, classe, texte) : document.createElement(balise);

  /* Feuille unique : tableau de bord, répartition textuelle et repli mouvement
     réduit. Aucune information n'est portée par la seule couleur. */
  ctx.css('constellation-v2-e069', `
.v2e069-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e069-qualite{margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:rgba(178,139,221,.05);color:var(--ink-soft);font-size:9px;line-height:1.5}
.v2e069-qualite-titre{margin:0 0 5px;color:var(--gold);font-family:var(--serif);font-size:11px;font-weight:600;letter-spacing:.04em}
.v2e069-qualite-liste{display:grid;grid-template-columns:max-content 1fr;gap:2px 8px;margin:0}
.v2e069-qualite-cle{margin:0;color:var(--ink-faint)}
.v2e069-qualite-valeur{margin:0;font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;overflow-wrap:anywhere}
.v2e069-repartition{margin:6px 0 0;font-family:var(--mono,monospace);font-size:9px;letter-spacing:.02em;overflow-wrap:anywhere}
.v2e069-qualite.v2e069-calme,.v2e069-qualite.v2e069-calme *{transition:none!important}
@media (prefers-reduced-motion:reduce){.v2e069-qualite,.v2e069-qualite *{transition:none!important}}
@media (max-width:620px){.v2e069-qualite{padding:6px 8px;font-size:8px}}
`);

  const soleils = field ? Array.from(field.querySelectorAll('.const-sun')) : [];
  const planetes = field ? Array.from(field.querySelectorAll('.const-planet')) : [];
  const lunes = field ? Array.from(field.querySelectorAll('.const-moon')) : [];
  const positions = field
    ? Array.from(field.querySelectorAll('.const-sun, .const-planet, .const-moon')) : [];
  const etat = layout.querySelector('.constellation-state');

  const precision = 1;
  const marge = 1.5;
  const referenceDensite = 1.5;
  let conversions = 0;
  let sentinelles = 0;
  let divergences = 0;

  /* E069-01 — Normalisation décimale : chaque position est relue avec le
     parseur tolérant (virgule, espace insécable, suffixe acceptés), puis
     publiée dans des variables et attributs v2 distincts de la passe 1. */
  positions.forEach((noeud) => {
    const brutX = noeud.style.getPropertyValue('--x');
    const brutY = noeud.style.getPropertyValue('--y');
    if ([brutX, brutY].some((brut) => /[,\s\u00a0\u202f]/.test(String(brut)))) conversions += 1;
    const x = decimal(brutX, NaN);
    const y = decimal(brutY, NaN);
    noeud.dataset.v2e069DecX = String(Number.isFinite(x) ? x : 0);
    noeud.dataset.v2e069DecY = String(Number.isFinite(y) ? y : 0);
    noeud.style.setProperty('--v2e069-x', `${Number.isFinite(x) ? x : 0}%`);
    noeud.style.setProperty('--v2e069-y', `${Number.isFinite(y) ? y : 0}%`);
    noeud.dataset.v2e069Decimal = '1';
  });
  layout.dataset.v2e069Conversions = String(conversions);

  /* E069-02 — Intervalle d'incertitude : à chaque position est associée une
     plage [valeur − marge ; valeur + marge], publiée en attributs et jamais
     suggérée par une couleur seule. */
  positions.forEach((noeud) => {
    const x = decimal(noeud.dataset.v2e069DecX, NaN);
    const y = decimal(noeud.dataset.v2e069DecY, NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    noeud.dataset.v2e069BasseX = String(arrondi(x - marge, 1));
    noeud.dataset.v2e069HauteX = String(arrondi(x + marge, 1));
    noeud.dataset.v2e069BasseY = String(arrondi(y - marge, 1));
    noeud.dataset.v2e069HauteY = String(arrondi(y + marge, 1));
    noeud.dataset.v2e069Marge = String(marge);
  });
  layout.dataset.v2e069Marge = String(marge);

  /* E069-03 — Valeurs sentinelles : NaN, infini et zéro négatif sont détectés
     puis remplacés par la valeur de repli documentée 0, avec marquage. */
  positions.forEach((noeud) => {
    const x = decimal(noeud.style.getPropertyValue('--x'), NaN);
    const y = decimal(noeud.style.getPropertyValue('--y'), NaN);
    const invalide = !Number.isFinite(x) || !Number.isFinite(y)
      || Object.is(x, -0) || Object.is(y, -0);
    if (invalide) {
      sentinelles += 1;
      noeud.dataset.v2e069Sentinelle = '1';
      noeud.dataset.v2e069SentinelleValeur = '0';
    } else {
      noeud.dataset.v2e069Sentinelle = '0';
    }
  });
  if (field) {
    const taille = decimal(field.style.getPropertyValue('--const-node-size'), NaN);
    const invalideTaille = !Number.isFinite(taille) || Object.is(taille, -0);
    if (invalideTaille) sentinelles += 1;
    field.dataset.v2e069Sentinelle = invalideTaille ? '1' : '0';
  }
  layout.dataset.v2e069Sentinelles = String(sentinelles);

  /* E069-04 — Précision déclarée : une décimale au plus, arrondie une seule
     fois au plus proche, exposée sur le layout et sur chaque nœud. */
  layout.dataset.v2e069Precision = String(precision);
  layout.dataset.v2e069RegleArrondi = 'au-plus-proche';
  positions.forEach((noeud) => {
    noeud.dataset.v2e069ArrondiX = String(arrondi(decimal(noeud.dataset.v2e069DecX, 0), precision));
    noeud.dataset.v2e069ArrondiY = String(arrondi(decimal(noeud.dataset.v2e069DecY, 0), precision));
  });

  /* E069-05 — Groupement des milliers : les effectifs sont publiés en clair
     avec espace insécable fine, prêts pour des constellations à quatre chiffres. */
  const effectifs = { eres: soleils.length, reperes: planetes.length, points: lunes.length };
  const formats = `${grouper(effectifs.eres)} / ${grouper(effectifs.reperes)} / ${grouper(effectifs.points)}`;
  layout.dataset.v2e069Format = formats;
  if (etat) {
    etat.dataset.v2e069Format = formats;
    etat.setAttribute('title', `Effectifs groupés : ères ${grouper(effectifs.eres)}, repères ${grouper(effectifs.reperes)}, points ${grouper(effectifs.points)}.`);
  }

  /* E069-06 — Audit de divergence : le total déclaré par la passe 1 est
     comparé au nombre réel de nœuds de chaque couche ; tout écart est compté. */
  [['.const-layer-suns', soleils], ['.const-layer-planets', planetes],
    ['.const-layer-moons', lunes]].forEach(([selecteur, liste]) => {
    const couche = field ? field.querySelector(selecteur) : null;
    if (!couche) return;
    const declare = entier(couche.dataset.e069Total, NaN);
    couche.dataset.v2e069Compte = String(liste.length);
    couche.dataset.v2e069Divergence = Number.isFinite(declare) && declare !== liste.length ? '1' : '0';
    if (couche.dataset.v2e069Divergence === '1') divergences += 1;
  });
  layout.dataset.v2e069Divergences = String(divergences);

  /* E069-07 — Taux de complétude : huit champs attendus sont testés et le
     ratio de présence est publié en pourcentage et en forme brute. */
  const champs = [
    !!field,
    !!etat,
    soleils.length > 0,
    planetes.length > 0,
    lunes.length > 0,
    positions.length > 0,
    Number.isFinite(decimal(field && field.style.getPropertyValue('--const-node-size'), NaN)),
    !!layout.querySelector('.constellation-back'),
  ];
  const valides = champs.filter(Boolean).length;
  const completude = Math.round((valides / champs.length) * 100);
  layout.dataset.v2e069Completude = `${completude}%`;
  layout.dataset.v2e069CompletudeDetail = `${valides}/${champs.length}`;

  /* E069-08 — Mesure référencée : la densité de points par ère est comparée
     à une référence déclarée de 1,5 ; l'écart signé et la tendance sont textuels. */
  const densite = lunes.length / Math.max(1, soleils.length);
  const ecart = arrondi(densite - referenceDensite, 2);
  const tendance = ecart > 0 ? 'au-dessus de' : ecart < 0 ? 'au-dessous de' : 'égale à';
  layout.dataset.v2e069Densite = String(arrondi(densite, 2));
  layout.dataset.v2e069Reference = String(referenceDensite);
  layout.dataset.v2e069EcartRef = `${ecart > 0 ? '+' : ''}${ecart}`;
  layout.dataset.v2e069Tendance = tendance;

  /* E069-09 — Répartition textuelle : trois barres de caractères, plafonnées
     à douze cases, donnent une vue d'ensemble sans dépendre d'un graphique
     ni d'une couleur. */
  const barre = (nombre) => '█'.repeat(Math.min(12, Math.max(0, entier(nombre, 0))));
  const repartitionTexte = `Ères ${barre(soleils.length)} · Repères ${barre(planetes.length)} · Points ${barre(lunes.length)}`;
  layout.dataset.v2e069Repartition = repartitionTexte;

  /* E069-10 — Tableau de bord qualité : un verdict dérivé des contrôles, une
     liste de définitions, la répartition, une région live dédiée et le repli
     mouvement réduit via l'API fournie par le contexte. */
  const verdict = divergences === 0 && sentinelles === 0 && completude >= 75
    ? 'Conforme' : 'À surveiller';
  layout.dataset.v2e069Verdict = verdict;

  let qualite = un(ctx, 'v2e069-qualite', 'section', 'v2e069-qualite', layout);
  qualite.textContent = '';
  qualite.setAttribute('aria-labelledby', 'v2e069-qualite-titre');
  const titre = creer('h2', 'v2e069-qualite-titre', 'Contrôle qualité des métriques');
  titre.id = 'v2e069-qualite-titre';
  const liste = creer('dl', 'v2e069-qualite-liste');
  const ajouter = (libelle, valeur) => {
    liste.append(creer('dt', 'v2e069-qualite-cle', libelle),
      creer('dd', 'v2e069-qualite-valeur', valeur));
  };
  ajouter('Verdict', verdict);
  ajouter('Complétude', `${valides}/${champs.length} (${completude} %)`);
  ajouter('Divergences', String(divergences));
  ajouter('Valeurs sentinelles', String(sentinelles));
  ajouter('Positions converties', String(conversions));
  ajouter('Précision', `${precision} décimale, arrondi au-plus-proche`);
  ajouter('Effectifs groupés', formats);
  ajouter('Densité de points', `${arrondi(densite, 2)} pour 1 ère — ${tendance} la référence ${referenceDensite}`);
  const repartition = creer('p', 'v2e069-repartition', repartitionTexte);

  const live = un(ctx, 'v2e069-live', 'p', 'v2e069-sr', layout);
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  live.textContent = `Contrôle qualité : ${verdict}. Complétude ${completude} %, ${divergences} divergence(s), ${sentinelles} valeur(s) sentinelle(s), marge de ${marge} point(s), densité ${arrondi(densite, 2)} pour 1 ère.`;

  qualite.append(titre, liste, repartition, live);
  if (field && field.parentNode === layout) layout.insertBefore(qualite, field);
  layout.dataset.v2e069Ids = IDS.every((id) => document.querySelectorAll(`[id="${id}"]`).length <= 1)
    ? 'uniques' : 'doublon';

  let calme = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { calme = !!ctx.reducedMotion(); } catch (erreur) { calme = false; }
  }
  if (calme) {
    qualite.classList.add('v2e069-calme');
    layout.dataset.v2e069Reduced = '1';
  } else {
    qualite.classList.remove('v2e069-calme');
    layout.dataset.v2e069Reduced = '0';
  }
});
