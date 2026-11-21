import { register } from './registry.js';

/* Lentille E077 — textes alternatifs, descriptions longues et équivalence
 * sémantique dans la vue Chronologie.
 *
 * Lectures seules : src/views/chronology.js, src/views/chronology/registry.js,
 * src/views/chronology/index.js, styles.css. Un seul register('E077'), un seul
 * css('chronology-e077', …), aucun fichier partagé modifié. Aucun appel réseau,
 * aucune source d'aléa, aucun affichage dans la console, aucun timer ni boucle
 * d'animation propre au greffon, aucun écouteur : tout est déclaratif.
 *
 * Les dix chantiers E077-01..E077-10 sont implémentés ici. Aucune donnée
 * historique n'est inventée : les textes diffusés sont soit les textes réels
 * du DOM (alt d'origine, titre, année, crédit, licence, sources), soit des
 * formulations françaises de cadrage calculées depuis ces seuls textes.
 */

const READOUT_ID = 'e077-readout';
const FIGURE_ID = 'e077-figure';
const CAPTION_ID = 'e077-caption';
const LONGDESC_ID = 'e077-longdesc';
const ORIGINAL_ID = 'e077-original';

/* E077-01 : marqueurs de fonction, déterministes et sans réseau. Les mots
   ambigus (« on », « en » présent dans les deux langues) sont écartés. */
const FRENCH_WORDS = [
  'le', 'la', 'les', 'des', 'du', 'de', 'un', 'une', 'dans', 'sur', 'avec',
  'pour', 'par', 'est', 'sont', 'vue', 'vues', 'siècle',
  'représentant', 'devant', 'selon', 'première', 'lors', 'aucune', 'cette',
  'ensemble', 'aujourd', 'musée', 'époque', 'royaume', 'empire', 'français',
];
const ENGLISH_WORDS = [
  'the', 'of', 'and', 'from', 'with', 'seen', 'into', 'over', 'under', 'this',
  'first', 'last', 'battle', 'museum', 'portrait', 'cover', 'presenting',
  'depicted', 'reconstruction', 'century', 'king', 'royal', 'library', 'left',
  'right', 'during', 'after', 'before', 'by', 'in', 'on', 'at', 'its',
];
const FRENCH_SET = new Set(FRENCH_WORDS.filter((word) => word.indexOf(' ') < 0));
const ENGLISH_SET = new Set(ENGLISH_WORDS);

const KIND_LABELS = {
  'récit': 'récit (fait narré)',
  'figure': 'figure (donnée chiffrée)',
  'lieu': 'lieu (repère géographique)',
  'audit': 'audit (vérification)',
};
const CONFIDENCE_LABELS = {
  'vérifié': 'vérifié',
  'certain': 'certain',
  'probable': 'probable',
  'disputed': 'contesté',
  'contesté': 'contesté',
};

const CSS = `
  .e077-sr-only {
    position: absolute !important; width: 1px; height: 1px; padding: 0;
    margin: -1px; overflow: hidden; clip: rect(0 0 0 0);
    white-space: nowrap; border: 0;
  }
  .chronology-layout .e077-readout {
    min-height: 13px; margin: -6px 0 12px; color: var(--muted);
    font-size: 9px; line-height: 1.45; font-variant-numeric: tabular-nums;
  }
  .chronology-layout .e077-figure { margin: 0; }
  .chronology-layout .e077-caption {
    margin: 6px 0 0; color: var(--ink-soft); font-size: 10px; line-height: 1.45;
  }
  .chronology-layout .e077-longdesc {
    margin: 8px 0 4px; padding: 6px 8px;
    border: 1px solid var(--line); border-radius: 8px;
    background: rgba(255, 255, 255, .02);
  }
  .chronology-layout .e077-longdesc > summary {
    min-height: 36px; padding: 6px 4px; color: var(--gold-bright);
    font-size: 10px; cursor: pointer;
  }
  .chronology-layout .e077-longdesc > summary:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  .chronology-layout .e077-longdesc > p {
    margin: 6px 4px; color: var(--muted); font-size: 10px; line-height: 1.5;
  }
  .chronology-layout .e077-original { font-style: italic; }
  .chronology-layout[data-e077-reduced="1"] .e077-longdesc,
  .chronology-layout[data-e077-reduced="1"] .e077-longdesc > summary {
    transition: none !important;
  }
  @media (prefers-reduced-motion: reduce) {
    .chronology-layout .e077-longdesc,
    .chronology-layout .e077-longdesc > summary { transition: none !important; }
  }
`;

function byId(id) {
  return document.getElementById(id) || null;
}

