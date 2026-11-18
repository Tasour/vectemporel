import { register } from './registry.js';

/* Lentille E073 — Contraste visuel appliqué au survol de la vue Constellation.
 *
 * Dix chantiers concrets et variés, tous locaux au rendu courant : recensement
 * des cibles, mesure WCAG déterministe, feuille de style unique, rehaussement
 * des libellés, halo des lunes, équivalent clavier, valuation du gain,
 * annonce vocalisée, panneau témoin et verdict de préférence.
 *
 * Contrat : un unique enregistrement sous la clé E073, avec ctx = { viewId,
 * stage, layout, css(id, rules), el(tag, cls, text), reducedMotion() }
 * (registry.js:28-44).
 * Aucun fichier partagé modifié, aucune écriture de débogage, aucun appel
 * réseau, aucune source aléatoire, aucun minuteur, aucune boucle d'animation
 * propre, aucune ressource distante. Greffon tolérant : aucune exception.
 */

const CSS_ID = 'constellation-e073';
const SELECTEUR = '.const-sun, .const-planet, .const-moon, .constellation-back, .constellation-legend span';
const SURVOL_ID = 'e073-live';
const PANNEAU_ID = 'e073-contrast-panel';
const TITRE_ID = 'e073-panel-title';
const LECTURE_ID = 'e073-readout';

/* Miroir des jetons de styles.css:3-15 : valeurs littérales, sans lecture de
 * style calculée, pour une mesure reproductible d'un rendu à l'autre. */
const JETONS = {
  fond: '#070a0e',
  surface2: '#10151d',
  encre: '#f2ede3',
  encreDouce: '#d7d1c6',
  atténué: '#a8a198',
  or: '#e6b96f',
  orVif: '#f4d69e',
  violet: '#b28bdd',
};

const CATEGORIES = [
  { nom: 'Ères (soleils)', base: JETONS.encreDouce },
  { nom: 'Repères (planètes)', base: JETONS.atténué },
  { nom: 'Points (lunes)', base: JETONS.atténué },
  { nom: 'Lien retour', base: JETONS.encreDouce },
  { nom: 'Légende', base: JETONS.or },
];

let survols = 0;

/* Luminance relative WCAG 2.1, sur des hexadécimaux à six chiffres. */
function luminance(hex) {
  const brut = String(hex).replace('#', '');
  const canaux = [0, 2, 4].map((i) => parseInt(brut.slice(i, i + 2), 16) / 255);
  const lineaires = canaux.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * lineaires[0] + 0.7152 * lineaires[1] + 0.0722 * lineaires[2];
}

