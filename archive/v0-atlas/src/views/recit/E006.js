import { register } from './registry.js';

/* Lentille E006 — Mobile et reflow responsive.
   Dix chantiers indépendants (E006-01 … E006-10). Tout est non destructif :
   les ajustements ajoutent des classes ou replient du contenu déjà présent,
   jamais de texte supprimé. Sans JavaScript, la vue Récit reste lisible.
   Les préférences de bascule survivent aux reconstructions du DOM. */
const prefs = {
  confort: false,
  imageCompacte: false,
  filReplie: false,
  legendeOuverte: false,
};

/* Crée une bascule unique, avec existence gardée et état aria-pressed. */
function boutonBascule(el, actions, id, libelles, pressed, onChange) {
  if (!actions || typeof actions.insertBefore !== 'function') return null;
  if (document.getElementById(id)) return null;
  const bouton = el('button', 'recit-e006-bouton', pressed ? libelles[1] : libelles[0]);
  bouton.id = id;
  bouton.type = 'button';
  bouton.setAttribute('aria-pressed', String(pressed));
  bouton.addEventListener('click', onChange);
  actions.insertBefore(bouton, actions.firstChild);
  return bouton;
}

/* E006-10 : le mode « faible hauteur » est recalculé au redimensionnement.
   L'écoute est installée une seule fois et ne touche aucun autre module. */
let ecouteHauteurInstallee = false;
function appliquerHauteur() {
  if (typeof window === 'undefined') return;
  const court = window.innerHeight <= 520;
  const racines = document.querySelectorAll('.recit-e006');
  Array.prototype.forEach.call(racines, (node) => {
    node.classList.toggle('recit-e006-court', court);
  });
}
function installerHauteur() {
  if (ecouteHauteurInstallee || typeof window === 'undefined') return;
  ecouteHauteurInstallee = true;
  window.addEventListener('resize', appliquerHauteur);
}

