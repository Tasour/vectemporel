import { register } from './registry.js';

/* Lentille E066 — Mobile et reflow responsive (vue Récit).
   Dix chantiers indépendants, tous non destructifs : sans ce module, la vue
   reste intégralement lisible. Un seul register, un seul bloc CSS préfixé
   recit-e066-, une seule ancre DOM (e066-compact-btn), zéro réseau, zéro
   journalisation, zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* E066 — socle : la classe est posée sur .recit-layout, le corps et la barre
   d'outils reçoivent leurs propres marqueurs. Aucune règle n'est globale. */
.recit-e066-root{--e066-gouttiere:16px}

/* E066-01 — Reflow anticipé : une colonne dès 1180px, média en bandeau haut.
   Évite l'écrasement de la colonne de lecture sur les petits portables et les
   tablettes en paysage, avant même le seuil d'origine de 1000px. */
@media (max-width:1180px){
  .recit-layout.recit-e066-root{
    grid-template-columns:minmax(0,1fr);
    grid-template-rows:minmax(96px,22%) minmax(0,1fr)
  }
}

/* E066-02 — Média : unités dvh avec repli vh et plafond, pour que le bandeau
   ne saute pas lors de l'ouverture/fermeture de la barre d'adresse mobile. */
.recit-e066-root .recit-media{max-height:20vh;max-height:20dvh}
@media (max-width:620px){
  .recit-e066-root .recit-media{
    min-height:min(96px,18vh);min-height:min(96px,18dvh);
    max-height:min(180px,22vh);max-height:min(180px,22dvh)
  }
}

/* E066-03 — Cibles tactiles >= 44px sur pointeur grossier, pour les actions,
   le fil, le résumé de traçabilité et les filtres. */
@media (pointer:coarse){
  .recit-e066-root .recit-actions button,
  .recit-e066-root .recit-thread-item,
  .recit-e066-root .recit-trace summary,
  .recit-e066-root .c3a-filter{min-height:44px}
  .recit-e066-root .recit-actions{gap:10px}
  .recit-e066-root .recit-thread-item{padding:8px 10px}
}

/* E066-04 — Barre d'outils recherche / filtres empilée sur tablette et mobile :
   champ pleine largeur, groupes alignés, plus de puces coupées au milieu. */
@media (max-width:900px){
  .recit-e066-root .c3a-tools{flex-direction:column;align-items:stretch;gap:6px}
  .recit-e066-root .c3a-search{width:100%;min-width:0;flex:1 1 auto}
  .recit-e066-root .c3a-group{width:100%}
}

/* E066-05 — Fil vertical pleine largeur sur téléphone : un point par ligne,
   retour à la ligne des mots longs, aucune coupure horizontale. */
@media (max-width:620px){
  .recit-e066-root .recit-thread-list{flex-direction:column;flex-wrap:nowrap;gap:6px}
  .recit-e066-root .recit-thread-item{
    width:100%;max-width:none;min-width:0;overflow-wrap:anywhere
  }
}

/* E066-06 — Zones de sécurité : le corps respecte les encoches et les barres
   système (safe-area-inset), sans réduire le texte sous 16px côté recherche. */
.recit-e066-safe{
  padding-left:max(clamp(24px,4vw,52px),env(safe-area-inset-left,0px));
  padding-right:max(clamp(24px,4vw,52px),env(safe-area-inset-right,0px))
}
@media (max-width:620px){
  .recit-e066-safe{
    padding-left:max(16px,env(safe-area-inset-left,0px));
    padding-right:max(16px,env(safe-area-inset-right,0px));
    padding-bottom:max(28px,env(safe-area-inset-bottom,0px))
  }
}

/* E066-07 — Paysage court : bandeau média réduit au minimum, corps prioritaire
   et défilement préservé même quand la hauteur visible est inférieure à 520px. */
@media (max-height:520px) and (orientation:landscape){
  .recit-layout.recit-e066-root{grid-template-rows:minmax(56px,16%) minmax(0,1fr)}
  .recit-e066-root .recit-media{min-height:56px;max-height:76px;max-height:14dvh}
}

