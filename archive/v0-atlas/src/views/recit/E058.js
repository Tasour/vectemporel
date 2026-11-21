import { register } from './registry.js';

/* Lentille E058 — Performance et sobriété de la vue Récit (vue « Récit »).
 *
 * Dix chantiers concrets et distincts, E058-01 … E058-10, tous implémentés
 * ci-dessous. Rapport : UNIFIED_AUDIT/RECIT/views/E058.md.
 *
 * Complémentarité : E008 traite déjà la performance par le confinement des
 * blocs de texte, le chargement différé de l'image, la densification du fil
 * et un miroir d'attributs caché. E058 porte sur d'autres leviers, sans les
 * dupliquer : police système (zéro fonte distante), réservation géométrique
 * du média, text-size-adjust, confinement de la région image, mode faible
 * données, color-scheme, mesure d'empreinte, compteur visible, gouttière de
 * défilement stable et bascule « sobriété renforcée » confiée à l'utilisateur.
 *
 * Greffon strictement non destructif : une seule feuille de style, deux nœuds
 * additifs au plus (paragraphe de mesure et bouton de bascule), aucun nœud
 * retiré, aucun texte existant réécrit, aucun écouteur sur les nœuds d'origine.
 * Sans JavaScript, la vue reste intégralement lisible. Aucun appel réseau,
 * aucun aléa, aucune sortie de débogage, aucun fichier partagé modifié.
 *
 * Sobriété des identifiants : ids DOM préfixés e058- et uniques ; toutes les
 * classes créées sont préfixées recit-e058- ; les attributs data-e058-* sont
 * réservés à cette lentille.
 */

/* Une seule feuille, un seul appel de la fonction css : toutes les règles
   du module sont regroupées ici. Aucune règle d'import ni d'URL distante,
   aucune police distante, pas de will-change, pas de filtre ni de
   backdrop-filter. */
const CSS = `
/* E058-01 — police système : aucune requête de fonte, rendu immédiat. */
.recit-e058-corps{
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
}
/* E058-02 — géométrie du média réservée : aucun décalage de mise en page
   (CLS) pendant le décodage de l'image. */
.recit-e058-media{background:#0a0d12}
.recit-e058-img{aspect-ratio:16/9;max-height:100%;height:auto;object-fit:cover;background:#0a0d12}
@media (max-width:620px){
  .recit-e058-media{min-height:96px}
}
/* E058-03 — neutralisation de l'inflation de texte sur mobile : évite un
   nouveau calcul de mise en page imposé par le navigateur. */
.recit-e058-corps{-webkit-text-size-adjust:100%;text-size-adjust:100%}
/* E058-04 — confinement de la région image : ses mutations de contenu ne
   provoquent pas de recalcul dans le reste de la grille. */
.recit-e058-media{contain:layout paint style}
/* E058-05 — mode faible données : l'image illustrative est omise, la légende
   et le crédit restent lisibles. Décision de l'utilisateur, uniquement CSS. */
@media (prefers-reduced-data:reduce){
  .recit-e058-media .recit-e058-img{display:none}
  .recit-e058-media{background:transparent}
}
/* E058-06 — color-scheme déclaré : le navigateur calque ses couleurs UA
   (barres de défilement, anneaux de focus) sans réajustement ni flash. */
.recit-e058-racine{color-scheme:dark light}
/* E058-07 — empreinte chiffrée : lisible dans le DOM, sans journalisation. */
.recit-e058-racine[data-e058-empreinte]{--e058-empreinte:1}
/* E058-08 — compteur de sobriété visible, additif et non prioritaire. */
.recit-e058-empreinte{
  margin:8px 0 0;padding:6px 9px;border-left:2px solid var(--line);
  color:var(--muted-2);font-size:10px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}
/* E058-09 — gouttière de défilement stable : la croissance du contenu ne
   décale pas horizontalement la colonne de lecture. */
.recit-e058-corps{scrollbar-gutter:stable}
/* E058-10 — bascule « sobriété renforcée » : cible ≥ 36 px, focus visible,
   état porté par aria-pressed ; les transitions sont suppressibles. */
.recit-e058-sobriete-btn{
  min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:10px;cursor:pointer;
  transition:border-color .18s linear,color .18s linear,background-color .18s linear;
}
.recit-e058-sobriete-btn[aria-pressed="true"]{
  border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.12);
}
.recit-e058-sobriete-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-layout.recit-e058-sobre .recit-e058-media .recit-e058-img{display:none}
.recit-layout.recit-e058-sobre .recit-e058-media{background:transparent}
/* E058-10 (suite) — mouvement réduit : aucune transition sur les éléments
   de cette lentille, qu'elle que soit l'origine de la préférence. */
.recit-e058-racine[data-e058-motion="reduce"] .recit-e058-sobriete-btn,
.recit-e058-racine[data-e058-motion="reduce"] .recit-e058-empreinte{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-e058-sobriete-btn,.recit-e058-empreinte{transition:none}
}
`;

/* L'état de la bascule survit aux reconstructions complètes du DOM
   opérées par la coque, comme pour les autres lentilles à bascule. */
const etat = { sobriete: false };

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
      && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function libelleSobriete() {
  return etat.sobriete
    ? 'Sobriété renforcée : activée'
    : 'Sobriété renforcée : désactivée';
}

