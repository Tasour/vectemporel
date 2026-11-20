import { register } from './registry.js';

/* V2 lentille E069 — vue Récit : transitions et mouvement.
 * Angle V2 : gestes de transition liés à l'état de lecture et continuité
 * visuelle. Dix chantiers V2 NEUFS, distincts de ceux de la passe 1 (cadran
 * de tempo, cascade du fil, piste de jalons et curseur, aiguille géométrique,
 * trait sous le titre, respiration de la pastille, entrée du bas de page,
 * glacis au survol, aiguille de focus, témoin de cadence).
 * Préfixes : classes recit-v2-e069-, ids DOM v2-e069-, variable --v2-e069-*.
 * Chaque nombre affiché est lu dans le DOM réel. Zéro réseau, zéro console,
 * zéro aléa, aucun fichier partagé modifié. */

const CSS = `
.recit-layout.recit-v2-e069-scope{--v2-e069-t:.3s}

/* E069-01 — remplissage animé de la barre de progression */
.recit-layout.recit-v2-e069-scope .recit-progress>span.recit-v2-e069-fill{position:relative;transform-origin:left center;animation:recit-v2-e069-remplir calc(var(--v2-e069-t)*1.1) ease-out 1}
.recit-layout.recit-v2-e069-scope .recit-progress>span.recit-v2-e069-fill::after{content:"";position:absolute;right:0;top:-1px;width:5px;height:calc(100% + 2px);border-radius:3px;background:var(--gold-bright);opacity:0;pointer-events:none}
.recit-layout.recit-v2-e069-scope .recit-progress>span.recit-v2-e069-fill.recit-v2-e069-fill-pulse::after{animation:recit-v2-e069-glint calc(var(--v2-e069-t)*.9) ease-out 1}
@keyframes recit-v2-e069-remplir{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes recit-v2-e069-glint{0%{opacity:.85;transform:scaleX(.4);transform-origin:right center}100%{opacity:0;transform:scaleX(1);transform-origin:right center}}

/* E069-02 — entrée directionnelle du titre */
.recit-layout.recit-v2-e069-scope .recit-title.recit-v2-e069-titre-dir{animation:recit-v2-e069-titre-in calc(var(--v2-e069-t)*.9) ease-out 1}
@keyframes recit-v2-e069-titre-in{from{opacity:0;transform:translateX(calc(var(--v2-e069-dir,1)*12px))}to{opacity:1;transform:none}}

/* E069-03 — cascade d'entrée des commandes d'action */
.recit-layout.recit-v2-e069-scope .recit-actions button.recit-v2-e069-action{animation:recit-v2-e069-action-in calc(var(--v2-e069-t)*.6) ease-out both;animation-delay:calc(var(--v2-e069-i,0)*45ms)}
@keyframes recit-v2-e069-action-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}

/* E069-04 — glissement latéral de la pastille de certitude */
.recit-layout.recit-v2-e069-scope .recit-conf.recit-v2-e069-conf-glisse{animation:recit-v2-e069-conf-glisse-in calc(var(--v2-e069-t)*.7) ease-out 1}
@keyframes recit-v2-e069-conf-glisse-in{from{opacity:0;transform:translateX(calc(var(--v2-e069-conf-dir,1)*8px))}to{opacity:1;transform:none}}

/* E069-05 — liseré vertical de l'item courant du fil */
.recit-layout.recit-v2-e069-scope .recit-thread-item.recit-v2-e069-lisere{position:relative}
.recit-layout.recit-v2-e069-scope .recit-thread-item.recit-v2-e069-lisere::before{content:"";position:absolute;left:2px;top:4px;bottom:4px;width:2px;border-radius:1px;background:var(--gold-bright);transform:scaleY(0);transform-origin:top center;animation:recit-v2-e069-lisere-in calc(var(--v2-e069-t)*.7) ease-out forwards}
@keyframes recit-v2-e069-lisere-in{to{transform:scaleY(1)}}

/* E069-06 — barre de lecture sous le bouton « Lecture automatique » actif */
.recit-layout.recit-v2-e069-scope .recit-actions button.recit-v2-e069-lecture{position:relative}
.recit-layout.recit-v2-e069-scope .recit-actions button.recit-v2-e069-lecture.recit-v2-e069-lecture-active::after{content:"";position:absolute;left:8px;right:8px;bottom:3px;height:2px;border-radius:2px;background:var(--gold-bright);transform:scaleX(0);transform-origin:left center;animation:recit-v2-e069-lecture-in calc(var(--v2-e069-t)*.8) ease-out forwards}
@keyframes recit-v2-e069-lecture-in{to{transform:scaleX(1)}}

/* E069-07 — révélation en cascade des groupes de filtres */
.recit-layout.recit-v2-e069-scope .c3a-group.recit-v2-e069-groupe{animation:recit-v2-e069-groupe-in calc(var(--v2-e069-t)*.6) ease-out both;animation-delay:calc(var(--v2-e069-g,0)*40ms)}
@keyframes recit-v2-e069-groupe-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}

/* E069-08 — soulignage du filtre actif (aria-pressed lu, jamais écrit) */
.recit-layout.recit-v2-e069-scope .c3a-filter.recit-v2-e069-filtre{position:relative}
.recit-layout.recit-v2-e069-scope .c3a-filter.recit-v2-e069-filtre[aria-pressed="true"]::after{content:"";position:absolute;left:6px;right:6px;bottom:2px;height:1px;border-radius:1px;background:var(--gold-bright);transform:scaleX(0);transform-origin:left center;animation:recit-v2-e069-filtre-in calc(var(--v2-e069-t)*.5) ease-out forwards}
@keyframes recit-v2-e069-filtre-in{to{transform:scaleX(1)}}

/* E069-09 — chevron et contenu de la traçabilité */
.recit-layout.recit-v2-e069-scope .recit-trace.recit-v2-e069-trace summary{position:relative;padding-right:18px}
.recit-layout.recit-v2-e069-scope .recit-trace.recit-v2-e069-trace summary::after{content:"›";position:absolute;right:4px;top:50%;color:var(--gold-bright);transform:translateY(-50%) rotate(0deg);transition:transform calc(var(--v2-e069-t)*.5) ease}
.recit-layout.recit-v2-e069-scope .recit-trace.recit-v2-e069-trace[open] summary::after{transform:translateY(-50%) rotate(90deg)}
.recit-layout.recit-v2-e069-scope .recit-trace.recit-v2-e069-trace[open] p{animation:recit-v2-e069-trace-in calc(var(--v2-e069-t)*.5) ease-out 1}
@keyframes recit-v2-e069-trace-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}

/* E069-10 — témoin V2 et coupe-circuit mouvement réduit */
.recit-layout.recit-v2-e069-scope .recit-v2-e069-note{margin:6px 0 0;color:var(--muted-2);font-size:9px;line-height:1.6;font-variant-numeric:tabular-nums}
.recit-layout.recit-v2-e069-scope[data-v2-e069-motion="reduce"] .recit-v2-e069-fill,
.recit-layout.recit-v2-e069-scope[data-v2-e069-motion="reduce"] .recit-v2-e069-fill::after,
.recit-layout.recit-v2-e069-scope[data-v2-e069-motion="reduce"] .recit-v2-e069-titre-dir,
.recit-layout.recit-v2-e069-scope[data-v2-e069-motion="reduce"] .recit-v2-e069-action,
.recit-layout.recit-v2-e069-scope[data-v2-e069-motion="reduce"] .recit-v2-e069-conf-glisse,
.recit-layout.recit-v2-e069-scope[data-v2-e069-motion="reduce"] .recit-v2-e069-lisere::before,
.recit-layout.recit-v2-e069-scope[data-v2-e069-motion="reduce"] .recit-v2-e069-lecture-active::after,
.recit-layout.recit-v2-e069-scope[data-v2-e069-motion="reduce"] .recit-v2-e069-groupe,
.recit-layout.recit-v2-e069-scope[data-v2-e069-motion="reduce"] .recit-v2-e069-filtre[aria-pressed="true"]::after,
.recit-layout.recit-v2-e069-scope[data-v2-e069-motion="reduce"] .recit-trace.recit-v2-e069-trace[open] p{animation:none!important;transition:none!important;transform:none!important}
.recit-layout.recit-v2-e069-scope[data-v2-e069-motion="reduce"] .recit-trace.recit-v2-e069-trace summary::after{transition:none!important}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e069-fill,.recit-v2-e069-fill::after,.recit-v2-e069-titre-dir,
  .recit-v2-e069-action,.recit-v2-e069-conf-glisse,.recit-v2-e069-lisere::before,
  .recit-v2-e069-lecture-active::after,.recit-v2-e069-groupe,
  .recit-v2-e069-filtre[aria-pressed="true"]::after,
  .recit-trace.recit-v2-e069-trace[open] p{animation:none!important;transition:none!important;transform:none!important}
  .recit-trace.recit-v2-e069-trace summary::after{transition:none!important}
}
@media (forced-colors:active){
  .recit-layout.recit-v2-e069-scope .recit-v2-e069-fill::after,
  .recit-layout.recit-v2-e069-scope .recit-v2-e069-lisere::before,
  .recit-layout.recit-v2-e069-scope .recit-v2-e069-lecture-active::after,
  .recit-layout.recit-v2-e069-scope .recit-v2-e069-filtre[aria-pressed="true"]::after,
  .recit-layout.recit-v2-e069-scope .recit-trace.recit-v2-e069-trace summary::after{background:CanvasText;color:CanvasText}
}
`;

