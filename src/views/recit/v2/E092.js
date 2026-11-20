import { register } from './registry.js';

/* V2 lentille E092 — Hiérarchie visuelle et informationnelle (complément de la
   passe 1). La passe 1 traite déjà l'échelle typographique, le surtitre-onglet,
   le point courant prééminent, le badge de certitude, le poids des boutons, la
   légende en paliers, les deux états de preuve, la progression chiffrée, le
   compteur du fil et le repli responsive. La V2 propose donc dix chantiers
   NEUFS et DISTINCTS, tous centrés sur la hiérarchie de l'information mais
   appliqués à des zones encore non traitées : fil d'Ariane contextuel, deux
   rangs de métadonnées, rang des types dans le fil, sous-section des outils,
   statut relégué, hiérarchie du média, état de lecture explicite, filtres
   actifs, références locales chiffrées, confort responsive/mouvement réduit.
   Tous non destructifs : sans ce module, la vue reste intégralement lisible.
   Préfixes : classes recit-v2-e092-, ids DOM v2-e092- (jamais e092- de la
   passe 1 qui tourne sur le MÊME DOM). Zéro réseau, zéro console, zéro aléa,
   aucun fichier partagé modifié. Tout chiffre affiché est dérivé du DOM réel. */

const CSS = `
/* E092-01 — Fil d'Ariane contextuel en tête du récit : Récit › Repère › Point. */
.recit-layout .recit-v2-e092-breadcrumb{margin:0 0 10px;color:var(--muted-2);font-size:9px;letter-spacing:.05em;font-variant-numeric:tabular-nums}

/* E092-02 — Métadonnées à deux rangs : contexte d'événement / évaluation du point. */
.recit-layout .recit-v2-e092-meta .recit-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.recit-layout .recit-v2-e092-meta .recit-meta .recit-conf{margin-left:auto;padding-left:10px;border-left:1px solid var(--line,#3a3f4a)}

/* E092-03 — Rang des types de points dans le fil (marqueur secondaire distinct). */
.recit-layout .recit-v2-e092-type-rang .thread-kind{display:inline-block;min-width:34px;margin-right:5px;padding:0 3px;border-left:2px solid var(--gold,#e6b96f);color:var(--muted-2);font-size:7px;letter-spacing:.06em;text-transform:uppercase;font-variant-numeric:tabular-nums}

/* E092-04 — Sous-section « Explorer ce repère » pour la barre d'outils. */
.recit-layout .recit-v2-e092-overline{margin:8px 0 0;color:var(--muted-2);font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}

/* E092-05 — Statut technique relégué au rang utilitaire. */
.recit-layout .recit-v2-e092-status #c3a-status{margin:8px 0 0;padding-top:6px;border-top:1px dashed var(--line,#3a3f4a);color:var(--muted-2);font-size:8px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E092-06 — Hiérarchie du bloc média : légende primaire, crédit tertiaire. */
.recit-layout .recit-v2-e092-media .media-caption{color:var(--ink-soft,#d7d1c6);font-size:10px;font-weight:600}
.recit-layout .recit-v2-e092-media .recit-media-credit{color:rgba(255,255,255,.5);font-size:7px;letter-spacing:.04em}

/* E092-07 — État de lecture explicite (mode automatique). */
.recit-layout .recit-v2-e092-play-state{margin:6px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E092-08 — Compte des filtres actifs, dérivé des boutons aria-pressed. */
.recit-layout .recit-v2-e092-filters{margin:0 0 4px;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E092-09 — Références locales chiffrées, lues depuis la traçabilité réelle. */
.recit-layout .recit-v2-e092-trace-count{margin:6px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E092-10 — Repli responsive et mouvement réduit propres à la V2. */
.recit-v2-e092-readout{transition:opacity .2s linear}
.recit-layout[data-v2-e092-motion="reduce"] .recit-v2-e092-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e092-readout{transition:none}}
@media (max-width:620px){
  .recit-layout .recit-v2-e092-breadcrumb{font-size:8px}
  .recit-layout .recit-v2-e092-readout{font-size:9px}
  .recit-layout .recit-v2-e092-type-rang .thread-kind{min-width:0;font-size:7px}
}
`;

/* Ajoute une classe sans jamais écraser les autres classes du nœud. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.nodeType === 1 && noeud.classList && !noeud.classList.contains(nom)) {
    noeud.classList.add(nom);
  }
}

/* Dépose (ou réutilise) un paragraphe de synthèse visible, à un emplacement
   stable. L'id est préfixé v2-e092- : aucun id e092- de la passe 1 n'est
   réutilisé, alors que les deux lentilles tournent sur le même DOM. */
function placeParagraphe(id, classe, parent, ancre, texte, apres, el) {
  if (!parent || typeof parent.insertBefore !== 'function' || typeof el !== 'function') return null;
  let noeud = document.getElementById(id);
  if (noeud && noeud.parentNode && noeud.parentNode !== parent) noeud.parentNode.removeChild(noeud);
  if (!noeud) {
    noeud = el('p', `recit-v2-e092-readout ${classe}`);
    noeud.id = id;
  }
  noeud.textContent = texte;
  let cible = null;
  if (ancre && ancre.parentNode === parent) cible = apres ? ancre.nextSibling : ancre;
  else if (!apres) cible = parent.firstChild;
  parent.insertBefore(noeud, cible);
  return noeud;
}

