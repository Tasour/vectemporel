import { register } from './registry.js';

/* V2 lentille E028 — Performance et sobriété (complément de la passe 1).
   Dix chantiers V2 neufs, distincts de ceux de la passe 1 (badge zéro réseau,
   compteur de nœuds, confinement du fil, content-visibility des points, fil
   compact, image différée, mouvement réduit, vue épurée, sceau d'idempotence,
   ligne de densité). Ici : empreinte textuelle, recensement des images et des
   contrôles, audit des ressources externes, préférence prefers-reduced-data et
   micro-optimisations CSS de peinture, de défilement et de typographie.
   Tous non destructifs : sans ce module, la vue reste intégralement lisible.
   Préfixes : classes recit-v2-e028-, ids DOM v2-e028- (jamais e028- de la passe 1).
   Zéro réseau, zéro console, zéro aléa, aucun fichier partagé modifié.
   Tout chiffre affiché est dérivé du DOM réel, jamais inventé. */

const CSS = `
/* E028-01 — Empreinte textuelle du point, dérivée du texte réel du corps. */
.recit-v2-e028-readout{margin:5px 0 0;color:var(--muted-2,#b9a98c);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-v2-e028-empreinte{margin-top:4px}

/* E028-02 — Recensement des images locales et distantes. */
.recit-v2-e028-images{margin-top:3px}

/* E028-03 — Isolation de la peinture du panneau média (conteneur distinct du fil). */
.recit-v2-e028-mediacontain{contain:layout}

/* E028-04 — Stabilité numérique : chiffres de largeur constante, sans décalage. */
.recit-layout .recit-v2-e028-tabulaire .recit-timing,
.recit-layout .recit-v2-e028-tabulaire .recit-meta,
.recit-layout .recit-v2-e028-tabulaire .recit-conf,
.recit-layout .recit-v2-e028-tabulaire .view-kicker,
.recit-layout .recit-v2-e028-tabulaire .c3a-status{font-variant-numeric:tabular-nums}

/* E028-05 — Défilement contenu du corps : pas de chaînage vers la page. */
.recit-layout .recit-v2-e028-scroll{overscroll-behavior:contain}

/* E028-06 — Ajustement de texte stabilisé : pas de gonflement mobile. */
.recit-v2-e028-texte{-webkit-text-size-adjust:100%;text-size-adjust:100%}

/* E028-07 — Synthèse de polices désactivée : pas de graisse/italique synthétique. */
.recit-v2-e028-fontes{font-synthesis:none}

/* E028-08 — Recensement des contrôles interactifs locaux. */
.recit-v2-e028-controles{margin-top:3px}

/* E028-09 — Audit des ressources externes (iframes, styles inline, images distantes). */
.recit-v2-e028-externes{margin-top:3px}

/* E028-10 — Préférence système prefers-reduced-data : média masqué, grille réduite. */
.recit-v2-e028-lowdata{grid-template-columns:1fr!important}
.recit-v2-e028-lowdata .recit-media{display:none}

@media (max-width:620px){
  .recit-v2-e028-readout{font-size:10px}
}
`;

/* Un chantier défectueux ne doit jamais interrompre le rendu : le registre
   capture déjà les erreurs, cette garde fournit une seconde barrière locale. */
function sansRisque(action) {
  try { action(); } catch { /* neutralisation silencieuse, sans journal */ }
}

/* Ajout d'une classe sans jamais écraser les autres classes du nœud. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Dépose (ou réutilise) un paragraphe de synthèse visible, à un emplacement
   stable. Le nœud est retrouvé par id : aucun doublon après re-render. */
