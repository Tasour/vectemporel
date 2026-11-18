import { register } from './registry.js';

/* Lentille E069 — garde-fous appliqués aux métriques chiffrées de la vue
   Constellation. Dix chantiers locaux (E069-01 … E069-10) : bornage des
   pourcentages de position, réparation des compteurs de rang, dénominateurs
   sûrs, ratio du point actif, chiffres tabulaires, comptage des sources,
   plage de taille des nœuds, détection de débordement, annonce live et
   empreinte auditable. Tout est déterministe et local : aucun appel réseau,
   aucune source aléatoire, aucun minuteur ni boucle d'animation propre,
   aucun fichier partagé modifié. Le greffon reste tolérant et ne jette
   aucune exception, même sur un DOM partiel. */

const IDS = ['e069-live', 'e069-garde', 'e069-garde-titre', 'e069-garde-texte'];

/* Lecture tolérante : vide, chaîne non numérique, NaN ou infini donnent le repli. */
function nombre(valeur, repli) {
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : repli;
  if (valeur === null || valeur === undefined) return repli;
  const n = parseFloat(String(valeur));
  return Number.isFinite(n) ? n : repli;
}

/* Borne fermée [min, max] ; la valeur invalide est ramenée au minimum. */
function borner(valeur, min, max) {
  return Math.min(max, Math.max(min, nombre(valeur, min)));
}

/* Un seul nœud par identifiant, réutilisé si le greffon est rejoué sur le DOM. */
function un(ctx, id, balise, classe, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) noeud = ctx.el(balise, classe);
  const doublons = document.querySelectorAll(`[id="${id}"]`);
  for (let i = 1; i < doublons.length; i += 1) doublons[i].remove();
  noeud.id = id;
  if (classe) noeud.className = classe;
  if (noeud.parentElement !== parent) parent.appendChild(noeud);
  return noeud;
}

