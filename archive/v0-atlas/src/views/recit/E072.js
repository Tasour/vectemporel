import { register } from './registry.js';

/* Lentille E072 — Hiérarchie visuelle et informationnelle (vue Récit).
 *
 * Dix chantiers indépendants, tous implémentés ici : E072-01 à E072-10.
 * Rapport détaillé : UNIFIED_AUDIT/RECIT/views/E072.md.
 * Lectures seules : recit.js, styles.css, registry.js, index.js.
 * Jeu de données : 901 points, kind ∈ {récit, figure, lieu, audit},
 * confidence ∈ {vérifié, certain, probable, disputed}, 587 sans source.
 *
 * Greffon strictement additif : une seule classe racine, un seul bloc CSS,
 * des classes préfixées recit-e072-, des attributs réservés data-e072-* et
 * des nœuds uniquement additionnels. Aucun texte existant n'est remplacé,
 * aucun gestionnaire n'est réattribué, aucun nœud n'est retiré. Sans ce
 * module, la vue Récit reste intégralement lisible et utilisable.
 *
 * Aucun appel réseau, aucune sortie de débogage, aucun aléa, aucun timer,
 * aucune animation par image, aucun fichier partagé modifié. Les identifiants
 * créés sont préfixés e072- et uniques par rendu.
 */

const RACINE = 'recit-e072-root';
const CSS_ID = 'recit-e072';

/* Bloc CSS unique. Toutes les règles sont portées par la classe racine ou par
   une classe préfixée : aucune règle globale, aucune ressource distante. */
