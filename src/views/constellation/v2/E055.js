import { register } from './registry.js';

/* Lentille V2 E055 — géométrie responsive du focus et de la tabulation de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, sans
   réseau, sans source aléatoire, sans minuteur ni boucle d'animation propre.
   Préfixe exclusif : v2e055 (aucune collision avec la passe 1 e055-…).
   Le module est passif : il lit le DOM construit par constellation.js et en
   dérive des mesures et des repères textuels, sans réécrire le rendu. */

const CSS_ID = 'constellation-v2-e055';
const PANNEAU_ID = 'v2e055-panneau';
const LIVE_ID = 'v2e055-live';

/* Seuils explicites, tous affichés dans le panneau pour être vérifiables. */
const ORIENT_PORTRAIT = 0.85;
const ORIENT_PAYSAGE = 1.30;
const SEUIL_COLLISION = 44; // px : écart souhaitable entre deux centres de cible
const PAS_LIGNE = 8; // % : tolérance de regroupement en lignes de lecture

/* État module : survit aux reconstructions complètes du DOM par la coque. */
const etat = { empreintePrecedente: null, rendus: 0 };

/* Greffon tolérant : un chantier défaillant n'interrompt pas les suivants. */
function sansEchec(action) {
  try { action(); } catch { /* neutralisation silencieuse, sans journalisation */ }
}

function ciblesDu(layout) {
  return Array.from(layout.querySelectorAll('.constellation-field button'));
}

function nombre(valeur) {
  const n = parseFloat(valeur);
  return Number.isFinite(n) ? n : NaN;
}

function positionDe(bouton) {
  return {
    x: nombre(bouton.style.getPropertyValue('--x')),
    y: nombre(bouton.style.getPropertyValue('--y')),
  };
}

function decimale(valeur) {
  return Number.isFinite(valeur) ? valeur.toFixed(2).replace('.', ',') : '—';
}

function dimensionsDe(layout) {
  const brutW = layout.clientWidth;
  const brutH = layout.clientHeight;
  return {
    largeur: Number.isFinite(brutW) && brutW > 0 ? brutW : NaN,
    hauteur: Number.isFinite(brutH) && brutH > 0 ? brutH : NaN,
  };
}

function orientationDe(ratio) {
  if (!Number.isFinite(ratio)) return 'indeterminee';
  if (ratio < ORIENT_PORTRAIT) return 'portrait';
  if (ratio > ORIENT_PAYSAGE) return 'paysage';
  return 'carree';
}

function rectangleChamp(layout) {
  const champ = layout.querySelector('.constellation-field');
  if (!champ || typeof champ.getBoundingClientRect !== 'function') return null;
  const r = champ.getBoundingClientRect();
  if (!(r.width > 0) || !(r.height > 0)) return null;
  return { gauche: r.left, haut: r.top, largeur: r.width, hauteur: r.height };
}

function centreDe(bouton, rect) {
  const p = positionDe(bouton);
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !rect) return null;
  return {
    x: rect.gauche + (p.x / 100) * rect.largeur,
    y: rect.haut + (p.y / 100) * rect.hauteur,
  };
}

function clefDe(bouton) {
  return bouton.dataset.constKey || bouton.getAttribute('aria-label') || '—';
}

function classeGroupe(bouton) {
  const couche = typeof bouton.closest === 'function' ? bouton.closest('.const-layer') : null;
  if (!couche || !couche.classList) return '';
  if (couche.classList.contains('const-layer-suns')) return 'ere';
  if (couche.classList.contains('const-layer-planets')) return 'repere';
  if (couche.classList.contains('const-layer-moons')) return 'point';
  return '';
}