function textOf(node) {
  return node && node.textContent ? String(node.textContent).trim() : '';
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9à-ÿ]+/g, ' ').trim();
}

function addToken(node, attribute, token) {
  if (!node || !token) return;
  const current = node.getAttribute(attribute);
  const tokens = current ? current.split(/\s+/).filter(Boolean) : [];
  if (!tokens.includes(token)) node.setAttribute(attribute, tokens.concat(token).join(' '));
}

/* E077-06 et E077-07 ne créent aucun nœud visible : elles ne font que
   qualifier des textes déjà présents, en préservant leur libellé exact. */
function kindLabel(raw) {
  return KIND_LABELS[normalize(raw)] || raw;
}

function confidenceLabel(raw) {
  return CONFIDENCE_LABELS[normalize(raw)] || raw;
}

/* E077-01 : score de marqueurs de fonction, jamais de réseau ni d'aléa. */
function languageOf(value) {
  const tokens = String(value || '').toLowerCase().match(/[a-zà-ÿ]+/g) || [];
  let french = 0;
  let english = 0;
  tokens.forEach((token) => {
    if (FRENCH_SET.has(token)) french += 1;
    if (ENGLISH_SET.has(token)) english += 1;
  });
  if (!french && !english) return 'indéterminé';
  if (english > french && english >= 2) return 'en';
  if (french > english) return 'fr';
  return 'mixte';
}

/* E077-02 : équivalent français composé uniquement à partir des champs réels
   déjà rendus par la vue (chronology.js:423, :430, :437). */
function frenchEquivalent(aside) {
  const title = textOf(aside && aside.querySelector('.aside-title'));
  const yearLine = textOf(aside && aside.querySelector('.aside-year'));
  const parts = yearLine.split('·').map((part) => part.trim()).filter(Boolean);
  const year = parts[0] || '';
  const subtitle = parts.slice(1).join(' · ');
  const credit = textOf(aside && aside.querySelector('.aside-credit'));
  const chunks = [`Illustration du repère « ${title || 'sans titre'} »`];
  if (year) chunks.push(year);
  if (subtitle) chunks.push(subtitle);
  if (credit) chunks.push(`crédit : ${credit}`);
  return `${chunks.join(' — ')}.`;
}

function ensureNode(parent, id, tag, className, content, el) {
  if (!parent || typeof parent.querySelector !== 'function') return null;
  let node = byId(id);
  if (node && String(node.tagName).toLowerCase() !== String(tag).toLowerCase()) {
    if (node.parentNode) node.parentNode.removeChild(node);
    node = null;
  }
  if (!node) {
    node = el(tag, className, content);
    node.id = id;
  }
  return node;
}

function place(node, parent, before) {
  if (!node || !parent) return;
  const anchor = before && before.parentNode === parent ? before : null;
  if (anchor) parent.insertBefore(node, anchor);
  else if (node.parentNode !== parent) parent.appendChild(node);
}

/* E077-01 et E077-04 : diagnostic de langue, puis neutralisation de l'alt
   redondant des cartes. L'alt d'origine est conservé tel quel en attribut. */
function prepareImages(layout, stats) {
  const images = Array.from(layout.querySelectorAll('img'));
  images.forEach((img) => {
    const original = img.getAttribute('alt') || '';
    img.dataset.e077AltOriginal = original;
    const lang = languageOf(original);
    img.dataset.e077AltLang = lang;
    if (lang === 'en' || lang === 'mixte') stats.foreign += 1;
    if (!original) stats.missingOriginal += 1;
    if (img.classList.contains('aside-image')) {
      stats.asideImages += 1;
      img.dataset.e077Role = 'informative';
    } else if (img.closest('.event-card')) {
      stats.cardImages += 1;
      img.dataset.e077Role = 'decorative';
      /* Le nom du bouton contient déjà année, titre et sous-titre
         (chronology.js:392-401) : l'alt répéterait la même information. */
      img.setAttribute('alt', '');
      img.setAttribute('aria-hidden', 'true');
    }
  });
  stats.images = images.length;
  return images;
}

/* E077-02, E077-03 et E077-05 : une figure sémantique regroupe l'image, sa
   légende courte, sa description longue et son crédit. Les nœuds de la vue
   sont déplacés, jamais renommés ni réécrits. */
