import { register } from './registry.js';

/* Lentille E007 — Contraste et perception (vue Récit).
 * Dix chantiers concrets, tous non destructifs : sans JavaScript le récit reste
 * lisible, aucun texte n'est retiré ni réécrit, aucune donnée historique n'est
 * ajoutée. Zéro réseau, zéro console, zéro aléa, un seul register, un seul bloc
 * CSS, identifiants DOM préfixés « e007- » et uniques.
 */

const CSS = `
/* E007-01 — voile de lisibilité sous les textes posés sur l'image. */
.recit-e007-media{position:relative}
.recit-e007-media::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(to top,rgba(4,6,10,.80) 0%,rgba(4,6,10,.34) 20%,rgba(4,6,10,0) 52%)}
.recit-e007-media>.media-caption,.recit-e007-media>.recit-media-credit{z-index:2}

/* E007-02 — degrés de certitude encodés par la forme du contour, pas la couleur. */
.recit-e007-conf{border-width:1px;letter-spacing:.02em;font-weight:600}
.recit-e007-conf--verifie{border-style:solid}
.recit-e007-conf--certain{border-style:double;border-width:2px}
.recit-e007-conf--probable{border-style:dashed}
.recit-e007-conf--conteste{border-style:dotted;background:rgba(221,113,101,.12)}

/* E007-03 — mesure et accent du titre. */
.recit-e007-title{max-width:36ch;padding-left:14px;border-left:3px solid var(--gold);text-wrap:balance}
@media (max-width:620px){.recit-e007-title{max-width:none;padding-left:10px}}

/* E007-04 — barre de progression : graduation et marqueur de position. */
.recit-e007-progress{position:relative;overflow:visible;background-image:repeating-linear-gradient(90deg,transparent 0 8px,rgba(255,255,255,.06) 8px 9px)}
.recit-e007-progress::after{content:"";position:absolute;top:50%;left:var(--e007-pos,0%);width:9px;height:9px;border-radius:50%;background:var(--gold-bright);border:2px solid var(--bg);box-shadow:0 0 0 1px var(--gold);transform:translate(-50%,-50%);transition:left .25s ease}
.recit-e007-reduced .recit-e007-progress::after{transition:none}

/* E007-05 — type et certitude du fil encodés par le bord et le soulignement. */
.recit-e007-thread .recit-thread-item{position:relative;border-left-width:3px}
.recit-e007-thread .recit-thread-item[data-kind="récit"]{border-left-style:solid}
.recit-e007-thread .recit-thread-item[data-kind="figure"]{border-left-style:dashed}
.recit-e007-thread .recit-thread-item[data-kind="lieu"]{border-left-style:double;border-left-width:4px}
.recit-e007-thread .recit-thread-item[data-kind="audit"]{border-left-style:dotted}
.recit-e007-thread .recit-thread-item[data-confidence="disputed"]{text-decoration:underline dotted var(--red);text-underline-offset:2px}

/* E007-06 — position courante signalée par un repère textuel, pas seulement doré. */
.recit-e007-thread .recit-e007-current{box-shadow:0 0 0 2px var(--gold-bright);font-weight:600}
.recit-e007-thread .recit-e007-current::after{content:"● ici";margin-left:6px;color:var(--gold-bright);font-size:8px;white-space:nowrap}

/* E007-07 — panneau de contexte : mesure confortable et contraste de fond. */
.recit-e007-context{max-width:68ch;padding:10px 12px;border-left:2px solid var(--line-strong);border-radius:0 8px 8px 0;background:rgba(255,255,255,.03);color:var(--ink-soft);line-height:1.65}

/* E007-08 — légendes : taille lisible et regroupement visuel. */
.recit-e007-legend{font-size:10px;line-height:1.7;color:var(--muted)}
.recit-e007-legend p{padding-left:12px;border-left:2px solid var(--line-strong)}
.recit-e007-legend p+p{margin-top:7px}

/* E007-09 — états des commandes : désactivé par la forme, pas par l'opacité seule. */
.recit-e007-actions button{min-height:40px}
.recit-e007-actions button:not([disabled]){border-color:var(--line-strong)}
.recit-e007-actions button[disabled]{opacity:1;color:var(--muted-2);border-style:dashed;border-color:var(--line);background:repeating-linear-gradient(135deg,rgba(255,255,255,.025) 0 4px,transparent 4px 8px);cursor:not-allowed}
.recit-e007-actions button:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px}

/* E007-10 — mode contraste renforcé et son commandement. */
.recit-e007-contrast-bar{display:flex;align-items:center;gap:8px;margin:8px 0}
.recit-e007-contrast-btn{min-height:36px;padding:4px 10px;border:1px solid var(--line-strong);border-radius:8px;background:transparent;color:var(--gold-bright);font-size:10px;cursor:pointer}
.recit-e007-contrast-btn[aria-pressed="true"]{background:var(--gold);border-color:var(--gold);color:#0b0f15;font-weight:600}
.recit-e007-contrast-btn:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px}
.recit-e007-contrast-note{color:var(--muted-2);font-size:9px}
.recit-e007-contrast .recit-title,.recit-e007-contrast .recit-context,.recit-e007-contrast .recit-timing,.recit-e007-contrast .recit-legend,.recit-e007-contrast .recit-sources{color:#ffffff}
.recit-e007-contrast .recit-legend{font-size:11px}
.recit-e007-contrast .recit-thread-item{color:#ffffff;border-color:rgba(255,255,255,.55)}
.recit-e007-contrast .recit-thread-item.is-current{background:rgba(255,255,255,.16)}
.recit-e007-contrast .recit-progress{background-color:rgba(255,255,255,.35)}
@media (prefers-reduced-motion:reduce){.recit-e007-progress::after{transition:none}}
`;