/* E066-08 — Anti-zoom iOS : le champ reste à 16px sur mobile, ce qui empêche
   Safari de zoomer automatiquement au premier focus. */
@media (max-width:620px),(pointer:coarse){
  .recit-e066-root .c3a-search{font-size:16px}
}

/* E066-09 — Actions en grille fluide : les six boutons se répartissent en
   lignes régulières et ne débordent jamais, même sur 320px de large. */
.recit-e066-root .recit-actions{gap:8px}
.recit-e066-root .recit-actions button{flex:1 1 128px;min-width:0}
@media (max-width:620px){
  .recit-e066-root .recit-actions button{flex:1 1 45%;min-width:132px}
}

/* E066-10 — Bascule « vue compacte » (grille à une colonne et média réduit,
   disponible à toute largeur) et confort de mouvement réduit. */
.recit-layout.recit-e066-compact{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(72px,16%) minmax(0,1fr)}
.recit-e066-compact .recit-media{min-height:56px;max-height:88px}
.recit-e066-root .recit-e066-btn{
  min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.04);color:var(--ink-soft);font-size:10px;
  cursor:pointer;transition:border-color .18s linear,color .18s linear,background-color .18s linear
}
.recit-e066-root .recit-e066-btn[aria-pressed="true"]{
  border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.12)
}
.recit-e066-root .recit-e066-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-layout[data-e066-motion="reduce"] .recit-e066-btn{transition:none}
@media (prefers-reduced-motion:reduce){.recit-e066-btn{transition:none}}
`;

/* État de la bascule, mémorisé dans le module pour survivre aux reconstructions
   complètes du DOM opérées par la coque. */
let compactActif = false;

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function libelleCompact() {
  return compactActif ? 'Vue compacte : désactiver' : 'Vue compacte : activer';
}

function synchroniseBouton(bouton) {
  if (!bouton) return;
  const libelle = libelleCompact();
  bouton.textContent = libelle;
  bouton.setAttribute('aria-label', libelle);
  bouton.setAttribute('aria-pressed', compactActif ? 'true' : 'false');
}

register('E066', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-e066', CSS); /* un seul appel, toutes les règles du module. */

    /* Socle : marqueurs posés sans écraser les classes existantes. */
    ajouteClasse(layout, 'recit-e066-root');
    const corps = layout.querySelector('.recit-body');
    const actions = layout.querySelector('.recit-actions');
    ajouteClasse(corps, 'recit-e066-safe'); /* E066-06 */

    /* E066-10 — bascule « vue compacte ». */
    if (actions) {
      let bouton = document.getElementById('e066-compact-btn');
      if (!bouton || bouton.parentElement !== actions) {
        bouton = el('button', 'recit-e066-btn');
        bouton.id = 'e066-compact-btn';
        bouton.type = 'button';
        actions.appendChild(bouton);
      }
      synchroniseBouton(bouton);
      if (bouton.getAttribute('data-e066-bound') !== '1') {
        bouton.setAttribute('data-e066-bound', '1');
        bouton.addEventListener('click', () => {
          compactActif = !compactActif;
          const cadre = document.querySelector('.recit-layout');
          if (cadre) {
            if (compactActif) ajouteClasse(cadre, 'recit-e066-compact');
            else if (cadre.classList) cadre.classList.remove('recit-e066-compact');
          }
          synchroniseBouton(document.getElementById('e066-compact-btn'));
        });
      }
      if (compactActif) ajouteClasse(layout, 'recit-e066-compact');
    }

    /* Mouvement réduit : lu une seule fois par rendu, sans écraser d'attribut. */
    if (reducedMotion && typeof reducedMotion === 'function' && reducedMotion()) {
      if (!layout.hasAttribute('data-e066-motion')) layout.setAttribute('data-e066-motion', 'reduce');
    } else if (layout.setAttribute) {
      layout.setAttribute('data-e066-motion', 'normal');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