const CSS = `
.recit-e072-root{
  --e072-ratio:1.25;
  --e072-n3:10px;
  --e072-n2:calc(var(--e072-n3) * var(--e072-ratio));
  --e072-n1:calc(var(--e072-n2) * var(--e072-ratio));
  --e072-n0:calc(var(--e072-n1) * var(--e072-ratio));
  --e072-ton-1:var(--gold-bright,#f0cd90);
  --e072-ton-2:var(--ink,#eee8dc);
  --e072-ton-3:var(--muted,#a89f8e);
  --e072-ton-4:var(--muted-2,#7a7367);
}

/* E072-01 — échelle modulaire à ratio constant, pilotée par la largeur du
   conteneur dès que les unités de conteneur sont disponibles. */
.recit-e072-root .recit-e072-container{font-size:var(--e072-n2)}
.recit-e072-root .recit-e072-container .recit-title{font-size:clamp(30px,4.6vw,54px);line-height:1.08}
.recit-e072-root .recit-e072-container .recit-context{font-size:var(--e072-n1);line-height:1.62}
.recit-e072-root .recit-e072-container .recit-meta{font-size:var(--e072-n2)}
.recit-e072-root .recit-e072-container .recit-timing{font-size:var(--e072-n3)}
@supports (font-size:1cqw){
  .recit-e072-root .recit-e072-container{container-type:inline-size}
  .recit-e072-root .recit-e072-container .recit-title{font-size:clamp(30px,7cqw,54px)}
}

/* E072-02 — profondeur hiérarchique : la zone d'énoncé passe au premier plan
   par un halo, un filet supérieur et une ombre portée du titre. */
.recit-e072-root .recit-e072-focus{
  background-image:radial-gradient(130% 300px at 0 0,rgba(230,185,111,.11),rgba(230,185,111,0) 72%);
  background-repeat:no-repeat;
}
.recit-e072-root .recit-e072-focus .view-kicker{border-top:2px solid var(--gold);padding-top:10px}
.recit-e072-root .recit-e072-focus .recit-title{text-shadow:0 3px 18px rgba(0,0,0,.55)}

/* E072-03 — filigrane ordinal : le rang du point est un repère de fond, jamais
   un nœud inséré dans le flux. Le chiffre est décoratif et non annualisé. */
.recit-e072-root .recit-e072-watermark{position:relative;isolation:isolate}
.recit-e072-root .recit-e072-watermark::before{
  content:attr(data-e072-ordinal);
  position:absolute;left:-.06em;top:-.34em;z-index:-1;
  font-size:clamp(96px,15vw,190px);font-weight:800;line-height:1;
  letter-spacing:-.06em;color:var(--gold);opacity:.07;pointer-events:none;
}
@supports (font-size:1cqw){
  .recit-e072-root .recit-e072-watermark::before{font-size:clamp(96px,24cqw,190px)}
}

/* E072-04 — mesure de ligne différenciée : la largeur de lecture est elle-même
   un signal de niveau (titre court, chapeau large, étiquette resserrée). */
.recit-e072-root .recit-e072-m-titre{max-width:30ch;text-wrap:balance}
.recit-e072-root .recit-e072-m-lead{max-width:62ch}
.recit-e072-root .recit-e072-m-etiquette{max-width:40ch}

/* E072-05 — plan documentaire : titres de section et région nommée, sans
   toucher au texte existant ni à l'ordre des nœuds. */
.recit-e072-root .recit-e072-h2{
  margin:0 0 7px;color:var(--e072-ton-1);font-size:var(--e072-n3);
  font-weight:700;letter-spacing:.14em;text-transform:uppercase;
}
.recit-e072-root .recit-e072-section-nom{color:var(--e072-ton-3)}

/* E072-06 — échelle de graisses indépendante de l'échelle de tailles. */
.recit-e072-root .recit-e072-w700{font-weight:700}
.recit-e072-root .recit-e072-w600{font-weight:600}
.recit-e072-root .recit-e072-w500{font-weight:500}
.recit-e072-root .recit-e072-w400{font-weight:400}

/* E072-07 — proximité du fil : courant, voisin, proche, lointain. La forme et
   l'opacité portent le rang, l'état aria-current restant la source unique. */
.recit-e072-root .recit-e072-dist{transition:opacity .18s linear,transform .18s linear}
.recit-e072-root .recit-e072-dist[data-e072-distance="0"]{opacity:1;font-weight:700;transform:translateX(2px)}
.recit-e072-root .recit-e072-dist[data-e072-distance="1"]{opacity:.9;transform:translateX(1px)}
.recit-e072-root .recit-e072-dist[data-e072-distance="2"]{opacity:.74}
.recit-e072-root .recit-e072-dist[data-e072-distance="3"]{opacity:.58}

/* E072-08 — minimap de composition : répartition des types du fil et curseur
   de position. Les motifs distinguent les types sans relever de la couleur. */
.recit-e072-root .recit-e072-minimap{
  margin:0 0 12px;padding:8px 10px;
  border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.02);
}
.recit-e072-root .recit-e072-minimap-caption{
  margin:0 0 6px;color:var(--e072-ton-2);font-size:var(--e072-n3);
  font-weight:700;letter-spacing:.1em;text-transform:uppercase;
}
.recit-e072-root .recit-e072-minimap-bar{
  position:relative;display:flex;height:8px;border-radius:999px;
  overflow:hidden;background:rgba(255,255,255,.06);
}
.recit-e072-root .recit-e072-minimap-seg{height:100%;border-right:1px solid rgba(0,0,0,.45)}
.recit-e072-root .recit-e072-minimap-seg[data-e072-kind="récit"]{background:var(--gold);opacity:.85}
.recit-e072-root .recit-e072-minimap-seg[data-e072-kind="figure"]{
  background:repeating-linear-gradient(45deg,var(--gold) 0 3px,rgba(0,0,0,.35) 3px 5px);
}
.recit-e072-root .recit-e072-minimap-seg[data-e072-kind="lieu"]{
  background:repeating-linear-gradient(90deg,var(--gold) 0 2px,rgba(0,0,0,.4) 2px 4px);
}
.recit-e072-root .recit-e072-minimap-seg[data-e072-kind="audit"]{
  background:repeating-linear-gradient(-45deg,var(--gold) 0 3px,rgba(0,0,0,.35) 3px 5px);
}
.recit-e072-root .recit-e072-minimap-seg[data-e072-kind="point"]{background:var(--muted-2);opacity:.6}
.recit-e072-root .recit-e072-minimap-cursor{
  position:absolute;top:-3px;bottom:-3px;width:2px;
  background:var(--gold-bright);box-shadow:0 0 0 2px rgba(0,0,0,.5);
}
.recit-e072-root .recit-e072-minimap-keys{
  margin:6px 0 0;color:var(--e072-ton-4);font-size:var(--e072-n3);
  line-height:1.5;font-variant-numeric:tabular-nums;
}

/* E072-09 — rampe tonale à quatre pas, appliquée de façon cohérente à chaque
   niveau : énoncé, chapeau, étiquette, note. */
.recit-e072-root .recit-e072-ton1{color:var(--e072-ton-1)}
.recit-e072-root .recit-e072-ton2{color:var(--e072-ton-2)}
.recit-e072-root .recit-e072-ton3{color:var(--e072-ton-3)}
.recit-e072-root .recit-e072-ton4{color:var(--e072-ton-4)}

/* E072-10 — robustesse : en contraste forcé, les motifs et le filigrane
   cèdent la place à des bordures ; le mouvement est neutralisé le cas échéant. */
@media (forced-colors:active){
  .recit-e072-root .recit-e072-watermark::before{content:none}
  .recit-e072-root .recit-e072-minimap,
  .recit-e072-root .recit-e072-minimap-bar,
  .recit-e072-root .recit-e072-minimap-seg{border:1px solid CanvasText;background:Canvas}
  .recit-e072-root .recit-e072-minimap-cursor{background:CanvasText;box-shadow:none}
  .recit-e072-root .recit-e072-ton1,
  .recit-e072-root .recit-e072-ton2,
  .recit-e072-root .recit-e072-ton3,
  .recit-e072-root .recit-e072-ton4{color:CanvasText}
}
.recit-e072-root[data-e072-motion="reduce"] .recit-e072-dist{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-e072-root .recit-e072-dist{transition:none}
}
@media (max-width:620px){
  .recit-e072-root .recit-e072-container .recit-title{font-size:clamp(26px,7vw,36px)}
  .recit-e072-root .recit-e072-watermark::before{font-size:96px;opacity:.05}
  .recit-e072-root .recit-e072-m-titre{max-width:24ch}
  .recit-e072-root .recit-e072-minimap{padding:6px 8px}
}
`;

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function cls(noeud, nom) {
  try {
    if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
        && !noeud.classList.contains(nom)) noeud.classList.add(nom);
  } catch { /* enrichissement facultatif */ }
}

