import { register } from './registry.js';

/* Lentille V2 E063 — lisibilité mesurable et contraste des métriques chiffrées
   de la vue Constellation. Seconde passe : dix chantiers inédits, tous
   implémentés, sans réseau, sans source aléatoire et sans minuteur ni boucle
   d'animation propre. Préfixe exclusif : v2e063 (aucune collision avec la
   passe 1, qui utilisait e063- et constellation-e063). */
register('E063', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  const fabrique = typeof ctx.el === 'function' ? ctx.el : null;

  /* Feuille unique de la lentille, installée une seule fois par ctx.css.
     Aucune information n'est portée par la seule couleur : texte, bordure,
     forme et largeur complètent systématiquement la teinte. */
  css('constellation-v2-e063', `
.v2e063-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e063-panneau{display:flex;flex-direction:column;gap:6px;margin:10px 0 2px;padding:10px 12px;border:1px solid var(--line-strong);border-radius:10px;background:#0c111a;box-shadow:inset 0 0 0 1px rgba(244,214,158,.06)}
.v2e063-titre{margin:0;color:var(--muted);font-size:9px;letter-spacing:.08em;text-transform:uppercase}

/* E063-01 — Verdict de contraste : la bordure du badge change de style
   (plein / double / pointillé) selon AA, AAA ou insuffisant. */
.v2e063-item{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px;padding:5px 6px;border-left:2px solid var(--line);border-radius:4px}
.v2e063-item:first-of-type{border-left-color:transparent}
.v2e063-ordre{flex:0 0 auto;min-width:26px;color:var(--muted);font-size:8px;font-variant-numeric:tabular-nums}
.v2e063-ordre::before{content:attr(data-v2e063-index)}
.v2e063-libelle{flex:1 1 90px;color:var(--muted);font-size:9px;letter-spacing:.04em}
.v2e063-ligne{display:flex;align-items:baseline;gap:4px}
.v2e063-valeur{color:#f2f5f9;font-size:15px;font-weight:700;line-height:1.15;font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1}
.v2e063-unite{color:var(--muted);font-size:9px;font-weight:500;letter-spacing:.02em;transform:translateY(-1px)}
.v2e063-ratio{flex:0 0 auto;min-width:58px;padding:2px 5px;border:1px solid var(--line);border-radius:5px;color:#f2f5f9;font-size:8px;font-weight:700;text-align:center;font-variant-numeric:tabular-nums}
.v2e063-aa .v2e063-ratio{border-style:solid;border-color:var(--gold)}
.v2e063-aaa .v2e063-ratio{border-style:double;border-width:3px;border-color:var(--gold-bright)}
.v2e063-faible .v2e063-ratio{border-style:dashed;text-decoration:underline;text-decoration-style:dotted}

/* E063-02 — Jauge de lisibilité : remplissage proportionnel au ratio mesuré,
   repère fixe au seuil AA de 4,5 pour un (4,5/21 ≈ 21,43 %). */
.v2e063-jauge{position:relative;flex:1 1 100px;height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:visible}
.v2e063-jauge-fill{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:3px;background:var(--gold-bright)}
.v2e063-jauge-seuil{position:absolute;top:-2px;bottom:-2px;width:2px;background:#f4d69e}

/* E063-06 — Barre de proportion active/total, complétée par le texte « N % ». */
.v2e063-proportion{position:relative;flex:1 1 100%;height:4px;border-radius:2px;background:rgba(255,255,255,.08)}
.v2e063-proportion-fill{position:absolute;left:0;top:0;bottom:0;background:var(--gold)}
.v2e063-part{flex:0 0 auto;color:var(--muted);font-size:8px;font-variant-numeric:tabular-nums}

/* E063-08 — Marqueur de forme (losange) de la métrique courante : repère
   géométrique distinct du soulignement de la passe 1. */
.v2e063-item[data-v2e063-courant="true"]{background:rgba(244,214,158,.06);border-left-color:var(--gold)}
.v2e063-item[data-v2e063-courant="true"] .v2e063-valeur::after{content:"";display:inline-block;width:6px;height:6px;margin-left:5px;background:var(--gold-bright);transform:rotate(45deg);vertical-align:middle}

/* E063-10 — Détail du contraste : bouton d'au moins 36 px, contour de focus
   visible, paragraphe révélé sans animation. */
.v2e063-detail-btn{min-height:36px;padding:6px 12px;border:1px solid var(--gold);border-radius:8px;background:var(--surface-2);color:var(--gold-bright);font-size:10px;cursor:pointer}
.v2e063-detail-btn:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px}
.v2e063-detail{margin:4px 0 0;color:var(--muted);font-size:10px;line-height:1.5}
.v2e063-detail[hidden]{display:none}
.v2e063-sobre .v2e063-panneau *{transition:none!important}
@media (prefers-reduced-motion: reduce){.v2e063-panneau *{transition:none!important}}

/* E063-09 — Impression : fond blanc, texte noir, bordures conservées, le
   contraste ne dépend plus du thème sombre de l'écran. */
@media print{
  .v2e063-panneau{background:#fff!important;border-color:#000!important;box-shadow:none!important}
  .v2e063-titre,.v2e063-libelle,.v2e063-unite,.v2e063-ordre,.v2e063-part,.v2e063-detail,.v2e063-valeur,.v2e063-ratio{color:#000!important}
  .v2e063-ratio{border-color:#000!important;text-decoration-color:#000!important}
  .v2e063-item{border-left-color:#000!important;background:#fff!important}
  .v2e063-jauge,.v2e063-proportion{background:#ddd!important}
  .v2e063-jauge-fill,.v2e063-proportion-fill,.v2e063-jauge-seuil{background:#000!important}
  .v2e063-item[data-v2e063-courant="true"] .v2e063-valeur::after{background:#000!important}
}
  `);

  /* Idempotence (transverse) : retirer les panneaux v2e063-* d'un rendu
     précédent avant d'en créer un nouveau, sur un DOM même incomplet. */
  try {
    const anciens = layout.querySelectorAll('[id^="v2e063-"]');
    if (anciens && typeof anciens.length === 'number') {
      Array.from(anciens).forEach((noeud) => {
        if (noeud && typeof noeud.remove === 'function') noeud.remove();
      });
    }
  } catch { /* greffon tolérant */ }

  /* Comptage déterministe depuis les couches réellement rendues : aucune
     valeur n'est codée en dur, aucune n'est tirée au sort. */
  const couche = (selecteur) => {
    try {
      const noeud = layout.querySelector(selecteur);
      return noeud && typeof noeud.querySelectorAll === 'function'
        ? Array.from(noeud.querySelectorAll('button')) : [];
    } catch { return []; }
  };
  const indexActif = (liste) => {
    for (let i = 0; i < liste.length; i += 1) {
      const noeud = liste[i];
      if (noeud && noeud.classList && typeof noeud.classList.contains === 'function'
          && noeud.classList.contains('is-active')) return i + 1;
    }
    return 0;
  };
  const soleils = couche('.const-layer-suns');
  const planetes = couche('.const-layer-planets');
  const lunes = couche('.const-layer-moons');
  const nbEres = soleils.length;
  const nbRep = planetes.length;
  const nbPoints = lunes.length;
  const ereActive = nbEres ? Math.max(1, indexActif(soleils)) : 0;
  const repActif = nbRep ? Math.max(1, indexActif(planetes)) : 0;
  const ptActif = nbPoints ? Math.max(1, indexActif(lunes)) : 0;

  const virgule = (valeur) => valeur.toFixed(1).replace('.', ',');

  /* E063-03 — Groupement des milliers par espace fine insécable (U+202F),
     déterministe ; la valeur brute reste lisible dans data-v2e063-brut. */
  const grouper = (nombre) => String(nombre).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');

  const metriques = [
    { cle: 'eres', libelle: 'Ères', brut: nbEres, valeur: grouper(nbEres), unite: 'èr.', courant: false, part: null },
    { cle: 'reperes', libelle: 'Repères', brut: nbRep, valeur: grouper(nbRep), unite: 'rep.', courant: false, part: null },
    { cle: 'points', libelle: 'Points vérifiés', brut: nbPoints, valeur: grouper(nbPoints), unite: 'pts', courant: false, part: null },
    { cle: 'ere-active', libelle: 'Ère active', brut: ereActive, valeur: grouper(nbEres ? ereActive : 0), unite: 'ère', courant: true, part: nbEres ? ereActive / nbEres : 0 },
    { cle: 'rep-active', libelle: 'Repère actif', brut: repActif, valeur: grouper(nbRep ? repActif : 0), unite: 'rep.', courant: false, part: nbRep ? repActif / nbRep : 0 },
    { cle: 'point-actif', libelle: 'Point actif', brut: ptActif, valeur: grouper(nbPoints ? ptActif : 0), unite: 'pt', courant: false, part: nbPoints ? ptActif / nbPoints : 0 },
    { cle: 'densite', libelle: 'Densité', brut: nbRep ? nbPoints / nbRep : 0, valeur: virgule(nbRep ? nbPoints / nbRep : 0), unite: 'pts/rep.', courant: false, part: null },
  ];

  const creer = (tag, classe, texte) => {
    let noeud;
    if (fabrique) noeud = fabrique(tag, classe, texte);
    else {
      noeud = document.createElement(tag);
      if (classe) noeud.className = classe;
      if (texte !== undefined) noeud.textContent = texte;
    }
    return noeud;
  };

  /* E063-04 — Unité détachée : l'unité abrégée est un span distinct de la
     valeur, de taille et de ligne de base différentes (voir la feuille CSS). */
  /* E063-05 — Numérotation ordinale : data-v2e063-index alimente le badge
     « N/7 » rendu par le pseudo-élément ::before de .v2e063-ordre. */
  /* E063-06 — Barre de proportion : role progressbar, aria-valuenow et trait
     de remplissage pour les métriques « actif / total ». */
  /* E063-08 — Marqueur de forme : data-v2e063-courant pilote le losange
     (pseudo-élément ::after), distinct du soulignement de la passe 1. */
  /* E063-09 — Impression : la feuille unique bascule sur fond blanc et texte
     noir sous @media print, sans dépendre du thème sombre de l'écran. */
  const panneau = creer('div', 'v2e063-panneau');
  panneau.id = 'v2e063-lisibilite';
  panneau.setAttribute('role', 'group');
  panneau.setAttribute('aria-label', 'Lisibilité et contraste des métriques chiffrées');
  panneau.appendChild(creer('p', 'v2e063-titre', 'Lisibilité des métriques chiffrées'));

  metriques.forEach((metrique, index) => {
    const item = creer('div', 'v2e063-item');
    item.setAttribute('data-v2e063-cle', metrique.cle);
    if (metrique.courant) item.setAttribute('data-v2e063-courant', 'true');

    const ordre = creer('span', 'v2e063-ordre');
    ordre.setAttribute('data-v2e063-index', `${index + 1}/${metriques.length}`);
    item.appendChild(ordre);

    item.appendChild(creer('span', 'v2e063-libelle', metrique.libelle));

    const ligne = creer('span', 'v2e063-ligne');
    const valeur = creer('span', 'v2e063-valeur', metrique.valeur);
    valeur.setAttribute('data-v2e063-brut', String(metrique.brut));
    ligne.appendChild(valeur);
    if (metrique.unite) ligne.appendChild(creer('span', 'v2e063-unite', metrique.unite));
    item.appendChild(ligne);

    const badge = creer('span', 'v2e063-ratio', '…');
    badge.setAttribute('aria-hidden', 'true');
    item.appendChild(badge);

    const jauge = creer('span', 'v2e063-jauge');
    jauge.setAttribute('aria-hidden', 'true');
    const remplissage = creer('span', 'v2e063-jauge-fill');
    const seuil = creer('span', 'v2e063-jauge-seuil');
    seuil.style.left = `${(4.5 / 21 * 100).toFixed(2)}%`;
    jauge.appendChild(remplissage);
    jauge.appendChild(seuil);
    item.appendChild(jauge);

    if (metrique.part !== null) {
      const proportion = creer('span', 'v2e063-proportion');
      proportion.setAttribute('role', 'progressbar');
      proportion.setAttribute('aria-label', `${metrique.libelle} — proportion active`);
      proportion.setAttribute('aria-valuemin', '0');
      proportion.setAttribute('aria-valuemax', '100');
      const pourcent = Math.round(metrique.part * 100);
      proportion.setAttribute('aria-valuenow', String(pourcent));
      proportion.setAttribute('aria-valuetext', `${metrique.valeur} ${metrique.unite}`);
      const barre = creer('span', 'v2e063-proportion-fill');
      barre.style.width = `${pourcent}%`;
      proportion.appendChild(barre);
      item.appendChild(proportion);
      item.appendChild(creer('span', 'v2e063-part', `${pourcent} %`));
    }

    metrique.noeudItem = item;
    metrique.noeudValeur = valeur;
    metrique.noeudBadge = badge;
    metrique.noeudRemplissage = remplissage;
    panneau.appendChild(item);
  });

  /* E063-10 — Bouton d'information (disclosure) et paragraphe détaillé. */
  const bouton = creer('button', 'v2e063-detail-btn', 'Détail du contraste');
  bouton.id = 'v2e063-detail-btn';
  bouton.type = 'button';
  bouton.setAttribute('aria-expanded', 'false');
  bouton.setAttribute('aria-controls', 'v2e063-detail');
  const detail = creer('p', 'v2e063-detail',
    'Le ratio est calculé à partir des couleurs calculées du texte et du fond, '
    + 'selon la formule WCAG de luminance relative. AA exige au moins 4,5 pour un, '
    + 'AAA au moins 7 pour un. Le losange signale la métrique courante, le trait '
    + 'vertical de la jauge le seuil AA : aucun repère ne repose sur la seule couleur.');
  detail.id = 'v2e063-detail';
  detail.setAttribute('hidden', '');
  bouton.addEventListener('click', () => {
    const ouvert = bouton.getAttribute('aria-expanded') === 'true';
    bouton.setAttribute('aria-expanded', ouvert ? 'false' : 'true');
    if (ouvert) detail.setAttribute('hidden', '');
    else detail.removeAttribute('hidden');
  });
  panneau.appendChild(bouton);
  panneau.appendChild(detail);

  /* Insertion avant le champ visuel, avec repli tolérant. */
  try {
    const champ = layout.querySelector('.constellation-field');
    if (champ && champ.parentNode) champ.parentNode.insertBefore(panneau, champ);
    else layout.appendChild(panneau);
  } catch { /* greffon tolérant */ }
  if (!panneau.parentNode) {
    try { layout.appendChild(panneau); } catch { /* greffon tolérant */ }
  }

  /* E063-01 — Audit WCAG : luminance relative et ratio de contraste calculés
     depuis les couleurs calculées réelles. Aucune valeur n'est supposée. */
  const parseCouleur = (texte) => {
    if (typeof texte !== 'string') return null;
    const parties = texte.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (!parties) return null;
    return [Number(parties[1]), Number(parties[2]), Number(parties[3])];
  };
  const luminance = (rgb) => {
    const canal = (valeur) => {
      const composee = valeur / 255;
      return composee <= 0.03928 ? composee / 12.92 : Math.pow((composee + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * canal(rgb[0]) + 0.7152 * canal(rgb[1]) + 0.0722 * canal(rgb[2]);
  };
  const contraste = (a, b) => {
    const clair = Math.max(luminance(a), luminance(b));
    const sombre = Math.min(luminance(a), luminance(b));
    return (clair + 0.05) / (sombre + 0.05);
  };
  const fondDe = (noeud) => {
    try {
      const style = window.getComputedStyle(noeud);
      const fond = style.backgroundColor;
      const rgb = parseCouleur(fond);
      if (rgb && fond.indexOf('rgba') !== 0) return rgb;
      const parent = noeud && noeud.parentNode;
      if (parent && parent !== layout) {
        const rgbParent = parseCouleur(window.getComputedStyle(parent).backgroundColor);
        if (rgbParent) return rgbParent;
      }
    } catch { /* repli déterministe ci-dessous */ }
    return [12, 17, 26];
  };
  const libelleVerdict = (verdict) => (verdict === 'AAA' ? 'excellent'
    : verdict === 'AA' ? 'conforme' : 'insuffisant');

  /* E063-02 — Jauge de lisibilité : le remplissage est proportionnel au ratio
     sur une échelle de 0 à 21 pour un, avec un repère fixe au seuil AA. */
  metriques.forEach((metrique, index) => {
    let ratio = 0;
    let verdict = 'faible';
    try {
      const couleur = parseCouleur(window.getComputedStyle(metrique.noeudValeur).color);
      if (couleur) {
        ratio = contraste(couleur, fondDe(metrique.noeudItem));
        verdict = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'faible';
      }
    } catch { /* métrique laissée en verdict faible, sans lever d'exception */ }
    metrique.ratio = ratio;
    metrique.verdict = verdict;
    metrique.noeudItem.classList.add(`v2e063-${verdict}`);
    metrique.noeudValeur.setAttribute('data-v2e063-ratio', ratio.toFixed(2));
    metrique.noeudBadge.textContent = `${verdict} ${ratio.toFixed(2).replace('.', ',')}:1`;

    /* La jauge affiche le ratio sur une échelle de 0 à 21 pour un. */
    metrique.noeudRemplissage.style.width = `${Math.min(100, ratio / 21 * 100).toFixed(2)}%`;

    /* Enrichissement accessible : rang, unité et verdict sont vocalisés. */
    metrique.noeudValeur.setAttribute('aria-label',
      `${metrique.libelle} : ${metrique.valeur} ${metrique.unite}, `
      + `rang ${index + 1} sur ${metriques.length}, `
      + `contraste ${libelleVerdict(verdict)} ${ratio.toFixed(2).replace('.', ',')} pour un.`);
  });

  /* E063-07 — Région live : bilan de lisibilité en français, sans couper la
     navigation (role status, aria-live polite). */
  const live = creer('p', 'v2e063-sr', '');
  live.id = 'v2e063-live';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  const conformes = metriques.filter((metrique) => metrique.verdict === 'AA' || metrique.verdict === 'AAA').length;
  const ratios = metriques.map((metrique) => metrique.ratio);
  const pire = ratios.length ? Math.min.apply(null, ratios) : 0;
  live.textContent = `Bilan de lisibilité : ${nbEres} ères, ${nbRep} repères, ${nbPoints} points vérifiés. `
    + `${conformes} métrique${conformes > 1 ? 's' : ''} sur ${metriques.length} atteignent le seuil AA de 4,5 pour un. `
    + `Contraste le plus faible : ${pire.toFixed(2).replace('.', ',')} pour un.`;
  try { layout.appendChild(live); } catch { /* greffon tolérant */ }

  /* Repli mouvement réduit demandé au contexte, sans sonde propre. Le contour
     de focus et les repères restent inchangés (voir chantier E063-10). */
  let sobre = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { sobre = !!ctx.reducedMotion(); } catch { sobre = false; }
  }
  if (sobre) panneau.classList.add('v2e063-sobre');
  else panneau.classList.remove('v2e063-sobre');
});
