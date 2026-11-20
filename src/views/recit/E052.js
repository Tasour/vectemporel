import { register } from './registry.js';

/* Lentille E052 — Hiérarchie visuelle et informationnelle (vue Récit).
 *
 * Dix chantiers indépendants et non destructifs (E052-01 … E052-10) appliqués
 * après renderRecit(stage), qui appelle runEnhancements({ viewId:'recit', stage,
 * layout }) en fin de fonction (recit.js:451). La lentille travaille donc sur un
 * DOM déjà assemblé : elle n'ajoute que des classes, des étiquettes et quelques
 * nœuds discrets. Sans ce module, la vue reste intégralement lisible.
 *
 * Contrat respecté : un seul enregistrement de lentille, une seule feuille de
 * styles regroupée via ctx.css('recit-e052', …), classes préfixées recit-e052-, ids
 * créés préfixés e052- et uniques, français partout, aucun appel à la console,
 * aucune requête réseau, aucun recours au hasard, aucun fichier partagé modifié.
 *
 * Les nœuds porteurs d'un id e052- sont déposés à l'intérieur de .recit-body
 * (jamais en enfant direct de stage, layout ou body) : le mode diagnostic ne
 * masque que les éléments dont le parent est l'un de ces trois conteneurs.
 */

const CSS_ID = 'recit-e052';
const API = { el: null };

const CSS = `
/* E052-01 — échelle typographique à trois niveaux : sur-titre, titre, subordinate. */
.recit-e052-scale .view-kicker{display:block;margin:0 0 .45em;color:var(--gold);font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
.recit-e052-scale .recit-title{margin:0 0 .5em;line-height:1.1;letter-spacing:-.015em;text-wrap:balance}
.recit-e052-scale .recit-title:focus-visible{outline:2px solid var(--gold-bright);outline-offset:3px}

/* E052-02 — numéro d'étape mis en exergue dans le sur-titre. */
.recit-e052-step-num{display:inline-block;margin-right:.2em;padding:1px 6px;border:1px solid var(--line-strong);border-radius:999px;color:var(--gold-bright);font-size:.92em;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:.02em}
.recit-e052-step-kind{color:var(--muted);font-weight:600}

/* E052-03 — poids de certitude : la forme et le graisse complètent la couleur. */
.recit-e052-conf--verifie{border-style:solid;border-width:2px;font-weight:700}
.recit-e052-conf--certain{border-style:solid;font-weight:700}
.recit-e052-conf--probable{border-style:dashed;font-weight:600}
.recit-e052-conf--conteste{border-style:dotted;font-weight:600}

/* E052-04 — étiquette textuelle de la progression, alignée sur la barre. */
.recit-e052-progress-label{display:block;margin:-6px 0 12px;color:var(--muted);font-size:10px;font-variant-numeric:tabular-nums;letter-spacing:.04em;text-align:right}
@media (max-width:620px){.recit-e052-progress-label{text-align:left}}

/* E052-05 — bandeau de métadonnées subordonné au titre. */
.recit-e052-submeta{padding-left:10px;border-left:2px solid var(--line-strong);color:var(--muted)}
.recit-e052-submeta.recit-timing{margin-top:4px;font-size:10px}

/* E052-06 — plan du document : titres de section masqués mais annonçables. */
.recit-e052-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

/* E052-07 — légende à sous-niveaux : libellé directeur en tête de paragraphe. */
.recit-e052-legend > p{padding-left:10px;border-left:2px solid var(--line)}
.recit-e052-legend-label{display:inline;color:var(--ink);font-weight:700}

/* E052-08 — fil : ordinal hiérarchique et marqueur de l'étape courante. */
.recit-e052-thread .recit-e052-ordinal{margin-right:.35em;color:var(--gold);font-weight:700;font-variant-numeric:tabular-nums}
.recit-e052-thread .recit-e052-kind-tag{opacity:.75;font-size:.9em}
.recit-thread-item.recit-e052-current{position:relative}
.recit-thread-item.recit-e052-current::before{content:"";position:absolute;left:0;top:4px;bottom:4px;width:2px;border-radius:2px;background:var(--gold-bright)}

/* E052-09 — hiérarchie des commandes : principal, accent, secondaire. */
.recit-e052-actions button.recit-e052-primary:not([disabled]){border-color:var(--gold);color:#0d1017;background:var(--gold);font-weight:700}
.recit-e052-actions button.recit-e052-accent{border-color:var(--gold);color:var(--gold-bright)}
.recit-e052-actions button.recit-e052-accent[aria-pressed="true"]{background:rgba(230,185,111,.12)}
.recit-e052-actions button.recit-e052-secondary{border-color:var(--line);color:var(--muted)}
.recit-e052-actions button.recit-e052-secondary:hover:not([disabled]){border-color:var(--gold);color:var(--ink)}
.recit-e052-actions button:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E052-10 — média : illustration dominante, légende, crédit en tertiaire. */
.recit-media.recit-e052-media .media-caption{opacity:.95}
.recit-media.recit-e052-media .recit-media-credit{opacity:.7;font-size:8px}
.recit-media.recit-e052-media .media-empty{color:var(--muted);font-size:10px;font-style:italic}

/* Confort : mouvement réduit, lu une seule fois par rendu. */
.recit-e052-no-motion [class*="recit-e052-"]{transition:none!important;animation:none!important}
@media (prefers-reduced-motion:reduce){[class*="recit-e052-"]{transition:none!important;animation:none!important}}
`;

