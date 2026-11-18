import { register } from './registry.js';

/* Lentille E022 — Détail & fiche : bloc de certitude au libellé explicite
 * (domaine C). Dix chantiers décrits dans UNIFIED_AUDIT/POINTS/views/E022.md.
 *
 * La vue de base (points.js:95-114) affiche la confiance du point sous forme
 * d'un simple badge nu : <span class="confidence is-…">vérifié</span> perdu
 * dans .points-meta, sans libellé, sans glose et sans repère non coloré. E022
 * ne réécrit PAS ce balisage : il ajoute, à côté du badge d'origine, un bloc
 * de certitude intitulé (« Certitude déclarée ») dont le libellé, la marque et
 * la glose sont dérivés du seul token de confiance déjà présent dans le DOM.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers la coque, le store ni une autre lentille.
 *
 * Invariants :
 * - un seul bloc, une seule feuille CSS, un seul observateur par rendu ;
 * - le badge d'origine (.points-meta .confidence) n'est jamais modifié ;
 * - aucune donnée historique inventée, aucun millésime, aucun total codé en dur ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e022';
const BLOCK_ID = 'points-e022-certainty';
const LABEL_ID = 'points-e022-certainty-label';

/* Libellés d'interface, calculés depuis le token — jamais une donnée de fond.
 * Même discipline que recit.js:8-13 : on traduit le libellé de l'audit, on
 * n'invente aucun fait. Le repli (token inconnu) réaffiche le token tel quel. */
const LABELS = {
  'vérifié': { label: 'Vérifié', mark: '✓', gloss: 'mention « vérifié » reprise de la fiche d’audit.' },
  'certain': { label: 'Certain', mark: '■', gloss: 'mention « certain » reprise de la fiche d’audit.' },
  'probable': { label: 'Probable', mark: '◐', gloss: 'mention « probable » reprise de la fiche d’audit.' },
  'disputed': { label: 'Contesté', mark: '≈', gloss: 'mention « disputed » de l’audit, traduite par « contesté ».' },
  'non documenté': { label: 'Non documenté', mark: '?', gloss: 'aucune mention de certitude dans la fiche.' },
};

const CSS = `
  #${BLOCK_ID} {
    box-sizing: border-box;
    margin: 10px 0 4px;
    padding: 8px 10px;
    border: 1px solid var(--line, rgba(244, 214, 158, .35));
    border-left: 3px solid var(--gold, #e6b96f);
    border-radius: 8px;
    background: var(--surface-2, rgba(255, 255, 255, .04));
    font-variant-numeric: tabular-nums;
  }
  #${BLOCK_ID}[hidden] { display: none; }
  #${BLOCK_ID} .points-e022-label {
    margin: 0 0 3px;
    color: var(--muted, #8aa);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
  }
  #${BLOCK_ID} .points-e022-value {
    display: flex;
    align-items: baseline;
    gap: 7px;
    margin: 0;
    color: var(--ink, #f4f6f8);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.35;
  }
  #${BLOCK_ID} .points-e022-mark {
    display: inline-block;
    min-width: 1.2em;
    color: var(--gold-bright, #f5d99a);
    font-weight: 700;
  }
  #${BLOCK_ID} .points-e022-gloss {
    margin: 3px 0 0;
    color: var(--muted, #8aa);
    font-size: 11px;
    line-height: 1.4;
  }
  #${BLOCK_ID} .points-e022-sr {
    position: absolute; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
  }
  /* E022-09 : transition uniquement si le JS a posé la classe d'animation. */
  #${BLOCK_ID}.points-e022-motion .points-e022-mark {
    transition: transform .16s ease;
  }
  @media (prefers-reduced-motion: reduce) {
    #${BLOCK_ID}, #${BLOCK_ID} .points-e022-mark { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${BLOCK_ID} { border: 2px solid CanvasText; }
    #${BLOCK_ID} .points-e022-mark { color: CanvasText; }
  }
  @media (max-width: 480px) {
    #${BLOCK_ID} { padding: 7px 8px; }
    #${BLOCK_ID} .points-e022-value { font-size: 12px; }
  }
`;

/* État module : pointeurs courants et métriques. Un seul observateur,
 * déconnecté puis reconnecté à chaque rendu de la coque (le DOM est recréé). */
let observer = null;
let watchedMeta = null;
let blockRef = null;
let markRef = null;
let wordRef = null;
let glossRef = null;
let srRef = null;
let updateCount = 0;
let lastSignature = '';

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function motionAllowed(ctx) {
  try { return typeof ctx.reducedMotion === 'function' && !ctx.reducedMotion(); }
  catch { return false; }
}

/* E022-07 : toute la valeur vient du DOM rendu. Aucune date ni aucun total. */
function readSignals(detail) {
  const badge = detail.querySelector('.points-meta .confidence');
  const title = detail.querySelector('.points-point-title');
  return {
    token: badge ? String(badge.textContent || '').trim() : '',
    subject: title ? String(title.textContent || '').trim() : '',
  };
}