function synchroniseBouton(bouton) {
  if (!bouton || typeof bouton.setAttribute !== 'function') return;
  const libelle = libelleSobriete();
  bouton.textContent = libelle;
  bouton.setAttribute('aria-label', libelle);
  bouton.setAttribute('aria-pressed', etat.sobriete ? 'true' : 'false');
}

/* E058-07 — mesure d'empreinte sans effet de bord ni journalisation. */
function mesureEmpreinte(racine, corps) {
  const elements = typeof racine.querySelectorAll === 'function'
    ? racine.querySelectorAll('*').length : 0;
  const caracteres = corps && typeof corps.textContent === 'string'
    ? corps.textContent.replace(/\s+/g, '').length : 0;
  let annonces = 0;
  if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
    annonces = document.querySelectorAll('[aria-live],[role="status"]').length;
  }
  return { elements, caracteres, annonces };
}

register('E058', (ctx) => {
  /* Garde d'existence globale : une lentille défaillante ne doit jamais
     interrompre le rendu de la vue. */
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { stage, layout, css, el, reducedMotion } = ctx;

    /* Une seule feuille de styles pour toute la lentille. */
    if (typeof css === 'function') css('recit-e058', CSS);

    const racine = layout && typeof layout.querySelector === 'function'
      ? layout
      : (stage && typeof stage.querySelector === 'function' ? stage : null);
    if (!racine || typeof racine.setAttribute !== 'function') return;

    const corps = racine.querySelector('.recit-body');
    const media = racine.querySelector('.recit-media');
    const image = media && typeof media.querySelector === 'function'
      ? media.querySelector('img') : null;
    const actions = racine.querySelector('.recit-actions');

    /* E058-01, E058-03, E058-09 — le corps de lecture porte la police
       système, le réglage de taille de texte et la gouttière stable. */
    ajouteClasse(corps, 'recit-e058-corps');

    /* E058-02, E058-04 — réservation géométrique et confinement du média. */
    ajouteClasse(media, 'recit-e058-media');
    ajouteClasse(image, 'recit-e058-img');

    /* E058-06 — marqueur de racine (color-scheme) et préférence de mouvement
       lue une seule fois par rendu. */
    ajouteClasse(racine, 'recit-e058-racine');
    let mouvement = 'normal';
    try { mouvement = reducedMotion && reducedMotion() ? 'reduce' : 'normal'; }
    catch { mouvement = 'normal'; }
    racine.setAttribute('data-e058-motion', mouvement);

    /* E058-07 — empreinte chiffrée exposée une seule fois par rendu. */
    if (!racine.hasAttribute('data-e058-empreinte')) {
      const m = mesureEmpreinte(racine, corps);
      racine.setAttribute(
        'data-e058-empreinte',
        `elements:${m.elements} caracteres:${m.caracteres} annonces:${m.annonces}`
      );
    }

    /* E058-08 — compteur de sobriété visible, additif et gardé contre la
       duplication. Aucun chiffre n'est inventé : tout vient du DOM réel. */
    if (corps && typeof el === 'function' && typeof corps.appendChild === 'function') {
      let compteur = document.getElementById('e058-empreinte');
      if (!compteur || compteur.parentElement !== corps) {
        compteur = el('p', 'recit-e058-empreinte');
        compteur.id = 'e058-empreinte';
        corps.appendChild(compteur);
      }
      const m = mesureEmpreinte(racine, corps);
      compteur.textContent = `Empreinte du rendu : ${m.elements} éléments · ${m.caracteres} caractères · ${m.annonces} région(s) d'annonce. Cette amélioration n'ajoute ni police ni ressource distante.`;
      compteur.setAttribute(
        'aria-label',
        `Empreinte du rendu : ${m.elements} éléments, ${m.caracteres} caractères, ${m.annonces} région d'annonce. Aucune police ni ressource distante ajoutée.`
      );
    }

    /* E058-10 — bascule « sobriété renforcée », lisible et réversible. */
    if (actions && typeof el === 'function' && typeof actions.appendChild === 'function') {
      let bouton = document.getElementById('e058-sobriete-btn');
      if (!bouton || bouton.parentElement !== actions) {
        bouton = el('button', 'recit-e058-sobriete-btn');
        bouton.id = 'e058-sobriete-btn';
        bouton.type = 'button';
        bouton.title = 'Masque l’image illustrative et réduit les effets, à la demande';
        actions.appendChild(bouton);
        bouton.addEventListener('click', () => {
          etat.sobriete = !etat.sobriete;
          const cadre = document.querySelector('.recit-layout');
          if (cadre && cadre.classList && typeof cadre.classList.toggle === 'function') {
            cadre.classList.toggle('recit-e058-sobre', etat.sobriete);
          }
          synchroniseBouton(document.getElementById('e058-sobriete-btn'));
        });
      }
      synchroniseBouton(bouton);
      if (etat.sobriete) ajouteClasse(racine, 'recit-e058-sobre');
      else if (racine.classList && typeof racine.classList.remove === 'function') {
        racine.classList.remove('recit-e058-sobre');
      }
    }
  } catch {
    /* Une lentille défaillante ne casse jamais le rendu de la vue. */
  }
});
