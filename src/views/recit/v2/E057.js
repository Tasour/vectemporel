import { register } from './registry.js';

/* V2 lentille E057 — Contraste et perception (complément de la passe 1).
   Dix chantiers V2 neufs, distincts de ceux de la passe 1 (contraste
   renforcé, ratio WCAG, motif de certitude, focus, bandeau du titre, états
   désactivés, progression texturée, légendes, espacement, préférence système).
   Ici : clarté perçue calculée sur les couleurs réellement rendues, encodage
   redondant du type de point, répartition des certitudes, lisibilité du statut
   de filtre, état actif des filtres par motif, message vide contrasté, étapes
   restantes, séparation perceptive des outils, liseré de la légende et bascule
   « métadonnées agrandies ». Tout chiffre affiché est dérivé du DOM réel.
   Tous non destructifs : sans ce module, la vue reste intégralement lisible.
   Préfixes : classes recit-v2-e057-, ids DOM v2-e057-, attributs
   data-v2-e057- (jamais les ids e057- / data-e057- de la passe 1, qui tourne
   sur le même DOM). Zéro réseau, zéro console, zéro aléa, aucun fichier
   partagé modifié. Code, commentaires et libellés en français. */

const RACINE = 'recit-v2-e057-root';

const CSS = `
.recit-v2-e057-root{--v2-e057-accent:#e6b96f}

/* E057-01 — Échelle de clarté perçue des trois niveaux de texte. */
.recit-v2-e057-readout{
  margin:6px 0;color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}
.recit-v2-e057-clarte,
.recit-v2-e057-certitudes,
.recit-v2-e057-reste{
  border-left:2px solid var(--v2-e057-accent);padding-left:8px;
}

/* E057-02 — Encodage redondant du type de point dans le fil (mot + motif). */
.recit-v2-e057-root .thread-kind{
  border:1px solid transparent;border-radius:3px;padding:0 2px;font-weight:700;
}
.recit-v2-e057-root .thread-kind[data-v2-e057-kind="récit"]{border-style:solid}
.recit-v2-e057-root .thread-kind[data-v2-e057-kind="figure"]{border-style:dashed}
.recit-v2-e057-root .thread-kind[data-v2-e057-kind="lieu"]{border-style:double}
.recit-v2-e057-root .thread-kind[data-v2-e057-kind="audit"]{border-style:dotted}

/* E057-03 — Répartition des certitudes du repère (paragraphe visible). */

/* E057-04 — Contraste et délimitation du statut de filtre. */
.recit-v2-e057-root .recit-v2-e057-status{
  color:var(--ink);border-left:2px solid var(--v2-e057-accent);
  padding-left:8px;font-size:10px;
}

/* E057-05 — État actif des filtres encodé par motif, pas par la seule couleur. */
.recit-v2-e057-root .c3a-filter.recit-v2-e057-filtre[aria-pressed="true"]{
  text-decoration:underline;text-decoration-style:wavy;text-underline-offset:3px;
  border-bottom-width:2px;
}

/* E057-06 — Contraste du message « aucun résultat ». */
.recit-v2-e057-root .recit-v2-e057-empty{
  color:var(--ink);background:rgba(230,185,111,.05);
}
.recit-v2-e057-root .recit-v2-e057-empty p::before{
  content:"∅ ";color:var(--v2-e057-accent);
}

/* E057-07 — Étapes restantes (paragraphe visible). */

/* E057-08 — Séparation perceptive de la zone d'outils (figure/fond). */
.recit-v2-e057-root .recit-v2-e057-outils{
  padding:8px 6px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);
  background:rgba(255,255,255,.02);border-radius:6px;
}

/* E057-09 — Liseré double distinctif de la légende d'aide. */
.recit-v2-e057-root .recit-v2-e057-legende{
  border-top:3px double var(--line-strong);
}

/* E057-10 — Bascule « métadonnées agrandies » pour la basse vision. */
.recit-v2-e057-bouton{
  min-height:36px;padding:6px 10px;border:1px solid var(--line);
  border-radius:8px;background:transparent;color:var(--gold-bright);
  font:inherit;font-size:10px;cursor:pointer;
}
.recit-v2-e057-bouton:focus-visible{
  outline:2px solid var(--gold-bright);outline-offset:2px;
}
.recit-v2-e057-root.recit-v2-e057-zoom .recit-meta,
.recit-v2-e057-root.recit-v2-e057-zoom .recit-timing,
.recit-v2-e057-root.recit-v2-e057-zoom .recit-conf,
.recit-v2-e057-root.recit-v2-e057-zoom .c3a-status,
.recit-v2-e057-root.recit-v2-e057-zoom .recit-legend{
  font-size:12px;
}
`;

