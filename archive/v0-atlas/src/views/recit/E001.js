import { register } from './registry.js';

/* Lentille E001 — Lisibilité et mesure de lecture (vue Récit).
   Dix chantiers indépendants, tous non destructifs : sans ce module, la vue
   reste intégralement lisible. Aucun appel réseau, aucun aléa, aucune sortie
   de débogage, aucun fichier partagé modifié. Les sélecteurs sont tous préfixés
   recit-e001- et les ancres DOM e001- sont uniques. */

const CSS = `
/* E001-01 — mesure de ligne calibrée. */
.recit-e001-measure{--e001-measure:66ch}
.recit-e001-measure .recit-title,
.recit-e001-measure .recit-context{max-width:var(--e001-measure)}
@media (max-width:1000px){.recit-e001-measure .recit-title,
  .recit-e001-measure .recit-context{max-width:var(--e001-measure)}}

/* E001-02 — rythme vertical et interlignage. */
.recit-e001-leading .recit-title{margin-bottom:.62em}
.recit-e001-leading .recit-context{line-height:1.72;margin:0 0 1.25em}
.recit-e001-leading .recit-timing{margin-top:.62em}

/* E001-03 — équilibre typographique du titre. */
.recit-e001-titre .recit-title{text-wrap:balance;font-size:clamp(28px,3.4vw,48px);line-height:1.12;letter-spacing:-.02em}

/* E001-04 — contraste du texte courant et des mentions. */
.recit-e001-contrast .recit-context,
.recit-e001-contrast .recit-timing,
.recit-e001-contrast .recit-sources,
.recit-e001-contrast .recit-legend,
.recit-e001-contrast .recit-legend p,
.recit-e001-contrast .recit-meta,
.recit-e001-contrast .recit-thread-item:not(.is-current){color:var(--ink-soft)}

/* E001-05 — plancher de taille pour les petits caractères. */
.recit-e001-petits .recit-timing,
.recit-e001-petits .recit-sources,
.recit-e001-petits .recit-legend,
.recit-e001-petits .recit-legend p,
.recit-e001-petits .recit-thread-item,
.recit-e001-petits .recit-conf{font-size:11px}
.recit-e001-petits .thread-kind{font-size:10px}
.recit-e001-petits .recit-thread-item{min-height:36px}

/* E001-06 — césure française (la langue est posée sur les nœuds). */
.recit-e001-cesure .recit-title,
.recit-e001-cesure .recit-context{-webkit-hyphens:auto;hyphens:auto;word-break:normal;overflow-wrap:break-word}

/* E001-07 — liseré de repère de lecture. */
.recit-e001-guide{position:relative}
.recit-e001-rule{position:absolute;left:10px;top:0;bottom:0;width:2px;border-radius:2px;background:linear-gradient(180deg,rgba(230,185,111,0),rgba(230,185,111,.55) 14%,rgba(230,185,111,.55) 86%,rgba(230,185,111,0));opacity:.5;pointer-events:none;transition:opacity .2s linear}
@media (max-width:620px){.recit-e001-rule{left:6px;opacity:.35}}

/* E001-08 — mode lecture concentrée. */
.recit-layout.recit-e001-focus{grid-template-columns:minmax(0,1fr)}
.recit-e001-focus .recit-media,
.recit-e001-focus .recit-thread,
.recit-e001-focus .recit-legend{display:none}
.recit-e001-focus .recit-body{max-width:none}
.recit-e001-btn{min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:10px;cursor:pointer;transition:border-color .18s linear,color .18s linear,background-color .18s linear}
.recit-e001-btn[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.12)}
.recit-e001-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E001-09 — mesure de la charge de lecture. */
.recit-e001-wordcount{margin:4px 0 0;color:var(--ink-soft);font-size:11px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E001-10 — confort : mouvement réduit. */
.recit-layout[data-e001-motion="reduce"] .recit-e001-rule,
.recit-layout[data-e001-motion="reduce"] .recit-e001-btn{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-e001-rule,.recit-e001-btn{transition:none}
}
`;

/* L'état de la bascule survit aux reconstructions du DOM opérées par la coque. */
let focusActif = false;

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function libelleFocus() {
  return focusActif ? 'Lecture concentrée : désactiver' : 'Lecture concentrée : activer';
}

function synchroniseBouton(bouton) {
  if (!bouton) return;
  const libelle = libelleFocus();
  bouton.textContent = libelle;
  bouton.setAttribute('aria-label', libelle);
  bouton.setAttribute('aria-pressed', focusActif ? 'true' : 'false');
}

