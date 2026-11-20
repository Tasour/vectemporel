import { register } from './registry.js';

/* Lentille V2 E006 — Mobile et reflow responsive (suite non destructive de la
   passe 1). Dix chantiers neufs, distincts de ceux de E006 passe 1 : ils ne
   replient ni ne compressent le texte, ils ajoutent des repères lisibles et
   quelques ajustements de mise en page. Tout chiffre affiché est dérivé du DOM
   réel (textContent / style inline) ; aucun nombre n'est inventé. Une seule
   feuille de styles préfixée, un seul register, gardes d'existence partout. */
const CSS = `
/* Fil : chaque point tient sur une ligne, le libellé complet reste dans aria-label. */
.recit-v2-e006 .recit-v2-e006-ligne{display:block;max-width:100%}
@media (max-width:620px){
  .recit-v2-e006 .recit-v2-e006-ligne{
    display:block;max-width:260px;overflow:hidden;
    text-overflow:ellipsis;white-space:nowrap
  }
}
/* Compteur de points dérivé du nombre de <li> du fil. */
.recit-v2-e006 .recit-v2-e006-compteur{
  color:var(--muted-2);font-size:9px;font-variant-numeric:tabular-nums;white-space:nowrap
}
/* Repère d'étape dérivé du kicker « Étape X / T ». */
.recit-v2-e006 .recit-v2-e006-etape{
  margin:0 0 4px;color:var(--muted);font-size:9px;
  letter-spacing:.08em;text-transform:uppercase
}
/* Progression textuelle dérivée de la largeur inline de la barre. */
.recit-v2-e006 .recit-v2-e006-progression{
  margin:2px 0 0;color:var(--muted-2);font-size:9px;font-variant-numeric:tabular-nums
}
/* Champ de recherche : 16 px sous 620 px pour éviter le zoom auto iOS. */
.recit-v2-e006 .recit-v2-e006-recherche{min-width:0}
@media (max-width:620px){
  .recit-v2-e006 .recit-v2-e006-recherche{font-size:16px;min-height:44px}
}
/* Zones sûres : marge de sécurité basse sur les écrans à encoche. */
@supports (padding-bottom:env(safe-area-inset-bottom)){
  .recit-v2-e006.recit-v2-e006-safe{padding-bottom:env(safe-area-inset-bottom,0px)}
}
/* Métadonnées : la pastille de certitude ne se comprime pas. */
@media (max-width:620px){
  .recit-v2-e006 .recit-v2-e006-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  .recit-v2-e006 .recit-v2-e006-conf{flex:0 0 auto}
}
/* Légende : deux colonnes sur écran large, une colonne sur mobile. */
.recit-v2-e006 .recit-v2-e006-legende p{margin:3px 0;line-height:1.6}
@media (min-width:760px){
  .recit-v2-e006 .recit-v2-e006-legende{
    display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:24px
  }
}
/* En colonne unique, la légende du média sort du flux absolu sous l'image. */
@media (max-width:1000px){
  .recit-v2-e006 .recit-v2-e006-media .media-caption{
    position:static;display:block;margin:4px 0 0;padding:0 8px;
    color:var(--muted-2);text-align:right
  }
}
/* Paysage : le média devient une bande latérale étroite, le texte garde la largeur. */
@media (orientation:landscape) and (max-height:520px){
  .recit-v2-e006.recit-v2-e006-paysage{
    grid-template-columns:minmax(96px,22vw) minmax(0,1fr);
    grid-template-rows:minmax(0,1fr)
  }
  .recit-v2-e006.recit-v2-e006-paysage .recit-media{min-height:0;max-height:none;align-self:start}
  .recit-v2-e006.recit-v2-e006-paysage .recit-media img{width:100%;height:auto;object-fit:contain}
}
@media (prefers-reduced-motion:no-preference){
  .recit-v2-e006.recit-v2-e006-paysage .recit-media{transition:min-height .18s ease}
}
/* Focus visible renforcé sur les contrôles de la vue. */
.recit-v2-e006 .recit-thread-item:focus-visible,
.recit-v2-e006 .c3a-search:focus-visible,
.recit-v2-e006 .c3a-filter:focus-visible{
  outline:2px solid var(--gold-bright);outline-offset:2px
}`;