/* Mémoire inter-rendus : la coque reconstruisant le DOM à chaque `set`, ce
   module survit, comme `c3aLocal` dans recit.js. Elle sert uniquement à
   décider si un geste doit être rejoué et à déterminer le sens de parcours. */
let dernierIndex = null;
let dernierRemplissage = null;
let derniereConf = null;

function q(racine, sélecteur) {
  try { return racine && typeof racine.querySelector === 'function' ? racine.querySelector(sélecteur) : null; }
  catch { return null; }
}

function qa(racine, sélecteur) {
  try { return racine && typeof racine.querySelectorAll === 'function' ? Array.from(racine.querySelectorAll(sélecteur)) : []; }
  catch { return []; }
}

function ajouteClasse(noeud, nom) {
  try { if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom); }
  catch { /* garde */ }
}

function cree(fabrique, balise, classe, texte) {
  let noeud = null;
  try { if (typeof fabrique === 'function') noeud = fabrique(balise, classe, texte); }
  catch { /* repli sur le DOM natif */ }
  if (noeud) return noeud;
  try {
    noeud = document.createElement(balise);
    if (classe) noeud.className = classe;
    if (texte !== undefined) noeud.textContent = texte;
    return noeud;
  } catch { return null; }
}

/* Un seul nœud par id maison : les doublons laissés par une reconstruction
   interrompue sont retirés, jamais un nœud étranger. */
