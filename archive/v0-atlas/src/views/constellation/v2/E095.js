import { register } from './registry.js';

/* Lentille V2 E095 — adaptabilité responsive avancée du champ d'étoiles de la
   vue Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle d'animation
   propre. Préfixe exclusif : v2e095 (aucune collision avec la passe 1). */

/* Observateur unique conservé entre deux rendus du shell (le DOM est recréé à
   chaque changement d'état) : jamais deux surveillances actives à la fois. */
let v2e095Observateur = null;
let v2e095Cible = null;

/* Écrit un attribut seulement s'il diffère : évite de réécrire le DOM à chaque
   notification de l'observateur et toute boucle de redimensionnement. */
function v2e095Attribut(noeud, nom, valeur) {
  if (noeud && typeof noeud.getAttribute === 'function' && noeud.getAttribute(nom) !== valeur) {
    noeud.setAttribute(nom, valeur);
  }
}

/* Écrit une variable CSS seulement si sa valeur change (même motif). */
function v2e095Variable(noeud, nom, valeur) {
  if (!noeud || !noeud.style || typeof noeud.style.getPropertyValue !== 'function') return;
  if (noeud.style.getPropertyValue(nom) !== valeur) noeud.style.setProperty(nom, valeur);
}

/* Borne déterministe, sans aucune source aléatoire. */
function v2e095Borne(valeur, plancher, plafond) {
  return Math.round(Math.max(plancher, Math.min(plafond, valeur)));
}

