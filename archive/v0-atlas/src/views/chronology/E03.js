import { register } from './registry.js';

/* Lentille E03 — Impression / export papier de la frise chronologique.
 *
 * Dix chantiers E03-01..E03-10, tous implémentés ici. La vue de base
 * (chronology.js) est conçue pour un écran sombre : aucun bloc `@media print`
 * n'est prévu, si bien qu'une impression directe gaspille l'encre (fond
 * sombre), coupe les cartes en plein texte et imprime les contrôles comme du
 * contenu. E03 ajoute une feuille d'impression unique et deux nœuds dérivés du
 * DOM rendu : aucun fait, millésime, thème ni source n'est inventé.
 *
 * Contrat : register('E03', …) unique, CSS injecté une fois via
 * ctx.css('chronology-e03', …), identifiants uniques, gardes anti-doublon,
 * zéro réseau, zéro Math.random, zéro console.*, aucun fichier partagé modifié,
 * aucun sélecteur de test renommé (.event-card, #atlas-chrono-events, …).
 *
 * Lectures seules : src/views/chronology.js, src/views/chronology/registry.js,
 * src/views/chronology/index.js, src/views/_diagnostics.js, styles.css,
 * UNIFIED_AUDIT/views/atlas-chronologie.md.
 */

const CSS_ID = 'chronology-e03';
const BTN_ID = 'chrono-frise-print-btn';
const HEAD_ID = 'chrono-frise-print-head';
const SCOPE = '[data-e03="on"]';

/* Toutes les règles sont cadrées par .chronology-layout[data-e03="on"], posé
   par le greffon : aucune fuite hors de la vue chronologie. Le seul `@page` est
   global par définition (la spécification ne permet pas de le porter sur un
   élément) et se limite aux marges, sans forcer le format de papier choisi par
   l'utilisateur. */
const CSS = `
/* E03-01 — état hors impression : les deux nœuds ajoutés restent invisibles. */
.chronology-layout${SCOPE} #${HEAD_ID}{display:none}
.chronology-layout${SCOPE} .chrono-frise-print-btn{
  min-height:36px;margin-left:4px;padding:5px 12px;border:1px solid var(--line);
  border-radius:999px;background:transparent;color:var(--muted);
  font:inherit;font-size:10px;cursor:pointer;
  transition:border-color .18s linear,color .18s linear;
}
.chronology-layout${SCOPE} .chrono-frise-print-btn:hover{border-color:var(--gold);color:var(--gold-bright)}
.chronology-layout${SCOPE} .chrono-frise-print-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
@media (prefers-reduced-motion:reduce){
  .chronology-layout${SCOPE} .chrono-frise-print-btn{transition:none}
}

/* E03-10 — marges de pagination. Aucune taille de feuille imposée : le réglage
   de l'imprimante reste souverain. */
@page{margin:14mm 12mm 16mm}

@media print{
  /* E03-01 — papier blanc, texte noir, aucune ombre ni transition. */
  .chronology-layout${SCOPE},
  .chronology-layout${SCOPE} *,
  .chronology-layout${SCOPE} *::before,
  .chronology-layout${SCOPE} *::after{
    color:#000!important;
    background-color:transparent!important;
    box-shadow:none!important;
    text-shadow:none!important;
    transition:none!important;
    animation:none!important;
  }
  .chronology-layout${SCOPE}{font-size:10pt}
  .chronology-layout${SCOPE} .chronology-main,
  .chronology-layout${SCOPE} .chronology-aside{scroll-behavior:auto!important}

  /* E03-09 — en-tête imprimé, dérivé du h1 et de la bande de statut. */
  .chronology-layout${SCOPE} #${HEAD_ID}{
    display:block!important;margin:0 0 6mm;padding:0 0 3mm;
    border-bottom:1px solid #000;
  }
  .chronology-layout${SCOPE} #${HEAD_ID} .e03-print-title{margin:0;font-size:14pt;font-weight:600}
  .chronology-layout${SCOPE} #${HEAD_ID} .e03-print-context{margin:2mm 0 0;font-size:8pt;line-height:1.4}

  /* E03-02 — les contrôles ne sont pas du contenu : ils sortent du papier. */
  .chronology-layout${SCOPE} #atlas-chrono-tools,
  .chronology-layout${SCOPE} .nav-c2-orientation,
  .chronology-layout${SCOPE} .aside-actions,
  .chronology-layout${SCOPE} .chrono-frise-print-btn{display:none!important}

  /* E03-06 — une seule bande d'ère, celle marquée aria-current par la vue. */
  .chronology-layout${SCOPE} .e03-print-drop{display:none!important}
  .chronology-layout${SCOPE} .e03-print-keep .era-band{
    display:block;width:auto;min-height:0;gap:0;padding:0 0 3mm;border:0;
  }
  .chronology-layout${SCOPE} .e03-print-keep .atlas-chrono-era-range{font-size:8pt}

  /* E03-03 — une carte reste entière sur une même page. */
  .chronology-layout${SCOPE} #atlas-chrono-events > li[data-event-id],
  .chronology-layout${SCOPE} .event-card{break-inside:avoid;page-break-inside:avoid}

  /* E03-04 — point, en-tête et sources ne se séparent pas. */
  .chronology-layout${SCOPE} li.point{break-inside:avoid;page-break-inside:avoid}
  .chronology-layout${SCOPE} .point-head{break-after:avoid;page-break-after:avoid}
  .chronology-layout${SCOPE} .point-sources{break-before:avoid;page-break-before:avoid}

  /* E03-05 — pas de titre orphelin ni de veuve en fin de page. */
  .chronology-layout${SCOPE} h1,
  .chronology-layout${SCOPE} h2,
  .chronology-layout${SCOPE} h3{break-after:avoid;page-break-after:avoid}
  .chronology-layout${SCOPE} .view-lede,
  .chronology-layout${SCOPE} .atlas-chrono-status,
  .chronology-layout${SCOPE} .aside-summary,
  .chronology-layout${SCOPE} .point p{orphans:3;widows:3}

  /* E03-07 — images dans la colonne, crédits conservés en toutes lettres. */
  .chronology-layout${SCOPE} img{max-width:100%!important;height:auto!important;break-inside:avoid}
  .chronology-layout${SCOPE} .aside-credit{display:block!important;font-size:8pt!important}
  .chronology-layout${SCOPE} .atlas-chrono-tags .atlas-chrono-tag{
    border:0!important;padding:0 4px 0 0!important;font-size:8pt!important;
  }
}`;