function installFigure(aside, el, stats) {
  const img = aside && aside.querySelector('img.aside-image');
  if (!img) return null;
  const credit = aside.querySelector('.aside-credit');
  const summary = aside.querySelector('.aside-summary');
  const original = img.dataset.e077AltOriginal || img.getAttribute('alt') || '';
  const lang = img.dataset.e077AltLang || languageOf(original);
  const equivalent = frenchEquivalent(aside);

  const figure = ensureNode(aside, FIGURE_ID, 'figure', 'e077-figure', undefined, el);
  if (!figure) return null;

  /* Garde d'existence sur l'id de l'image : un nœud périmé d'un rendu
     précédent ne peut pas créer de doublon. */
  const occupied = byId('e077-figure-image');
  if (occupied && occupied !== img) occupied.removeAttribute('id');
  if (!figure.contains(img)) figure.insertBefore(img, figure.firstChild);
  img.id = 'e077-figure-image';

  const caption = ensureNode(figure, CAPTION_ID, 'figcaption', 'e077-caption', equivalent, el);
  if (caption) {
    if (caption.textContent !== equivalent) caption.textContent = equivalent;
    place(caption, figure, credit && credit.parentNode === figure ? credit : null);
    addToken(img, 'aria-describedby', CAPTION_ID);
  }

  /* E077-02 : seul l'alt non français reçoit un nom accessible français ; un
     alt déjà français reste le nom de l'image, sans duplication. */
  if (lang === 'en' || lang === 'mixte' || lang === 'indéterminé') {
    img.setAttribute('aria-label', equivalent);
    img.dataset.e077Equivalent = '1';
    stats.translated += 1;
  } else {
    img.removeAttribute('aria-label');
    img.removeAttribute('data-e077-equivalent');
  }

  const details = ensureNode(figure, LONGDESC_ID, 'details', 'e077-longdesc', undefined, el);
  if (details) {
    let summaryNode = details.querySelector('summary');
    if (!summaryNode) {
      summaryNode = el('summary', '', 'Description détaillée de l’illustration');
      details.appendChild(summaryNode);
    }
    const originalText = `Texte alternatif d’origine (${lang === 'fr' ? 'français' : 'anglais'}) : ${original || 'aucun texte fourni'}`;
    const originalNode = ensureNode(details, ORIGINAL_ID, 'p', 'e077-original', originalText, el);
    if (originalNode) {
      if (originalNode.textContent !== originalText) originalNode.textContent = originalText;
      originalNode.setAttribute('lang', lang === 'fr' ? 'fr' : 'en');
      place(originalNode, details, null);
    }
    let note = details.querySelector('.e077-note');
    if (!note) {
      note = el('p', 'e077-note',
        'Ce texte est conservé tel qu’il figure dans les données ; la légende ci-dessus en donne l’équivalent français à partir des champs visibles du repère.');
      details.appendChild(note);
    }
  }

  if (credit && !figure.contains(credit)) figure.appendChild(credit);
  place(figure, aside, summary);
  if (credit && figure.contains(credit)) figure.appendChild(credit);
  if (details) place(details, figure, null);
  return figure;
}

/* E077-06 : les badges gardent leur texte visible mais exposent une
   paraphrase française, y compris « disputed » → « contesté ». */
function translateBadges(layout, el, stats) {
  Array.from(layout.querySelectorAll('.point-kind, .confidence')).forEach((badge) => {
    const raw = textOf(badge);
    const isKind = badge.classList.contains('point-kind');
    const label = isKind ? kindLabel(raw) : confidenceLabel(raw);
    badge.setAttribute('aria-label', `${isKind ? 'Nature du point' : 'Niveau de confiance'} : ${label}`);
    badge.setAttribute('title', label);
    stats.badges += 1;
  });
}

/* E077-07 : crédit et licence déjà visibles reçoivent un nom explicite. */
function nameCredit(aside, stats) {
  const credit = aside && aside.querySelector('.aside-credit');
  if (!credit) return;
  const parts = textOf(credit).split('·').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return;
  credit.setAttribute('aria-label', `Crédit de l’illustration : ${parts[0]}.${parts[1] ? ` Licence : ${parts[1]}.` : ''}`);
  stats.credits += 1;
}

/* E077-08 : le détail de la source n'existe que dans un attribut title,
   souvent ignoré des lecteurs d'écran : on le rend textuel et indexable. */
function nameSources(aside, el, stats) {
  if (!aside) return;
  const points = Array.from(aside.querySelectorAll('li.point'));
  points.forEach((point, pointIndex) => {
    Array.from(point.querySelectorAll('.point-sources li')).forEach((source, sourceIndex) => {
      const detail = source.getAttribute('title');
      if (!detail) return;
      const id = `e077-source-${pointIndex + 1}-${sourceIndex + 1}`;
      let node = byId(id);
      if (node && !source.contains(node)) {
        if (node.parentNode) node.parentNode.removeChild(node);
        node = null;
      }
      if (!node) {
        node = el('span', 'e077-sr-only', `Détail de la source : ${detail}`);
        node.id = id;
        source.appendChild(node);
      }
      stats.sources += 1;
    });
  });
}