/* Empreinte FNV-1a déterministe : aucun tirage, aucune horloge. */
function empreinteDe(chaine) {
  let h = 0x811c9dc5;
  for (let i = 0; i < chaine.length; i += 1) {
    h ^= chaine.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function ecrire(layout, identifiant, texte) {
  const noeud = layout.querySelector('#' + identifiant);
  if (noeud) noeud.textContent = texte;
}

/* Panneau unique, créé une seule fois, avec un vrai texte indexable. */
function panneauDans(layout, el) {
  const existant = layout.querySelector('#' + PANNEAU_ID);
  if (existant) return existant;

  const panneau = el('section', 'v2e055-panneau');
  panneau.id = PANNEAU_ID;
  panneau.setAttribute('aria-labelledby', 'v2e055-titre');

  const titre = el('h2', 'v2e055-titre', 'Géométrie responsive du focus et de la tabulation');
  titre.id = 'v2e055-titre';
  panneau.appendChild(titre);
  panneau.appendChild(el('p', 'v2e055-intro',
    'Relevé déterministe de la disposition courante : orientation, ordre de lecture, densité, débordements et repères de parcours.'));

  [
    ['v2e055-orientation', 'Orientation'],
    ['v2e055-ordre', 'Ordre de lecture'],
    ['v2e055-densite', 'Densité des cibles'],
    ['v2e055-lignes', 'Lignes de lecture'],
    ['v2e055-hors-champ', 'Débordement du champ'],
    ['v2e055-ecran', 'Visibilité du focus'],
    ['v2e055-groupes', 'Densité par groupe'],
    ['v2e055-entree', 'Points d’entrée et de sortie'],
    ['v2e055-empreinte', 'Empreinte géométrique'],
    ['v2e055-synthese', 'Synthèse'],
  ].forEach(([identifiant, intitule]) => {
    const ligne = el('p', 'v2e055-ligne', `${intitule} : en cours de mesure.`);
    ligne.id = identifiant;
    panneau.appendChild(ligne);
  });

  const live = el('p', 'v2e055-ligne v2e055-live', '');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  panneau.appendChild(live);

  const champ = layout.querySelector('.constellation-field');
  if (champ && typeof layout.insertBefore === 'function') layout.insertBefore(panneau, champ);
  else if (typeof layout.appendChild === 'function') layout.appendChild(panneau);
  return panneau;
}

register('E055', (ctx) => {
  /* Garde de contexte : aucun ajout au DOM sans layout exploitable. */
  const layout = ctx && ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function' || typeof document === 'undefined') return;
  const css = typeof ctx.css === 'function' ? ctx.css : null;
  const el = typeof ctx.el === 'function' ? ctx.el : null;
  if (!css || !el) return;
  const cibles = ciblesDu(layout);
  if (!cibles.length) return; /* champ vide : rien à mesurer */

  /* Feuille unique, injectée une seule fois pour toute la vue. */
  css(CSS_ID, `
    .constellation-layout[data-v2e055='on'] #${PANNEAU_ID} {
      margin: 10px 0 4px; padding: 8px 10px;
      border: 1px solid var(--line); border-radius: 8px;
      background: rgba(255,255,255,.02); color: var(--ink-soft);
      font-family: var(--sans, inherit);
    }
    #v2e055-titre {
      margin: 0 0 5px; font-size: 10px; font-weight: 600;
      letter-spacing: .1em; text-transform: uppercase; color: var(--gold);
    }
    #${PANNEAU_ID} .v2e055-intro { margin: 0 0 4px; font-size: 9px; line-height: 1.5; color: var(--muted); }
    #${PANNEAU_ID} .v2e055-ligne {
      margin: 3px 0; font-size: 9px; line-height: 1.45;
      color: var(--muted-2); font-variant-numeric: tabular-nums;
    }
    #${LIVE_ID} { color: var(--gold-bright); }
    /* E055-02 : décalage ordre DOM / lecture — contour tireté, jamais la couleur seule. */
    .constellation-layout[data-v2e055='on'] .constellation-field button[data-v2e055-ordre-decale='1'] {
      outline: 2px dashed var(--gold); outline-offset: 2px;
    }
    /* E055-03 : collision de centres — anneau interne double, distinct du contour. */
    .constellation-layout[data-v2e055='on'] .constellation-field button[data-v2e055-collision='1'] {
      box-shadow: inset 0 0 0 3px var(--violet);
    }
    /* E055-05 : cible hors champ — bordure double. */
    .constellation-layout[data-v2e055='on'] .constellation-field button[data-v2e055-hors-champ='1'] {
      border-style: double; border-width: 2px;
    }
    /* E055-08 : entrée et sortie conseillées — soulignement, sans déplacer le focus. */
    .constellation-layout[data-v2e055='on'] .constellation-field button[data-v2e055-entree='1'] {
      text-decoration: underline;
    }
    .constellation-layout[data-v2e055='on'] .constellation-field button[data-v2e055-sortie='1'] {
      text-decoration: underline dotted;
    }
    .constellation-layout.v2e055-reduit #${PANNEAU_ID} *,
    .constellation-layout.v2e055-reduit .constellation-field button {
      transition: none !important; animation: none !important;
    }
    @media (max-width: 620px) {
      #v2e055-titre { font-size: 9px; }
      #${PANNEAU_ID} .v2e055-ligne, #${PANNEAU_ID} .v2e055-intro { font-size: 8px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #${PANNEAU_ID} *, .constellation-layout .constellation-field button {
        transition: none !important; animation: none !important;
      }
    }
  `);
  panneauDans(layout, el);

  /* E055-01 — Classement par orientation (portrait / carré / paysage). */
  sansEchec(() => {
    const { largeur, hauteur } = dimensionsDe(layout);
    const ratio = Number.isFinite(largeur) && Number.isFinite(hauteur) ? largeur / hauteur : NaN;
    const orientation = orientationDe(ratio);
    layout.dataset.v2e055Orientation = orientation;
    layout.dataset.v2e055Ratio = decimale(ratio);
    layout.dataset.v2e055Dimensions = Number.isFinite(largeur) && Number.isFinite(hauteur)
      ? `${Math.round(largeur)} × ${Math.round(hauteur)}` : 'indetermine';
    ecrire(layout, 'v2e055-orientation',
      `Orientation : ${orientation} · rapport largeur/hauteur ${decimale(ratio)} · ${layout.dataset.v2e055Dimensions} px · seuils ${String(ORIENT_PORTRAIT).replace('.', ',')} / ${String(ORIENT_PAYSAGE).replace('.', ',')}.`);
  });

  /* E055-02 — Inversions entre ordre DOM et ordre de lecture spatiale. */
  sansEchec(() => {
    const spatial = cibles.map((bouton, index) => {
      const p = positionDe(bouton);
      return { index, x: Number.isFinite(p.x) ? p.x : 50, y: Number.isFinite(p.y) ? p.y : 50 };
    }).sort((a, b) => {
      const la = Math.round(a.y / PAS_LIGNE);
      const lb = Math.round(b.y / PAS_LIGNE);
      return la - lb || a.x - b.x;
    });
    const rangSpatial = new Map();
    spatial.forEach((entree, rang) => rangSpatial.set(entree.index, rang));
    const participants = new Set();
    let inversions = 0;
    for (let i = 0; i < cibles.length; i += 1) {
      for (let j = i + 1; j < cibles.length; j += 1) {
        if (rangSpatial.get(i) > rangSpatial.get(j)) {
          inversions += 1;
          participants.add(i);
          participants.add(j);
        }
      }
    }
    participants.forEach((i) => {
      if (cibles[i] && cibles[i].dataset) cibles[i].dataset.v2e055OrdreDecale = '1';
    });
    cibles.forEach((bouton, i) => {
      if (bouton.dataset && !participants.has(i)) bouton.dataset.v2e055OrdreDecale = '0';
    });
    layout.dataset.v2e055Inversions = String(inversions);
    layout.dataset.v2e055Decales = String(participants.size);
    ecrire(layout, 'v2e055-ordre',
      `Ordre de lecture : ${inversions} inversion${inversions > 1 ? 's' : ''} entre l’ordre DOM et l’ordre spatial · ${participants.size} cible${participants.size > 1 ? 's' : ''} décalée${participants.size > 1 ? 's' : ''} sur ${cibles.length} · bande de ${PAS_LIGNE} %.`);
  });

  /* E055-03 — Distance minimale et collisions entre centres de cibles. */
  sansEchec(() => {
    const rect = rectangleChamp(layout);
    const centres = cibles.map((bouton) => centreDe(bouton, rect));
    let minimum = Infinity;
    let collisions = 0;
    const enCollision = new Set();
    for (let i = 0; i < centres.length; i += 1) {
      for (let j = i + 1; j < centres.length; j += 1) {
        const a = centres[i];
        const b = centres[j];
        if (!a || !b) continue;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (!Number.isFinite(distance)) continue;
        if (distance < minimum) minimum = distance;
        if (distance < SEUIL_COLLISION) {
          collisions += 1;
          enCollision.add(i);
          enCollision.add(j);
        }
      }
    }
    enCollision.forEach((i) => {
      if (cibles[i] && cibles[i].dataset) cibles[i].dataset.v2e055Collision = '1';
    });
    cibles.forEach((bouton, i) => {
      if (bouton.dataset && !enCollision.has(i)) bouton.dataset.v2e055Collision = '0';
    });
    layout.dataset.v2e055DistMin = Number.isFinite(minimum) ? decimale(minimum) : 'indetermine';
    layout.dataset.v2e055Collisions = String(collisions);
    ecrire(layout, 'v2e055-densite',
      `Densité des cibles : écart minimal ${decimale(minimum)} px pour un seuil de ${SEUIL_COLLISION} px · ${collisions} paire${collisions > 1 ? 's' : ''} trop proche${collisions > 1 ? 's' : ''} · ${enCollision.size} cible${enCollision.size > 1 ? 's' : ''} signalée${enCollision.size > 1 ? 's' : ''}.`);
  });

  /* E055-04 — Lignes de lecture et numérotation ligne / colonne. */
  sansEchec(() => {
    const rangees = new Map();
    cibles.forEach((bouton, index) => {
      const p = positionDe(bouton);
      const y = Number.isFinite(p.y) ? p.y : 50;
      const x = Number.isFinite(p.x) ? p.x : 50;
      const cle = String(Math.round(y / PAS_LIGNE));
      if (!rangees.has(cle)) rangees.set(cle, []);
      rangees.get(cle).push({ index, x });
    });
    const cles = Array.from(rangees.keys()).sort((a, b) => Number(a) - Number(b));
    cles.forEach((cle, rang) => {
      rangees.get(cle).sort((a, b) => a.x - b.x).forEach((entree, colonne) => {
        const bouton = cibles[entree.index];
        if (!bouton || !bouton.dataset) return;
        bouton.dataset.v2e055Ligne = String(rang + 1);
        bouton.dataset.v2e055Colonne = String(colonne + 1);
      });
    });
    layout.dataset.v2e055Lignes = String(cles.length);
    ecrire(layout, 'v2e055-lignes',
      `Lignes de lecture : ${cles.length} rangée${cles.length > 1 ? 's' : ''} détectée${cles.length > 1 ? 's' : ''} sur ${cibles.length} cible${cibles.length > 1 ? 's' : ''} · bande de ${PAS_LIGNE} % · chaque cible porte son rang de ligne et de colonne.`);
  });

  /* E055-05 — Débordement hors champ : pourcentages hors plage ou centre hors cadre. */
  sansEchec(() => {
    const rect = rectangleChamp(layout);
    const egares = [];
    cibles.forEach((bouton, index) => {
      const p = positionDe(bouton);
      const horsPlage = !Number.isFinite(p.x) || !Number.isFinite(p.y)
        || p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100;
      const centre = centreDe(bouton, rect);
      const horsCadre = !!(rect && centre && (
        centre.x < rect.gauche || centre.x > rect.gauche + rect.largeur
        || centre.y < rect.haut || centre.y > rect.haut + rect.hauteur));
      const hors = !!(horsPlage || horsCadre);
      if (bouton.dataset) bouton.dataset.v2e055HorsChamp = hors ? '1' : '0';
      if (hors) egares.push(`${index + 1} (${clefDe(bouton)})`);
    });
    layout.dataset.v2e055HorsChamp = String(egares.length);
    ecrire(layout, 'v2e055-hors-champ',
      `Débordement du champ : ${egares.length}/${cibles.length} cible${egares.length > 1 ? 's' : ''} hors cadre réel${egares.length ? ` (${egares.join(', ')})` : ' · toutes dans le cadre'} · cadre ${rect ? 'mesuré' : 'non mesurable'}.`);
  });

  /* E055-06 — Visibilité réelle du focus, détectée sans défilement forcé. */
  sansEchec(() => {
    ecrire(layout, 'v2e055-ecran', 'Visibilité du focus : en attente d’un focus dans le champ.');
    const doc = layout.ownerDocument || document;
    const win = doc && doc.defaultView ? doc.defaultView : null;
    const hauteurVue = win && Number.isFinite(win.innerHeight) ? win.innerHeight : NaN;
    const largeurVue = win && Number.isFinite(win.innerWidth) ? win.innerWidth : NaN;
    layout.addEventListener('focusin', (evenement) => {
      sansEchec(() => {
        const cible = evenement && evenement.target && typeof evenement.target.closest === 'function'
          ? evenement.target.closest('.constellation-field button') : null;
        if (!cible || !layout.contains(cible) || typeof cible.getBoundingClientRect !== 'function') return;
        const r = cible.getBoundingClientRect();
        if (!(r.width > 0) || !(r.height > 0)) return;
        let visibilite = 'visible';
        if (Number.isFinite(hauteurVue) && (r.bottom > hauteurVue || r.top < 0)) visibilite = 'hors-hauteur';
        else if (Number.isFinite(largeurVue) && (r.right > largeurVue || r.left < 0)) visibilite = 'hors-largeur';
        layout.dataset.v2e055HorsEcran = visibilite === 'visible' ? '0' : '1';
        layout.dataset.v2e055Visibilite = visibilite;
        ecrire(layout, 'v2e055-ecran', visibilite === 'visible'
          ? `Visibilité du focus : ${clefDe(cible)} entièrement dans la zone visible (${Math.round(r.width)} × ${Math.round(r.height)} px).`
          : `Visibilité du focus : ${clefDe(cible)} partiellement hors écran (${visibilite}) · défilement non forcé, repère textuel uniquement.`);
      });
    });
  });

  /* E055-07 — Densité par groupe et classement des calques. */
  sansEchec(() => {
    const rect = rectangleChamp(layout);
    const groupes = [
      { cle: 'ere', calque: '.const-layer-suns', nom: 'ères' },
      { cle: 'repere', calque: '.const-layer-planets', nom: 'repères' },
      { cle: 'point', calque: '.const-layer-moons', nom: 'points vérifiés' },
    ];
    const mesures = groupes.map((groupe) => {
      const calque = layout.querySelector(groupe.calque);
      const centres = cibles.filter((bouton) => classeGroupe(bouton) === groupe.cle)
        .map((bouton) => centreDe(bouton, rect)).filter(Boolean);
      let voisin = Infinity;
      for (let i = 0; i < centres.length; i += 1) {
        for (let j = 0; j < centres.length; j += 1) {
          if (i === j) continue;
          const distance = Math.hypot(centres[i].x - centres[j].x, centres[i].y - centres[j].y);
          if (Number.isFinite(distance) && distance < voisin) voisin = distance;
        }
      }
      if (calque && calque.dataset) {
        calque.dataset.v2e055Voisin = Number.isFinite(voisin) ? decimale(voisin) : 'indetermine';
      }
      return { cle: groupe.cle, nom: groupe.nom, calque, voisin, count: centres.length };
    });
    const ordre = mesures.slice().sort((a, b) => {
      const va = Number.isFinite(a.voisin) ? a.voisin : Infinity;
      const vb = Number.isFinite(b.voisin) ? b.voisin : Infinity;
      return va - vb;
    });
    ordre.forEach((mesure, rang) => {
      if (mesure.calque && mesure.calque.dataset) mesure.calque.dataset.v2e055Densite = String(rang + 1);
    });
    layout.dataset.v2e055DensiteOrdre = ordre.map((mesure) => mesure.cle).join('>');
    ecrire(layout, 'v2e055-groupes',
      `Densité par groupe (du plus serré au plus aéré) : ${ordre.map((m) => `${m.nom} ${decimale(m.voisin)} px (${m.count})`).join(' · ')} · écart mesuré au voisin le plus proche.`);
  });

  /* E055-08 — Points d'entrée et de sortie conseillés selon l'orientation. */
  sansEchec(() => {
    const orientation = layout.dataset.v2e055Orientation || 'indeterminee';
    const axe = orientation === 'portrait' ? 'y' : 'x';
    const axeNom = orientation === 'portrait' ? 'vertical' : 'horizontal';
    const points = cibles.map((bouton) => ({ bouton, p: positionDe(bouton) }));
    const valeur = (entree) => Number.isFinite(entree.p[axe]) ? entree.p[axe] : (axe === 'x' ? 50 : 50);
    const entree = points.slice().sort((a, b) => valeur(a) - valeur(b))[0];
    const sortie = points.slice().sort((a, b) => valeur(b) - valeur(a))[0];
    if (entree && entree.bouton.dataset) entree.bouton.dataset.v2e055Entree = '1';
    if (sortie && sortie.bouton.dataset) sortie.bouton.dataset.v2e055Sortie = '1';
    layout.dataset.v2e055Entree = entree ? clefDe(entree.bouton) : '';
    layout.dataset.v2e055Sortie = sortie ? clefDe(sortie.bouton) : '';
    ecrire(layout, 'v2e055-entree',
      `Points d’entrée et de sortie conseillés (axe ${axeNom}, orientation ${orientation}) : entrée ${layout.dataset.v2e055Entree} · sortie ${layout.dataset.v2e055Sortie} · repères calculés sur les positions réelles, sans modifier l’ordre de tabulation.`);
  });

  /* E055-09 — Empreinte géométrique et détection de changement entre rendus. */
  sansEchec(() => {
    const champs = ['v2e055Orientation', 'v2e055Ratio', 'v2e055Dimensions',
      'v2e055Inversions', 'v2e055Decales', 'v2e055DistMin', 'v2e055Collisions',
      'v2e055Lignes', 'v2e055HorsChamp', 'v2e055DensiteOrdre',
      'v2e055Entree', 'v2e055Sortie'];
    const chaine = champs.map((champ) => `${champ}=${layout.dataset[champ] || ''}`).join('|');
    const empreinte = empreinteDe(chaine);
    etat.rendus += 1;
    const modifie = etat.empreintePrecedente !== null && etat.empreintePrecedente !== empreinte;
    etat.empreintePrecedente = empreinte;
    layout.dataset.v2e055Empreinte = empreinte;
    layout.dataset.v2e055Rendus = String(etat.rendus);
    layout.dataset.v2e055Modifie = modifie ? '1' : '0';
    ecrire(layout, 'v2e055-empreinte',
      `Empreinte géométrique : ${empreinte} (FNV-1a sur ${champs.length} champs) · rendu n° ${etat.rendus} · ${modifie ? 'géométrie modifiée depuis le relevé précédent' : etat.rendus === 1 ? 'premier relevé' : 'géométrie inchangée'}.`);
  });

  /* E055-10 — Synthèse consolidée, annonce live, mouvement réduit et activation. */
  sansEchec(() => {
    const donnees = layout.dataset;
    const synthese = `Synthèse : orientation ${donnees.v2e055Orientation} (rapport ${donnees.v2e055Ratio}) · `
      + `${donnees.v2e055Inversions} inversion(s) de lecture · écart minimal ${donnees.v2e055DistMin} px · `
      + `${donnees.v2e055Collisions} collision(s) · ${donnees.v2e055Lignes} ligne(s) · `
      + `${donnees.v2e055HorsChamp} cible(s) hors champ · groupes ${donnees.v2e055DensiteOrdre || '—'} · `
      + `empreinte ${donnees.v2e055Empreinte}.`;
    ecrire(layout, 'v2e055-synthese', synthese);
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() === true;
    layout.dataset.v2e055Mouvement = reduit ? 'reduit' : 'normal';
    if (reduit) layout.classList.add('v2e055-reduit');
    else layout.classList.remove('v2e055-reduit');
    const region = layout.querySelector('#' + LIVE_ID);
    if (region) {
      region.textContent = `Relevé géométrique n° ${etat.rendus} · ${synthese} Mouvement ${reduit ? 'réduit' : 'normal'}.`;
    }
    /* Activation atomique : aucune règle ne s'applique à un DOM à moitié muté. */
    layout.dataset.v2e055 = 'on';
  });
});