register('E03', (ctx) => {
  const { layout, css, el } = ctx;
  if (!layout) return;

  /* E03-01 — ancrage de portée et feuille unique. */
  css(CSS_ID, CSS);
  layout.dataset.e03 = 'on';

  /* E03-08 — commande d'impression locale. Aucun écriture dans le store : le
     clic ne provoque donc pas de reconstruction du DOM et le focus reste sur
     le bouton. La garde par identifiant protège un second passage éventuel de
     runEnhancements sur le même rendu. */
  const tools = layout.querySelector('#atlas-chrono-tools');
  if (tools && !layout.querySelector(`#${BTN_ID}`)) {
    const btn = el('button', 'chrono-frise-print-btn', 'Imprimer cette frise');
    btn.type = 'button';
    btn.id = BTN_ID;
    btn.setAttribute('aria-controls', 'atlas-chrono-main');
    btn.addEventListener('click', () => {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
    });
    tools.appendChild(btn);
  }

  /* E03-06 — la coque ne marque qu'une bande avec aria-current="true" ; on
     traduit ce fait en deux classes d'impression, recalculées à chaque rendu.
     Aucune bande active (cas dégradé) ⇒ aucune bande conservée : la bande de
     statut de la vue porte déjà le contexte d'ère. */
  const bands = layout.querySelectorAll('#atlas-chrono-eras .atlas-chrono-era-list > li');
  bands.forEach((li) => {
    const active = Boolean(li.querySelector('button[aria-current="true"]'));
    li.classList.toggle('e03-print-keep', active);
    li.classList.toggle('e03-print-drop', !active);
  });

  /* E03-09 — en-tête d'impression : uniquement des textes déjà présents dans
     le rendu (h1 et bande de statut), jamais une valeur fabriquée. */
  if (!layout.querySelector(`#${HEAD_ID}`)) {
    const head = el('div', 'chronology-e03-print-head');
    head.id = HEAD_ID;
    head.setAttribute('aria-hidden', 'true');
    const title = layout.querySelector('#atlas-chrono-title');
    const status = layout.querySelector('#atlas-chrono-status');
    head.appendChild(el('p', 'e03-print-title', title ? title.textContent : 'Chronologie'));
    head.appendChild(el('p', 'e03-print-context', status ? status.textContent : ''));
    const main = layout.querySelector('#atlas-chrono-main');
    if (main && main.firstChild) main.insertBefore(head, main.firstChild);
    else if (main) main.appendChild(head);
    else layout.appendChild(head);
  }
});
