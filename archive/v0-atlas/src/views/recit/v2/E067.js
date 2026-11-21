import { register } from './registry.js';

/* V2 lentille E067 — Contraste et perception (complément de la passe 1).
   Dix chantiers V2 neufs, distincts de ceux de la passe 1 (contraste du texte
   courant, pastille de certitude, fil, focus, barre graduée, bascule, légende,
   chiffres tabulaires, absence de source, préférences système). Ici : perception
   des états d'interface (désactivé, actif, vide, recherche), du texte superposé
   au média et des repères chiffrés dérivés du DOM réel. Tous non destructifs :
   sans ce module, la vue reste intégralement lisible. Préfixes : classes
   recit-v2-e067-, ids DOM v2-e067- (jamais e067- de la passe 1, qui tourne sur
   le même DOM). Zéro réseau, zéro console, zéro aléa, aucun fichier partagé. */

const CSS = `
/* E067 — socle : jetons de perception réutilisables par tous les chantiers. */
.recit-v2-e067-root{
  --v2-e067-encre:#f2ede3;
  --v2-e067-encre-douce:#d7d1c6;
  --v2-e067-or:#f4d69e;
  --v2-e067-ligne:rgba(255,255,255,.34);
  --v2-e067-fond:rgba(6,9,13,.86);
}

/* E067-01 — contraste des textes superposés au média. */
.recit-v2-e067-root .recit-v2-e067-media .media-caption,
.recit-v2-e067-root .recit-v2-e067-media .recit-media-credit{
  color:#ffffff;background:var(--v2-e067-fond);
  padding:3px 7px;border-radius:6px;text-shadow:0 1px 3px rgba(0,0,0,.9)
}
.recit-v2-e067-root .recit-v2-e067-media .recit-media-credit{border:1px solid var(--v2-e067-ligne)}
.recit-v2-e067-root .recit-v2-e067-media .media-empty{color:var(--v2-e067-encre-douce)}

/* E067-02 — état désactivé : forme + symbole, pas l'opacité seule. */
.recit-v2-e067-root .recit-v2-e067-deactive button[disabled],
.recit-v2-e067-root .recit-v2-e067-deactive .recit-thread-item[disabled]{
  opacity:.5;border-style:dashed;border-color:var(--v2-e067-ligne)
}
.recit-v2-e067-root .recit-v2-e067-deactive button[disabled]::before{content:"⊘";margin-right:4px;color:var(--v2-e067-or)}

/* E067-03 — focus renforcé des outils de recherche et de filtrage. */
.recit-v2-e067-root .recit-v2-e067-outils .c3a-search:focus-visible,
.recit-v2-e067-root .recit-v2-e067-outils .c3a-filter:focus-visible,
.recit-v2-e067-root .recit-v2-e067-outils .c3a-reset:focus-visible{
  outline:3px solid var(--v2-e067-or);outline-offset:2px;
  box-shadow:0 0 0 5px rgba(244,214,158,.2)
}

/* E067-04 — filtre actif : repère de forme et de graisse, au-delà de la couleur. */
.recit-v2-e067-root .recit-v2-e067-filtres .c3a-filter[aria-pressed="true"]{
  box-shadow:inset 0 -3px 0 var(--v2-e067-or);
  font-weight:700;color:var(--v2-e067-encre)
}

/* E067-05 — champ de recherche : bord et texte contrastés. */
.recit-v2-e067-root .recit-v2-e067-champ{
  color:var(--v2-e067-encre);border-color:var(--v2-e067-ligne);
  background:rgba(6,9,13,.55)
}
.recit-v2-e067-root .recit-v2-e067-champ::placeholder{color:var(--v2-e067-encre-douce);opacity:.9}

/* E067-06 — état vide : statut signalé par la forme et un pictogramme. */
.recit-v2-e067-root .recit-v2-e067-vide{color:var(--v2-e067-encre);border-left:3px solid var(--v2-e067-or)}
.recit-v2-e067-root .recit-v2-e067-vide p::before{content:"ⓘ";margin-right:7px;color:var(--v2-e067-or)}

/* E067-07 — glose de certitude rendue visible dans un nœud de synthèse. */
.recit-v2-e067-readout{margin:4px 0;color:var(--v2-e067-encre-douce);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-v2-e067-root .recit-v2-e067-gloss{padding-left:9px;border-left:2px solid var(--v2-e067-or)}

/* E067-08 — compteur de références de traçabilité, lisible hors du panneau replié. */
.recit-v2-e067-root .recit-v2-e067-refs{padding-left:9px;border-left:2px solid var(--v2-e067-ligne)}

/* E067-09 — progression segmentée en autant de repères qu'il y a d'étapes. */
.recit-v2-e067-root .recit-v2-e067-seg.recit-progress{position:relative}
.recit-v2-e067-root .recit-v2-e067-seg.recit-progress::after{
  content:"";position:absolute;inset:0;pointer-events:none;
  background-image:repeating-linear-gradient(90deg,
    transparent 0,
    transparent calc(100% / var(--v2-e067-steps, 1) - 1px),
    rgba(6,9,13,.85) calc(100% / var(--v2-e067-steps, 1) - 1px),
    rgba(6,9,13,.85) calc(100% / var(--v2-e067-steps, 1)))
}

/* E067-10 — fonds translucides : preference systeme lue une fois par rendu. */
.recit-v2-e067-root[data-v2-e067-transparency="reduce"] .c3a-search,
.recit-v2-e067-root[data-v2-e067-transparency="reduce"] .recit-v2-e067-media .media-caption,
.recit-v2-e067-root[data-v2-e067-transparency="reduce"] .recit-v2-e067-media .recit-media-credit{background:#070a0e}
@media (prefers-reduced-transparency:reduce){
  .recit-v2-e067-root{--v2-e067-fond:#070a0e;--v2-e067-ligne:rgba(255,255,255,.7)}
  .recit-v2-e067-root .c3a-search{background:#070a0e}
}
`;

