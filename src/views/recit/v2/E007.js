import { register } from './registry.js';

/* V2 lentille E007 — Contraste et perception (vue Récit), second jeu de chantiers.
 * La passe 1 traite le voile photo, le chip de certitude, le titre, la barre de
 * progression, le bord du fil, le repère « ici », le contexte, la légende, les
 * commandes bornées et un contraste global. Ce jeu V2 cible exclusivement les
 * micro-textes et états que la passe 1 laisse intacts : kicker d'étape,
 * métadonnées, temps de lecture, libellés de type, item courant filtré, statut
 * de filtrage, crédit photo, tracabilité, encart vide, puis un régime
 * « détails lisibles » réversible et l'appui du réglage système.
 *
 * Dix chantiers, tous non destructifs : aucun texte n'est retiré ni réécrit,
 * aucun attribut porté par la coque n'est remplacé, aucune donnée historique
 * n'est ajoutée. Zéro réseau, zéro console, zéro aléa. Un seul register, un
 * seul bloc CSS, classes préfixées « recit-v2-e007- », ids DOM préfixés
 * « v2-e007- » et uniques (la passe 1 utilise « e007- » sur le même DOM).
 */

const CSS = `
/* E007-01 — kicker d'étape : pastille contrastée et soulignement proportionnel
   dont la largeur est dérivée de « Étape X / Y » lu dans le DOM. */
.recit-v2-e007-step{position:relative;display:inline-flex;align-items:center;min-height:22px;padding:3px 9px 6px;border:1px solid var(--line-strong);border-radius:999px;background-color:rgba(230,185,111,.08);background-image:linear-gradient(90deg,var(--gold-bright) 0 calc(var(--v2-e007-ratio,0) * 100%),rgba(230,185,111,.22) calc(var(--v2-e007-ratio,0) * 100%) 100%);background-position:9px calc(100% - 3px);background-size:calc(100% - 18px) 2px;background-repeat:no-repeat;color:var(--ink);font-size:10px;font-weight:600;letter-spacing:.02em;font-variant-numeric:tabular-nums}
@media (max-width:620px){.recit-v2-e007-step{font-size:9px}}

/* E007-02 — métadonnées du repère : l'année et le séparateur gagnent en
   contraste et en alignement numérique, sans toucher au chip de certitude. */
.recit-v2-e007-meta{color:var(--ink-soft);font-size:10px;line-height:1.7;letter-spacing:.01em;font-variant-numeric:tabular-nums}
.recit-v2-e007-meta .recit-conf{vertical-align:middle}

/* E007-03 — temps de lecture : sortie du micro-texte 9 px, filet d'ancrage. */
.recit-v2-e007-timing{padding-left:8px;border-left:2px solid var(--line);color:var(--muted);font-size:10px;line-height:1.55;font-variant-numeric:tabular-nums}

/* E007-04 — libellé de type dans le fil : pastille à bordure, plus lisible
   que le simple préfixe 8 px « muted-2 ». */
.recit-v2-e007-kind{display:inline-block;padding:1px 5px;border:1px solid var(--line-strong);border-radius:4px;background:rgba(255,255,255,.05);color:var(--ink-soft);font-size:8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;vertical-align:1px}

/* E007-05 — item courant de la liste FILTRÉE : anneau et barre interne,
   distinct du « ● ici » de la passe 1 posé sur l'autre liste. */
.recit-v2-e007-cur{box-shadow:inset 3px 0 0 var(--gold-bright),0 0 0 1px var(--gold);background:rgba(230,185,111,.14);color:var(--ink);font-weight:600}

/* E007-06 — statut de filtrage : encart bordé, chiffres alignés, contraste
   renforcé, sans modifier le texte ni role="status". */
.recit-v2-e007-status{padding:5px 8px;border-left:2px solid var(--gold);border-radius:0 6px 6px 0;background:rgba(255,255,255,.04);color:var(--ink-soft);font-size:10px;line-height:1.55;font-variant-numeric:tabular-nums}

/* E007-07 — crédit/licence photo : contraste par ombres portées multiples,
   technique distincte du voile de la passe 1, sans image ni requête. */
.recit-v2-e007-credit{color:rgba(255,255,255,.86);letter-spacing:.01em;text-shadow:0 1px 2px #000,0 0 6px rgba(0,0,0,.9),0 0 2px rgba(0,0,0,.95)}

/* E007-08 — résumé de traçabilité : vraie cible de 36 px, bordure et focus
   renforcés, marqueur de disclosure coloré. */
.recit-v2-e007-trace{min-height:36px;padding:4px 8px;border:1px solid var(--line-strong);border-radius:7px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:10px;font-weight:600}
.recit-v2-e007-trace:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px}
.recit-v2-e007-trace::marker{color:var(--gold-bright)}

/* E007-09 — encart « aucun résultat » : cadre et texte remontés pour que
   l'absence de résultat ne se confonde pas avec un simple vide. */
.recit-v2-e007-empty{border-width:2px;border-color:var(--line-strong);background:rgba(255,255,255,.04);color:var(--ink);font-size:11px;line-height:1.6}
.recit-v2-e007-empty p{color:var(--ink-soft)}

/* E007-10 — régime « détails lisibles » : barre de commande, état pressé et
   élévation ciblée des micro-textes des neuf chantiers précédents. */
.recit-v2-e007-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03)}
.recit-v2-e007-btn{min-height:36px;padding:5px 12px;border:1px solid var(--line-strong);border-radius:8px;background:transparent;color:var(--gold-bright);font-size:10px;font-weight:600;cursor:pointer}
.recit-v2-e007-btn[aria-pressed="true"]{background:var(--gold);border-color:var(--gold);color:#0b0f15}
.recit-v2-e007-btn:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px}
.recit-v2-e007-note{color:var(--muted);font-size:9px;line-height:1.5}
.recit-v2-e007-detail .recit-v2-e007-step,
.recit-v2-e007-detail .recit-v2-e007-meta,
.recit-v2-e007-detail .recit-v2-e007-timing,
.recit-v2-e007-detail .recit-v2-e007-status,
.recit-v2-e007-detail .recit-v2-e007-trace{color:var(--ink);font-size:12px}
.recit-v2-e007-detail .recit-v2-e007-kind{color:var(--ink);font-size:10px;border-color:var(--gold)}
.recit-v2-e007-detail .recit-v2-e007-credit{color:#fff;font-size:10px}
.recit-v2-e007-detail .recit-v2-e007-empty{font-size:12px}
/* Même régime appliqué automatiquement quand le système demande plus de contraste. */
@media (prefers-contrast:more){
  .recit-v2-e007-step,.recit-v2-e007-meta,.recit-v2-e007-timing,.recit-v2-e007-kind,
  .recit-v2-e007-status,.recit-v2-e007-credit,.recit-v2-e007-trace,.recit-v2-e007-empty{color:var(--ink);border-color:var(--gold);font-size:11px}
}
.recit-v2-e007-reduced .recit-v2-e007-step,
.recit-v2-e007-reduced .recit-v2-e007-btn{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e007-step,.recit-v2-e007-btn{transition:none}}
`;