/* E077-09 : audit d'équivalence — références mortes, alt dupliqués et
   images sans nom — publié sous forme de compteurs dans le DOM. L'audit des
   références est volontairement limité aux nœuds possédés par E077 : les
   greffons enregistrés après celui-ci (index.js:79 et suivants) n'ont pas
   encore créé leurs cibles au moment où le nœud courant est appliqué, et un
   audit global produirait de faux positifs dépendants de l'ordre d'import. */
function audit(layout, stats) {
  const owned = Array.from(layout.querySelectorAll('#e077-figure, [id^="e077"]'));
  owned.forEach((node) => {
    const refs = String(node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    refs.forEach((ref) => {
      if (!byId(ref)) stats.brokenRefs += 1;
    });
  });
  const cards = Array.from(layout.querySelectorAll('.event-card'));
  cards.forEach((card) => {
    const title = textOf(card.querySelector('strong'));
    const subtitle = textOf(card.querySelector('.event-subtitle'));
    const img = card.querySelector('img');
    const original = normalize(img && img.dataset.e077AltOriginal);
    if (original && (original === normalize(title) || original === normalize(subtitle))) {
      stats.duplicateAlt += 1;
    }
  });
  layout.dataset.e077Images = String(stats.images);
  layout.dataset.e077Foreign = String(stats.foreign);
  layout.dataset.e077MissingAlt = String(stats.missingOriginal);
  layout.dataset.e077AsideImages = String(stats.asideImages);
  layout.dataset.e077Descriptive = String(stats.cardImages);
  layout.dataset.e077Translated = String(stats.translated);
  layout.dataset.e077Badges = String(stats.badges);
  layout.dataset.e077Credits = String(stats.credits);
  layout.dataset.e077Sources = String(stats.sources);
  layout.dataset.e077BrokenRefs = String(stats.brokenRefs);
  layout.dataset.e077DuplicateAlt = String(stats.duplicateAlt);
  return stats;
}

/* E077-10 : un seul readout vivant, réaffirmé à chaque rendu (la coque
   reconstruit le DOM à chaque set(), chronology.js:539). */
function installReadout(layout, el, stats) {
  const main = layout.querySelector('.chronology-main') || layout;
  const anchor = byId('atlas-chrono-status');
  let readout = byId(READOUT_ID);
  if (readout && !main.contains(readout)) {
    if (readout.parentNode) readout.parentNode.removeChild(readout);
    readout = null;
  }
  if (!readout) {
    readout = el('p', 'e077-readout');
    readout.id = READOUT_ID;
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
  }
  const message = `Textes alternatifs : ${stats.images} image(s) relevée(s) · ${stats.foreign} texte(s) d’origine non français · `
    + `${stats.translated} équivalent(s) français · ${stats.cardImages} image(s) décorative(s) `
    + `(nom déjà porté par la carte) · ${stats.badges} badge(s) et ${stats.sources} source(s) explicités · `
    + `${stats.brokenRefs} référence(s) orpheline(s) · ${stats.duplicateAlt} alt redondant(s).`;
  if (readout.textContent !== message) readout.textContent = message;
  place(readout, main, anchor && anchor.nextSibling);
}

register('E077', (ctx) => {
  const { viewId, stage, layout, css, el, reducedMotion } = ctx;
  if (viewId !== 'chronology' || !layout || typeof layout.querySelector !== 'function') return;

  /* E077-10 : un seul bloc CSS, injecté une seule fois par le registre
     (registry.js:13-19), quel que soit le nombre de rendus. */
  css('chronology-e077', CSS);
  layout.dataset.e077 = '1';
  layout.dataset.e077Reduced = reducedMotion() ? '1' : '0';

  const stats = {
    images: 0,
    foreign: 0,
    missingOriginal: 0,
    asideImages: 0,
    cardImages: 0,
    translated: 0,
    badges: 0,
    credits: 0,
    sources: 0,
    brokenRefs: 0,
    duplicateAlt: 0,
  };

  const aside = layout.querySelector('.chronology-aside');
  prepareImages(layout, stats);
  installFigure(aside, el, stats);
  translateBadges(layout, el, stats);
  nameCredit(aside, stats);
  nameSources(aside, el, stats);
  audit(layout, stats);
  installReadout(layout, el, stats);
});