/* Paysage : écoute installée une seule fois, sans toucher aux autres modules. */
let ecoutePaysageInstallee = false;
function appliquerPaysage(racine) {
  if (!racine || !racine.classList) return;
  let paysage = false;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try { paysage = window.matchMedia('(orientation: landscape) and (max-height: 520px)').matches; }
    catch (_) { paysage = false; }
  }
  racine.classList.toggle('recit-v2-e006-paysage', paysage);
}
function installerPaysage(racine) {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  appliquerPaysage(racine);
  if (ecoutePaysageInstallee) return;
  ecoutePaysageInstallee = true;
  window.addEventListener('resize', () => {
    try {
      const racines = typeof document !== 'undefined'
        ? document.querySelectorAll('.recit-v2-e006') : [];
      Array.prototype.forEach.call(racines, appliquerPaysage);
    } catch (_) { /* dégradation silencieuse */ }
  });
}

register('E006', (ctx) => {
  const { stage, layout, css, el } = ctx;
  try {
    if (typeof document === 'undefined') return;
    const racine = layout && typeof layout.querySelector === 'function'
      ? layout
      : (stage && typeof stage.querySelector === 'function' ? stage : null);
    if (!racine) return;

    css('recit-v2-e006', CSS);
    racine.classList.add('recit-v2-e006');

    const corps = racine.querySelector('.recit-body');
    const kicker = racine.querySelector('.view-kicker');
    const titre = racine.querySelector('#recit-point-title');
    const titreFil = racine.querySelector('.recit-thread-title');
    const itemsFil = racine.querySelectorAll('.recit-thread-item');
    const fil = racine.querySelector('#c3a-thread');
    const progres = racine.querySelector('.recit-progress');
    const recherche = racine.querySelector('.c3a-search');
    const meta = racine.querySelector('.recit-meta');
    const conf = racine.querySelector('.recit-conf');
    const legende = racine.querySelector('.recit-legend');
    const media = racine.querySelector('.recit-media');

    /* E006-01 — Fil en une seule ligne sur mobile, libellé intégral préservé. */
    Array.prototype.forEach.call(itemsFil, (node) => node.classList.add('recit-v2-e006-ligne'));

    /* E006-02 — Compteur de points du fil dérivé du nombre réel de <li>. */
    if (titreFil && fil && !document.getElementById('v2-e006-compteur')) {
      const nombre = fil.querySelectorAll('li').length;
      const badge = el('span', 'recit-v2-e006-compteur', ` · ${nombre} point(s)`);
      badge.id = 'v2-e006-compteur';
      titreFil.appendChild(badge);
    }

    /* E006-03 — Repère d'étape « Point X sur T » dérivé du kicker visible. */
    if (corps && titre && kicker && !document.getElementById('v2-e006-etape')) {
      const m = /Étape\s+(\d+)\s*\/\s*(\d+)/.exec(kicker.textContent || '');
      if (m) {
        const badge = el('p', 'recit-v2-e006-etape', `Point ${m[1]} sur ${m[2]}`);
        badge.id = 'v2-e006-etape';
        corps.insertBefore(badge, titre);
      }
    }

    /* E006-04 — Progression textuelle dérivée de la barre déjà calculée. */
    if (progres && progres.parentNode && !document.getElementById('v2-e006-progression')) {
      const span = progres.querySelector('span');
      const largeur = span && span.style ? String(span.style.width || '').trim() : '';
      const pm = /^(\d+)\s*%$/.exec(largeur);
      if (pm) {
        const badge = el('p', 'recit-v2-e006-progression', `Progression : ${pm[1]} %`);
        badge.id = 'v2-e006-progression';
        progres.parentNode.insertBefore(badge, progres.nextSibling);
      }
    }

    /* E006-05 — Recherche à 16 px sous 620 px : plus de zoom auto sur iOS. */
    if (recherche) recherche.classList.add('recit-v2-e006-recherche');

    /* E006-06 — Marge de sécurité basse pour les écrans à encoche. */
    racine.classList.add('recit-v2-e006-safe');

    /* E006-07 — Pastille de certitude non compressible sur mobile. */
    if (meta) meta.classList.add('recit-v2-e006-meta');
    if (conf) conf.classList.add('recit-v2-e006-conf');

    /* E006-08 — Légende en deux colonnes sur grand écran. */
    if (legende) legende.classList.add('recit-v2-e006-legende');

    /* E006-09 — Légende du média replacée sous l'image en colonne unique. */
    if (media) media.classList.add('recit-v2-e006-media');

    /* E006-10 — Paysage : média en bande latérale, recalculé au redimensionnement. */
    installerPaysage(racine);
  } catch (_) { /* la vue reste intégralement lisible sans ce greffon */ }
});