register('E006', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  const racine = layout && typeof layout.querySelector === 'function'
    ? layout
    : (stage && typeof stage.querySelector === 'function' ? stage : null);
  if (!racine) return;

  /* Une seule feuille de styles, une seule fois, préfixée recit-e006-.
     Les transitions ne sont actives que si l'utilisateur le permet. */
  const transition = reducedMotion()
    ? ''
    : '.recit-e006 .recit-e006-media-actif,.recit-e006 .recit-e006-thread-list{transition:max-height .18s ease}';
  css('recit-e006', `
.recit-e006 .recit-e006-corps{min-width:0}
.recit-e006 .recit-e006-titre{overflow-wrap:anywhere;hyphens:auto;line-height:1.12}
.recit-e006 .recit-e006-confort.recit-e006-corps{font-size:16px;line-height:1.75}
.recit-e006 .recit-e006-confort.recit-e006-corps .recit-e006-titre{line-height:1.2}
.recit-e006 .recit-e006-media-actif{min-width:0}
.recit-e006 .recit-e006-media-compact img{width:100%;height:100%;object-fit:cover}
.recit-e006 .recit-e006-thread-list{overflow:auto;overscroll-behavior:contain}
.recit-e006 .recit-e006-legende{margin:0}
.recit-e006 .recit-e006-legende-resume{min-height:36px;display:flex;align-items:center;cursor:pointer;color:var(--gold-bright);font-size:10px}
.recit-e006 .recit-e006-legende-resume:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-e006 .recit-e006-trace{max-width:100%;overflow-wrap:anywhere;word-break:break-word}
.recit-e006 .recit-e006-bouton{min-height:36px;padding:4px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--gold-bright);font-size:9px;white-space:nowrap;cursor:pointer}
.recit-e006 .recit-e006-bouton[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.12)}
.recit-e006 .recit-e006-bouton:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
@media (max-width:620px){
  .recit-e006 .recit-e006-corps{padding-bottom:64px}
  .recit-e006 .recit-e006-titre{font-size:clamp(24px,6.6vw,36px)}
  .recit-e006 .recit-e006-confort.recit-e006-corps{font-size:18px;line-height:1.8}
  .recit-e006 .recit-e006-media-compact{min-height:54px;max-height:9vh}
  .recit-e006 .recit-e006-thread-list.recit-e006-thread-replie{max-height:132px}
  .recit-e006 .recit-e006-actions{position:sticky;bottom:0;z-index:3;flex-wrap:nowrap;overflow-x:auto;overscroll-behavior-x:contain;padding:8px 0;margin-top:8px;background:rgba(8,11,18,.94);backdrop-filter:blur(6px)}
  .recit-e006 .recit-e006-actions button{flex:0 0 auto}
  .recit-e006 .recit-e006-touch{min-height:44px;min-width:44px}
  .recit-e006 .recit-e006-outils{flex-direction:column;align-items:stretch;gap:6px}
  .recit-e006 .recit-e006-recherche{flex:1 1 auto;width:100%}
  .recit-e006 .recit-e006-groupe{flex-wrap:nowrap;overflow-x:auto;overscroll-behavior-x:contain;padding-bottom:2px}
  .recit-e006 .recit-e006-groupe .recit-e006-touch{flex:0 0 auto}
}
.recit-e006.recit-e006-court .recit-e006-media-actif{min-height:0;max-height:14vh}
.recit-e006.recit-e006-court .recit-e006-corps{padding-top:10px;padding-bottom:52px}
.recit-e006.recit-e006-court .recit-e006-titre{font-size:clamp(22px,4.4vw,32px)}
${transition}`);

  /* Repères du DOM, tous facultatifs. */
  const corps = racine.querySelector('.recit-body');
  const media = racine.querySelector('.recit-media');
  const actions = racine.querySelector('.recit-actions');
  const fil = racine.querySelector('.recit-thread-list');
  const outils = racine.querySelector('.c3a-tools');
  const recherche = racine.querySelector('.c3a-search');
  const groupes = racine.querySelectorAll('.c3a-group');
  const boutonsTactiles = racine.querySelectorAll(
    '.recit-actions button, .c3a-filter, .c3a-search, .c3a-reset, .recit-thread-item, .recit-trace summary'
  );
  const titre = racine.querySelector('#recit-point-title');
  const legende = racine.querySelector('.recit-legend');
  const traces = racine.querySelectorAll('.recit-trace, .recit-sources');

  /* E006-01 — Confort de lecture : agrandit le corps sur petit écran. */
  if (corps) {
    corps.classList.add('recit-e006-corps');
    if (prefs.confort) corps.classList.add('recit-e006-confort');
    const bouton = boutonBascule(el, actions, 'e006-confort',
      ['Texte confort : désactivé', 'Texte confort : activé'], prefs.confort, () => {
        prefs.confort = !prefs.confort;
        const cible = racine.querySelector('.recit-e006-corps');
        if (cible) cible.classList.toggle('recit-e006-confort', prefs.confort);
        bouton.setAttribute('aria-pressed', String(prefs.confort));
        bouton.textContent = prefs.confort ? 'Texte confort : activé' : 'Texte confort : désactivé';
      });
    if (bouton) bouton.title = 'Agrandit le texte et l’interlignage du récit sur mobile';
  }

  /* E006-02 — Image compacte : libère la hauteur du récit sur mobile. */
  if (media) {
    media.classList.add('recit-e006-media-actif');
    if (prefs.imageCompacte) media.classList.add('recit-e006-media-compact');
    const bouton = boutonBascule(el, actions, 'e006-image',
      ['Image compacte : désactivée', 'Image compacte : activée'], prefs.imageCompacte, () => {
        prefs.imageCompacte = !prefs.imageCompacte;
        const cible = racine.querySelector('.recit-e006-media-actif');
        if (cible) cible.classList.toggle('recit-e006-media-compact', prefs.imageCompacte);
        bouton.setAttribute('aria-pressed', String(prefs.imageCompacte));
        bouton.textContent = prefs.imageCompacte ? 'Image compacte : activée' : 'Image compacte : désactivée';
      });
    if (bouton) bouton.title = 'Réduit la hauteur de l’image au profit du texte';
  }

  /* E006-03 — Fil repliable : le mur de boutons devient une zone défilante. */
  if (fil) {
    fil.classList.add('recit-e006-thread-list');
    if (prefs.filReplie) fil.classList.add('recit-e006-thread-replie');
    const bouton = boutonBascule(el, actions, 'e006-fil',
      ['Fil : déplier', 'Fil : réduire'], prefs.filReplie, () => {
        prefs.filReplie = !prefs.filReplie;
        const cible = racine.querySelector('.recit-e006-thread-list');
        if (cible) cible.classList.toggle('recit-e006-thread-replie', prefs.filReplie);
        bouton.setAttribute('aria-pressed', String(prefs.filReplie));
        bouton.textContent = prefs.filReplie ? 'Fil : réduire' : 'Fil : déplier';
      });
    if (bouton && fil.id) bouton.setAttribute('aria-controls', fil.id);
  }

  /* E006-04 — Barre d'actions ancrée en bas de la zone de lecture. */
  if (actions) actions.classList.add('recit-e006-actions');

  /* E006-05 — Cibles tactiles élargies à 44 px sur pointeur grossier. */
  Array.prototype.forEach.call(boutonsTactiles, (node) => node.classList.add('recit-e006-touch'));

  /* E006-06 — Outils de recherche en bandeau, filtres défilables. */
  if (outils) outils.classList.add('recit-e006-outils');
  if (recherche) recherche.classList.add('recit-e006-recherche');
  Array.prototype.forEach.call(groupes, (node) => node.classList.add('recit-e006-groupe'));

  /* E006-07 — Légende repliée dans un <details> natif, sans perte de texte. */
  if (legende && !document.getElementById('e006-legende')) {
    const repli = el('details', 'recit-e006-legende');
    repli.id = 'e006-legende';
    const resume = el('summary', 'recit-e006-legende-resume', 'Légende et raccourcis');
    resume.id = 'e006-legende-resume';
    repli.appendChild(resume);
    Array.prototype.slice.call(legende.childNodes).forEach((node) => repli.appendChild(node));
    legende.appendChild(repli);
    repli.open = prefs.legendeOuverte;
    repli.addEventListener('toggle', () => { prefs.legendeOuverte = Boolean(repli.open); });
  }

  /* E006-08 — Traçabilité : coupure des identifiants longs, sans débordement. */
  Array.prototype.forEach.call(traces, (node) => node.classList.add('recit-e006-trace'));

  /* E006-09 — Titre : retour à la ligne maîtrisé sur écran étroit. */
  if (titre) titre.classList.add('recit-e006-titre');

  /* E006-10 — Faible hauteur / paysage : adaptation immédiate et au resize. */
  racine.classList.add('recit-e006');
  installerHauteur();
  appliquerHauteur();
});
