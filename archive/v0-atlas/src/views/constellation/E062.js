import { register } from './registry.js';

/* Lentille E062 — Performance de rendu appliquée aux métriques chiffrées de la
 * vue Constellation. Dix chantiers concrets et variés : numérotation tabulaire,
 * largeurs réservées, lecture unique de l'état, comptage unique des nœuds,
 * isolation de rendu, écriture groupée, mouvement réduit, survol passif,
 * confiance moyenne et panneau de synthèse. Greffon tolérant : aucune
 * exception, aucun réseau, aucun aléa, aucun timer, aucune boucle propre.
 *
 * Contrat : register('E062', ctx => { … }) ; ctx = { viewId, stage, layout,
 * css(id, rules), el(tag, cls, text), reducedMotion() }.
 */

const CSS_ID = 'constellation-e062';
const PANEL_ID = 'e062-summary';
const FIGURE_ID = 'e062-figure';
const READOUT_ID = 'e062-readout';
const TITLE_ID = 'e062-title';

/* Feuille unique. Chaque règle est rattachée à son chantier par un commentaire
 * local ; aucun sélecteur ne sort du périmètre préfixé e062- ou de la vue. */
const CSS = `
#${PANEL_ID}{
  margin:12px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;
  background:var(--surface-2);color:var(--muted);font-family:inherit;
  font-size:10px;line-height:1.5;
  /* E062-05 — isolation de rendu : le recalcul des chiffres ne remonte pas. */
  contain:layout style paint;
  content-visibility:auto;
  contain-intrinsic-size:auto 96px;
}
#${PANEL_ID} .e062-head{
  margin:0 0 6px;color:var(--gold);font-family:var(--serif);
  font-size:12px;font-weight:450;
}
#${PANEL_ID} .e062-readout{margin:6px 0 0;color:var(--ink-soft);font-size:10px;}

/* E062-01 — chiffres à largeur fixe : évite le reflow quand un compteur change. */
.constellation-layout .e062-metric,
#${PANEL_ID} .e062-figure{
  font-variant-numeric:tabular-nums;
  font-feature-settings:'tnum' 1;
}

/* E062-02 — largeur réservée en ch : passer de 9 à 10 ne déplace pas le voisin. */
#${PANEL_ID} .e062-figure{
  display:inline-block;min-width:6ch;padding:2px 6px;margin:0 4px 4px 0;
  border:1px solid var(--violet);border-radius:6px;text-align:right;
}

/* E062-06 — transition courte sur la valeur, neutralisée en mouvement réduit. */
#${PANEL_ID} .e062-figure{transition:color .15s ease,background-color .15s ease;}
/* E062-07 — mouvement réduit : aucune transition sur les métriques. */
.e062-still #${PANEL_ID} .e062-figure{transition:none;}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID},#${PANEL_ID} *{transition:none!important;animation:none!important;}
}`;

