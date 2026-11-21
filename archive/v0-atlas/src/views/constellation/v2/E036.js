import { register } from './registry.js';

/* Lentille V2 E036 — gestion avancée de l'état des arêtes du graphe de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   déterministes et dérivés des <line> réellement rendues, aucune valeur
   inventée. Préfixe exclusif v2e036 : aucune collision avec la passe 1
   (e036-, constellation-e036, __e036_mode_nav). Zéro réseau, zéro aléa,
   zéro journalisation, aucun minuteur ni boucle d'animation propre. */

/* État local conservé entre deux appels du registre, sous préfixe v2e036. */
let boutonRapportLie = null;

/* djb2 : empreinte déterministe (aucune source aléatoire). Sert à la signature
   structurelle du chantier 08, concept distinct de l'empreinte géométrique
   FNV-1a de la passe 1 : elle ne dépend que de la topologie et des classes. */
function empreinteStructurelle(chaine) {
  let h = 5381;
  for (let i = 0; i < chaine.length; i += 1) {
    h = ((h * 33) ^ chaine.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function coord(noeud, nom) {
  const brut = typeof noeud.getAttribute === 'function' ? noeud.getAttribute(nom) : null;
  const valeur = Number.parseFloat(brut);
  return Number.isFinite(valeur) ? valeur : NaN;
}

function arrondi(valeur) {
  return Math.round(valeur * 100) / 100;
}

function texte(valeur) {
  return Number.isFinite(valeur) ? arrondi(valeur).toFixed(2) : 'indisponible';
}

function estActive(ligne) {
  return !!(ligne.classList && ligne.classList.contains('is-path'));
}

function estLune(ligne) {
  return !!(ligne.classList && ligne.classList.contains('is-moon'));
}

function lireLignes(svg) {
  return Array.prototype.slice.call(svg.querySelectorAll('line.const-edge'));
}

function styleCoordonnee(noeud, nom) {
  if (!noeud || !noeud.style || typeof noeud.style.getPropertyValue !== 'function') return NaN;
  return Number.parseFloat(noeud.style.getPropertyValue(nom));
}

register('E036', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;
  if (typeof document.createElement !== 'function') return;

  /* Feuille unique de la lentille, installée une seule fois par cssOnce.
     Toute information est doublée en texte : aucune couleur seule, et les
     extrêmes se distinguent par l'épaisseur et les tirets, pas par la teinte. */
  css('constellation-v2-e036', `
.v2e036-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e036-panneau{margin:6px 0 0;color:var(--muted,#8b8b8b);font-size:10px;line-height:1.5}
.v2e036-panneau strong{color:var(--gold,#e6b96f);font-weight:600}
.v2e036-dl{display:grid;grid-template-columns:auto 1fr;gap:1px 8px}
.v2e036-dl dt{font-weight:600;color:var(--gold,#e6b96f)}
.v2e036-dl dd{margin:0}
.v2e036-bouton{min-height:36px;padding:5px 10px;border:1px solid var(--line,#444);border-radius:7px;background:transparent;color:var(--gold,#e6b96f);font:inherit;font-size:10px;cursor:pointer}
.v2e036-bouton:focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.v2e036-rapport-pre[hidden]{display:none}
.v2e036-rapport-pre{margin:6px 0 0;padding:8px;max-height:220px;overflow:auto;white-space:pre-wrap;word-break:break-word;border:1px solid var(--line,#444);border-radius:7px;background:rgba(0,0,0,.18);color:var(--text,#ddd);font-size:9px;line-height:1.45}
.v2e036-extreme-long{stroke-width:2.2;stroke-dasharray:none}
.v2e036-extreme-court{stroke-width:1;stroke-dasharray:1 2}
.v2e036-calme .const-edge{transition:none}
@media (prefers-reduced-motion: reduce){.const-edge{transition:none!important}}
`);

  const svg = layout.querySelector('svg.constellation-edges');
  if (!svg || typeof svg.querySelectorAll !== 'function'
      || typeof svg.setAttribute !== 'function' || !svg.classList) return;

  const lignes = lireLignes(svg);
  const total = lignes.length;
  const caption = layout.querySelector('.constellation-caption') || layout;

  /* Fabrique un nœud une seule fois par identifiant, pour rester idempotent
     quand le registre rejoue la lentille sur un DOM déjà enrichi. */
  function nouveau(tag, className, texteInitial) {
    const noeud = typeof ctx.el === 'function'
      ? ctx.el(tag, className, texteInitial)
      : document.createElement(tag);
    if (typeof ctx.el !== 'function') {
      if (className) noeud.className = className;
      if (texteInitial !== undefined) noeud.textContent = texteInitial;
    }
    return noeud;
  }

  function placer(parent, id, tag, className, texteInitial) {
    let noeud = layout.querySelector(`#${id}`);
    if (!noeud) {
      noeud = nouveau(tag, className, texteInitial);
      noeud.id = id;
      (parent || caption).appendChild(noeud);
    }
    return noeud;
  }

  function remplir(parent, enfants) {
    if (typeof parent.replaceChildren === 'function') parent.replaceChildren.apply(parent, enfants);
    else {
      while (parent.firstChild) parent.removeChild(parent.firstChild);
      enfants.forEach((enfant) => parent.appendChild(enfant));
    }
  }

  /* Région live unique de la V2, distincte de #e036-live de la passe 1. */
  const live = placer(caption, 'v2e036-live', 'p', 'v2e036-sr', '');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');

  function dire(message) {
    if (live && typeof live.textContent === 'string') live.textContent = message;
  }

  /* Panneaux visibles, créés une seule fois et simplement remplis ensuite. */
  const panneauClasses = placer(caption, 'v2e036-classes', 'dl',
    'v2e036-panneau v2e036-dl', '');
  const panneauExtremes = placer(caption, 'v2e036-extremes', 'p', 'v2e036-panneau', '');
  const panneauAnomalies = placer(caption, 'v2e036-anomalies', 'p', 'v2e036-panneau', '');
  const panneauOrphelins = placer(caption, 'v2e036-orphelins', 'p', 'v2e036-panneau', '');
  const conteneurRapport = placer(caption, 'v2e036-rapport', 'pre',
    'v2e036-rapport-pre', '');
  const boutonRapport = placer(caption, 'v2e036-rapport-bouton', 'button',
    'v2e036-bouton', 'Afficher le relevé détaillé');
  boutonRapport.type = 'button';
  boutonRapport.setAttribute('aria-controls', conteneurRapport.id);

  /* ---------------------------------------------------------------------- */
  /* Données dérivées, calculées une seule fois puis réutilisées.            */
  /* ---------------------------------------------------------------------- */

  const longueurs = [];
  const classes = [];
  const origines = [];
  const cibles = [];
  let minLongueur = Infinity;
  let maxLongueur = -Infinity;
  let sommeLongueurs = 0;

  /* E036-01 — Regroupement par origine et degré sortant : les arêtes sont
     classées par leur point de départ (x1;y1) arrondi ; chaque origine reçoit
     un rang, chaque arête son origine et le nombre de rayons émis depuis elle.
     La topologie est déduite des <line>, jamais codée en dur. */
  const indexOrigine = Object.create(null);
  lignes.forEach((ligne) => {
    const cle = `${texte(coord(ligne, 'x1'))};${texte(coord(ligne, 'y1'))}`;
    if (!(cle in indexOrigine)) {
      indexOrigine[cle] = origines.length;
      origines.push({ cle, degre: 0 });
    }
    origines[indexOrigine[cle]].degre += 1;
  });
  lignes.forEach((ligne) => {
    const cle = `${texte(coord(ligne, 'x1'))};${texte(coord(ligne, 'y1'))}`;
    const rang = indexOrigine[cle];
    if (typeof ligne.setAttribute === 'function' && typeof rang === 'number') {
      ligne.setAttribute('data-v2e036-origine', String(rang));
      ligne.setAttribute('data-v2e036-degre', String(origines[rang].degre));
    }
  });
  svg.setAttribute('data-v2e036-origines', String(origines.length));

  /* E036-02 — Longueur euclidienne par arête : racine de la somme des carrés
     des écarts de coordonnées, arrondie au centième et écrite sur chaque ligne.
     Le total, le minimum et le maximum sont publiés sur le SVG. */
  lignes.forEach((ligne) => {
    const x1 = coord(ligne, 'x1');
    const y1 = coord(ligne, 'y1');
    const x2 = coord(ligne, 'x2');
    const y2 = coord(ligne, 'y2');
    const longueur = Number.isFinite(x1) && Number.isFinite(y1)
      && Number.isFinite(x2) && Number.isFinite(y2)
      ? Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) : NaN;
    longueurs.push(longueur);
    if (Number.isFinite(longueur)) {
      minLongueur = Math.min(minLongueur, longueur);
      maxLongueur = Math.max(maxLongueur, longueur);
      sommeLongueurs += longueur;
    }
    if (typeof ligne.setAttribute === 'function') {
      ligne.setAttribute('data-v2e036-longueur', texte(longueur));
    }
  });
  const moyenne = total && Number.isFinite(sommeLongueurs)
    ? sommeLongueurs / lignes.filter((l) => Number.isFinite(l)).length : NaN;
  svg.setAttribute('data-v2e036-longueur-totale', texte(sommeLongueurs));
  svg.setAttribute('data-v2e036-longueur-moyenne', texte(moyenne));

  /* E036-03 — Classes de longueur : trois bandes égales entre le minimum et
     le maximum observés, recalculées à chaque rendu. Chaque arête porte sa
     classe ; un <dl> visible affiche le décompte, sans recourir à la couleur. */
  const seuil1 = minLongueur + (maxLongueur - minLongueur) / 3;
  const seuil2 = minLongueur + 2 * (maxLongueur - minLongueur) / 3;
  const comptes = { courte: 0, moyenne: 0, longue: 0 };
  lignes.forEach((ligne, index) => {
    const valeur = longueurs[index];
    let classe = 'courte';
    if (Number.isFinite(valeur)) {
      if (valeur > seuil1 && valeur <= seuil2) classe = 'moyenne';
      else if (valeur > seuil2) classe = 'longue';
    }
    classes.push(classe);
    comptes[classe] += 1;
    if (typeof ligne.setAttribute === 'function') ligne.setAttribute('data-v2e036-classe', classe);
  });
  const entreesClasses = [
    nouveau('dt', '', 'Arêtes courtes'),
    nouveau('dd', '', String(comptes.courte)),
    nouveau('dt', '', 'Arêtes moyennes'),
    nouveau('dd', '', String(comptes.moyenne)),
    nouveau('dt', '', 'Arêtes longues'),
    nouveau('dd', '', String(comptes.longue)),
  ];
  remplir(panneauClasses, entreesClasses);
  panneauClasses.setAttribute('aria-label', 'Répartition des arêtes par longueur');
  svg.setAttribute('data-v2e036-classes',
    `${comptes.courte}/${comptes.moyenne}/${comptes.longue}`);

  /* E036-04 — Arêtes extrêmes : l'arête la plus longue et la plus courte
     reçoivent une classe CSS distincte par l'épaisseur et les tirets, et sont
     nommées explicitement dans un paragraphe visible. L'information n'est donc
     jamais portée par la seule couleur. */
  let indexLong = -1;
  let indexCourt = -1;
  if (total) {
    indexLong = 0;
    indexCourt = 0;
    for (let i = 1; i < total; i += 1) {
      const v = longueurs[i];
      if (!Number.isFinite(v)) continue;
      if (Number.isFinite(longueurs[indexLong]) && v > longueurs[indexLong]) indexLong = i;
      if (Number.isFinite(longueurs[indexCourt]) && v < longueurs[indexCourt]) indexCourt = i;
    }
  }
  lignes.forEach((ligne) => ligne.classList.remove('v2e036-extreme-long', 'v2e036-extreme-court'));
  if (indexLong >= 0 && lignes[indexLong]) {
    lignes[indexLong].classList.add('v2e036-extreme-long');
    lignes[indexLong].setAttribute('data-v2e036-extreme', 'longue');
  }
  if (indexCourt >= 0 && lignes[indexCourt]) {
    lignes[indexCourt].classList.add('v2e036-extreme-court');
    lignes[indexCourt].setAttribute('data-v2e036-extreme', 'courte');
  }
  panneauExtremes.textContent = total
    ? `Arête la plus longue : ${texte(longueurs[indexLong])} unités (rang ${indexLong + 1}). `
      + `Arête la plus courte : ${texte(longueurs[indexCourt])} unités (rang ${indexCourt + 1}).`
    : 'Aucune arête à mesurer dans ce rendu.';
  svg.setAttribute('data-v2e036-extreme-long', indexLong >= 0 ? String(indexLong) : '');
  svg.setAttribute('data-v2e036-extreme-court', indexCourt >= 0 ? String(indexCourt) : '');

  /* E036-05 — Contrôle de qualité géométrique : une arête est signalée si sa
     longueur est nulle, invalide, ou si l'une de ses extrémités sort de la
     boîte de vue 0–100. Le décompte est publié, détaillé en texte et annoncé
     dans la région live lorsqu'il est non nul. */
  const anomalieRangs = [];
  lignes.forEach((ligne, index) => {
    const x1 = coord(ligne, 'x1');
    const y1 = coord(ligne, 'y1');
    const x2 = coord(ligne, 'x2');
    const y2 = coord(ligne, 'y2');
    const horsCadre = [x1, y1, x2, y2].some((v) => !Number.isFinite(v) || v < 0 || v > 100);
    const long = longueurs[index];
    const anomalie = horsCadre || !Number.isFinite(long) || long < 0.01;
    if (typeof ligne.setAttribute === 'function') {
      ligne.setAttribute('data-v2e036-anomalie', anomalie ? 'oui' : 'non');
    }
    if (anomalie) anomalieRangs.push(index + 1);
  });
  svg.setAttribute('data-v2e036-anomalies', String(anomalieRangs.length));
  panneauAnomalies.textContent = anomalieRangs.length
    ? `Contrôle géométrique : ${anomalieRangs.length} arête(s) à vérifier — rangs ${anomalieRangs.slice(0, 8).join(', ')}${anomalieRangs.length > 8 ? '…' : ''}.`
    : 'Contrôle géométrique : aucune arête dégénérée ni hors cadre.';
  if (anomalieRangs.length) dire(panneauAnomalies.textContent);

  /* E036-06 — Réconciliation arête ↔ nœud : chaque extrémité (x2;y2) est
     rapprochée du bouton de planète ou de lune le plus proche, d'après ses
     variables --x/--y posées par la vue. Le nœud visé et l'écart sont écrits
     sur l'arête ; aucun appariement n'est supposé, tout est mesuré. */
  const couches = [
    ['repère', layout.querySelector('.const-layer-planets')],
    ['point', layout.querySelector('.const-layer-moons')],
  ];
  couches.forEach((pair) => {
    const couche = pair[1];
    if (!couche || typeof couche.querySelectorAll !== 'function') return;
    Array.prototype.slice.call(couche.querySelectorAll('button')).forEach((noeud) => {
      const x = styleCoordonnee(noeud, '--x');
      const y = styleCoordonnee(noeud, '--y');
      const cle = noeud.getAttribute('data-const-key') || '';
      if (Number.isFinite(x) && Number.isFinite(y) && cle) {
        cibles.push({ type: pair[0], cle, x, y });
      }
    });
  });
  const ciblesTouchees = Object.create(null);
  lignes.forEach((ligne) => {
    const x2 = coord(ligne, 'x2');
    const y2 = coord(ligne, 'y2');
    let meilleure = null;
    let meilleurEcart = Infinity;
    cibles.forEach((cible) => {
      const ecart = Math.sqrt((cible.x - x2) ** 2 + (cible.y - y2) ** 2);
      if (ecart < meilleurEcart) {
        meilleurEcart = ecart;
        meilleure = cible;
      }
    });
    const retenue = meilleure && meilleurEcart <= 1 ? meilleure : null;
    if (retenue) ciblesTouchees[retenue.cle] = true;
    if (typeof ligne.setAttribute === 'function') {
      ligne.setAttribute('data-v2e036-cible', retenue ? retenue.cle : '');
      ligne.setAttribute('data-v2e036-type-cible', retenue ? retenue.type : '');
      ligne.setAttribute('data-v2e036-ecart', texte(meilleurEcart));
    }
  });
  svg.setAttribute('data-v2e036-cibles', String(Object.keys(ciblesTouchees).length));

  /* E036-07 — Nœuds orphelins : un nœud réel dont aucune arête ne termine
     l'extrémité est signalé. Le décompte et les clés sont écrits en texte
     visible, ce qui rend la couverture du graphe auditable sans le SVG. */
  const orphelins = cibles.filter((cible) => !ciblesTouchees[cible.cle]);
  svg.setAttribute('data-v2e036-orphelins', String(orphelins.length));
  panneauOrphelins.textContent = orphelins.length
    ? `Nœuds sans arête entrante : ${orphelins.length} — `
      + `${orphelins.slice(0, 6).map((cible) => cible.cle).join(', ')}${orphelins.length > 6 ? '…' : ''}.`
    : 'Couverture complète : chaque nœud atteint au moins une arête.';

  /* E036-08 — Empreinte structurelle tolérante : concaténation, pour chaque arête,
     de l'origine, de la classe de longueur, du type lune et de l'état actif.
     Hachée en djb2, elle reste stable si les coordonnées varient légèrement,
     à la différence de l'empreinte géométrique exacte de la passe 1. */
  const structure = lignes.map((ligne, index) => {
    const origine = ligne.getAttribute('data-v2e036-origine') || '-';
    return `${origine}.${classes[index]}.${estLune(ligne) ? 1 : 0}.${estActive(ligne) ? 1 : 0}`;
  }).join('|');
  const empreinte = empreinteStructurelle(structure);
  svg.setAttribute('data-v2e036-structure', empreinte);
  svg.setAttribute('data-v2e036-structure-taille', String(structure.length));

  /* E036-09 — Diff de peuplement entre rendus : le nombre d'arêtes est
     mémorisé sous une clé window dédiée, comparé au rendu précédent, puis
     publié en attribut signé (+ ajouts, − retraits) et annoncé en français.
     Aucune donnée n'est perdue quand le SVG est remplacé. */
  const CLE_PEUPLEMENT = '__v2e036_peuplement';
  const precedent = typeof window !== 'undefined' && window[CLE_PEUPLEMENT]
    ? window[CLE_PEUPLEMENT] : null;
  const count = lignes.length;
  let delta = 'initial';
  if (precedent && Number.isFinite(precedent.count)) {
    const ecart = count - precedent.count;
    delta = ecart > 0 ? `+${ecart}` : String(ecart);
  }
  svg.setAttribute('data-v2e036-delta', delta);
  if (typeof window !== 'undefined') window[CLE_PEUPLEMENT] = { count };
  if (delta !== 'initial' && delta !== '0') {
    dire(`Peuplement des arêtes : ${delta} arête(s) depuis le rendu précédent, soit ${count} au total.`);
  }

  /* E036-10 — Bascule du relevé détaillé : bouton indépendant à aria-pressed,
     révélant un <pre> qui consolide toutes les mesures ci-dessus. Le texte est
     généré une fois par rendu ; l'état de la bascule est annoncé dans la région
     live, et le focus reste visible grâce à la règle :focus-visible. */
  const rapport = [
    'Relevé détaillé des arêtes — lentille V2 E036',
    `Arêtes : ${total} ; origines distinctes : ${origines.length}.`,
    `Longueur totale : ${texte(sommeLongueurs)} ; moyenne : ${texte(moyenne)}.`,
    `Longueur minimale : ${texte(minLongueur)} ; maximale : ${texte(maxLongueur)}.`,
    `Répartition courtes/moyennes/longues : ${comptes.courte}/${comptes.moyenne}/${comptes.longue}.`,
    `Arêtes à vérifier : ${anomalieRangs.length}.`,
    `Arêtes rattachées à un nœud : ${Object.keys(ciblesTouchees).length} ; nœuds orphelins : ${orphelins.length}.`,
    `Empreinte structurelle : ${empreinte}.`,
    `Peuplement depuis le rendu précédent : ${delta}.`,
  ].join('\n');
  conteneurRapport.textContent = rapport;

  const appliquerRapport = (ouvert, annoncer) => {
    boutonRapport.setAttribute('aria-pressed', ouvert ? 'true' : 'false');
    boutonRapport.textContent = ouvert ? 'Masquer le relevé détaillé' : 'Afficher le relevé détaillé';
    conteneurRapport.hidden = !ouvert;
    svg.setAttribute('data-v2e036-rapport', ouvert ? 'ouvert' : 'ferme');
    if (annoncer) dire(ouvert ? 'Relevé détaillé affiché.' : 'Relevé détaillé masqué.');
  };
  appliquerRapport(boutonRapport.getAttribute('aria-pressed') === 'true', false);
  if (boutonRapportLie !== boutonRapport && typeof boutonRapport.addEventListener === 'function') {
    boutonRapportLie = boutonRapport;
    boutonRapport.addEventListener('click', () => {
      const ouvert = boutonRapport.getAttribute('aria-pressed') === 'true';
      appliquerRapport(!ouvert, true);
    });
  }

  /* Repli « mouvement réduit » : aucune transition sur les arêtes mesurées. */
  let calme = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { calme = !!ctx.reducedMotion(); }
    catch (erreur) { calme = false; }
  }
  if (calme) svg.classList.add('v2e036-calme');
  else svg.classList.remove('v2e036-calme');
});
