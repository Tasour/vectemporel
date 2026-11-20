import { register } from './registry.js';

/* V2 lentille E001 — Lisibilité et mesure de lecture (complément de la passe 1).
   Dix chantiers V2 neufs, distincts de ceux de la passe 1 (mesure 66 ch,
   interlignage, équilibre du titre, contraste, plancher de taille, césure,
   liseré, lecture concentrée, compteur de mots, mouvement réduit). Ici :
   lectures chiffrées dérivées du DOM réel et confort typographique ciblé.
   Tous non destructifs : sans ce module, la vue reste intégralement lisible.
   Préfixes : classes recit-v2-e001-, ids DOM v2-e001- (jamais e001- de la passe 1).
   Zéro réseau, zéro console, zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* E001-01 — Progression de lecture chiffrée. */
.recit-v2-e001-progress{margin:6px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E001-02 — Durée de lecture en minutes. */
.recit-v2-e001-duration{margin:2px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E001-03 — Densité du fil. */
.recit-v2-e001-density{margin:0 0 6px;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E001-04 — Estimation du nombre de lignes de lecture. */
.recit-v2-e001-lignes{margin:4px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E001-05 — Respiration de la légende. */
.recit-layout .recit-v2-e001-legende .recit-legend{line-height:1.72}
.recit-layout .recit-v2-e001-legende .recit-legend p{margin:6px 0}

/* E001-06 — Contraste du repère d'étape. */
.recit-layout .recit-v2-e001-kicker .view-kicker{color:var(--ink-soft);letter-spacing:.1em}

/* E001-07 — Mesure étendue aux textes secondaires. */
.recit-layout .recit-v2-e001-mesure2 .recit-legend,
.recit-layout .recit-v2-e001-mesure2 .recit-sources,
.recit-layout .recit-v2-e001-mesure2 .recit-trace p{max-width:66ch}

/* E001-08 — Chiffres alignés pour la lecture. */
.recit-layout .recit-v2-e001-tabulaire .recit-timing,
.recit-layout .recit-v2-e001-tabulaire .recit-meta,
.recit-layout .recit-v2-e001-tabulaire .recit-conf,
.recit-layout .recit-v2-e001-tabulaire .view-kicker{font-variant-numeric:tabular-nums}

/* E001-09 — Repère renforcé du point courant dans le fil. */
.recit-layout .recit-v2-e001-courant .recit-thread-item.is-current{box-shadow:inset 3px 0 0 var(--gold-bright);font-weight:700}

/* E001-10 — Confort : mouvement reduced des lectures chiffrées V2. */
.recit-v2-e001-readout{transition:opacity .2s linear}
.recit-layout[data-v2-e001-motion="reduce"] .recit-v2-e001-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e001-readout{transition:none}}
`;

/* Ajoute une classe sans jamais écraser les autres classes du nœud. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Dépose (ou réutilise) un paragraphe de synthèse visible, à un emplacement stable. */
function placeParagraphe(id, classe, parent, ancre, texte) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = el('p', `recit-v2-e001-readout ${classe}`);
    noeud.id = id;
  }
  noeud.textContent = texte;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

register('E001', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e001', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const kicker = corps.querySelector('.view-kicker');
    const titre = document.getElementById('recit-point-title') || corps.querySelector('.recit-title');
    const contexte = document.getElementById('recit-context') || corps.querySelector('.recit-context');
    const timing = corps.querySelector('.recit-timing');
    const remplissage = corps.querySelector('.recit-progress > span');
    const thread = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');
    const threadTitre = corps.querySelector('.recit-thread-title');

    /* E001-01 — progression lue depuis le kicker « Étape X / Y » et la barre. */
    if (kicker) {
      const found = (kicker.textContent || '').match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
      let largeur = null;
      if (remplissage && remplissage.style && remplissage.style.width) {
        const pct = remplissage.style.width.match(/(\d+(?:\.\d+)?)\s*%/);
        if (pct) largeur = Math.round(parseFloat(pct[1]));
      }
      if (found) {
        const texte = largeur === null
          ? `Progression de lecture : étape ${found[1]} sur ${found[2]}.`
          : `Progression de lecture : étape ${found[1]} sur ${found[2]} · ${largeur} % parcourus.`;
        placeParagraphe('v2-e001-progress', 'recit-v2-e001-progress', corps, kicker, texte);
      }
    }

    /* E001-02 — durée convertie depuis les secondes réelles de .recit-timing. */
    if (timing) {
      const found = (timing.textContent || '').match(/≈\s*(\d+)\s*s/);
      if (found) {
        const secondes = parseInt(found[1], 10);
        const minutes = Math.floor(secondes / 60);
        const reste = secondes % 60;
        const texte = minutes > 0
          ? `Durée estimée : ${minutes} min ${reste} s de lecture.`
          : `Durée estimée : ${reste} s de lecture.`;
        placeParagraphe('v2-e001-duration', 'recit-v2-e001-duration', corps, timing, texte);
      }
    }

    /* E001-03 — densité du fil calculée depuis les vrais boutons du fil. */
    if (thread) {
      const items = Array.from(thread.querySelectorAll('.recit-thread-item'));
      if (items.length) {
        const indexCourant = items.findIndex((n) => n.classList && n.classList.contains('is-current'));
        const texte = indexCourant >= 0
          ? `Fil : ${items.length} points · point ${indexCourant + 1} en cours.`
          : `Fil : ${items.length} points.`;
        placeParagraphe('v2-e001-density', 'recit-v2-e001-density', thread, threadTitre, texte);
      }
    }

    /* E001-04 — lignes estimées depuis les caractères réels du point. */
    if (titre) {
      const texteBrut = (titre.textContent || '') + (contexte ? (contexte.textContent || '') : '');
      const caracteres = texteBrut.replace(/\s+/g, '').length;
      const lignes = Math.max(1, Math.ceil(caracteres / 70));
      placeParagraphe('v2-e001-lignes', 'recit-v2-e001-lignes', corps, titre,
        `≈ ${lignes} ligne${lignes > 1 ? 's' : ''} de lecture à ~70 caractères par ligne.`);
    }

    /* E001-05 — respiration de la légende. */
    ajouteClasse(corps, 'recit-v2-e001-legende');

    /* E001-06 — contraste du repère d'étape. */
    ajouteClasse(corps, 'recit-v2-e001-kicker');

    /* E001-07 — mesure étendue aux textes secondaires. */
    ajouteClasse(corps, 'recit-v2-e001-mesure2');

    /* E001-08 — chiffres alignés. */
    ajouteClasse(corps, 'recit-v2-e001-tabulaire');

    /* E001-09 — repère renforcé du point courant. */
    ajouteClasse(corps, 'recit-v2-e001-courant');

    /* E001-10 — mouvement réduit, lu une fois par rendu. */
    if (reducedMotion && typeof reducedMotion === 'function' && reducedMotion()) {
      layout.setAttribute('data-v2-e001-motion', 'reduce');
    } else {
      layout.setAttribute('data-v2-e001-motion', 'normal');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