/* Aucun chantier ne peut faire échouer un autre chantier ni le rendu. */
function guard(fn) {
  try { return fn(); } catch { return null; }
}

function make(tag, className, text) {
  if (API.el && typeof API.el === 'function') return API.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function one(root, selector) {
  return guard(() => (root && root.querySelector) ? root.querySelector(selector) : null);
}

function all(root, selector) {
  return guard(() => (root && root.querySelectorAll) ? Array.from(root.querySelectorAll(selector)) : []) || [];
}

function add(node, className) {
  if (node && node.classList && !node.classList.contains(className)) node.classList.add(className);
}

function byId(id) {
  return guard(() => document.getElementById(id));
}

/* E052-01 — échelle typographique : un seul point focal, sur-titre et
   métadonnées clairement subordonnés. */
function echelleTypographique(body) {
  add(body, 'recit-e052-scale');
}

/* E052-02 — le sur-titre « Étape X / Y · type » devient une hiérarchie lisible :
   numéro de étape en pastille, type en complément. Le texte visible et l'ordre
   des mots sont conservés (l'expression régulière des autres lentilles reste
   valide), le texte brut est gardé dans aria-label. */
function etapeEnExergue(body) {
  const kicker = one(body, '.view-kicker');
  if (!kicker || kicker.hasAttribute('data-e052-step')) return;
  if (kicker.children && kicker.children.length) return;
  const brut = (kicker.textContent || '').trim();
  const m = /^(Étape)\s+(\d+)\s*\/\s*(\d+)(.*)$/i.exec(brut);
  if (!m) return;
  const numero = make('span', 'recit-e052-step-num', `${m[2]} / ${m[3]}`);
  const type = make('span', 'recit-e052-step-kind', m[4].replace(/^\s*·\s*/, '').trim());
  kicker.textContent = '';
  kicker.appendChild(document.createTextNode(`${m[1]} `));
  kicker.appendChild(numero);
  if (type.textContent) {
    kicker.appendChild(document.createTextNode(' · '));
    kicker.appendChild(type);
  }
  kicker.setAttribute('aria-label', brut);
  kicker.setAttribute('data-e052-step', '1');
}

/* E052-03 — la certitude est hiérarchisée par le style de bordure et le poids
   de la police, jamais par la seule couleur ; le libellé visible est intact. */
function poidsCertitude(body) {
  const conf = one(body, '.recit-conf');
  if (!conf || conf.hasAttribute('data-e052-conf')) return;
  const texte = (conf.textContent || '').toLowerCase();
  let niveau = 'autre';
  if (/vérifi/.test(texte)) niveau = 'verifie';
  else if (/certain/.test(texte)) niveau = 'certain';
  else if (/probable/.test(texte)) niveau = 'probable';
  else if (/contest/.test(texte)) niveau = 'conteste';
  if (niveau !== 'autre') add(conf, `recit-e052-conf--${niveau}`);
  conf.setAttribute('data-e052-conf', niveau);
}

/* E052-04 — la barre de progression reçoit une étiquette chiffrée, dérivée de
   sa largeur réelle et de l'étape lue dans le sur-titre. Masquée aux lecteurs
   d'écran pour ne pas doubler le progressbar d'E015. */
function etiquetteProgression(body) {
  if (byId('e052-progress-label')) return;
  const barre = one(body, '.recit-progress');
  if (!barre || !barre.parentNode) return;
  const kicker = (one(body, '.view-kicker')?.textContent || '');
  const m = /(\d+)\s*\/\s*(\d+)/.exec(kicker);
  const remplissage = one(barre, 'span');
  let pourcent = 0;
  if (remplissage && remplissage.style && remplissage.style.width) {
    const largeur = parseFloat(remplissage.style.width);
    if (!Number.isNaN(largeur)) pourcent = Math.max(0, Math.min(100, Math.round(largeur)));
  }
  const etape = m ? Number(m[1]) : 0;
  const total = m ? Number(m[2]) : 0;
  const texte = total
    ? `Progression : étape ${etape} sur ${total} · ${pourcent} %`
    : `Progression : ${pourcent} %`;
  const etiquette = make('p', 'recit-e052-progress-label', texte);
  etiquette.id = 'e052-progress-label';
  etiquette.setAttribute('aria-hidden', 'true');
  barre.parentNode.insertBefore(etiquette, barre.nextSibling);
}

/* E052-05 — le repère, l'année, la certitude et la durée forment un bandeau
   de métadonnées visuellement subordonné au titre. */
function bandeauMetadonnees(body) {
  ['.recit-meta', '.recit-timing'].forEach((selecteur) => {
    add(one(body, selecteur), 'recit-e052-submeta');
  });
}

/* E052-06 — un plan documentaire : des titres h2 masqués structurent la vue
   pour les lecteurs d'écran sans modifier le contenu visible. */
function planDocumentaire(body) {
  const titre = (ancre, id, libelle) => {
    if (!ancre || !ancre.parentNode || byId(id)) return;
    const t = make('h2', 'recit-e052-sr-only', libelle);
    t.id = id;
    ancre.parentNode.insertBefore(t, ancre);
  };
  titre(one(body, '.view-kicker'), 'e052-h-texte', 'Texte du point courant');
  titre(one(body, '.recit-thread'), 'e052-h-fil', 'Fil du repère');
  titre(one(body, '.recit-trace') || one(body, '.recit-sources'),
    'e052-h-trace', 'Traçabilité des sources');
  titre(one(body, '.recit-actions'), 'e052-h-actions', 'Commandes de lecture');
  titre(one(body, '.recit-legend'), 'e052-h-legende', 'Légende et aide à la lecture');
}

/* E052-07 — chaque paragraphe de la légende est précédé d'un libellé directeur
   en gras ; le texte intégral est conservé à l'identique. */
function legendeNiveaux(body) {
  const legend = one(body, '.recit-legend');
  if (!legend) return;
  add(legend, 'recit-e052-legend');
  all(legend, 'p').forEach((p) => {
    if (p.hasAttribute('data-e052-legend')) return;
    if (p.children && p.children.length) return;
    const texte = p.textContent || '';
    const i = texte.indexOf(' :');
    if (i <= 0) return;
    const directeur = make('strong', 'recit-e052-legend-label', texte.slice(0, i));
    p.textContent = '';
    p.appendChild(directeur);
    p.appendChild(document.createTextNode(texte.slice(i)));
    p.setAttribute('data-e052-legend', '1');
  });
}

/* E052-08 — le fil gagne un ordinal tabulaire et un marqueur latéral pour
   l'étape courante, en complément de la couleur. */
function filHierarchique(body) {
  const fil = one(body, '.recit-thread');
  if (!fil) return;
  add(fil, 'recit-e052-thread');
  all(fil, '.recit-thread-item').forEach((bouton) => {
    if (bouton.hasAttribute('data-e052-ordinal')) return;
    for (const noeud of Array.from(bouton.childNodes || [])) {
      if (noeud.nodeType === 3) {
        const m = /^(\d+)\.\s*/.exec(noeud.nodeValue || '');
        if (m) {
          const ordinal = make('span', 'recit-e052-ordinal', m[0]);
          noeud.nodeValue = noeud.nodeValue.slice(m[0].length);
          bouton.insertBefore(ordinal, noeud);
        }
        break;
      }
    }
    add(one(bouton, '.thread-kind'), 'recit-e052-kind-tag');
    if (bouton.getAttribute('aria-current') === 'step' || bouton.classList.contains('is-current')) {
      add(bouton, 'recit-e052-current');
    }
    bouton.setAttribute('data-e052-ordinal', '1');
  });
}

/* E052-09 — trois niveaux d'action : « Point suivant » principal, lecture
   automatique en accent, le reste en secondaire. Le texte et les états
   disabled / aria-pressed ne sont pas modifiés. */
function commandesHierarchisees(body) {
  const actions = one(body, '.recit-actions');
  if (!actions) return;
  add(actions, 'recit-e052-actions');
  all(actions, 'button').forEach((bouton) => {
    if (bouton.hasAttribute('data-e052-action')) return;
    const fk = bouton.getAttribute('data-fk') || '';
    const libelle = bouton.textContent || '';
    let niveau = 'secondary';
    if (fk === 'c3a-next' || /Point suivant/.test(libelle)) niveau = 'primary';
    else if (fk === 'c3a-play' || /Lecture automatique/.test(libelle)) niveau = 'accent';
    add(bouton, `recit-e052-${niveau}`);
    bouton.setAttribute('data-e052-action', niveau);
  });
}

/* E052-10 — le bloc image est étiqueté comme un ensemble où l'illustration
   domine, la légende vient ensuite et le crédit reste tertiaire. */
function mediaHierarchise(stage) {
  const media = one(stage, '.recit-media');
  if (!media) return;
  add(media, 'recit-e052-media');
}

register('E052', (ctx) => {
  API.el = (ctx && typeof ctx.el === 'function') ? ctx.el : null;
  try {
    if (!ctx || typeof document === 'undefined') return;
    const stage = ctx.stage;
    if (!stage || typeof stage.querySelector !== 'function') return;

    /* Un seul appel CSS, regroupant toutes les règles du module. */
    if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);

    const layout = ctx.layout || one(stage, '.recit-layout');
    const body = one(stage, '.recit-body') || (layout && one(layout, '.recit-body'));
    if (!body) return;

    const reduit = (typeof ctx.reducedMotion === 'function') ? !!ctx.reducedMotion() : false;
    if (reduit) add(layout, 'recit-e052-no-motion');

    const chantiers = [
      () => echelleTypographique(body),
      () => etapeEnExergue(body),
      () => poidsCertitude(body),
      () => etiquetteProgression(body),
      () => bandeauMetadonnees(body),
      () => planDocumentaire(body),
      () => legendeNiveaux(body),
      () => filHierarchique(body),
      () => commandesHierarchisees(body),
      () => mediaHierarchise(stage),
    ];
    chantiers.forEach((chantier) => { guard(chantier); });
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