register('E095', ctx => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function' || typeof ctx.layout.querySelector !== 'function') return;

  const layout = ctx.layout;
  const champ = layout.querySelector('.constellation-field');
  if (!champ || !champ.style || typeof champ.style.setProperty !== 'function') return;

  /* Feuille unique de la lentille, préfixée v2e095. Chaque état est porté par
     un attribut ou une classe en plus de la couleur, jamais par elle seule. */
  css('constellation-v2-e095', `
/* V2E095-01 — Palier vertical : densité d'espacement de l'en-tête. */
.v2e095-field{--v2e095-densite:1}
.v2e095-field[data-v2e095-vertical="bas"]{--v2e095-densite:.8}
.v2e095-field[data-v2e095-vertical="haut"]{--v2e095-densite:1.15}
.v2e095-tete{row-gap:calc(4px * var(--v2e095-densite,1))}

/* V2E095-02 — Rapport d'aspect : opacité du réseau selon la forme du champ. */
.v2e095-field[data-v2e095-rapport="portrait"] .constellation-edges line{opacity:.7}
.v2e095-field[data-v2e095-rapport="carré"] .constellation-edges line{opacity:.88}

/* V2E095-03 — Cible tactile des planètes élargie à 44 px sur palier étroit.
   Le pseudo-élément est transparent et ne modifie ni le libellé ni la couleur. */
.v2e095-field[data-v2e095-etroit="1"] .const-planet::before{
  content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;
  transform:translate(-50%,-50%);border-radius:50%;pointer-events:auto;
}

/* V2E095-04 — Vignette de bord, opacité calculée depuis la largeur réelle. */
.v2e095-field::before{
  content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;
  background:radial-gradient(ellipse at center,transparent 55%,rgba(4,6,11,.6) 100%);
  opacity:var(--v2e095-vignette,0);
}

/* V2E095-05 — Gouttières adaptatives de l'en-tête et du pied de légende. */
.v2e095-tete,.v2e095-caption{padding-inline:var(--v2e095-gouttiere,12px)}

/* V2E095-06 — Échelle de la police des étiquettes, bornée entre 9 et 11 px. */
.v2e095-field .const-sun::after{font-size:var(--v2e095-label,10px)}
.v2e095-field .const-moon::after{font-size:var(--v2e095-label,9px)}

/* V2E095-07 — Chemin différencié par un tiret sur palier étroit. */
.v2e095-field[data-v2e095-chemin="tirete"] .constellation-edges line.is-path{stroke-dasharray:4 3}

/* V2E095-08 — Grille de lecture optionnelle : repère visuel de 48 px, sans
   intercepter le pointeur, réservé au contrôle explicite de la lentille. */
.v2e095-field.v2e095-grille::after{
  content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;
  background-image:linear-gradient(to right,rgba(244,214,158,.14) 1px,transparent 1px),
                   linear-gradient(to bottom,rgba(244,214,158,.14) 1px,transparent 1px);
  background-size:48px 48px;opacity:.5;
}
.v2e095-grille-btn{
  min-height:36px;padding:0 12px;border:1px solid var(--line,rgba(255,255,255,.2));
  border-radius:8px;background:var(--surface-2,rgba(255,255,255,.04));
  color:var(--gold-bright,#f0cf8f);font-size:10px;cursor:pointer;
}
.v2e095-grille-btn:focus-visible{outline:2px solid var(--gold-bright,#f0cf8f);outline-offset:2px}

/* V2E095-09 — Lecteur de diagnostic chiffré, discret et indexable. */
.v2e095-diag{
  margin:0;color:var(--muted,#93a0b4);font-size:9px;font-variant-numeric:tabular-nums;
}

/* V2E095-10 — Mouvement réduit et ancrage du focus au défilement. */
.v2e095-calm *{transition:none!important}
.v2e095-field :focus-visible{scroll-margin:12px}
@media (prefers-reduced-motion:reduce){.v2e095-field *{transition:none!important}}
`);

  champ.classList.add('v2e095-field');

  /* Marquage de l'en-tête et du pied : la feuille y applique les gouttières et
     la densité verticale sans toucher au balisage produit par la vue. */
  const tete = layout.querySelector('.constellation-head');
  if (tete) tete.classList.add('v2e095-tete');
  const caption = layout.querySelector('.constellation-caption');
  if (caption) caption.classList.add('v2e095-caption');

  /* E095-09 — Lecteur de diagnostic : un seul par rendu, rôle et région live
     posés, avec un repli tolérant si ctx.el n'est pas fourni. */
  let diag = layout.querySelector('#v2e095-diag');
  if (!diag) {
    diag = typeof ctx.el === 'function'
      ? ctx.el('p', 'v2e095-diag', '')
      : document.createElement('p');
    diag.id = 'v2e095-diag';
    diag.setAttribute('role', 'status');
    diag.setAttribute('aria-live', 'polite');
    diag.setAttribute('aria-atomic', 'true');
    (caption || layout).appendChild(diag);
  }

  /* E095-08 — Bascule indépendante de la grille de lecture. aria-pressed est
     légitime ici : l'état ne dépend d'aucun autre choix du groupe. */
  if (!champ.id) champ.id = 'v2e095-champ';
  let grilleBtn = layout.querySelector('#v2e095-grille-btn');
  if (!grilleBtn) {
    grilleBtn = typeof ctx.el === 'function'
      ? ctx.el('button', 'v2e095-grille-btn', 'Afficher la grille de lecture')
      : document.createElement('button');
    grilleBtn.id = 'v2e095-grille-btn';
    grilleBtn.type = 'button';
    grilleBtn.setAttribute('aria-pressed', 'false');
    grilleBtn.setAttribute('aria-controls', champ.id);
    grilleBtn.addEventListener('click', () => {
      const actif = champ.classList.toggle('v2e095-grille');
      grilleBtn.setAttribute('aria-pressed', actif ? 'true' : 'false');
      grilleBtn.textContent = actif
        ? 'Masquer la grille de lecture'
        : 'Afficher la grille de lecture';
      if (diag) {
        diag.textContent = actif
          ? 'Grille de lecture affichée : repères de 48 pixels.'
          : 'Grille de lecture masquée.';
      }
    });
    (caption || layout).appendChild(grilleBtn);
  }

  /* Mesure unique, réutilisée par le rendu initial et l'observateur passif. */
  const mesurer = () => {
    const largeur = champ.clientWidth || layout.clientWidth ||
      (typeof window !== 'undefined' ? window.innerWidth : 0) || 1024;
    const hauteur = champ.clientHeight || layout.clientHeight ||
      (typeof window !== 'undefined' ? window.innerHeight : 0) || 720;

  /* E095-01 — Palier vertical : la hauteur réelle (avec repli sur le layout
       puis la fenêtre) fixe un profil écrit dans le DOM et consommé en CSS. */
    const vertical = hauteur < 420 ? 'bas' : (hauteur > 760 ? 'haut' : 'moyen');
    v2e095Attribut(champ, 'data-v2e095-vertical', vertical);

  /* E095-02 — Rapport d'aspect : largeur sur hauteur, classé en trois formes.
       Aucun seuil ne dépend d'une valeur aléatoire ou d'un rendu précédent. */
    const ratio = largeur / Math.max(1, hauteur);
    const rapport = ratio < 0.9 ? 'portrait' : (ratio > 1.35 ? 'paysage' : 'carré');
    v2e095Attribut(champ, 'data-v2e095-rapport', rapport);

  /* E095-03 — Palier étroit : marqueur binaire pilotant l'agrandissement de
       la cible tactile des planètes, distinct du réglage des lunes de la passe 1. */
    const etroit = largeur < 480;
    v2e095Attribut(champ, 'data-v2e095-etroit', etroit ? '1' : '0');

  /* E095-04 — Vignette : opacité croissante avec la largeur, bornée entre 0
       et 0,55, calculée une seule fois puis exposée en variable CSS. */
    const vignette = Math.min(0.55, Math.max(0, (largeur - 480) / 2200)).toFixed(2);
    v2e095Variable(champ, '--v2e095-vignette', vignette);

  /* E095-05 — Gouttières : 2 % de la largeur, bornées entre 10 et 28 px. */
    v2e095Variable(champ, '--v2e095-gouttiere', v2e095Borne(largeur * 0.02, 10, 28) + 'px');

  /* E095-06 — Étiquettes : échelle continue bornée entre 9 et 11 px. */
    v2e095Variable(champ, '--v2e095-label', v2e095Borne(largeur * 0.008, 9, 11) + 'px');

  /* E095-07 — Trait des chemins : tiret court uniquement sur palier étroit,
       afin de distinguer les liaisons des axes sans jouer sur la seule couleur. */
    v2e095Attribut(champ, 'data-v2e095-chemin', etroit ? 'tirete' : 'plein');

    /* E095-09 (suite) — Le même calcul alimente le témoin chiffré, annoncé
       poliment et mis à jour sans jamais générer d'aléa. */
    if (diag) {
      diag.textContent = 'Champ ' + Math.round(largeur) + ' × ' + Math.round(hauteur) +
        ' px · profil ' + vertical + ' · rapport ' + rapport + ' · vignette ' + vignette + '.';
    }
  };

  /* E095-10 — Mouvement réduit : l'état est lu une fois via l'API du contexte
     et porté par une classe propre à la V2, sans sonde ni écouteur système. */
  const calme = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  champ.classList.toggle('v2e095-calm', !!calme);
  v2e095Attribut(champ, 'data-v2e095-motion', calme ? '0' : '1');

  mesurer();

  /* Réactivité de l'E095-01 : un seul observateur passif, rebranché sur le
     champ courant. Aucun minuteur ni boucle d'animation propre ; repli
     silencieux si l'API est absente, la mesure initiale restant acquise. */
  if (v2e095Observateur && typeof v2e095Observateur.disconnect === 'function') {
    try { v2e095Observateur.disconnect(); } catch (erreur) { v2e095Observateur = null; }
  }
  if (typeof ResizeObserver === 'function') {
    try {
      if (!v2e095Observateur) v2e095Observateur = new ResizeObserver(() => mesurer());
      if (v2e095Cible && v2e095Cible !== champ && typeof v2e095Observateur.unobserve === 'function') {
        v2e095Observateur.unobserve(v2e095Cible);
      }
      v2e095Observateur.observe(champ);
      v2e095Cible = champ;
    } catch (erreur) {
      v2e095Observateur = null;
    }
  }
});
