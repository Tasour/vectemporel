import { register } from './registry.js';

/* Lentille E077 — Contraste et perception (vue Récit).
 *
 * Dix chantiers concrets et distincts, E077-01 … E077-10, détaillés dans
 * UNIFIED_AUDIT/RECIT/views/E077.md. Greffon strictement additif : sans ce
 * module, la vue reste intégralement lisible et navigable.
 *
 * Un seul register('E077', …), un seul bloc CSS injecté par
 * css('recit-e077', …), toutes les classes préfixées `recit-e077-`, aucun
 * identifiant DOM créé (unicité triviale), zéro sortie de débogage, zéro
 * réseau, zéro générateur aléatoire, aucune animation JavaScript. Tout est sous garde d'existence
 * et dans un try/catch : une lentille défaillante ne casse jamais le rendu.
 *
 * Lectures seules : src/views/recit/registry.js, src/views/recit/index.js,
 * src/views/recit.js, styles.css. Aucun fichier partagé n'est modifié.
 */

/* Bloc CSS unique, entièrement cadré par la classe racine `recit-e077-root`
   posée sur `.recit-layout` : aucune règle globale, aucune ressource distante. */
const CSS = `
/* Socle — jetons de contraste locaux à la vue Récit. */
.recit-e077-root{
  --e077-texte:#f2ede3;
  --e077-texte-doux:#d7d1c6;
  --e077-or:#ffd990;
  --e077-bord:rgba(255,255,255,.34);
  --e077-fond:rgba(255,255,255,.06);
}

/* E077-01 — contraste de la barre d'outils (recherche + groupes de filtres). */
.recit-e077-outils .c3a-search{
  color:var(--e077-texte);
  border-color:var(--e077-bord);
  background:rgba(0,0,0,.30);
}
.recit-e077-outils .c3a-search::placeholder{color:#c8c1b6;opacity:1}
.recit-e077-outils .c3a-group-label{color:var(--e077-texte-doux);font-weight:600}

/* E077-02 — état actif des filtres : forme et poids, pas la couleur seule. */
.recit-e077-filtres .c3a-filter[aria-pressed="true"]{
  color:var(--e077-or);
  font-weight:700;
  box-shadow:inset 0 -2px 0 var(--e077-or);
}
.recit-e077-filtres .c3a-filter[aria-pressed="true"]::after{content:" ✓"}

/* E077-03 — légendes au-dessus de l'image : figure/fond renforcée. */
.recit-e077-media .recit-media-credit{
  color:#ffffff;
  background:rgba(0,0,0,.48);
  padding:2px 6px;
  border-radius:4px;
  text-shadow:0 1px 3px #000,0 0 6px #000;
}
.recit-e077-media .media-caption{
  color:#ffffff;
  background:linear-gradient(0deg,rgba(0,0,0,.62),rgba(0,0,0,0));
  text-shadow:0 1px 3px #000,0 0 6px #000;
}

/* E077-04 — titre du point : contraste d'emphase détaché du fond. */
.recit-e077-titre .recit-title{
  color:#ffffff;
  text-shadow:0 2px 10px rgba(0,0,0,.78);
  letter-spacing:-.012em;
}

/* E077-05 — type du point : glyphe distinct par kind, sans dépendre d'une couleur. */
.recit-e077-type .recit-thread-item[data-e077-kind]::before{
  display:inline-block;
  width:1.3em;
  margin-right:2px;
  text-align:center;
  font-weight:700;
}
.recit-e077-type .recit-thread-item[data-e077-kind="recit"]::before{content:"§";color:var(--e077-or)}
.recit-e077-type .recit-thread-item[data-e077-kind="figure"]::before{content:"◉"}
.recit-e077-type .recit-thread-item[data-e077-kind="lieu"]::before{content:"◇"}
.recit-e077-type .recit-thread-item[data-e077-kind="audit"]::before{content:"▤"}

/* E077-06 — point courant : repère de forme (triangle) + poids, dans le fil. */
.recit-e077-courant .recit-thread-item.is-current{
  color:#ffffff;
  font-weight:700;
  background-color:rgba(255,217,144,.14);
}
.recit-e077-courant .recit-thread-item.is-current::after{
  content:"▶";
  position:absolute;
  right:5px;
  top:50%;
  transform:translateY(-50%);
  color:var(--e077-or);
  font-size:8px;
}

/* E077-07 — rythme du fil : bandes alternées pour scanner une longue liste. */
.recit-e077-fil .recit-thread-list li+li{margin-top:3px}
.recit-e077-fil .recit-thread-list li:nth-child(even) .recit-thread-item:not(.is-current){background-color:rgba(255,255,255,.035)}
.recit-e077-fil .recit-thread-list li:nth-child(odd) .recit-thread-item:not(.is-current){background-color:rgba(0,0,0,.18)}

/* E077-08 — commandes désactivées : état lisible au lieu d'un simple fondu. */
.recit-e077-desactive .recit-actions button[disabled]{
  opacity:1;
  color:#b9b2a6;
  border:1px dashed var(--e077-bord);
  cursor:not-allowed;
}

/* E077-09 — lecture automatique : état "en cours" visible sans couleur seule. */
.recit-e077-lecture .recit-play[aria-pressed="true"]{
  color:var(--e077-or);
  border-color:var(--e077-or);
  font-weight:700;
}
.recit-e077-lecture .recit-play[aria-pressed="true"]::after{
  content:" · en cours";
  font-weight:400;
  animation:recit-e077-pulse 1.6s ease-in-out infinite;
}
@keyframes recit-e077-pulse{0%,100%{opacity:1}50%{opacity:.45}}
.recit-e077-root[data-e077-motion="reduce"] .recit-play[aria-pressed="true"]::after{animation:none}
@media (prefers-reduced-motion:reduce){
  .recit-e077-root .recit-play[aria-pressed="true"]::after{animation:none}
}

/* E077-10 — bandeau de statut de filtrage : cadre et repère de lecture. */
.recit-e077-statut .c3a-status{
  color:var(--e077-texte);
  border:1px solid var(--e077-bord);
  border-left:3px solid var(--e077-or);
  border-radius:6px;
  background:var(--e077-fond);
  padding:5px 9px;
  font-size:10px;
}
.recit-e077-statut .c3a-status::before{content:"☷ ";color:var(--e077-or)}
`;