function nodeUnique(id, balise, classe, parent, fabrique, ancre) {
  if (!parent || typeof parent.appendChild !== 'function') return null;
  let trouves = [];
  try { trouves = Array.from(document.querySelectorAll(`[id="${id}"]`)); }
  catch { return null; }
  for (let i = 1; i < trouves.length; i += 1) {
    try { if (trouves[i].parentNode) trouves[i].parentNode.removeChild(trouves[i]); }
    catch { /* garde */ }
  }
  let noeud = trouves[0] || null;
  if (noeud && noeud.parentNode !== parent) {
    try { noeud.parentNode.removeChild(noeud); } catch { /* garde */ }
    noeud = null;
  }
  if (!noeud) {
    noeud = cree(fabrique, balise, classe);
    if (!noeud) return null;
    try { noeud.id = id; } catch { return null; }
    try {
      if (ancre && ancre.parentNode === parent) parent.insertBefore(noeud, ancre.nextSibling);
      else parent.appendChild(noeud);
    } catch { return null; }
  }
  return noeud;
}

/* « Étape i / n · kind » est écrit par recit.js:278 : source dérivée, jamais
   une grandeur inventée. */
function lireEtapes(kicker) {
  const texte = kicker ? String(kicker.textContent || '') : '';
  const trouvé = /Étape\s+(\d+)\s*\/\s*(\d+)/i.exec(texte);
  if (trouvé) {
    const i = Number(trouvé[1]);
    const n = Number(trouvé[2]);
    return { i: Number.isFinite(i) ? i : 0, n: Number.isFinite(n) ? n : 0 };
  }
  return { i: 0, n: 0 };
}