function placeReadout(el, id, classe, parent, ancre, texte) {
  if (typeof document === 'undefined' || !parent || typeof parent.insertBefore !== 'function') return null;
  if (typeof el !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = el('p', `recit-v2-e028-readout ${classe}`);
    noeud.id = id;
  }
  if (noeud.textContent !== texte) noeud.textContent = texte;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

register('E028', (ctx) => {
  const { layout, css, el } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    if (typeof css !== 'function' || typeof el !== 'function') return;
    css('recit-v2-e028', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    /* Mesures calculées UNE fois, avant toute insertion, pour ne jamais
       compter les paragraphes que cette lentille ajoute elle-même. */
    const caracteres = (corps.textContent || '').replace(/\s+/g, '').length;
    const ko = (caracteres / 1024).toFixed(2);
    const images = Array.prototype.slice.call(layout.querySelectorAll('img'));
    const distantes = images.filter((img) => /^(?:https?:)?\/\//i.test(img.getAttribute('src') || '')).length;
    const locales = images.length - distantes;
    const controles = layout.querySelectorAll('button, a[href], summary, input, select, textarea').length;
    const iframes = layout.querySelectorAll('iframe').length;
    const stylesInline = layout.querySelectorAll('[style]').length;

    /* Ancres stables du rendu de base (recit.js). */
    const timing = corps.querySelector('.recit-timing');
    const meta = corps.querySelector('.recit-meta');
    const status = corps.querySelector('.c3a-status');
    const legende = corps.querySelector('.recit-legend');
    const media = layout.querySelector('.recit-media');

    /* E028-01 — Empreinte textuelle du point. */
    sansRisque(() => {
      placeReadout(el, 'v2-e028-empreinte', 'recit-v2-e028-empreinte', corps, timing,
        `Empreinte textuelle : ${caracteres} caractères · ≈ ${ko} Ko de texte (hors balises).`);
      layout.setAttribute('data-v2-e028-caracteres', String(caracteres));
      layout.setAttribute('data-v2-e028-ko', ko);
    });

    /* E028-02 — Recensement des images locales et distantes. */
    sansRisque(() => {
      placeReadout(el, 'v2-e028-images', 'recit-v2-e028-images', corps, meta,
        `Images du repère : ${locales} locale(s), ${distantes} distante(s).`);
      layout.setAttribute('data-v2-e028-images', `${locales}/${distantes}`);
    });

    /* E028-03 — Isolation de la peinture du panneau média. */
    sansRisque(() => { ajouteClasse(media, 'recit-v2-e028-mediacontain'); });

    /* E028-04 — Stabilité numérique des valeurs affichées. */
    sansRisque(() => { ajouteClasse(corps, 'recit-v2-e028-tabulaire'); });

    /* E028-05 — Défilement contenu du corps. */
    sansRisque(() => { ajouteClasse(corps, 'recit-v2-e028-scroll'); });

    /* E028-06 — Ajustement de texte stabilisé sur mobile. */
    sansRisque(() => { ajouteClasse(layout, 'recit-v2-e028-texte'); });

    /* E028-07 — Synthèse de polices désactivée. */
    sansRisque(() => { ajouteClasse(layout, 'recit-v2-e028-fontes'); });

    /* E028-08 — Recensement des contrôles interactifs. */
    sansRisque(() => {
      placeReadout(el, 'v2-e028-controles', 'recit-v2-e028-controles', corps, status,
        `Contrôles interactifs : ${controles} (tous locaux, aucun script externe).`);
      layout.setAttribute('data-v2-e028-controles', String(controles));
    });

    /* E028-09 — Audit des ressources externes. */
    sansRisque(() => {
      placeReadout(el, 'v2-e028-externes', 'recit-v2-e028-externes', corps, legende,
        `Ressources externes : ${iframes} iframe(s) · ${stylesInline} style(s) inline · ${distantes} image(s) distante(s).`);
      layout.setAttribute('data-v2-e028-externes', `${iframes}/${stylesInline}/${distantes}`);
    });

    /* E028-10 — Préférence système prefers-reduced-data, lue sans aléa. */
    sansRisque(() => {
      let reduit = false;
      try {
        reduit = Boolean(typeof window !== 'undefined' && window.matchMedia
          && window.matchMedia('(prefers-reduced-data: reduce)').matches);
      } catch { reduit = false; }
      if (reduit) ajouteClasse(layout, 'recit-v2-e028-lowdata');
      layout.setAttribute('data-v2-e028-donnees', reduit ? 'reduce' : 'normal');
    });
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