function securiser(fn) {
  try { fn(); } catch { /* une lentille défaillante ne casse jamais le rendu */ }
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function') {
    noeud.classList.add(nom);
  }
}

function retireClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.remove === 'function') {
    noeud.classList.remove(nom);
  }
}

function setAttr(noeud, nom, valeur) {
  if (noeud && typeof noeud.setAttribute === 'function') {
    try { noeud.setAttribute(nom, valeur); } catch { /* attribut facultatif */ }
  }
}

/* Dépose (ou réutilise par id) un paragraphe de synthèse visible, dans un
   parent imbriqué — jamais directement sous stage/layout/body. */
function placeParagraphe(el, id, classe, parent, ancre, texte) {
  if (typeof document === 'undefined' || !parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = el('p', `recit-v2-e057-readout ${classe}`);
    noeud.id = id;
  }
  noeud.textContent = texte;
  const cible = (ancre && ancre.parentNode === parent) ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

/* Analyse une couleur CSS rgb()/rgba() renvoyée par getComputedStyle. */
function parseRgb(couleur) {
  const m = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(String(couleur || ''));
  if (!m) return null;
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
}

/* Luminance perceptive sRGB ramenée à une échelle 0–100. */
function clartéPourcent(rgb) {
  if (!rgb) return null;
  const l = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return Math.round(Math.max(0, Math.min(1, l)) * 100);
}

/* Couleur réellement calculée par le navigateur pour un nœud rendu. */
function lireCouleur(noeud) {
  if (!noeud || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return null;
  try { return window.getComputedStyle(noeud).color; } catch { return null; }
}

/* Bascule réversible, unique par id, insérée en tête de .recit-actions. */
function ajouterBouton(el, actions, id, libelleActif, libelleInactif, pressed, onChange) {
  if (typeof el !== 'function' || !actions || typeof actions.insertBefore !== 'function') return null;
  if (typeof document !== 'undefined' && document.getElementById(id)) return null;
  const bouton = el('button', 'recit-v2-e057-bouton', pressed ? libelleActif : libelleInactif);
  bouton.id = id;
  bouton.type = 'button';
  bouton.setAttribute('aria-pressed', String(pressed));
  bouton.addEventListener('click', () => onChange(bouton));
  actions.insertBefore(bouton, actions.firstChild);
  return bouton;
}

/* Préférence conservée d'un rendu à l'autre (la coque reconstruit le DOM). */
const prefs = { zoomMeta: false };

register('E057', (ctx) => {
  const { layout, css, el } = ctx || {};
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e057', CSS); /* un seul appel, toutes les règles du module */
    ajouteClasse(layout, RACINE);

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const kicker = corps.querySelector('.view-kicker');
    const titre = document.getElementById('recit-point-title') || corps.querySelector('.recit-title');
    const meta = corps.querySelector('.recit-meta');
    const legend = corps.querySelector('.recit-legend');
    const legendP = legend && legend.querySelector('p');
    const status = corps.querySelector('#c3a-status');
    const tools = corps.querySelector('.c3a-tools');
    const thread = corps.querySelector('.recit-thread');
    const threadTitre = thread && thread.querySelector('.recit-thread-title');
    const empty = corps.querySelector('.c3a-empty');
    const actions = corps.querySelector('.recit-actions');
    const filtres = Array.from(corps.querySelectorAll('.c3a-filter'));

    /* E057-01 — clarté perçue des trois niveaux, lue sur les couleurs rendues. */
    securiser(() => {
      const niveaux = [['titre', titre], ['secondaire', meta], ['tertiaire', legendP]];
      const parties = [];
      niveaux.forEach(([nom, noeud]) => {
        const pct = clartéPourcent(parseRgb(lireCouleur(noeud)));
        if (pct !== null) parties.push(`${nom} ${pct} %`);
      });
      if (!parties.length) return;
      placeParagraphe(el, 'v2-e057-clarte', 'recit-v2-e057-clarte', corps, titre,
        `Clarté perçue du texte : ${parties.join(' · ')} (échelle 0–100).`);
    });

    /* E057-02 — type de point encodé par un motif de bordure sur .thread-kind. */
    securiser(() => {
      const connus = ['récit', 'figure', 'lieu', 'audit'];
      Array.from(corps.querySelectorAll('.thread-kind')).forEach((tag) => {
        const valeur = String((tag && tag.textContent) || '').trim();
        setAttr(tag, 'data-v2-e057-kind', connus.indexOf(valeur) >= 0 ? valeur : 'autre');
      });
    });

    /* E057-03 — répartition des certitudes lue sur data-confidence du fil. */
    securiser(() => {
      if (!thread) return;
      const items = Array.from(thread.querySelectorAll('.recit-thread-item'));
      if (!items.length) return;
      const niveaux = [
        ['vérifié', 'vérifiés'], ['certain', 'certains'],
        ['probable', 'probables'], ['disputed', 'contestés'],
      ];
      const parties = niveaux.map(([valeur, pluriel]) => {
        const n = items.filter((it) => it && it.dataset && it.dataset.confidence === valeur).length;
        return `${n} ${pluriel}`;
      });
      placeParagraphe(el, 'v2-e057-certitudes', 'recit-v2-e057-certitudes', thread, threadTitre,
        `Répartition des certitudes du repère : ${parties.join(' · ')}.`);
    });

    /* E057-04 — statut de filtre contrasté et délimité. */
    securiser(() => { ajouteClasse(status, 'recit-v2-e057-status'); });

    /* E057-05 — filtres actifs soulignés par un motif ondulé (pas couleur seule). */
    securiser(() => { filtres.forEach((bouton) => ajouteClasse(bouton, 'recit-v2-e057-filtre')); });

    /* E057-06 — message vide contrasté et signalé par un glyphe. */
    securiser(() => { ajouteClasse(empty, 'recit-v2-e057-empty'); });

    /* E057-07 — étapes restantes calculées depuis « Étape X / Y ». */
    securiser(() => {
      if (!kicker) return;
      const trouvé = /Étape\s+(\d+)\s*\/\s*(\d+)/i.exec(kicker.textContent || '');
      if (!trouvé) return;
      const restants = Math.max(0, Number(trouvé[2]) - Number(trouvé[1]));
      placeParagraphe(el, 'v2-e057-reste', 'recit-v2-e057-reste', corps, kicker,
        `Étapes restantes après celle-ci : ${restants}.`);
    });

    /* E057-08 — séparation perceptive de la barre d'outils. */
    securiser(() => { ajouteClasse(tools, 'recit-v2-e057-outils'); });

    /* E057-09 — liseré double de la légende d'aide. */
    securiser(() => { ajouteClasse(legend, 'recit-v2-e057-legende'); });

    /* E057-10 — bascule « métadonnées agrandies » (cible ≥ 36 px, aria-pressed). */
    securiser(() => {
      if (prefs.zoomMeta) ajouteClasse(layout, 'recit-v2-e057-zoom');
      const bouton = ajouterBouton(el, actions, 'v2-e057-zoom-meta',
        'Métadonnées : agrandies', 'Métadonnées : normales', prefs.zoomMeta, (b) => {
          prefs.zoomMeta = !prefs.zoomMeta;
          if (prefs.zoomMeta) ajouteClasse(layout, 'recit-v2-e057-zoom');
          else retireClasse(layout, 'recit-v2-e057-zoom');
          b.setAttribute('aria-pressed', String(prefs.zoomMeta));
          b.textContent = prefs.zoomMeta ? 'Métadonnées : agrandies' : 'Métadonnées : normales';
        });
      if (bouton) bouton.title = 'Agrandit les textes secondaires pour les lecteurs à basse vision';
    });
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