/* E022-04 : traduction déterministe, repli honnête sur le token brut. */
function describe(token) {
  const key = String(token || '').trim().toLocaleLowerCase('fr');
  const found = LABELS[key];
  if (found) return found;
  if (!key) return { label: 'Non renseignée', mark: '•', gloss: 'aucune certitude déclarée dans la fiche.' };
  return { label: token, mark: '•', gloss: 'libellé de certitude repris tel quel de la fiche.' };
}

/* E022-08 : écriture sans innerHTML, signature de déduplication, compteur. */
function paint(token, subject) {
  if (!blockRef || !markRef || !wordRef || !glossRef || !srRef) return;
  const info = describe(token);
  const signature = `${token}\u0000${subject}\u0000${info.label}`;
  if (signature === lastSignature) return;
  lastSignature = signature;
  updateCount += 1;

  markRef.textContent = info.mark;
  wordRef.textContent = info.label;
  glossRef.textContent = info.gloss;
  srRef.textContent = subject ? `Pour « ${subject} », certitude : ` : 'Certitude : ';
  blockRef.setAttribute('data-e022-token', token);
  blockRef.setAttribute('data-e022-subject', subject);
  blockRef.setAttribute('data-e022-updates', String(updateCount));
  blockRef.hidden = !token;
}

/* E022-03 / 06 / 09 : structure statique construite une seule fois. Seuls les
 * textes sont remplacés ensuite par paint() ; le badge d'origine reste intact. */
function buildBlock(ctx, detail) {
  const block = ctx.el('div', 'points-e022-block');
  block.id = BLOCK_ID;
  block.setAttribute('role', 'group');
  block.setAttribute('aria-labelledby', LABEL_ID);

  const label = ctx.el('p', 'points-e022-label', 'Certitude déclarée');
  label.id = LABEL_ID;
  block.appendChild(label);

  const value = ctx.el('p', 'points-e022-value');
  srRef = ctx.el('span', 'points-e022-sr', '');
  markRef = ctx.el('span', 'points-e022-mark', '');
  markRef.setAttribute('aria-hidden', 'true');
  wordRef = ctx.el('span', 'points-e022-word', '');
  value.append(srRef, markRef, wordRef);
  block.appendChild(value);

  glossRef = ctx.el('p', 'points-e022-gloss', '');
  block.appendChild(glossRef);

  blockRef = block;
  return block;
}

/* E022-03 : insertion à côté de .points-meta, jamais à l'intérieur. */
function mount(ctx, detail) {
  const existing = detail.querySelector('#' + BLOCK_ID);
  if (existing && existing.parentElement === detail) {
    blockRef = existing;
    markRef = existing.querySelector('.points-e022-mark');
    wordRef = existing.querySelector('.points-e022-word');
    glossRef = existing.querySelector('.points-e022-gloss');
    srRef = existing.querySelector('.points-e022-sr');
    if (!markRef || !wordRef || !glossRef || !srRef) {
      existing.remove();
    } else {
      return existing;
    }
  } else if (existing) {
    existing.remove();
  }

  const block = buildBlock(ctx, detail);
  const meta = detail.querySelector('.points-meta');
  if (meta && meta.parentElement === detail) {
    if (meta.nextSibling) detail.insertBefore(block, meta.nextSibling);
    else detail.appendChild(block);
  } else {
    detail.appendChild(block);
  }
  return block;
}

/* E022-10 : observateur unique, ciblé sur .points-meta que E022 n'écrit jamais
 * (aucune boucle d'écriture possible), déconnecté puis reconnecté au rendu neuf. */
function watch(meta, refresh) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  observer = null;
  watchedMeta = meta && meta.isConnected ? meta : null;
  if (!watchedMeta || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(refresh);
  observer.observe(watchedMeta, {
    childList: true, characterData: true, subtree: true,
    attributes: true, attributeFilter: ['class'],
  });
}

register('E022', (ctx) => {
  /* E022-01 — garde d'entrée : contexte incomplet = lentille neutre. */
  if (!ctx || !isElement(ctx.layout) || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const detail = ctx.layout.querySelector('.points-detail');
  if (!isElement(detail)) return;

  /* E022-02 — une seule feuille, identifiant dédié, aucun url/@import. */
  ctx.css(CSS_ID, CSS);

  /* Unique chemin de réconciliation, appelé à l'installation et par l'observateur.
   * Il gère les deux sens : l'apparition et la disparition du badge de confiance.
   * Sans token, aucun bloc n'est fabriqué : on n'invente aucune certitude. */
  const refresh = () => {
    if (!detail.isConnected) return;
    const signals = readSignals(detail);
    if (!signals.token) {
      const stale = detail.querySelector('#' + BLOCK_ID);
      if (stale && stale.parentElement === detail) stale.remove();
      blockRef = null;
      return;
    }
    if (!blockRef || !blockRef.isConnected || blockRef.parentElement !== detail) {
      const block = mount(ctx, detail);
      block.classList.toggle('points-e022-motion', motionAllowed(ctx));
      block.setAttribute('data-e022-motion', motionAllowed(ctx) ? 'on' : 'off');
    }
    paint(signals.token, signals.subject);
  };

  refresh();
  watch(detail.querySelector('.points-meta'), refresh);
});