/* Un chantier défaillant est isolé : les neuf autres continuent. */
function safe(fn) {
  try { fn(); }
  catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

register('E092', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e092', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const kicker = corps.querySelector('.view-kicker');
    const meta = corps.querySelector('.recit-meta');
    const progres = corps.querySelector('.recit-progress');
    const actions = corps.querySelector('.recit-actions');
    const outils = document.getElementById('c3a-tools') || corps.querySelector('.c3a-tools');
    const detail = corps.querySelector('.recit-trace');
    const sansSource = corps.querySelector('.recit-sources');
    const media = layout.querySelector('.recit-media');

    /* E092-01 — Fil d'Ariane contextuel : « Récit › Repère › point X / Y ».
       Le nom du repère vient du texte réel de .recit-meta (premier segment
       avant le séparateur « · »), la position du kicker « Étape X / Y ». */
    safe(() => {
      const found = kicker && (kicker.textContent || '').match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
      const nomRepere = meta ? String(meta.textContent || '').split('·')[0].trim() : '';
      if (found && nomRepere) {
        placeParagraphe('v2-e092-breadcrumb', 'recit-v2-e092-breadcrumb', corps, progres,
          `Récit › ${nomRepere} › point ${found[1]} / ${found[2]}`, false, el);
      }
    });

    /* E092-02 — Les métadonnées se lisent en deux rangs : le contexte de
       l'événement à gauche, l'évaluation du point (pastille de certitude)
       rejetée à droite et séparée par un liseré. Aucun texte réécrit. */
    safe(() => ajouteClasse(corps, 'recit-v2-e092-meta'));

    /* E092-03 — Le type de chaque point du fil devient un rang secondaire
       explicite (marqueur en petites capitales, chiffres tabulaires), distinct
       de l'emphase du point courant déjà portée par la passe 1. */
    safe(() => ajouteClasse(corps, 'recit-v2-e092-type-rang'));

    /* E092-04 — La barre d'outils est nommée comme sous-section « Explorer ce
       repère », subordinate au récit : un vrai <p> visible est inséré avant
       #c3a-tools, sans toucher au contenu des champs ni des filtres. */
    safe(() => {
      if (outils) {
        placeParagraphe('v2-e092-explore-overline', 'recit-v2-e092-overline', corps, outils,
          'Explorer ce repère', false, el);
      }
    });

    /* E092-05 — Le statut technique (#c3a-status, région live) est marqué comme
       niveau utilitaire : filet en pointillés, corps réduit, chiffres alignés.
       Cible limitée à l'id existant, aucun attribut de live region modifié. */
    safe(() => ajouteClasse(corps, 'recit-v2-e092-status'));

    /* E092-06 — Dans le panneau média, la légende devient le libellé primaire
       et le crédit le niveau tertiaire. Aucune image ni source n'est modifiée. */
    safe(() => ajouteClasse(media, 'recit-v2-e092-media'));

    /* E092-07 — L'état du mode « lecture automatique », jusqu'ici porté par le
       seul aria-pressed du bouton, est rendu explicite dans un <p> visible
       inséré après les commandes. La valeur est lue sur l'attribut réel. */
    safe(() => {
      const play = actions && actions.querySelector('.recit-play');
      if (!play) return;
      const enCours = play.getAttribute('aria-pressed') === 'true';
      placeParagraphe('v2-e092-play-state', 'recit-v2-e092-play-state', corps, actions,
        enCours
          ? 'Lecture automatique : en cours (Espace pour mettre en pause).'
          : 'Lecture automatique : en pause (Espace pour reprendre).', true, el);
    });

    /* E092-08 — Les critères de filtrage effectivement actifs sont comptés et
       nommés depuis les boutons .c3a-filter portant aria-pressed="true", hors
       boutons « Tous / Toutes » (data-fk se terminant par -all). */
    safe(() => {
      const pressés = Array.from(corps.querySelectorAll('.c3a-filter[aria-pressed="true"]'))
        .filter((bouton) => !(bouton.dataset.fk && /-all$/.test(bouton.dataset.fk)));
      const texte = pressés.length
        ? `Filtres actifs (${pressés.length}) : ${pressés.map((b) => String(b.textContent || '').trim()).join(' · ')}.`
        : 'Aucun filtre actif : tous les points du repère sont affichés.';
      placeParagraphe('v2-e092-active-filters', 'recit-v2-e092-filters', corps, outils, texte, true, el);
    });

    /* E092-09 — Le nombre de références locales est surfacé comme donnée de
       hiérarchie : il est lu dans le résumé réel de <details> (« N référence(s)
       locale(s) »), ou vaut 0 quand le point affiche .recit-sources. */
    safe(() => {
      let n = null;
      if (detail) {
        const summary = detail.querySelector('summary');
        const found = summary && String(summary.textContent || '').match(/(\d+)\s*référence/i);
        if (found) n = parseInt(found[1], 10);
      }
      if (n === null && sansSource) n = 0;
      if (n !== null) {
        placeParagraphe('v2-e092-trace-count', 'recit-v2-e092-trace-count', corps,
          detail || sansSource, `Références locales attachées : ${n}.`, true, el);
      }
    });

    /* E092-10 — Le confort reste préservé à 390 px (repli CSS) et les lectures
       chiffrées n'utilisent aucun mouvement quand l'utilisateur le refuse. */
    safe(() => {
      let reduce = false;
      try { reduce = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
      catch { reduce = false; }
      layout.setAttribute('data-v2-e092-motion', reduce ? 'reduce' : 'normal');
    });
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