function attr(noeud, nom, valeur) {
  try {
    if (noeud && typeof noeud.setAttribute === 'function') noeud.setAttribute(nom, valeur);
  } catch { /* enrichissement facultatif */ }
}

function creer(el, tag, classe, texte) {
  try {
    if (typeof el !== 'function') return null;
    return el(tag, classe, texte) || null;
  } catch { return null; }
}

/* Insère un nœud additionnel avant une ancre existante, sans jamais déplacer
   ni remplacer un nœud d'origine. */
function avant(ancre, noeud) {
  try {
    if (ancre && noeud && ancre.parentNode
        && typeof ancre.parentNode.insertBefore === 'function') {
      ancre.parentNode.insertBefore(noeud, ancre);
      return noeud;
    }
  } catch { /* rendu préservé coûte que coûte */ }
  return null;
}

/* Lit « Étape X / Y » sur le surtitre sans modifier son texte. */
function lireOrdinal(noeud) {
  const texte = String((noeud && noeud.textContent) || '');
  const trouve = texte.match(/(\d+)\s*\/\s*(\d+)/);
  return trouve ? { rang: trouve[1], total: trouve[2] } : null;
}

register('E072', (ctx) => {
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  void stage;
  try {
    if (typeof document === 'undefined') return;

    /* Un seul appel CSS pour toute la lentille (cssOnce garantit l'idempotence). */
    try { if (typeof css === 'function') css(CSS_ID, CSS); } catch { /* rendu préservé */ }

    const root = layout;
    cls(root, RACINE);
    try {
      attr(root, 'data-e072-motion',
        typeof reducedMotion === 'function' && reducedMotion() ? 'reduce' : 'normal');
    } catch { /* attribut facultatif */ }

    const body = q(root, '.recit-body');
    if (!body) return;

    const kicker = q(root, '.view-kicker');
    const titre = q(root, '#recit-point-title') || q(root, '.recit-title');
    const contexte = q(root, '#recit-context') || q(root, '.recit-context');
    const meta = q(root, '.recit-meta');
    const timing = q(root, '.recit-timing');
    const confiance = q(root, '.recit-conf');
    const fil = q(root, '.recit-thread');
    const titreFil = fil ? q(fil, '.recit-thread-title') : null;
    const trace = q(root, '.recit-trace');
    const sources = q(root, '.recit-sources');
    const legende = q(root, '.recit-legend');
    const items = qa(root, '.recit-thread-item');

    /* E072-01 — contexte de mesure et échelle modulaire. */
    cls(body, 'recit-e072-container');

    /* E072-02 — zone focale en relief. */
    cls(body, 'recit-e072-focus');

    /* E072-03 — filigrane ordinal : rang lu sur le surtitre, jamais inventé. */
    cls(titre, 'recit-e072-watermark');
    const ordinal = lireOrdinal(kicker);
    if (titre && ordinal) attr(titre, 'data-e072-ordinal', String(ordinal.rang).padStart(2, '0'));

    /* E072-04 — mesure propre à chaque niveau. */
    cls(titre, 'recit-e072-m-titre');
    cls(contexte, 'recit-e072-m-lead');
    cls(meta, 'recit-e072-m-etiquette');

    /* E072-05 — plan documentaire : un vrai titre de section sur le fil, un
       titre de légende additionnel, et une région nommée pour la traçabilité. */
    if (titreFil) {
      attr(titreFil, 'role', 'heading');
      attr(titreFil, 'aria-level', '2');
      cls(titreFil, 'recit-e072-section-nom');
    }
    if (legende && !q(root, '#e072-outline-legend')) {
      const titreLegende = creer(el, 'h2', 'recit-e072-h2', 'Repères de lecture');
      if (titreLegende) {
        titreLegende.id = 'e072-outline-legend';
        try { legende.insertBefore(titreLegende, legende.firstChild); } catch { /* inchangé */ }
      }
    }
    if (trace) {
      attr(trace, 'role', 'region');
      attr(trace, 'aria-label', 'Traçabilité du point');
    }

    /* E072-06 — échelle de graisses. */
    cls(titre, 'recit-e072-w700');
    cls(kicker, 'recit-e072-w600');
    cls(meta, 'recit-e072-w500');
    cls(contexte, 'recit-e072-w400');
    cls(confiance, 'recit-e072-w600');

    /* E072-07 — distance au point courant, calculée depuis les seuls états
       présents dans le DOM (classe is-current ou aria-current="step"). */
    let courant = -1;
    items.forEach((item, i) => {
      try {
        if (item.classList.contains('is-current') || item.getAttribute('aria-current') === 'step') courant = i;
      } catch { /* item ignoré */ }
    });
    items.forEach((item, i) => {
      const distance = courant < 0 ? 3 : Math.min(3, Math.abs(i - courant));
      cls(item, 'recit-e072-dist');
      attr(item, 'data-e072-distance', String(distance));
    });

    /* E072-08 — minimap de composition : nœud purement additionnel, inséré
       avant le surtitre. Équivalent textuel toujours visible sous la barre. */
    if (typeof el === 'function' && items.length && !q(root, '#e072-minimap')) {
      const comptes = Object.create(null);
      items.forEach((item) => {
        let genre = 'point';
        try { genre = item.getAttribute('data-kind') || 'point'; } catch { /* valeur par défaut */ }
        comptes[genre] = (comptes[genre] || 0) + 1;
      });
      const genres = ['récit', 'figure', 'lieu', 'audit', 'point'];
      const presents = genres.filter((genre) => comptes[genre] > 0);

      const minimap = creer(el, 'div', 'recit-e072-minimap');
      if (minimap) {
        minimap.id = 'e072-minimap';
        const legendeMini = creer(el, 'p', 'recit-e072-minimap-caption', 'Vue d’ensemble du fil');
        const barre = creer(el, 'div', 'recit-e072-minimap-bar');
        const cles = creer(el, 'p', 'recit-e072-minimap-keys',
          `Composition : ${presents.map((genre) => `${comptes[genre]} ${genre}`).join(' · ')}.`);
        if (barre) {
          attr(barre, 'aria-hidden', 'true');
          presents.forEach((genre) => {
            const segment = creer(el, 'span', 'recit-e072-minimap-seg');
            if (!segment) return;
            attr(segment, 'data-e072-kind', genre);
            attr(segment, 'aria-hidden', 'true');
            try {
              segment.style.width = `${Math.round((comptes[genre] / items.length) * 1000) / 10}%`;
            } catch { /* barre sans largeur explicite */ }
            segment.title = `${comptes[genre]} point(s) de type ${genre}`;
            barre.appendChild(segment);
          });
          if (courant >= 0) {
            const curseur = creer(el, 'span', 'recit-e072-minimap-cursor');
            if (curseur) {
              attr(curseur, 'aria-hidden', 'true');
              try {
                curseur.style.left = `${Math.round(((courant + 0.5) / items.length) * 1000) / 10}%`;
              } catch { /* curseur sans position explicite */ }
              barre.appendChild(curseur);
            }
          }
        }
        if (legendeMini) minimap.appendChild(legendeMini);
        if (barre) minimap.appendChild(barre);
        if (cles) minimap.appendChild(cles);
        avant(kicker || titre || body.firstChild, minimap);
      }
    }

    /* E072-09 — rampe tonale cohérente du premier au quatrième niveau. */
    cls(titre, 'recit-e072-ton1');
    cls(contexte, 'recit-e072-ton2');
    cls(meta, 'recit-e072-ton2');
    cls(titreFil, 'recit-e072-ton3');
    cls(timing, 'recit-e072-ton4');
    cls(sources, 'recit-e072-ton4');
    const resumeTrace = trace ? q(trace, 'summary') : null;
    cls(resumeTrace, 'recit-e072-ton4');
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