const RACINE = 'recit-e077-root';

/* Ajout d'une classe sans jamais retirer ni remplacer une classe existante. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
    && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Traduction du type de point en jeton ASCII, sans toucher à data-kind. */
function jetonType(valeur) {
  const t = String(valeur || '');
  if (t === 'récit' || t === 'recit') return 'recit';
  if (t === 'figure') return 'figure';
  if (t === 'lieu') return 'lieu';
  if (t === 'audit') return 'audit';
  return 'autre';
}

register('E077', (ctx) => {
  const { layout, css, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout
      || typeof layout.querySelector !== 'function') return;

    /* Un seul appel CSS, toutes les règles du module. */
    css('recit-e077', CSS);

    /* Socle : jetons locaux et ancrage de la préférence de mouvement. */
    ajouteClasse(layout, RACINE);

    /* E077-01 — barre d'outils contrastée (recherche + libellés de groupes). */
    ajouteClasse(layout, 'recit-e077-outils');

    /* E077-02 — filtres actifs : coche et poids en plus de la couleur. */
    ajouteClasse(layout, 'recit-e077-filtres');

    /* E077-03 — légendes au-dessus de l'image (crédit, caption). */
    ajouteClasse(layout, 'recit-e077-media');

    /* E077-04 — titre du point détaché du fond. */
    ajouteClasse(layout, 'recit-e077-titre');

    /* E077-05 — glyphe de type : lecture de data-kind, sans rien écraser. */
    ajouteClasse(layout, 'recit-e077-type');
    const items = layout.querySelectorAll('.recit-thread-item');
    if (items && typeof items.forEach === 'function') {
      items.forEach((item) => {
        if (item && typeof item.getAttribute === 'function'
          && typeof item.setAttribute === 'function') {
          item.setAttribute('data-e077-kind', jetonType(item.getAttribute('data-kind')));
        }
      });
    }

    /* E077-06 — repère du point courant (purement CSS via .is-current). */
    ajouteClasse(layout, 'recit-e077-courant');

    /* E077-07 — rythme du fil (bandes alternées, current exclu). */
    ajouteClasse(layout, 'recit-e077-fil');

    /* E077-08 — commandes désactivées lisibles. */
    ajouteClasse(layout, 'recit-e077-desactive');

    /* E077-09 — état de lecture perceptible ; mouvement lu une fois par rendu. */
    ajouteClasse(layout, 'recit-e077-lecture');
    const reduit = typeof reducedMotion === 'function' && reducedMotion();
    if (typeof layout.setAttribute === 'function') {
      layout.setAttribute('data-e077-motion', reduit ? 'reduce' : 'normal');
    }

    /* E077-10 — statut de filtrage : compte dérivé du texte rendu, non codé en dur. */
    ajouteClasse(layout, 'recit-e077-statut');
    const statut = layout.querySelector('.c3a-status');
    if (statut && typeof statut.textContent !== 'undefined'
      && typeof statut.setAttribute === 'function') {
      const trouvé = /^(\d+)/.exec(String(statut.textContent || '').trim());
      if (trouvé) statut.setAttribute('data-e077-matches', trouvé[1]);
    }
  } catch {
    /* Ne jamais faire lever d'exception : le rendu d'origine reste intact. */
  }
});