register('E069', ctx => {
  /* Garde d'entrée : sans contexte, sans layout ou sans document, rien n'est ajouté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.layout.querySelector !== 'function' || typeof ctx.css !== 'function') return;

  const layout = ctx.layout;
  const field = layout.querySelector('.constellation-field');
  const creer = (balise, classe, texte) => typeof ctx.el === 'function'
    ? ctx.el(balise, classe, texte) : document.createElement(balise);

  /* Feuille unique : chiffres tabulaires, débordement, badge de sources,
     panneau de garde-fous et repli mouvement réduit. */
  ctx.css('constellation-e069', `
.e069-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.e069-tab{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;min-width:3ch;text-align:right}
.constellation-state.e069-tab{min-width:0;text-align:left;overflow-wrap:anywhere}
.constellation-state[data-e069-overflow="1"]{overflow-wrap:anywhere;word-break:break-word}
.const-moon.e069-sources::before{position:absolute;top:-8px;right:-10px;min-width:12px;padding:0 2px;border-radius:6px;background:var(--surface-2);color:var(--violet);font-size:7px;line-height:12px;text-align:center;content:attr(data-e069-sources);pointer-events:none}
.e069-garde{margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:rgba(178,139,221,.04);color:var(--ink-soft);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.e069-garde-titre{margin:0 0 4px;color:var(--gold);font-family:var(--serif);font-size:11px;font-weight:600;letter-spacing:.04em}
.e069-garde-texte{margin:0}
.e069-garde.e069-calme,.e069-garde.e069-calme *{transition:none!important}
@media (prefers-reduced-motion:reduce){.e069-garde,.e069-garde *{transition:none!important}}
@media (max-width:620px){.e069-garde{padding:6px 8px;font-size:8px}}
`);

  const soleils = field ? Array.from(field.querySelectorAll('.const-sun')) : [];
  const planetes = field ? Array.from(field.querySelectorAll('.const-planet')) : [];
  const lunes = field ? Array.from(field.querySelectorAll('.const-moon')) : [];
  let bornes = 0;
  let reparations = 0;

  /* E069-01 — Bornage des positions : chaque pourcentage lu sur --x / --y est
     ramené dans la fenêtre de la vue (10–90 % en largeur, 12–88 % en hauteur).
     Une valeur absente ou non finie est remplacée par la borne basse et l'écart
     est consigné dans un attribut auditable. */
  const noeudsPosition = field
    ? Array.from(field.querySelectorAll('.const-sun, .const-planet, .const-moon')) : [];
  noeudsPosition.forEach((noeud) => {
    const brutX = nombre(noeud.style.getPropertyValue('--x'), NaN);
    const brutY = nombre(noeud.style.getPropertyValue('--y'), NaN);
    const x = borner(brutX, 10, 90);
    const y = borner(brutY, 12, 88);
    const hors = !Number.isFinite(brutX) || !Number.isFinite(brutY)
      || Math.abs(brutX - x) > 0.005 || Math.abs(brutY - y) > 0.005;
    if (hors) bornes += 1;
    noeud.style.setProperty('--x', `${x.toFixed(2)}%`);
    noeud.style.setProperty('--y', `${y.toFixed(2)}%`);
    noeud.dataset.e069X = x.toFixed(2);
    noeud.dataset.e069Y = y.toFixed(2);
    if (hors) noeud.dataset.e069Clamped = '1';
  });

  /* E069-02 — Compteurs de rang : le chiffre affiché sur un soleil ou une
     planète doit égaler sa position réelle dans la couche. Un écart est réparé
     en place et marqué ; le total est exposé sur chaque nœud et sur la couche. */
  [['.const-layer-suns', soleils], ['.const-layer-planets', planetes]].forEach(([selecteur, liste]) => {
    const couche = field ? field.querySelector(selecteur) : null;
    liste.forEach((noeud, index) => {
      const attendu = String(index + 1);
      const affiche = (noeud.textContent || '').trim();
      if (affiche !== attendu) {
        noeud.textContent = attendu;
        reparations += 1;
        noeud.dataset.e069Repaired = '1';
      }
      noeud.dataset.e069Rank = attendu;
      noeud.dataset.e069Total = String(liste.length);
    });
    if (couche) couche.dataset.e069Total = String(liste.length);
  });

  /* E069-03 — Dénominateurs sûrs : chaque grandeur expose un dénominateur
     au moins égal à un, sous forme de variable CSS et d'attribut, pour rendre
     impossible une division par zéro dans tout calcul aval. */
  const den = (n) => String(Math.max(1, n));
  layout.style.setProperty('--e069-den-eres', den(soleils.length));
  layout.style.setProperty('--e069-den-reperes', den(planetes.length));
  layout.style.setProperty('--e069-den-points', den(lunes.length));
  layout.dataset.e069Den = `${soleils.length}:${planetes.length}:${lunes.length}`;
  layout.dataset.e069DenSafe = '1';

  /* E069-04 — Ratio du point actif : le « X / Y » de la légende est relu,
     borné entre 0 et son propre dénominateur, puis réécrit. Un libellé « aucun »
     ou absent reçoit un ratio sûr 0 / 0 au lieu d'un vide ambigu. */
  let ratioTexte = '0 / 0';
  const etat = layout.querySelector('.constellation-state');
  if (etat) {
    const brut = etat.textContent || '';
    const trouve = brut.match(/Point\s*:\s*(\d+)\s*\/\s*(\d+)/);
    if (trouve) {
      const denominateur = Math.max(0, nombre(trouve[2], 0));
      const numerateur = borner(trouve[1], 0, denominateur);
      ratioTexte = `${numerateur} / ${denominateur}`;
      const nettoye = brut.replace(/Point\s*:\s*\d+\s*\/\s*\d+/, `Point : ${ratioTexte}`);
      if (nettoye !== brut) etat.textContent = nettoye;
    } else if (!/Point\s*:\s*aucun/i.test(brut)) {
      etat.textContent = `${brut}${brut ? ' · ' : ''}Point : 0 / 0`.trim();
    }
    etat.dataset.e069Ratio = ratioTexte;
    etat.dataset.e069RatioSafe = '1';
  }

  /* E069-05 — Chiffres tabulaires : une classe dédiée impose la même largeur
     à chaque chiffre sur les compteurs et la légende, pour qu'une mise à jour
     de 9 à 10 ne décale pas le texte voisin. */
  if (etat) etat.classList.add('e069-tab');
  soleils.concat(planetes).forEach((noeud) => noeud.classList.add('e069-tab'));
  layout.dataset.e069Tabular = '1';

  /* E069-06 — Comptage des sources : le nombre annoncé sur chaque lune est
     relu depuis son étiquette, ramené à zéro s'il est invalide, puis exposé
     en attribut et affiché comme badge chiffré par la feuille unique. */
  lunes.forEach((lune, index) => {
    const etiquette = `${lune.getAttribute('title') || ''} ${lune.getAttribute('aria-label') || ''} ${lune.dataset.label || ''}`;
    const trouve = etiquette.match(/(\d+)\s+source/i);
    const nb = trouve ? Math.max(0, nombre(trouve[1], 0)) : 0;
    lune.dataset.e069Sources = String(nb);
    lune.dataset.e069SourceSafe = '1';
    lune.dataset.e069Ordre = String(index + 1);
    lune.classList.add('e069-sources');
  });

  /* E069-07 — Plage de taille des nœuds : la variable dérivée du nombre de
     repères (18, 22 ou 28 px) est bornée dans cet intervalle ; si elle manque,
     la valeur de repli est recalculée depuis le nombre réel de planètes. */
  if (field && typeof field.style.getPropertyValue === 'function') {
    const repli = planetes.length > 16 ? 18 : planetes.length > 9 ? 22 : 28;
    const brut = nombre(field.style.getPropertyValue('--const-node-size'), NaN);
    const taille = Number.isFinite(brut) ? borner(brut, 18, 28) : repli;
    field.style.setProperty('--const-node-size', `${taille}px`);
    field.dataset.e069NodeSize = `${taille}px`;
    field.dataset.e069NodeSafe = '1';
  }

  /* E069-08 — Débordement de mesure : la largeur visible est comparée à la
     largeur du contenu ; l'attribut résultant pilote une règle CSS de retour
     à la ligne, et un unique écouteur de redimensionnement le recalcule. */
  function mesurer() {
    if (!etat) return;
    const visible = etat.clientWidth;
    const contenu = etat.scrollWidth;
    const deborde = visible > 0 && contenu > visible + 1;
    etat.dataset.e069Overflow = deborde ? '1' : '0';
    layout.dataset.e069Overflow = deborde ? '1' : '0';
  }
  mesurer();
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function'
      && typeof window.removeEventListener === 'function') {
    const CLE = '__e069_resize';
    if (typeof window[CLE] === 'function') window.removeEventListener('resize', window[CLE]);
    const surRedimension = () => mesurer();
    window[CLE] = surRedimension;
    window.addEventListener('resize', surRedimension);
  }

  /* E069-09 — Région live : la synthèse chiffrée est annoncée aux technologies
     d'assistance, avec mise à jour en capture avant le clic qui redessine la
     scène, afin que le dernier état mesuré soit toujours énoncé. */
  const live = un(ctx, 'e069-live', 'p', 'e069-sr', layout);
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  const annoncer = () => {
    live.textContent = `Ères : ${soleils.length} · Repères : ${planetes.length} · Points : ${lunes.length} · Point actif : ${ratioTexte} · positions bornées : ${bornes} · rangs réparés : ${reparations}.`;
  };
  annoncer();
  if (field) field.addEventListener('click', annoncer, true);

  /* E069-10 — Empreinte et panneau de garde-fous : une signature déterministe
     des métriques corrigées est affichée et stockée pour un audit reproductible ;
     le panneau bascule en mode sobre si le mouvement réduit est demandé. */
  const empreinte = `${soleils.length}-${planetes.length}-${lunes.length}-${bornes}-${reparations}`;
  layout.dataset.e069Fingerprint = empreinte;
  layout.dataset.e069Ids = IDS.every((id) => document.querySelectorAll(`[id="${id}"]`).length <= 1)
    ? 'uniques' : 'doublon';
  const garde = un(ctx, 'e069-garde', 'section', 'e069-garde', layout);
  garde.textContent = '';
  garde.setAttribute('aria-labelledby', 'e069-garde-titre');
  const titre = creer('h2', 'e069-garde-titre', 'Garde-fous des métriques');
  titre.id = 'e069-garde-titre';
  const texte = creer('p', 'e069-garde-texte');
  texte.id = 'e069-garde-texte';
  texte.setAttribute('role', 'status');
  texte.setAttribute('aria-live', 'polite');
  texte.textContent = `Positions bornées : ${bornes} · Rangs réparés : ${reparations} · Dénominateurs sûrs : 3 · Ratio : ${ratioTexte} · Taille : ${(field && field.dataset.e069NodeSize) || '—'} · Empreinte : ${empreinte}.`;
  garde.append(titre, texte);
  if (field && field.parentNode === layout) layout.insertBefore(garde, field);
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    garde.classList.add('e069-calme');
    layout.dataset.e069Reduced = '1';
  } else {
    garde.classList.remove('e069-calme');
    layout.dataset.e069Reduced = '0';
  }
});