/* État de la bascule, conservé entre deux reconstructions du DOM par la coque. */
let detailsLisibles = false;

/* Neutralise un chantier défaillant sans interrompre les suivants ni le rendu. */
function safe(fn) {
  try { fn(); } catch { /* enrichissement non destructif : la vue ne casse jamais. */ }
}

/* Ajoute une classe sans écraser les classes déjà portées par la coque. */
function marquer(node, classe) {
  if (node && node.classList && !node.classList.contains(classe)) node.classList.add(classe);
  return node;
}

/* Réutilise un nœud déjà inséré (idempotence) ou le crée, puis le rattache. */
function assure(id, tag, classe, parent, fabriquer) {
  if (!parent || typeof parent.appendChild !== 'function' || typeof document === 'undefined') return null;
  let node = document.getElementById(id);
  if (!node) {
    node = fabriquer(tag, classe, id);
    if (node && !node.id) node.id = id;
  }
  if (node && node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Ratio « étape courante / total » lu dans le texte réel du kicker.
   Aucun chiffre n'est inventé ; valeur rejetée si le libellé est inattendu. */
function ratioDepuisKicker(node) {
  if (!node) return null;
  const found = /(?:Étape|etape)\s+(\d+)\s*\/\s*(\d+)/i.exec(node.textContent || '');
  if (!found) return null;
  const step = Number(found[1]);
  const total = Number(found[2]);
  if (!Number.isFinite(step) || !Number.isFinite(total) || total <= 0 || step < 1 || step > total) return null;
  return Math.round((step / total) * 1000) / 1000;
}

register('E007', (ctx) => {
  try {
    const { layout, css, el, reducedMotion } = ctx;
    if (typeof document === 'undefined') return;

    safe(() => { css('recit-v2-e007', CSS); });
    if (!layout || typeof layout.querySelector !== 'function') return;

    /* E007-01 — pastille de kicker et soulignement proportionnel dérivé du DOM. */
    safe(() => {
      const kicker = layout.querySelector('.recit-body .view-kicker');
      if (!kicker) return;
      marquer(kicker, 'recit-v2-e007-step');
      const ratio = ratioDepuisKicker(kicker);
      if (ratio !== null) kicker.style.setProperty('--v2-e007-ratio', String(ratio));
    });

    /* E007-02 — métadonnées du repère (titre · année · chip) contrastées. */
    safe(() => { marquer(layout.querySelector('.recit-meta'), 'recit-v2-e007-meta'); });

    /* E007-03 — temps de lecture et gloss au-dessus du seuil micro-texte. */
    safe(() => { marquer(layout.querySelector('.recit-timing'), 'recit-v2-e007-timing'); });

    /* E007-04 — chaque libellé de type du fil devient une pastille bordée. */
    safe(() => {
      const tags = layout.querySelectorAll('.thread-kind');
      if (!tags || typeof tags.forEach !== 'function') return;
      tags.forEach((tag) => marquer(tag, 'recit-v2-e007-kind'));
    });

    /* E007-05 — item courant de la liste filtrée : anneau et barre internes. */
    safe(() => {
      marquer(layout.querySelector('.c3a-thread-item[aria-current="step"]'), 'recit-v2-e007-cur');
    });

    /* E007-06 — ligne de statut des filtres : encart et chiffres alignés. */
    safe(() => {
      const status = document.getElementById('c3a-status') || layout.querySelector('.c3a-status');
      marquer(status, 'recit-v2-e007-status');
    });

    /* E007-07 — crédit/licence photo : ombres multiples, sans voile ni image. */
    safe(() => { marquer(layout.querySelector('.recit-media-credit'), 'recit-v2-e007-credit'); });

    /* E007-08 — résumé de traçabilité : cible 36 px, focus et marqueur. */
    safe(() => { marquer(layout.querySelector('.recit-trace summary'), 'recit-v2-e007-trace'); });

    /* E007-09 — encart « aucun point corresponding » plus contrasté. */
    safe(() => { marquer(layout.querySelector('.c3a-empty'), 'recit-v2-e007-empty'); });

    /* E007-10 — bascule « Détails lisibles » et appui de prefers-contrast. */
    safe(() => {
      const corps = layout.querySelector('.recit-body');
      if (!corps || typeof el !== 'function') return;
      marquer(layout, 'recit-v2-e007-detail-off');
      layout.classList.toggle('recit-v2-e007-detail', detailsLisibles);
      if (typeof reducedMotion === 'function' && reducedMotion()) {
        marquer(layout, 'recit-v2-e007-reduced');
      }

      const barre = assure('v2-e007-detail-bar', 'div', 'recit-v2-e007-bar', corps, (tag, classe) => {
        const noeud = el(tag, classe);
        const bouton = el('button', 'recit-v2-e007-btn', 'Détails lisibles');
        bouton.type = 'button';
        bouton.id = 'v2-e007-detail-btn';
        const note = el('span', 'recit-v2-e007-note', 'Renforce le contraste des petits textes de cette vue.');
        noeud.append(bouton, note);
        return noeud;
      });
      if (!barre) return;
      if (barre.parentElement !== corps) corps.insertBefore(barre, corps.firstChild);
      const bouton = document.getElementById('v2-e007-detail-btn');
      if (!bouton) return;

      bouton.setAttribute('aria-pressed', String(detailsLisibles));
      bouton.setAttribute('aria-label', detailsLisibles
        ? 'Désactiver les détails lisibles'
        : 'Activer les détails lisibles');

      if (bouton.dataset.v2E007Lie !== '1') {
        bouton.dataset.v2E007Lie = '1';
        bouton.addEventListener('click', () => {
          detailsLisibles = !detailsLisibles;
          const conteneur = document.querySelector('.recit-layout');
          if (conteneur) conteneur.classList.toggle('recit-v2-e007-detail', detailsLisibles);
          bouton.setAttribute('aria-pressed', String(detailsLisibles));
          bouton.setAttribute('aria-label', detailsLisibles
            ? 'Désactiver les détails lisibles'
            : 'Activer les détails lisibles');
        });
      }
    });
  } catch { /* garde-fou global : une lentille défaillante ne casse pas le rendu. */ }
});