/* Ajoute une classe sans jamais écraser les autres classes du nœud. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Dépose (ou réutilise) un paragraphe de synthèse visible, à un emplacement stable. */
function placeTexte(id, classe, parent, ancre, texte) {
  if (!parent || typeof parent.insertBefore !== 'function' || !texte) return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = document.createElement('p');
    noeud.className = `recit-v2-e067-readout ${classe}`;
    noeud.id = id;
  }
  noeud.textContent = texte;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

register('E067', (ctx) => {
  const { layout, css } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e067', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    /* Socle (jetons partagés, distincts des jetons recit-e067- de la passe 1). */
    ajouteClasse(layout, 'recit-v2-e067-root');

    /* E067-01 — contraste des légendes et crédits superposés au média. */
    ajouteClasse(layout.querySelector('.recit-media'), 'recit-v2-e067-media');

    /* E067-02 — état désactivé perceptible des commandes. */
    ajouteClasse(corps.querySelector('.recit-actions'), 'recit-v2-e067-deactive');

    /* E067-03 — focus des outils (la règle cible les contrôles existants). */
    ajouteClasse(corps.querySelector('.c3a-tools'), 'recit-v2-e067-outils');

    /* E067-04 — repère de forme des filtres actifs. */
    ajouteClasse(corps.querySelector('.c3a-tools'), 'recit-v2-e067-filtres');

    /* E067-05 — champ de recherche contrasté. */
    ajouteClasse(corps.querySelector('.c3a-search'), 'recit-v2-e067-champ');

    /* E067-06 — état vide : le conteneur n'existe que si des filtres excluent tout. */
    ajouteClasse(corps.querySelector('.c3a-empty'), 'recit-v2-e067-vide');

    /* E067-07 — glose de certitude lue sur le title réel de .recit-conf. */
    const conf = corps.querySelector('.recit-conf');
    const meta = corps.querySelector('.recit-meta');
    const glose = conf && typeof conf.getAttribute === 'function' ? conf.getAttribute('title') : '';
    if (glose && meta) {
      placeTexte('v2-e067-gloss', 'recit-v2-e067-gloss', corps, meta,
        `Certitude : ${glose}.`);
    }

    /* E067-08 — compte de références lu dans le texte réel de la traçabilité. */
    const trace = corps.querySelector('.recit-trace');
    const summary = trace ? trace.querySelector('summary') : null;
    const texteSummary = summary && summary.textContent ? summary.textContent : '';
    const ref = texteSummary.match(/(\d+)\s*référence/);
    if (ref) {
      const nombre = parseInt(ref[1], 10);
      const ancre = trace && trace.parentNode === corps ? trace : meta;
      placeTexte('v2-e067-refs', 'recit-v2-e067-refs', corps, ancre,
        `Traçabilité : ${nombre} référence${nombre > 1 ? 's' : ''} locale${nombre > 1 ? 's' : ''} dans le registre.`);
    }

    /* E067-09 — segmentation de la barre d'après « Étape X / Y » du kicker. */
    const kicker = corps.querySelector('.view-kicker');
    const progression = corps.querySelector('.recit-progress');
    if (kicker && progression) {
      const etape = (kicker.textContent || '').match(/Étape\s+\d+\s*\/\s*(\d+)/i);
      if (etape) {
        const total = parseInt(etape[1], 10);
        if (Number.isFinite(total) && total > 0) {
          ajouteClasse(progression, 'recit-v2-e067-seg');
          if (progression.style && typeof progression.style.setProperty === 'function') {
            progression.style.setProperty('--v2-e067-steps', String(total));
          }
        }
      }
    }

    /* E067-10 — préférence de transparence réduite, lue une seule fois par rendu. */
    let transparenceReduite = false;
    try {
      transparenceReduite = typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
    } catch {
      /* Préférence non reconnue : valeur par défaut conservée. */
    }
    layout.setAttribute('data-v2-e067-transparency', transparenceReduite ? 'reduce' : 'normal');
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