register('E062', (ctx) => {
  /* Garde d'entrée : sans layout rendu par constellation.js, aucun ajout DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;

  try {
    const layout = ctx.layout;
    if (ctx.viewId && ctx.viewId !== 'constellation') return;

    /* Fabrique tolérante : ctx.el est utilisé quand il existe, sinon repli local. */
    const make = typeof ctx.el === 'function'
      ? (tag, cls, txt) => ctx.el(tag, cls, txt)
      : (tag, cls, txt) => {
          const node = document.createElement(tag);
          if (cls) node.className = cls;
          if (txt !== undefined) node.textContent = txt;
          return node;
        };

    /* E062-04 — comptage unique des trois familles de nœuds chiffrés : une
     * seule passe de requête, puis publication des effectifs en attributs.
     * Évite les querySelectorAll répétés par les lentilles voisines. */
    const soleils = layout.querySelectorAll('.const-sun');
    const planetes = layout.querySelectorAll('.const-planet');
    const lunes = layout.querySelectorAll('.const-moon');
    const nbEres = soleils.length;
    const nbRep = planetes.length;
    const nbPoints = lunes.length;
    layout.dataset.e062Suns = String(nbEres);
    layout.dataset.e062Planets = String(nbRep);
    layout.dataset.e062Moons = String(nbPoints);

    /* E062-03 — lecture unique du libellé d'état « Ère … · Repère … · Point … ».
     * Un seul accès à textContent, puis deux mesures dérivées en attributs :
     * la longueur du libellé et la position du compteur de point. */
    const etat = layout.querySelector('.constellation-state');
    const texteEtat = etat && typeof etat.textContent === 'string' ? etat.textContent : '';
    layout.dataset.e062StateChars = String(texteEtat.length);
    const reperePoint = /Point\s*:\s*(\d+)\s*\/\s*(\d+)/.exec(texteEtat);
    const pointCourant = reperePoint ? Number(reperePoint[1]) : 0;
    const pointTotal = reperePoint ? Number(reperePoint[2]) : 0;
    layout.dataset.e062PointIndex = String(pointCourant);
    const pointTotalAttr = String(pointTotal);
    layout.dataset.e062PointTotal = pointTotalAttr;

    /* E062-01 — numérotation tabulaire : marquage unique de chaque porteur de
     * chiffres. La feuille unique applique alors font-variant-numeric: tnum. */
    const porteurs = [etat]
      .concat(Array.prototype.slice.call(soleils))
      .concat(Array.prototype.slice.call(planetes))
      .concat(Array.prototype.slice.call(lunes));
    porteurs.forEach((node) => {
      if (node && node.classList) node.classList.add('e062-metric');
    });

    /* E062-09 — confiance moyenne calculée en une seule passe sur les lunes,
     * sans re-requêter le DOM. Le résultat est publié en attribut réutilisable. */
    let sommeConfiance = 0;
    let nbConfiance = 0;
    for (let i = 0; i < lunes.length; i += 1) {
      const lune = lunes[i];
      const source = (lune.getAttribute('title') || '') + ' '
        + (lune.getAttribute('aria-label') || '');
      const mesure = /confiance\s+(\d+)/.exec(source);
      if (mesure) {
        sommeConfiance += Number(mesure[1]);
        nbConfiance += 1;
      }
    }
    const confianceMoy = nbConfiance ? Math.round(sommeConfiance / nbConfiance) : 0;
    layout.dataset.e062Confidence = String(confianceMoy);

    /* E062-10 — panneau de synthèse : section autonome, titre, chiffres à
     * largeur réservée et région live. Tout panneau antérieur est retiré pour
     * rester idempotent sur les rendus successifs du shell. */
    const panneau = make('section', 'e062-summary');
    panneau.id = PANEL_ID;
    panneau.setAttribute('aria-labelledby', TITLE_ID);
    const titre = make('h3', 'e062-head', 'Métriques chiffrées · E062');
    titre.id = TITLE_ID;
    panneau.appendChild(titre);

    const figures = make('div', 'e062-figures');
    const figureEres = make('span', 'e062-figure', String(nbEres));
    figureEres.id = FIGURE_ID;
    const figureRep = make('span', 'e062-figure', String(nbRep));
    const figurePts = make('span', 'e062-figure', String(nbPoints));
    const figureConf = make('span', 'e062-figure', String(confianceMoy) + '%');
    [figureEres, figureRep, figurePts, figureConf].forEach((figure) => figures.appendChild(figure));
    panneau.appendChild(figures);

    const lecture = make('p', 'e062-readout', '');
    lecture.id = READOUT_ID;
    lecture.setAttribute('role', 'status');
    lecture.setAttribute('aria-live', 'polite');
    lecture.setAttribute('aria-atomic', 'true');
    panneau.appendChild(lecture);

    const precedent = document.getElementById(PANEL_ID);
    if (precedent && precedent.parentNode) precedent.parentNode.removeChild(precedent);
    const ancre = layout.querySelector('.constellation-caption') || layout;
    ancre.appendChild(panneau);

    /* E062-06 — écriture groupée : une seule assignation de textContent pour
     * le résumé, une seule pour la région live, plutôt que N insertions. */
    const resume = `${nbEres} ère(s) · ${nbRep} repère(s) · ${nbPoints} point(s) · `
      + `confiance moyenne ${confianceMoy} % · point ${pointCourant}/${pointTotal}.`;
    lecture.textContent = resume;
    panneau.dataset.e062Summary = resume;
    layout.dataset.e062Verdict = (nbEres && nbRep) ? 'métriques-complètes' : 'métriques-partielles';

    /* E062-08 — écouteur passif de survol : un seul délégué sur le panneau,
     * en mode passif, enrichit la région live sans bloquer le défilement. */
    if (!layout.dataset.e062Hover) {
      panneau.addEventListener('pointerover', (event) => {
        const cible = event.target && typeof event.target.closest === 'function'
          ? event.target.closest('.e062-figure') : null;
        if (!cible || !panneau.contains(cible)) return;
        lecture.textContent = `Détail · ${cible.textContent} · ${resume}`;
      }, { passive: true });
      layout.dataset.e062Hover = '1';
    }

    /* E062-07 — mouvement réduit : la classe e062-still neutralise les
     * transitions des chiffres via la feuille unique, sans animation propre. */
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    if (reduit) layout.classList.add('e062-still');
    layout.dataset.e062Motion = reduit ? 'reduced' : 'full';

    /* Feuille de style unique, identifiant réservé à cette lentille. */
    if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