register('E001', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-e001', CSS); /* un seul appel, toutes les règles du module. */

    const body = layout.querySelector('.recit-body');
    const titre = document.getElementById('recit-point-title') || layout.querySelector('.recit-title');
    const contexte = document.getElementById('recit-context') || layout.querySelector('.recit-context');
    const timing = layout.querySelector('.recit-timing');
    const actions = layout.querySelector('.recit-actions');

    /* E001-01 — colonne de mesure. */
    ajouteClasse(body, 'recit-e001-measure');

    /* E001-02 — rythme vertical. */
    ajouteClasse(body, 'recit-e001-leading');

    /* E001-03 — titre équilibré. */
    ajouteClasse(body, 'recit-e001-titre');

    /* E001-04 — contraste renforcé. */
    ajouteClasse(body, 'recit-e001-contrast');

    /* E001-05 — plancher de taille. */
    ajouteClasse(body, 'recit-e001-petits');

    /* E001-06 — césure : la langue est déclarée sans écraser une langue existante. */
    ajouteClasse(body, 'recit-e001-cesure');
    if (titre && titre.setAttribute && !titre.hasAttribute('lang')) titre.setAttribute('lang', 'fr');
    if (contexte && contexte.setAttribute && !contexte.hasAttribute('lang')) contexte.setAttribute('lang', 'fr');

    /* E001-07 — liseré de lecture, décoratif et annulé pour les lecteurs d'écran. */
    if (body) {
      ajouteClasse(body, 'recit-e001-guide');
      let liseré = document.getElementById('e001-rule');
      if (!liseré) {
        liseré = el('div', 'recit-e001-rule');
        liseré.id = 'e001-rule';
        liseré.setAttribute('aria-hidden', 'true');
      }
      if (liseré.parentElement !== body) body.insertBefore(liseré, body.firstChild);
    }

    /* E001-08 — bascule « lecture concentrée ». */
    if (actions) {
      let bouton = document.getElementById('e001-focus-btn');
      if (!bouton || bouton.parentElement !== actions) {
        bouton = el('button', 'recit-e001-btn');
        bouton.id = 'e001-focus-btn';
        bouton.type = 'button';
        actions.appendChild(bouton);
      }
      synchroniseBouton(bouton);
      const dejaLie = bouton.getAttribute('data-e001-bound') === '1';
      if (!dejaLie) {
        bouton.setAttribute('data-e001-bound', '1');
        bouton.addEventListener('click', () => {
          focusActif = !focusActif;
          const cadre = document.querySelector('.recit-layout');
          if (cadre) {
            if (focusActif) cadre.classList.add('recit-e001-focus');
            else cadre.classList.remove('recit-e001-focus');
          }
          synchroniseBouton(document.getElementById('e001-focus-btn'));
        });
      }
      if (focusActif) ajouteClasse(layout, 'recit-e001-focus');
      else if (layout.classList) layout.classList.remove('recit-e001-focus');
    }

    /* E001-09 — charge de lecture chiffrée, dérivée du texte réel du point. */
    if (titre && body) {
      const texte = titre.textContent || '';
      const mots = texte.trim().split(/\s+/).filter(Boolean).length;
      const caracteres = texte.replace(/\s+/g, '').length;
      let compteur = document.getElementById('e001-wordcount');
      if (!compteur || compteur.parentElement !== body) {
        compteur = el('p', 'recit-e001-wordcount');
        compteur.id = 'e001-wordcount';
        if (timing && timing.parentNode) timing.parentNode.insertBefore(compteur, timing.nextSibling);
        else body.appendChild(compteur);
      }
      compteur.textContent = `Mesure du passage : ${mots} mot${mots > 1 ? 's' : ''} · ${caracteres} caractère${caracteres > 1 ? 's' : ''}.`;
      compteur.setAttribute('aria-label', `Longueur du point : ${mots} mots, ${caracteres} caractères.`);
    }

    /* E001-10 — mouvement réduit, lu une seule fois par rendu. */
    if (reducedMotion && typeof reducedMotion === 'function' && reducedMotion()) {
      if (!layout.hasAttribute('data-e001-motion')) layout.setAttribute('data-e001-motion', 'reduce');
    } else if (layout.setAttribute) {
      layout.setAttribute('data-e001-motion', 'normal');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
