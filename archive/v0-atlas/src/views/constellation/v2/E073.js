import { register } from './registry.js';

/* Lentille V2 E073 — contraste visuel appliqué au survol de la vue Constellation.
   Seconde passe : dix chantiers inédits, tous implémentés, sans réseau ni source
   aléatoire, sans minuteur ni boucle d'animation propre. Préfixe exclusif v2e073 :
   aucune collision avec les identifiants de la première passe. */
register('E073', ctx => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (layout.nodeType !== 1 || typeof layout.querySelectorAll !== 'function') return;

  const doc = layout.ownerDocument || document;
  const vue = doc.defaultView || null;

  /* Miroir des jetons de styles.css:3-16 : valeurs littérales, sans lecture de
     style calculée, pour des mesures reproductibles d'un rendu à l'autre. */
  const JETONS = {
    fond: '#070a0e',
    surface2: '#10151d',
    encre: '#f2ede3',
    encreDouce: '#d7d1c6',
    mute: '#a8a198',
    mute2: '#8c8d91',
    or: '#e6b96f',
    orVif: '#f4d69e',
    violet: '#b28bdd',
  };

  /* Cinq familles survolables, avec leur couleur au repos et leur couleur
     renforcée ; la couleur active sert de repère à l'état « sélectionné ». */
  const FAMILLES = [
    { nom: 'Ères (soleils)', sel: '.const-sun', repos: JETONS.encreDouce, survol: JETONS.orVif, actif: JETONS.orVif },
    { nom: 'Repères (planètes)', sel: '.const-planet', repos: JETONS.mute, survol: JETONS.orVif, actif: JETONS.orVif },
    { nom: 'Points (lunes)', sel: '.const-moon', repos: JETONS.violet, survol: JETONS.orVif, actif: JETONS.violet },
    { nom: 'Lien retour', sel: '.constellation-back', repos: JETONS.encreDouce, survol: JETONS.orVif, actif: JETONS.orVif },
    { nom: 'Légende', sel: '.constellation-legend span', repos: JETONS.or, survol: JETONS.orVif, actif: JETONS.or },
  ];
  const SELECTEUR = FAMILLES.map(famille => famille.sel).join(', ');
  const liste = selecteur => Array.prototype.slice.call(layout.querySelectorAll(selecteur));
  const selecteurs = suffixe => FAMILLES
    .map(famille => `.constellation-layout.v2e073 ${famille.sel}${suffixe}`).join(', ');
  const selecteursMax = suffixe => FAMILLES
    .map(famille => `.constellation-layout.v2e073.v2e073-max ${famille.sel}${suffixe}`).join(', ');

  const AVANT = `${selecteurs(':hover::before')}, ${selecteurs(':focus-visible::before')}`;
  const APRES = `${selecteurs(':hover::after')}, ${selecteurs(':focus-visible::after')}`;
  const SURVOL = `${selecteurs(':hover')}, ${selecteurs(':focus-visible')}`;
  const VOILE = `${selecteurs('.v2e073-voile:hover::after')}, ${selecteurs('.v2e073-voile:focus-visible::after')}`;
  const LONG = '.constellation-layout.v2e073 button.v2e073-long:hover::after, '
    + '.constellation-layout.v2e073 button.v2e073-long:focus-visible::after';
  const MAX_APRES = `${selecteursMax(':hover::after')}, ${selecteursMax(':focus-visible::after')}`;

  /* Feuille unique : toutes les règles sont préfixées par .v2e073, classe posée
     uniquement ici. Hors cette lentille, la vue reste strictement inchangée. */
  css('constellation-v2-e073', `
/* 03 — cibles sous 24 px : contour pointillé, sans changer leur géométrie. */
${selecteurs('.v2e073-petite:hover')}, ${selecteurs('.v2e073-petite:focus-visible')} {
  outline: 3px dashed var(--gold-bright);
  outline-offset: 3px;
}
/* 04 — marqueur « ▸ » : l'état renforcé est lisible par la forme, pas seulement
   par la couleur, au pointeur comme au clavier. */
${selecteurs('')} { position: relative; }
${AVANT} {
  content: '▸';
  position: absolute; top: -15px; left: 50%;
  transform: translateX(-50%);
  color: var(--gold-bright); font-size: 10px; line-height: 1;
  pointer-events: none;
}
/* 05 — voile de fond local sous l'étiquette, au-dessus des arêtes du champ. */
${VOILE} {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--bg);
  box-shadow: 0 0 0 1px var(--line-strong);
}
/* 06 — libellés longs : l'ellipse est levée au survol pour lire le nom entier. */
${LONG} {
  width: auto; max-width: 220px;
  white-space: normal; overflow: visible; text-overflow: clip;
  font-size: 10px;
}
/* 07 — contraste forcé du système : couleurs système et contour renforcé. */
@media (forced-colors: active) {
  ${SURVOL} { outline: 3px solid CanvasText; outline-offset: 3px; }
  ${APRES} { color: CanvasText; background: Canvas; text-shadow: none; box-shadow: none; }
  ${AVANT} { color: Highlight; }
}
/* 09 — bascule « contraste maximal » : l'état pressé n'est jamais porté par la
   seule couleur, le libellé change aussi ; la couleur sûre est calculée en 02. */
.v2e073-toggle {
  min-height: 36px; min-width: 36px; padding: 0 12px;
  border: 1px solid var(--line-strong); border-radius: 8px;
  background: var(--surface-2); color: var(--ink);
  font-size: 10px; cursor: pointer;
}
.v2e073-toggle:focus-visible { outline: 3px solid var(--gold-bright); outline-offset: 2px; }
.v2e073-toggle[aria-pressed="true"] {
  border-color: var(--gold-bright); color: var(--gold-bright);
  box-shadow: inset 0 0 0 1px var(--line-strong);
}
${MAX_APRES} {
  color: var(--v2e073-safe, var(--gold-bright));
  text-shadow: 0 1px 0 var(--bg), 0 0 8px rgba(244, 214, 158, .55);
}
${selecteursMax(':hover')}, ${selecteursMax(':focus-visible')} {
  outline-color: var(--v2e073-safe, var(--gold-bright));
}
/* 10 — bilan visible, annonce masquée et repli « mouvement réduit ». */
.v2e073-sr {
  position: absolute !important; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.v2e073-audit {
  margin: 12px 0 0; padding: 9px 11px;
  border: 1px solid var(--line); border-radius: 8px;
  background: var(--surface-2); color: var(--ink-soft);
  font-size: 9px; line-height: 1.5;
}
.v2e073-audit h3 { margin: 0 0 5px; color: var(--gold); font-size: 11px; font-weight: 450; }
.v2e073-audit p { margin: 0 0 6px; }
.v2e073-audit ul { margin: 0; padding-left: 15px; }
.v2e073-audit li { margin: 1px 0; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.constellation-layout.v2e073.v2e073-still * { transition: none !important; }
@media (prefers-reduced-motion: reduce) {
  .constellation-layout.v2e073 * { transition: none !important; }
}
`);

  /* Fabrique tolérante : ctx.el quand il existe, sinon le document propriétaire. */
  const creer = (tag, cls, text) => {
    if (typeof ctx.el === 'function') return ctx.el(tag, cls, text);
    const noeud = doc.createElement(tag);
    if (cls) noeud.className = cls;
    if (text !== undefined) noeud.textContent = text;
    return noeud;
  };

  /* Luminance relative WCAG 2.1, sur des hexadécimaux à six chiffres. */
  const luminance = (hex) => {
    const brut = String(hex || '').replace('#', '');
    if (brut.length !== 6) return 0;
    const lineaires = [0, 2, 4].map((i) => {
      const entier = parseInt(brut.slice(i, i + 2), 16);
      const v = Number.isFinite(entier) ? entier / 255 : 0;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lineaires[0] + 0.7152 * lineaires[1] + 0.0722 * lineaires[2];
  };

  /* Ratio (L clair + 0,05) / (L sombre + 0,05) et outils de mélange déterministe. */
  const contraste = (a, b) => {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const composantes = (hex) => {
    const brut = String(hex || '').replace('#', '');
    return [0, 2, 4].map((i) => {
      const entier = parseInt(brut.slice(i, i + 2), 16);
      return Number.isFinite(entier) ? entier : 0;
    });
  };
  const assembler = (r, g, b) => '#' + [r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');
  const melanger = (a, b, t) => {
    const x = composantes(a);
    const y = composantes(b);
    return assembler(
      x[0] + (y[0] - x[0]) * t,
      x[1] + (y[1] - x[1]) * t,
      x[2] + (y[2] - x[2]) * t,
    );
  };

  /* E073-01 — Échelon WCAG : chaque famille est rangée AAA, AA, AA pour grand
     texte ou échec ; la distribution et le niveau de chaque cible sont publiés. */
  const cibles = liste(SELECTEUR);
  const mesures = FAMILLES.map((famille) => ({
    nom: famille.nom,
    repos: contraste(famille.repos, JETONS.fond),
    survol: contraste(famille.survol, JETONS.fond),
  }));
  const echelon = (ratio) => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA-grand' : 'echec');
  mesures.forEach((mesure) => {
    mesure.grade = echelon(mesure.repos);
    mesure.gradeSurvol = echelon(mesure.survol);
  });
  const distribution = { AAA: 0, AA: 0, 'AA-grand': 0, echec: 0 };
  mesures.forEach((mesure) => { distribution[mesure.grade] += 1; });
  FAMILLES.forEach((famille, index) => {
    liste(famille.sel).forEach((cible) => {
      cible.dataset.v2e073Grade = mesures[index].grade;
      cible.dataset.v2e073GradeSurvol = mesures[index].gradeSurvol;
    });
  });
  layout.dataset.v2e073Grades = mesures.map((mesure) => `${mesure.nom}=${mesure.grade}`).join('|');
  layout.dataset.v2e073Distribution = `${distribution.AAA}/${distribution.AA}/${distribution['AA-grand']}/${distribution.echec}`;
  layout.dataset.v2e073Cibles = String(cibles.length);

  /* E073-02 — Plancher AAA déterministe : la couleur la plus pâle est élevée
     vers le blanc par pas fixes jusqu'à 7:1, sans tirage ni horloge. */
  const faible = mesures.reduce((a, b) => (a.repos <= b.repos ? a : b), mesures[0]);
  const indexFaible = mesures.indexOf(faible);
  const depart = FAMILLES[indexFaible] ? FAMILLES[indexFaible].repos : JETONS.or;
  let plancher = depart;
  let pas = 0;
  for (; pas <= 20; pas += 1) {
    const candidat = melanger(depart, '#ffffff', pas / 20);
    if (contraste(candidat, JETONS.fond) >= 7) { plancher = candidat; break; }
  }
  layout.dataset.v2e073Plancher = plancher;
  layout.dataset.v2e073PlancherPas = String(pas);
  layout.dataset.v2e073PlancherBase = faible.repos.toFixed(2);
  if (layout.style && typeof layout.style.setProperty === 'function') {
    layout.style.setProperty('--v2e073-safe', plancher);
  }

  /* E073-03 — Surface minimale : lecture synchrone des dimensions rendues,
     sans boucle d'attente ; les cibles sous 24 px gagnent un contour pointillé. */
  let petites = 0;
  cibles.forEach((cible) => {
    const largeur = Number(cible.offsetWidth) || 0;
    const hauteur = Number(cible.offsetHeight) || 0;
    if (largeur > 0 && hauteur > 0 && (largeur < 24 || hauteur < 24)) {
      cible.dataset.v2e073Petite = `${Math.round(largeur)}x${Math.round(hauteur)}`;
      cible.classList.add('v2e073-petite');
      petites += 1;
    }
  });
  layout.dataset.v2e073Petites = String(petites);

  /* E073-04 — Marqueur textuel « ▸ » : l'état renforcé reste identifiable par
     la forme, jamais par la seule couleur, au pointeur comme au clavier. */
  cibles.forEach((cible) => { cible.dataset.v2e073Marqueur = '▸'; });
  layout.dataset.v2e073Marqueur = '▸';

  /* E073-05 — Voile de fond local : l'étiquette reçoit un fond opaque et un
     liseré, ce qui maintient son contraste au-dessus des arêtes du champ. */
  cibles.forEach((cible) => {
    cible.classList.add('v2e073-voile');
    cible.dataset.v2e073Voile = 'bg';
  });
  layout.dataset.v2e073Voile = 'bg';

  /* E073-06 — Libellés longs : au-delà du seuil propre à chaque famille,
     l'ellipse est levée au survol pour que le nom complet soit lisible. */
  const SEUILS = { '.const-sun': 24, '.const-planet': 20, '.const-moon': 18 };
  let longs = 0;
  Object.keys(SEUILS).forEach((selecteur) => {
    liste(selecteur).forEach((cible) => {
      const libelle = String((cible.dataset && cible.dataset.label) || '');
      if (libelle.length > SEUILS[selecteur]) {
        cible.dataset.v2e073Long = String(libelle.length);
        cible.classList.add('v2e073-long');
        longs += 1;
      }
    });
  });
  layout.dataset.v2e073Longs = String(longs);

  /* E073-07 — Contraste forcé du système : la feuille emploie les couleurs
     système CanvasText/Canvas/Highlight et l'état est consigné sans sonde propre. */
  let force = false;
  try {
    force = !!(vue && typeof vue.matchMedia === 'function'
      && vue.matchMedia('(forced-colors: active)').matches);
  } catch (_) { force = false; }
  layout.dataset.v2e073ForceColors = force ? 'active' : 'inactive';
  if (force) layout.classList.add('v2e073-force');
  else layout.classList.remove('v2e073-force');

  /* E073-08 — Écart de luminance : un changement de contraste sans saut de
     luminance reste invisible pour certains ; l'écart est mesuré par famille. */
  const ecarts = mesures.map((mesure, index) => {
    const famille = FAMILLES[index];
    return { nom: mesure.nom, valeur: Math.abs(luminance(famille.survol) - luminance(famille.repos)) };
  });
  FAMILLES.forEach((famille, index) => {
    liste(famille.sel).forEach((cible) => {
      cible.dataset.v2e073Luminance = ecarts[index].valeur.toFixed(3);
    });
  });
  layout.dataset.v2e073Ecarts = ecarts.map((ecart) => `${ecart.nom}=${ecart.valeur.toFixed(3)}`).join('|');
  layout.dataset.v2e073LuminanceFaible = String(ecarts.filter((ecart) => ecart.valeur < 0.05).length);

  /* E073-09 — Bascule « contraste maximal » : aria-pressed sur une bascule
     indépendante, libellé modifié en plus de la couleur, annonce polie. */
  try {
    let maxLive = layout.querySelector('#v2e073-max-live');
    if (!maxLive) {
      maxLive = creer('p', 'v2e073-sr', '');
      maxLive.id = 'v2e073-max-live';
      maxLive.setAttribute('role', 'status');
      maxLive.setAttribute('aria-live', 'polite');
      maxLive.setAttribute('aria-atomic', 'true');
      layout.appendChild(maxLive);
    }
    let bascule = layout.querySelector('#v2e073-max-toggle');
    if (!bascule) {
      bascule = creer('button', 'v2e073-toggle', 'Contraste maximal — désactivé');
      bascule.id = 'v2e073-max-toggle';
      bascule.type = 'button';
      bascule.setAttribute('aria-pressed', 'false');
      bascule.setAttribute('aria-label', 'Contraste maximal au survol');
      if (typeof bascule.addEventListener === 'function') {
        bascule.addEventListener('click', () => {
          const actif = bascule.getAttribute('aria-pressed') !== 'true';
          bascule.setAttribute('aria-pressed', actif ? 'true' : 'false');
          bascule.textContent = actif
            ? 'Contraste maximal — activé' : 'Contraste maximal — désactivé';
          if (actif) layout.classList.add('v2e073-max');
          else layout.classList.remove('v2e073-max');
          if (maxLive) {
            maxLive.textContent = actif
              ? `Contraste maximal activé : couleur sûre ${plancher} et marqueur « ▸ » au survol.`
              : 'Contraste maximal désactivé : retour aux couleurs habituelles.';
          }
        });
      }
      const ancre = layout.querySelector('.constellation-caption')
        || layout.querySelector('.constellation-legend');
      if (ancre && ancre.parentNode && typeof ancre.parentNode.insertBefore === 'function') {
        ancre.parentNode.insertBefore(bascule, ancre);
      } else {
        layout.appendChild(bascule);
      }
    }
    layout.dataset.v2e073Bascule = 'presente';
  } catch (_) { layout.dataset.v2e073Bascule = 'absente'; }

  /* E073-10 — Bilan visible, contrôle d'intégrité et repli « mouvement réduit ». */
  let reduit = false;
  try { reduit = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion(); }
  catch (_) { reduit = false; }
  layout.dataset.v2e073Motion = reduit ? 'reduced' : 'full';
  if (reduit) layout.classList.add('v2e073-still');
  else layout.classList.remove('v2e073-still');

  const feuilles = doc.querySelectorAll('#constellation-v2-e073').length;
  const lives = layout.querySelectorAll('#v2e073-max-live').length;
  const bascules = layout.querySelectorAll('#v2e073-max-toggle').length;
  const sain = feuilles === 1 && lives <= 1 && bascules <= 1;
  layout.dataset.v2e073Integrite = sain ? 'ok' : 'degrade';

  try {
    const precedent = layout.querySelector('#v2e073-audit');
    if (precedent && precedent.parentNode) precedent.parentNode.removeChild(precedent);
    const panneau = creer('section', 'v2e073-audit');
    panneau.id = 'v2e073-audit';
    panneau.setAttribute('aria-label', 'Bilan du contraste au survol, seconde passe');
    const titre = creer('h3', '', 'Contraste au survol · bilan V2');
    panneau.appendChild(titre);
    const resume = creer('p', '', `${cibles.length} cible(s) · niveaux AAA/AA/AA-grand/échec : `
      + `${layout.dataset.v2e073Distribution} · plancher AAA ${plancher} en ${pas} pas · `
      + `${petites} cible(s) sous 24 px · ${longs} libellé(s) long(s).`);
    resume.setAttribute('role', 'status');
    resume.setAttribute('aria-live', 'polite');
    panneau.appendChild(resume);
    const listeBilan = creer('ul', '');
    mesures.forEach((mesure, index) => {
      listeBilan.appendChild(creer('li', '', `${mesure.nom} : ${mesure.repos.toFixed(2)}:1 au repos `
        + `(${mesure.grade}), ${mesure.survol.toFixed(2)}:1 au survol (${mesure.gradeSurvol}), `
        + `écart de luminance ${ecarts[index].valeur.toFixed(3)}.`));
    });
    panneau.appendChild(listeBilan);
    layout.appendChild(panneau);
  } catch (_) { layout.dataset.v2e073Bilan = 'absent'; }
});
