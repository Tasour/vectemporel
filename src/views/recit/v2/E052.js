import { register } from './registry.js';

/* V2 lentille E052 — Hiérarchie visuelle et informationnelle (complément de la passe 1).
   La passe 1 traite déjà l'échelle typographique, la pastille d'étape, le poids de
   certitude, l'étiquette de progression, le bandeau de métadonnées, le plan sonore,
   la légende à niveaux, l'ordinal du fil, la hiérarchie des boutons et du média.
   La V2 propose donc DIX chantiers neufs et distincts, centrés sur les registres
   que la passe 1 n'a pas touchés : la zone de filtrage, le statut, le chapeau, le
   fil chiffré, l'échelle graduée, la traçabilité, la certitude dans le fil, le
   clavier de la légende, l'année du repère et la note d'absence de source.
   Préfixes : classes recit-v2-e052-, ids DOM v2-e052- (jamais e052- de la passe 1,
   qui tourne sur le MÊME DOM). Tout chiffre affiché est dérivé du DOM réel.
   Zéro réseau, zéro console, zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* E052-01 — zone de filtrage : registre secondaire délimité. */
.recit-layout .recit-v2-e052-tools{margin-top:14px;padding:10px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.recit-layout .recit-v2-e052-tools .c3a-group-label{color:var(--muted-2);font-size:9px;letter-spacing:.14em;text-transform:uppercase}

/* E052-02 — statut : bandeau d'état subordonné au contenu. */
.recit-layout #c3a-status.recit-v2-e052-status{margin:0 0 10px;padding:6px 9px;border-left:2px solid var(--line-strong);background:rgba(255,255,255,.02);font-variant-numeric:tabular-nums}

/* E052-03 — résumé : paragraphe d'introduction (chapeau). */
.recit-layout .recit-v2-e052-lead{margin:14px 0 18px;padding-left:12px;border-left:2px solid var(--gold);color:var(--ink-soft);font-size:15px;line-height:1.62}
@media (max-width:620px){.recit-layout .recit-v2-e052-lead{font-size:14px}}

/* E052-04 — fil : compteur de points chiffré dans le titre. */
.recit-v2-e052-thread-count{color:var(--gold-bright);font-weight:700;font-variant-numeric:tabular-nums;text-transform:none;letter-spacing:.02em}

/* E052-05 — progression : échelle graduée en segments. */
.recit-v2-e052-scale{display:flex;gap:3px;margin:-8px 0 12px}
.recit-v2-e052-seg{flex:1 1 0;height:3px;border-radius:2px;background:rgba(255,255,255,.09)}
.recit-v2-e052-seg.est-franchi{background:var(--gold)}
.recit-v2-e052-seg.est-courant{box-shadow:0 0 0 1px var(--gold-bright)}

/* E052-06 — traçabilité : pastille de dénombrement des références. */
.recit-layout .recit-v2-e052-trace summary{gap:7px}
.recit-v2-e052-trace-badge{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:18px;padding:0 5px;border:1px solid var(--line-strong);border-radius:999px;color:var(--gold-bright);font-size:9px;font-variant-numeric:tabular-nums}

/* E052-07 — fil : indice de certitude par la forme du soulignement. */
.recit-layout .recit-v2-e052-conf--verifie{text-decoration:underline;text-decoration-style:solid;text-decoration-color:var(--gold-bright)}
.recit-layout .recit-v2-e052-conf--certain{text-decoration:underline;text-decoration-style:double;text-decoration-color:var(--muted)}
.recit-layout .recit-v2-e052-conf--probable{text-decoration:underline;text-decoration-style:dashed;text-decoration-color:var(--muted)}
.recit-layout .recit-v2-e052-conf--conteste{text-decoration:underline;text-decoration-style:dotted;text-decoration-color:var(--muted-2)}

/* E052-08 — légende : niveau visuel dédié aux raccourcis clavier. */
.recit-v2-e052-kbd{display:inline-block;min-width:16px;padding:0 4px;border:1px solid var(--line-strong);border-bottom-width:2px;border-radius:4px;background:rgba(255,255,255,.04);color:var(--ink);font:inherit;font-size:9px;line-height:1.5;text-align:center;white-space:nowrap}

/* E052-09 — métadonnées : l'année du repère comme repère contextuel. */
.recit-v2-e052-year{color:var(--gold-bright);font-weight:700;font-variant-numeric:tabular-nums}

/* E052-10 — absence de source : note tertiaire discrètement encadrée. */
.recit-layout .recit-v2-e052-nosource{margin-top:12px;padding:8px 10px;border:1px dashed var(--line);border-radius:8px;color:var(--muted-2);font-size:9px;font-style:italic;line-height:1.5}
`;

/* API d'injection, renseignée une fois par rendu depuis ctx.el. */
const API = { el: null };

/* Ajoute une classe sans jamais écraser les autres classes du nœud. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Crée un nœud via l'usine fournie, avec un repli autonome. */
function cree(tag, className, text) {
  let noeud;
  if (API.el && typeof API.el === 'function') {
    noeud = API.el(tag, className, text);
  } else {
    noeud = document.createElement(tag);
    if (className) noeud.className = className;
    if (text !== undefined) noeud.textContent = text;
  }
  return noeud;
}

function un(root, selecteur) {
  try { return (root && root.querySelector) ? root.querySelector(selecteur) : null; }
  catch { return null; }
}

function tous(root, selecteur) {
  try { return (root && root.querySelectorAll) ? Array.from(root.querySelectorAll(selecteur)) : []; }
  catch { return []; }
}

function parId(id) {
  try { return document.getElementById(id); }
  catch { return null; }
}

/* Place noeud juste après ancre ; sans déplacement superflu si déjà en place. */
function placeApres(noeud, ancre) {
  if (!noeud || !ancre || !ancre.parentNode) return;
  const parent = ancre.parentNode;
  const suivant = ancre.nextSibling;
  if (suivant === noeud) return;
  parent.insertBefore(noeud, suivant);
}

/* Dépose noeud en fin de parent, une seule fois. */
function placeDans(noeud, parent) {
  if (!noeud || !parent || noeud.parentNode === parent) return;
  parent.appendChild(noeud);
}

/* Collecte les nœuds texte, avec repli si TreeWalker est indisponible. */
function textes(noeud) {
  const resultat = [];
  if (!noeud) return resultat;
  if (typeof document.createTreeWalker === 'function' && typeof NodeFilter !== 'undefined') {
    try {
      const marcheur = document.createTreeWalker(noeud, NodeFilter.SHOW_TEXT);
      let courant;
      while ((courant = marcheur.nextNode())) resultat.push(courant);
      return resultat;
    } catch { /* repli récursif ci-dessous */ }
  }
  const visite = (n) => {
    if (!n) return;
    if (n.nodeType === 3) resultat.push(n);
    else if (n.childNodes) Array.from(n.childNodes).forEach(visite);
  };
  visite(noeud);
  return resultat;
}

/* E052-01 — la barre d'outils devient un registre secondaire délimité. */
function zoneFiltrage(corps) {
  ajouteClasse(un(corps, '.c3a-tools'), 'recit-v2-e052-tools');
}

/* E052-02 — le statut de filtrage devient un bandeau d'état distinct. */
function bandeauStatut(corps) {
  ajouteClasse(un(corps, '#c3a-status'), 'recit-v2-e052-status');
}

/* E052-03 — le résumé du repère est assis comme chapeau d'introduction. */
function resumeIntro(corps) {
  ajouteClasse(un(corps, '.recit-context') || parId('recit-context'), 'recit-v2-e052-lead');
}

/* E052-04 — compteur de points dans le titre du fil, dérivé des vrais items. */
function compteurFil(corps) {
  const titreFil = un(corps, '.recit-thread-title');
  if (!titreFil) return;
  const items = tous(corps, '.recit-thread-item');
  if (!items.length) return;
  let noeud = parId('v2-e052-thread-count');
  if (!noeud) {
    noeud = cree('span', 'recit-v2-e052-thread-count');
    noeud.id = 'v2-e052-thread-count';
  }
  const courant = items.findIndex((n) => (
    (n.classList && n.classList.contains('is-current')) || n.getAttribute('aria-current') === 'step'
  )) + 1;
  const pluriel = items.length > 1 ? 's' : '';
  noeud.textContent = courant > 0
    ? ` · ${items.length} point${pluriel} · ${courant} en cours`
    : ` · ${items.length} point${pluriel}`;
  placeDans(noeud, titreFil);
}

/* E052-05 — échelle graduée : un segment par point, d'après le sur-titre réel. */
function echelleProgression(corps) {
  const barre = un(corps, '.recit-progress');
  if (!barre || !barre.parentNode) return;
  const kicker = un(corps, '.view-kicker');
  const found = kicker ? /(?:Étape)\s+(\d+)\s*\/\s*(\d+)/i.exec(kicker.textContent || '') : null;
  const total = found ? parseInt(found[2], 10) : 0;
  const courant = found ? parseInt(found[1], 10) : 0;
  if (!Number.isFinite(total) || !total || total > 60) return;
  let echelle = parId('v2-e052-scale');
  if (!echelle) {
    echelle = cree('div', 'recit-v2-e052-scale');
    echelle.id = 'v2-e052-scale';
    echelle.setAttribute('aria-hidden', 'true');
  }
  echelle.textContent = '';
  for (let i = 0; i < total; i += 1) {
    let nom = 'recit-v2-e052-seg';
    if (i < courant) nom += ' est-franchi';
    if (i === courant - 1) nom += ' est-courant';
    echelle.appendChild(cree('span', nom));
  }
  placeApres(echelle, barre);
}

/* E052-06 — pastille de dénombrement des références dans la traçabilité. */
function badgeTracabilite(corps) {
  const trace = un(corps, '.recit-trace');
  if (!trace) return;
  ajouteClasse(trace, 'recit-v2-e052-trace');
  const summary = un(trace, 'summary');
  if (!summary) return;
  const found = /(\d+)\s*référence/i.exec(summary.textContent || '');
  if (!found) return;
  let badge = parId('v2-e052-trace-badge');
  if (!badge) {
    badge = cree('span', 'recit-v2-e052-trace-badge');
    badge.id = 'v2-e052-trace-badge';
    badge.setAttribute('aria-hidden', 'true');
  }
  badge.textContent = `${found[1]} réf.`;
  if (summary.firstChild !== badge) summary.insertBefore(badge, summary.firstChild);
}

/* E052-07 — indice de certitude du fil, issu de data-confidence (jamais la couleur seule). */
function indiceCertitudeFil(corps) {
  tous(corps, '.recit-thread-item').forEach((bouton) => {
    if (bouton.hasAttribute('data-v2-e052-conf')) return;
    const conf = bouton.getAttribute('data-confidence') || '';
    let niveau = '';
    if (/vérifi/i.test(conf)) niveau = 'verifie';
    else if (/certain/i.test(conf)) niveau = 'certain';
    else if (/probable/i.test(conf)) niveau = 'probable';
    else if (/disput|contest/i.test(conf)) niveau = 'conteste';
    if (niveau) ajouteClasse(bouton, `recit-v2-e052-conf--${niveau}`);
    bouton.setAttribute('data-v2-e052-conf', niveau || 'autre');
  });
}

/* E052-08 — les tokens clavier de la légende deviennent des <kbd> distincts. */
function clavierLegende(corps) {
  const legend = un(corps, '.recit-legend');
  if (!legend) return;
  tous(legend, 'p').forEach((p) => {
    if (p.hasAttribute('data-v2-e052-kbd')) return;
    const remplacements = [];
    textes(p).forEach((noeud) => {
      const texte = noeud.nodeValue || '';
      const motif = /(Espace|Entrée|←|→|↑|↓|Début|Fin)/g;
      const fragment = document.createDocumentFragment();
      let dernier = 0;
      let compte = 0;
      let correspondance;
      while ((correspondance = motif.exec(texte))) {
        compte += 1;
        if (correspondance.index > dernier) {
          fragment.appendChild(document.createTextNode(texte.slice(dernier, correspondance.index)));
        }
        fragment.appendChild(cree('kbd', 'recit-v2-e052-kbd', correspondance[0]));
        dernier = correspondance.index + correspondance[0].length;
      }
      if (!compte) return;
      if (dernier < texte.length) fragment.appendChild(document.createTextNode(texte.slice(dernier)));
      remplacements.push([noeud, fragment]);
    });
    remplacements.forEach(([noeud, fragment]) => {
      if (noeud.parentNode) noeud.parentNode.replaceChild(fragment, noeud);
    });
    p.setAttribute('data-v2-e052-kbd', '1');
  });
}

/* E052-09 — l'année réelle du repère est mise en exergue dans les métadonnées. */
function anneeRepere(corps) {
  const meta = un(corps, '.recit-meta');
  if (!meta || meta.hasAttribute('data-v2-e052-year')) return;
  const remplacements = [];
  textes(meta).forEach((noeud) => {
    const texte = noeud.nodeValue || '';
    const motif = /(·\s*)(\d{1,4}(?:\s+av\.\s+J\.-C\.)?)(\s*·)/;
    const trouve = motif.exec(texte);
    if (!trouve) return;
    const fragment = document.createDocumentFragment();
    fragment.appendChild(document.createTextNode(texte.slice(0, trouve.index) + trouve[1]));
    fragment.appendChild(cree('span', 'recit-v2-e052-year', trouve[2]));
    fragment.appendChild(document.createTextNode(trouve[3] + texte.slice(trouve.index + trouve[0].length)));
    remplacements.push([noeud, fragment]);
  });
  remplacements.forEach(([noeud, fragment]) => {
    if (noeud.parentNode) noeud.parentNode.replaceChild(fragment, noeud);
  });
  meta.setAttribute('data-v2-e052-year', '1');
}

/* E052-10 — le message d'absence de source devient une note tertiaire. */
function noteSourceNeutre(corps) {
  ajouteClasse(un(corps, '.recit-sources'), 'recit-v2-e052-nosource');
}

register('E052', (ctx) => {
  API.el = (ctx && typeof ctx.el === 'function') ? ctx.el : null;
  try {
    if (typeof document === 'undefined' || !ctx) return;
    const stage = ctx.stage;
    const layout = ctx.layout || (stage && typeof stage.querySelector === 'function'
      ? stage.querySelector('.recit-layout') : null);
    if (!layout || typeof layout.querySelector !== 'function') return;

    /* Un seul appel CSS, regroupant toutes les règles du module. */
    if (typeof ctx.css === 'function') ctx.css('recit-v2-e052', CSS);

    const corps = layout.querySelector('.recit-body')
      || (stage && typeof stage.querySelector === 'function' ? stage.querySelector('.recit-body') : null);
    if (!corps) return;

    const chantiers = [
      () => zoneFiltrage(corps),
      () => bandeauStatut(corps),
      () => resumeIntro(corps),
      () => compteurFil(corps),
      () => echelleProgression(corps),
      () => badgeTracabilite(corps),
      () => indiceCertitudeFil(corps),
      () => clavierLegende(corps),
      () => anneeRepere(corps),
      () => noteSourceNeutre(corps),
    ];
    chantiers.forEach((chantier) => {
      try { chantier(); } catch { /* un chantier ne doit jamais en casser un autre */ }
    });
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