/* Ratio de contraste (L_claire + 0,05) / (L_sombre + 0,05). */
function contraste(avant, apres) {
  const a = luminance(avant);
  const b = luminance(apres);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/* Recherche d'ancêtre par sélecteur, sans dépendance au global Element. */
function plusProche(noeud, selecteur) {
  let courant = noeud;
  while (courant && typeof courant === 'object' && typeof courant.classList !== 'undefined') {
    if (typeof courant.matches === 'function' && courant.matches(selecteur)) return courant;
    courant = courant.parentNode;
  }
  return null;
}

/* Fabrique tolérante : utilise ctx.el quand il existe, sinon le document propriétaire. */
function creer(ctx, doc, tag, cls, text) {
  if (typeof ctx.el === 'function') return ctx.el(tag, cls, text);
  const noeud = doc.createElement(tag);
  if (cls) noeud.className = cls;
  if (text !== undefined) noeud.textContent = text;
  return noeud;
}

const CSS = `
/* règle E073-03 : seule la vue marquée .e073 reçoit le survol renforcé. */
.constellation-layout.e073 .const-sun,
.constellation-layout.e073 .const-planet,
.constellation-layout.e073 .const-moon,
.constellation-layout.e073 .constellation-back,
.constellation-layout.e073 .constellation-legend span {
  transition: color .16s ease, box-shadow .16s ease, border-color .16s ease, outline-color .16s ease;
}
/* règle E073-04 : libellés des ères et des repères, or vif, gras, ombre portée. */
.constellation-layout.e073 .const-sun:hover::after,
.constellation-layout.e073 .const-planet:hover::after {
  color: var(--gold-bright);
  font-weight: 700;
  text-shadow: 0 1px 0 var(--bg), 0 0 6px rgba(244, 214, 158, .55);
}
.constellation-layout.e073 .const-sun:hover,
.constellation-layout.e073 .const-planet:hover {
  outline: 2px solid var(--gold-bright);
  outline-offset: 2px;
}
/* règle E073-05 : lunes, halo double et libellé révélé en or vif. */
.constellation-layout.e073 .const-moon:hover {
  border-color: var(--gold-bright);
  box-shadow: 0 0 0 3px rgba(244, 214, 158, .28), 0 0 12px rgba(244, 214, 158, .6);
}
.constellation-layout.e073 .const-moon:hover::after {
  opacity: 1;
  color: var(--gold-bright);
  font-weight: 700;
}
/* règle E073-06 : le focus visible reçoit exactement le même contraste. */
.constellation-layout.e073 .const-sun:focus-visible::after,
.constellation-layout.e073 .const-planet:focus-visible::after {
  color: var(--gold-bright);
  font-weight: 700;
  text-shadow: 0 1px 0 var(--bg), 0 0 6px rgba(244, 214, 158, .55);
}
.constellation-layout.e073 .const-sun:focus-visible,
.constellation-layout.e073 .const-planet:focus-visible {
  outline: 2px solid var(--gold-bright);
  outline-offset: 2px;
}
.constellation-layout.e073 .const-moon:focus-visible {
  border-color: var(--gold-bright);
  box-shadow: 0 0 0 3px rgba(244, 214, 158, .28), 0 0 12px rgba(244, 214, 158, .6);
}
.constellation-layout.e073 .const-moon:focus-visible::after {
  opacity: 1;
  color: var(--gold-bright);
  font-weight: 700;
}
.constellation-layout.e073 .constellation-back:hover,
.constellation-layout.e073 .constellation-back:focus-visible {
  border-color: var(--gold-bright);
  color: var(--gold-bright);
  box-shadow: inset 0 0 0 1px rgba(244, 214, 158, .45);
}
.constellation-layout.e073 .constellation-legend span:hover {
  color: var(--gold-bright);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}
/* règle E073-08 : région live discrète, vocalisée sans déplacer le texte courant. */
#${SURVOL_ID} {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0);
  white-space: nowrap; border: 0;
}
/* règle E073-09 : le contraste devient un texte lisible et indexable. */
#${PANNEAU_ID} {
  margin: 12px 0 0; padding: 9px 11px;
  border: 1px solid var(--line); border-radius: 8px;
  background: var(--surface-2); color: var(--muted-2);
  font-size: 9px; line-height: 1.5; contain: layout style;
}
#${PANNEAU_ID} .e073-title {
  margin: 0 0 5px; color: var(--gold);
  font-family: var(--serif); font-size: 11px; font-weight: 450;
}
#${PANNEAU_ID} .e073-readout { margin: 0 0 6px; color: var(--ink-soft); font-variant-numeric: tabular-nums; }
#${PANNEAU_ID} .e073-list { margin: 0; padding-left: 15px; }
#${PANNEAU_ID} .e073-list li { margin: 1px 0; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
@media (prefers-reduced-motion: reduce) {
  .constellation-layout.e073 * { transition: none !important; }
}
@media (prefers-contrast: more) {
  .constellation-layout.e073 .const-sun:hover::after,
  .constellation-layout.e073 .const-planet:hover::after,
  .constellation-layout.e073 .const-moon:hover::after {
    text-shadow: 0 0 0 1px var(--bg), 0 0 8px rgba(244, 214, 158, .8);
  }
}`;

register('E073', (ctx) => {
  /* Garde d'entrée : sans layout exploitable, la lentille ne touche à aucun DOM. */
  const layout = ctx && ctx.layout;
  if (!layout || layout.nodeType !== 1 || typeof layout.querySelectorAll !== 'function') return;

  try {
    const doc = layout.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;
    const css = typeof ctx.css === 'function' ? ctx.css : null;
    const vue = doc.defaultView || null;
    const mesures = CATEGORIES.map((cat) => ({
      nom: cat.nom,
      base: contraste(cat.base, JETONS.fond),
      survol: contraste(JETONS.orVif, JETONS.fond),
    }));
    const ratioBase = Math.min.apply(null, mesures.map((m) => m.base));
    const ratioSurvol = Math.max.apply(null, mesures.map((m) => m.survol));
    const gain = ratioSurvol - ratioBase;

    /* E073-01 — Recensement des cibles : chaque élément survolable est compté
     * et marqué ; le total et la vue d'origine sont publiés sur le layout. */
    const cibles = Array.prototype.slice.call(layout.querySelectorAll(SELECTEUR));
    const parType = {
      soleils: layout.querySelectorAll('.const-sun').length,
      planetes: layout.querySelectorAll('.const-planet').length,
      lunes: layout.querySelectorAll('.const-moon').length,
    };
    layout.dataset.e073Targets = String(cibles.length);
    layout.dataset.e073View = (ctx.viewId && String(ctx.viewId)) || 'inconnue';
    cibles.forEach((cible) => { cible.dataset.e073Target = '1'; });

    /* E073-02 — Mesure WCAG de base : ratio minimal des libellés par défaut
     * sur le fond, calculé depuis le miroir de styles.css:3-15. */
    layout.dataset.e073RatioBase = ratioBase.toFixed(2);
    layout.dataset.e073Seuil = '4.5';

    /* E073-03 — Feuille unique et portée : un seul appel css, une seule classe
     * d'activation .e073 qui délimite strictement les règles de survol. */
    layout.classList.add('e073');
    if (css) css(CSS_ID, CSS);

    /* E073-04 — Rehaussement des libellés : les soleils et planètes reçoivent
     * l'attribut de contraste renforcé, la feuille appliquant or vif + gras. */
    cibles.forEach((cible) => {
      if (cible.matches('.const-sun, .const-planet')) {
        cible.dataset.e073LabelContrast = 'renforce';
      }
    });

    /* E073-05 — Halo des lunes : attribut dédié, relayé par l'anneau et le
     * libellé révélé au survol dans la feuille E073-03. */
    cibles.forEach((cible) => {
      if (cible.matches('.const-moon')) cible.dataset.e073Halo = 'actif';
    });

    /* E073-06 — Équivalent clavier : l'attribut atteste que chaque cible
     * possède le même traitement au focus visible qu'au pointeur. */
    layout.dataset.e073Keyboard = 'mirrore';
    cibles.forEach((cible) => { cible.dataset.e073FocusEcho = '1'; });

    /* E073-07 — Valorisation du gain : ratio au survol, écart absolu et
     * progression relative, publiés pour comparaison avec la mesure de base. */
    const pourcent = ratioBase > 0 ? (gain / ratioBase) * 100 : 0;
    layout.dataset.e073RatioHover = ratioSurvol.toFixed(2);
    layout.dataset.e073Gain = gain.toFixed(2);
    layout.dataset.e073GainPct = pourcent.toFixed(0);

    /* E073-08 — Écouteur délégué : pointeur et focus annoncent la cible survolée
     * dans une région live unique, avec un compteur déterministe. */
    let live = null;
    try {
      live = creer(ctx, doc, 'p', 'e073-live', 'Contraste au survol prêt.');
      live.id = SURVOL_ID;
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      layout.appendChild(live);
      if (typeof layout.addEventListener === 'function' && !layout.dataset.e073Bound) {
        layout.dataset.e073Bound = '1';
        const annoncer = (event) => {
          try {
            const cible = plusProche(event && event.target, SELECTEUR);
            if (!cible || !layout.contains(cible)) return;
            const cle = (cible.dataset && cible.dataset.constKey) || cible.tagName.toLowerCase();
            const libelle = (cible.dataset && cible.dataset.label)
              || cible.getAttribute('title') || cible.getAttribute('aria-label') || cle;
            survols += 1;
            layout.dataset.e073SurvolCount = String(survols);
            layout.dataset.e073Hovering = cle;
            cible.dataset.e073Hovered = '1';
            if (live) {
              live.textContent = `Contraste renforcé : ${libelle} — ${ratioSurvol.toFixed(2)}:1 `
                + `contre ${ratioBase.toFixed(2)}:1 au repos, soit +${pourcent.toFixed(0)} %.`;
            }
          } catch (_) { /* annonce tolérante : aucun survol ne doit lever d'exception */ }
        };
        layout.addEventListener('pointerover', annoncer, true);
        layout.addEventListener('focusin', annoncer, true);
      }
    } catch (_) { /* région live facultative */ }

    /* E073-09 — Panneau témoin : une liste sémantique par catégorie transforme
     * la mesure en texte indexable, avec un relevé synthétique. */
    let panneau = null;
    try {
      const precedent = doc.getElementById(PANNEAU_ID);
      if (precedent && precedent.parentNode) precedent.parentNode.removeChild(precedent);
      panneau = creer(ctx, doc, 'section', 'e073-panel');
      panneau.id = PANNEAU_ID;
      panneau.setAttribute('aria-labelledby', TITRE_ID);
      const titre = creer(ctx, doc, 'h3', 'e073-title', 'Contraste visuel au survol · E073');
      titre.id = TITRE_ID;
      panneau.appendChild(titre);
      const lecture = creer(ctx, doc, 'p', 'e073-readout');
      lecture.id = LECTURE_ID;
      lecture.setAttribute('role', 'status');
      lecture.setAttribute('aria-live', 'polite');
      lecture.textContent = `${cibles.length} cible(s) · base ${ratioBase.toFixed(2)}:1 · `
        + `survol ${ratioSurvol.toFixed(2)}:1 · gain +${gain.toFixed(2)} point(s), soit +${pourcent.toFixed(0)} %.`;
      panneau.appendChild(lecture);
      const liste = creer(ctx, doc, 'ul', 'e073-list');
      mesures.forEach((m) => {
        liste.appendChild(creer(ctx, doc, 'li', '',
          `${m.nom} : ${m.base.toFixed(2)}:1 au repos → ${m.survol.toFixed(2)}:1 au survol.`));
      });
      panneau.appendChild(liste);
      layout.appendChild(panneau);
    } catch (_) { /* panneau facultatif */ }

    /* E073-10 — Verdict et préférences : mobilité réduite, contraste renforcé
     * du système et conformité au seuil AA de 4,5:1, sans dépendance au hasard. */
    let reduit = false;
    try { reduit = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion(); }
    catch (_) { reduit = false; }
    let contrasteForce = false;
    try {
      if (vue && typeof vue.matchMedia === 'function') {
        contrasteForce = !!vue.matchMedia('(prefers-contrast: more)').matches;
      }
    } catch (_) { contrasteForce = false; }
    const conforme = ratioBase >= 4.5 && ratioSurvol >= 4.5 && ratioSurvol > ratioBase;
    layout.dataset.e073Motion = reduit ? 'reduced' : 'full';
    layout.dataset.e073ContrastPref = contrasteForce ? 'more' : 'normal';
    layout.dataset.e073Verdict = conforme ? 'renforce-conforme' : 'a-revoir';
    layout.dataset.e073Population = `${parType.soleils}/${parType.planetes}/${parType.lunes}`;
    if (reduit) layout.classList.add('e073-still');
    if (contrasteForce) layout.classList.add('e073-contrast-more');
    if (panneau) panneau.setAttribute('data-e073-verdict', layout.dataset.e073Verdict);
  } catch (_) {
    /* Greffon tolérant : toute anomalie locale est absorbée, le rendu continue. */
    return;
  }
});