/* État de la bascule conservé entre deux reconstructions du DOM par la coque. */
let contrasteRenforce = false;

/* Neutralise un chantier défaillant sans interrompre les suivants ni le rendu. */
function safe(fn) {
  try { fn(); } catch { /* enrichissement non destructif : on ne casse jamais la vue. */ }
}

function marquer(node, classe) {
  if (node && node.classList && !node.classList.contains(classe)) node.classList.add(classe);
  return node;
}

function assure(id, tag, classe, parent, fabriquer) {
  if (!parent || typeof parent.appendChild !== 'function') return null;
  let node = document.getElementById(id);
  if (!node) {
    node = fabriquer(tag, classe, id);
    if (node && !node.id) node.id = id;
  }
  if (node && node.parentElement !== parent) parent.appendChild(node);
  return node;
}

register('E007', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  if (typeof document === 'undefined') return;

  safe(() => { css('recit-e007', CSS); });
  if (!layout || typeof layout.querySelector !== 'function') return;
  const corps = layout.querySelector('.recit-body');

  if (typeof reducedMotion === 'function' && reducedMotion()) {
    safe(() => { layout.classList.add('recit-e007-reduced'); });
  }

  /* E007-01 — voile de lisibilité sous les légendes posées sur l'image. */
  safe(() => { marquer(layout.querySelector('.recit-media'), 'recit-e007-media'); });

  /* E007-02 — certitude du point : contour à forme distincte selon le degré. */
  safe(() => {
    const chip = layout.querySelector('.recit-conf');
    if (!chip) return;
    const texte = chip.textContent || '';
    let degree = '';
    if (/vérifié/i.test(texte)) degree = 'verifie';
    else if (/certain/i.test(texte)) degree = 'certain';
    else if (/probable/i.test(texte)) degree = 'probable';
    else if (/contesté/i.test(texte)) degree = 'conteste';
    if (!degree) return;
    marquer(chip, 'recit-e007-conf');
    marquer(chip, `recit-e007-conf--${degree}`);
    chip.setAttribute('data-e007-certitude', degree);
  });

  /* E007-03 — titre : mesure de lecture et accent d'ancrage. */
  safe(() => {
    const titre = document.getElementById('recit-point-title') || layout.querySelector('.recit-title');
    marquer(titre, 'recit-e007-title');
  });

  /* E007-04 — progression : graduation et marqueur « vous êtes ici ». */
  safe(() => {
    const barre = layout.querySelector('.recit-progress');
    if (!barre) return;
    const remplissage = barre.querySelector('span');
    const largeur = remplissage && remplissage.style ? remplissage.style.width : '';
    barre.style.setProperty('--e007-pos', largeur || '0%');
    marquer(barre, 'recit-e007-progress');
  });

  /* E007-05 — fil : type et certitude encodés par la forme, pas la couleur. */
  safe(() => { marquer(layout.querySelector('.recit-thread'), 'recit-e007-thread'); });

  /* E007-06 — item courant du fil : repère textuel « ● ici » ajouté en CSS. */
  safe(() => {
    const courant = layout.querySelector('.recit-thread-item[aria-current="step"]');
    marquer(courant, 'recit-e007-current');
  });

  /* E007-07 — contexte : panneau à mesure et contraste maîtrisés. */
  safe(() => {
    const contexte = document.getElementById('recit-context') || layout.querySelector('.recit-context');
    marquer(contexte, 'recit-e007-context');
  });

  /* E007-08 — légendes : taille et regroupement plus lisibles. */
  safe(() => { marquer(layout.querySelector('.recit-legend'), 'recit-e007-legend'); });

  /* E007-09 — commandes : bornes désactivées lisibles et focus renforcé. */
  safe(() => { marquer(layout.querySelector('.recit-actions'), 'recit-e007-actions'); });

  /* E007-10 — bascule de contraste renforcé, au début du corps du récit. */
  safe(() => {
    if (!corps) return;
    safe(() => { layout.classList.toggle('recit-e007-contrast', contrasteRenforce); });
    const barre = assure('e007-contrast-bar', 'div', 'recit-e007-contrast-bar', corps, (tag, classe) => {
      const noeud = el(tag, classe);
      const bouton = el('button', 'recit-e007-contrast-btn', 'Contraste renforcé');
      bouton.type = 'button';
      bouton.id = 'e007-contrast-btn';
      const note = el('span', 'recit-e007-contrast-note', 'Améliore la lisibilité du récit.');
      noeud.append(bouton, note);
      return noeud;
    });
    if (!barre) return;
    if (barre.parentElement !== corps) corps.insertBefore(barre, corps.firstChild);
    const bouton = document.getElementById('e007-contrast-btn');
    if (!bouton) return;
    bouton.setAttribute('aria-pressed', String(contrasteRenforce));
    bouton.setAttribute('aria-label', contrasteRenforce
      ? 'Désactiver le contraste renforcé'
      : 'Activer le contraste renforcé');
    if (bouton.dataset.e007Lie !== '1') {
      bouton.dataset.e007Lie = '1';
      bouton.addEventListener('click', () => {
        contrasteRenforce = !contrasteRenforce;
        const conteneur = document.querySelector('.recit-layout');
        if (conteneur) conteneur.classList.toggle('recit-e007-contrast', contrasteRenforce);
        bouton.setAttribute('aria-pressed', String(contrasteRenforce));
        bouton.setAttribute('aria-label', contrasteRenforce
          ? 'Désactiver le contraste renforcé'
          : 'Activer le contraste renforcé');
      });
    }
  });
});