register('E069', (contexte) => {
  try {
    const ctx = contexte || {};
    const { layout, css, el, reducedMotion } = ctx;
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    if (typeof css === 'function') css('recit-v2-e069', CSS);

    let reduce = false;
    try { reduce = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduce = false; }

    /* Portée unique : toutes les règles sont sous .recit-layout.recit-v2-e069-scope. */
    ajouteClasse(layout, 'recit-v2-e069-scope');
    try { layout.dataset.v2E069Motion = reduce ? 'reduce' : 'full'; } catch { /* garde */ }

    const corps = q(layout, '.recit-body');
    if (!corps) return;

    const kicker = q(corps, '.view-kicker');
    const étapes = lireEtapes(kicker);
    const i = étapes.i;
    const n = étapes.n;

    /* Le sens est déduit de l'étape courante comparée au rendu précédent. */
    let sens = 'avant';
    if (dernierIndex !== null && i > 0) {
      if (i > dernierIndex) sens = 'avant';
      else if (i < dernierIndex) sens = 'arrière';
      else sens = 'stable';
    }
    const dir = sens === 'arrière' ? '-1' : '1';
    try {
      layout.style.setProperty('--v2-e069-dir', dir);
      layout.dataset.v2E069Sens = sens;
      layout.dataset.v2E069Etape = String(i);
      layout.dataset.v2E069Total = String(n);
    } catch { /* garde */ }
    if (i > 0) dernierIndex = i;

    /* 01 — remplissage : la largeur est celle posée par recit.js:275. */
    const remplissage = q(corps, '.recit-progress > span');
    if (remplissage) {
      ajouteClasse(remplissage, 'recit-v2-e069-fill');
      const largeur = remplissage.style && remplissage.style.width ? String(remplissage.style.width) : '';
      if (largeur && largeur !== dernierRemplissage) {
        remplissage.classList.remove('recit-v2-e069-fill-pulse');
        void remplissage.offsetWidth;
        remplissage.classList.add('recit-v2-e069-fill-pulse');
      }
      dernierRemplissage = largeur;
      try { layout.dataset.v2E069Remplissage = largeur.replace('%', ''); } catch { /* garde */ }
    }

    /* 02 — entrée directionnelle du titre, sans toucher à son texte ni à ses attributs. */
    const titre = q(corps, '#recit-point-title') || q(corps, '.recit-title');
    if (titre) ajouteClasse(titre, 'recit-v2-e069-titre-dir');

    /* 03 — cascade des commandes, indexée sur leur position réelle dans .recit-actions. */
    const actions = qa(corps, '.recit-actions button');
    actions.forEach((bouton, index) => {
      try { bouton.style.setProperty('--v2-e069-i', String(Math.min(index, 8))); }
      catch { /* garde */ }
      ajouteClasse(bouton, 'recit-v2-e069-action');
    });

    /* 04 — glissement de la pastille seulement quand son libellé change. */
    const conf = q(corps, '.recit-conf');
    if (conf) {
      const texteConf = String(conf.textContent || '');
      try { conf.style.setProperty('--v2-e069-conf-dir', dir); } catch { /* garde */ }
      if (derniereConf === null || texteConf !== derniereConf) {
        conf.classList.remove('recit-v2-e069-conf-glisse');
        void conf.offsetWidth;
        conf.classList.add('recit-v2-e069-conf-glisse');
      }
      derniereConf = texteConf;
    }

    /* 05 — liseré vertical sur l'item courant du fil (is-current / aria-current). */
    qa(corps, '.recit-thread-item.is-current, .recit-thread-item[aria-current="step"]')
      .forEach((item) => ajouteClasse(item, 'recit-v2-e069-lisere'));

    /* 06 — la barre de lecture découle de l'aria-pressed réel du bouton. */
    const lecture = q(corps, '.recit-play') || q(corps, '.recit-actions button[aria-keyshortcuts="Space"]');
    if (lecture) {
      ajouteClasse(lecture, 'recit-v2-e069-lecture');
      let actif = false;
      try { actif = lecture.getAttribute && lecture.getAttribute('aria-pressed') === 'true'; }
      catch { actif = false; }
      if (actif) ajouteClasse(lecture, 'recit-v2-e069-lecture-active');
    }

    /* 07 — révélation décalée des groupes de filtres (Type, Certitude). */
    qa(corps, '.c3a-group').forEach((groupe, index) => {
      try { groupe.style.setProperty('--v2-e069-g', String(Math.min(index, 6))); }
      catch { /* garde */ }
      ajouteClasse(groupe, 'recit-v2-e069-groupe');
    });

    /* 08 — soulignage des filtres actifs ; l'attribut aria-pressed est lu en CSS. */
    qa(corps, '.c3a-filter').forEach((filtre) => ajouteClasse(filtre, 'recit-v2-e069-filtre'));

    /* 09 — chevron et entrée du contenu de la traçabilité ; [open] est natif. */
    const trace = q(corps, '.recit-trace');
    if (trace) ajouteClasse(trace, 'recit-v2-e069-trace');

    /* 10 — témoin visible et attributs d'audit, tous dérivés du DOM rendu. */
    const légende = q(corps, '.recit-legend') || corps;
    const note = nodeUnique('v2-e069-note', 'p', 'recit-v2-e069-note', légende, el);
    if (note) {
      const filtres = qa(corps, '.c3a-filter').length;
      const régime = reduce ? 'mouvement réduit (réglage système)' : 'mouvement animé (réglage système)';
      note.textContent = `Mouvement V2 : sens ${sens} · étape ${i > 0 ? i : '—'}/${n > 0 ? n : '—'}`
        + ` · ${actions.length} commande(s) · ${filtres} filtre(s) · ${régime} · 10 chantiers.`;
    }

    let unique = true;
    try { unique = document.querySelectorAll('[id="v2-e069-note"]').length <= 1; }
    catch { unique = true; }
    try {
      layout.dataset.v2E069Chantiers = '10';
      layout.dataset.v2E069Unique = unique ? '1' : '0';
    } catch { /* garde */ }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
