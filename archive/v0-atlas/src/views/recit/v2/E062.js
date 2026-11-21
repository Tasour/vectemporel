import { register } from './registry.js';

/* V2 lentille E062 — Hiérarchie visuelle et informationnelle (échelles, rangs,
   priorités). La passe 1 (src/views/recit/E062.js) traitait le fil d'Ariane,
   l'outline §NN, les rails d'indenture, la progression segmentée, les titres
   de section, la forme des types, le groupement des commandes, la lettrine,
   le badge de traçabilité et le repli responsive/mouvement. Cette V2 propose
   dix chantiers neufs et distincts : un bilan hiérarchique consolidé, une
   échelle de certitude en quatre crans, la composition du fil par type, le
   niveau de documentation, le rang ordinal du point, la charge du fil,
   l'échelle typographique titre → chapeau, la priorité des commandes, le
   repère de début/fin de repère et la lisibilité en contraste forcé.

   Greffon strictement additif : une seule feuille de style, une seule classe
   racine, des classes préfixées recit-v2-e062-, des attributs
   data-v2-e062-* et des nœuds additionnels (aucun texte existant remplacé,
   aucun gestionnaire réattribué). Les deux passes tournant sur le MÊME DOM,
   tous les ids créés sont préfixés v2-e062- (jamais e062-). Sans JavaScript,
   la vue reste intégralement lisible. Zéro réseau, zéro console, zéro aléa. */

const RACINE = 'recit-v2-e062-root';

const CSS = `
/* E062-01 — Bilan hiérarchique : un cadre unique qui rassemble les échelles. */
.recit-v2-e062-root .recit-v2-e062-bilan{margin:8px 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-v2-e062-root .recit-v2-e062-bilan-titre{margin:0 0 6px;color:var(--gold-bright);font-size:9px;font-weight:700;letter-spacing:.11em;text-transform:uppercase}
.recit-v2-e062-root .recit-v2-e062-bilan-liste{margin:0;padding:0;list-style:none;display:grid;gap:4px}
.recit-v2-e062-root .recit-v2-e062-ligne{display:flex;flex-wrap:wrap;gap:6px;align-items:baseline;font-size:10px;line-height:1.45;color:var(--ink-soft);font-variant-numeric:tabular-nums}
.recit-v2-e062-root .recit-v2-e062-ligne::before{content:'\\2022';color:var(--gold);flex:none}
.recit-v2-e062-root .recit-v2-e062-valeur{color:var(--gold-bright);font-weight:700}

/* E062-02 — Échelle de certitude en quatre crans, lue sur la pastille réelle. */
.recit-v2-e062-root .recit-conf[data-v2-e062-certitude]::after{
  content:'';display:inline-block;width:42px;height:6px;margin-left:7px;vertical-align:1px;
  border:1px solid var(--line-strong);border-radius:2px;
  background:
    repeating-linear-gradient(90deg,transparent 0 9px,var(--line-strong) 9px 10px),
    linear-gradient(90deg,var(--gold) 0 calc(var(--v2-e062-niveau,4) * 25%),transparent calc(var(--v2-e062-niveau,4) * 25%) 100%);
}

/* E062-03 — Composition du fil : le type devient un filet de rang sur l'item. */
.recit-v2-e062-root .recit-thread-item[data-v2-e062-type]{border-left-width:3px}
.recit-v2-e062-root .recit-thread-item[data-v2-e062-type="récit"]{border-left-style:solid}
.recit-v2-e062-root .recit-thread-item[data-v2-e062-type="figure"]{border-left-style:dashed}
.recit-v2-e062-root .recit-thread-item[data-v2-e062-type="lieu"]{border-left-style:dotted}
.recit-v2-e062-root .recit-thread-item[data-v2-e062-type="audit"]{border-left-style:double}

/* E062-04 — Niveau de documentation : valeur atténuée quand elle est nulle. */
.recit-v2-e062-root .recit-v2-e062-ligne[data-v2-e062-docs="0"] .recit-v2-e062-valeur{color:var(--muted-2);font-weight:400}

/* E062-05 — Rang ordinal en grand chiffre accolé au titre du point. */
.recit-v2-e062-root .recit-title[data-v2-e062-rang]::before{
  content:attr(data-v2-e062-rang);display:inline-block;margin-right:10px;
  color:var(--gold);font-size:.62em;font-weight:700;letter-spacing:.04em;
  font-variant-numeric:tabular-nums;vertical-align:2px;
}

/* E062-06 — Charge du fil : soulignement pointillé si des filtres sont actifs. */
.recit-v2-e062-root .recit-v2-e062-ligne[data-v2-e062-filtre="actif"] .recit-v2-e062-valeur{text-decoration:underline dotted var(--gold)}

/* E062-07 — Échelle typographique titre → chapeau : filet d'ancrage du niveau 2. */
.recit-v2-e062-root[data-v2-e062-echelle="1"] .recit-title{line-height:1.12}
.recit-v2-e062-root[data-v2-e062-echelle="1"] .recit-context{border-left:2px solid var(--gold);padding-left:12px}

/* E062-08 — Priorité des commandes : primaire, secondaire, tertiaire. */
.recit-v2-e062-root .recit-actions button[data-v2-e062-priorite="primaire"]{border-color:var(--gold);box-shadow:inset 0 0 0 1px var(--gold)}
.recit-v2-e062-root .recit-actions button[data-v2-e062-priorite="tertiaire"]{color:var(--muted)}
.recit-v2-e062-root .recit-actions button[data-v2-e062-priorite="tertiaire"]:hover{color:var(--ink-soft)}

/* E062-09 — Marqueur de début/fin de repère dans la lecture chiffrée. */
.recit-v2-e062-root .recit-v2-e062-ligne[data-v2-e062-boundaire="debut"] .recit-v2-e062-valeur::before{content:'\\2191 '}
.recit-v2-e062-root .recit-v2-e062-ligne[data-v2-e062-boundaire="fin"] .recit-v2-e062-valeur::before{content:'\\2193 '}

/* E062-10 — Contraste forcé : jauges et repères lisibles sans couleur seule. */
@media (forced-colors:active){
  .recit-v2-e062-root .recit-v2-e062-bilan{border:1px solid CanvasText}
  .recit-v2-e062-root .recit-v2-e062-bilan-titre,
  .recit-v2-e062-root .recit-v2-e062-valeur{color:CanvasText}
  .recit-v2-e062-root .recit-conf[data-v2-e062-certitude]::after{border:1px solid CanvasText;background:Highlight}
  .recit-v2-e062-root .recit-title[data-v2-e062-rang]::before{color:Highlight}
  .recit-v2-e062-root .recit-context{border-left-color:CanvasText}
}
`;

/* Vrai nœud d'élément (écarte textes et commentaires). */
function present(node) {
  return !!(node && node.nodeType === 1);
}

function marquer(node, className) {
  if (present(node) && node.classList && typeof node.classList.add === 'function'
      && !node.classList.contains(className)) node.classList.add(className);
}

function data(node, name, value) {
  if (!present(node) || typeof node.setAttribute !== 'function') return;
  try { node.setAttribute(`data-v2-e062-${name}`, String(value)); }
  catch { /* attribut facultatif */ }
}

function texte(node) {
  return present(node) && typeof node.textContent === 'string' ? node.textContent.trim() : '';
}

function cree(tag, className, contenu, el) {
  let node;
  if (typeof el === 'function') node = el(tag, className, contenu);
  else {
    node = document.createElement(tag);
    if (className) node.className = className;
    if (contenu !== undefined) node.textContent = contenu;
  }
  return node;
}

/* Crée ou réutilise un nœud par id et le place après `ancre` dans `parent`.
   Garantit l'unicité de l'id et l'idempotence entre deux rendus. */
function prepare(id, tag, className, parent, ancre, el) {
  if (!present(parent) || typeof parent.insertBefore !== 'function') return null;
  let node = null;
  try { node = document.getElementById(id); } catch { node = null; }
  if (!node) {
    node = cree(tag, className, undefined, el);
    node.id = id;
  }
  if (className && node.className !== className) node.className = className;
  const cible = present(ancre) && ancre.parentNode === parent ? ancre.nextSibling : null;
  const bienPlace = present(ancre) ? ancre.nextSibling === node : parent.firstChild === node;
  if (node.parentNode !== parent || !bienPlace) {
    try { parent.insertBefore(node, cible); } catch { return null; }
  }
  return node;
}

/* Une ligne du bilan : libellé visible + valeur mise en évidence. Les lignes
   sont ajoutées à la fin et jamais déplacées : l'ordre d'appel fixe l'ordre
   d'affichage, y compris quand runEnhancements repasse sur le même DOM. */
function ligne(liste, id, libelle, valeur, attrs, el) {
  if (!present(liste) || typeof liste.appendChild !== 'function') return null;
  let li = null;
  try { li = document.getElementById(id); } catch { li = null; }
  if (!li) {
    li = cree('li', 'recit-v2-e062-ligne', undefined, el);
    li.id = id;
  }
  if (li.className !== 'recit-v2-e062-ligne') li.className = 'recit-v2-e062-ligne';
  if (li.parentNode !== liste) liste.appendChild(li);
  while (li.firstChild) li.removeChild(li.firstChild);
  li.appendChild(document.createTextNode(`${libelle} : `));
  li.appendChild(cree('span', 'recit-v2-e062-valeur', valeur, el));
  li.appendChild(document.createTextNode('.'));
  if (attrs) Object.keys(attrs).forEach((nom) => data(li, nom, attrs[nom]));
  return li;
}

register('E062', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { layout, css, el } = ctx;
    if (typeof css === 'function') css('recit-v2-e062', CSS); /* un seul bloc. */
    const root = layout;
    if (!present(root) || typeof root.querySelector !== 'function') return;
    marquer(root, RACINE);

    const corps = root.querySelector('.recit-body');
    if (!present(corps)) return;

    const kicker = root.querySelector('.view-kicker');
    const titre = document.getElementById('recit-point-title') || root.querySelector('.recit-title');
    const meta = root.querySelector('.recit-meta');
    const timing = root.querySelector('.recit-timing');
    const conf = root.querySelector('.recit-conf');
    const contexte = document.getElementById('recit-context') || root.querySelector('.recit-context');
    const statut = document.getElementById('c3a-status');
    const fil = document.getElementById('c3a-thread');
    const items = fil && typeof fil.querySelectorAll === 'function'
      ? Array.from(fil.querySelectorAll('.recit-thread-item')) : [];
    const trace = root.querySelector('details.recit-trace');
    const resume = trace && typeof trace.querySelector === 'function' ? trace.querySelector('summary') : null;
    const sources = root.querySelector('.recit-sources');
    const actions = root.querySelector('.recit-actions');

    /* E062-01 — Bilan hiérarchique consolidé, inséré après le timing. */
    const bilan = prepare('v2-e062-bilan', 'section', 'recit-v2-e062-bilan', corps, timing, el);
    if (!present(bilan)) return;
    const titreBilan = prepare('v2-e062-bilan-titre', 'h2', 'recit-v2-e062-bilan-titre', bilan, null, el);
    if (present(titreBilan)) {
      titreBilan.textContent = 'Bilan hiérarchique du repère';
      if (bilan.firstChild !== titreBilan) bilan.insertBefore(titreBilan, bilan.firstChild);
    }
    const liste = prepare('v2-e062-bilan-liste', 'ul', 'recit-v2-e062-bilan-liste', bilan, titreBilan, el);
    if (!present(liste)) return;

    /* E062-02 — Échelle de certitude : rang lu dans la pastille .recit-conf. */
    if (present(conf)) {
      const brut = texte(conf);
      const libelle = brut.replace(/^[✓■◐≈•]\s*/, '').trim() || 'non précisée';
      const paliers = [[/vérifi/i, 4], [/certain/i, 3], [/probabl/i, 2], [/contest/i, 1]];
      let niveau = 0;
      for (let i = 0; i < paliers.length; i += 1) {
        if (paliers[i][0].test(libelle)) { niveau = paliers[i][1]; break; }
      }
      data(conf, 'certitude', niveau > 0 ? String(niveau) : 'indéterminé');
      if (niveau > 0 && conf.style && typeof conf.style.setProperty === 'function') {
        conf.style.setProperty('--v2-e062-niveau', String(niveau));
      }
      ligne(liste, 'v2-e062-certitude', 'Certitude du point',
        niveau > 0 ? `${libelle} · ${niveau}/4` : libelle);
    }

    /* E062-03 — Composition du fil : comptage réel des data-kind. */
    if (items.length) {
      const comptes = {};
      items.forEach((item) => {
        const kind = item.getAttribute('data-kind') || 'point';
        comptes[kind] = (comptes[kind] || 0) + 1;
        data(item, 'type', kind);
      });
      const ordre = ['récit', 'figure', 'lieu', 'audit'];
      const parties = ordre.filter((k) => comptes[k]).map((k) => `${k} ×${comptes[k]}`);
      Object.keys(comptes).filter((k) => ordre.indexOf(k) < 0)
        .forEach((k) => parties.push(`${k} ×${comptes[k]}`));
      const dominant = ordre.slice()
        .sort((a, b) => (comptes[b] || 0) - (comptes[a] || 0))
        .find((k) => comptes[k]);
      ligne(liste, 'v2-e062-composition', 'Composition du fil',
        `${items.length} points · ${parties.join(' · ')}${dominant ? ` · dominant : ${dominant}` : ''}`);
    }

    /* E062-04 — Niveau de documentation : références locales du résumé. */
    if (present(resume) || present(sources)) {
      let refs = 0;
      if (present(resume)) {
        const trouvé = texte(resume).match(/(\d+)\s*référence\(s\)/i);
        if (trouvé) refs = parseInt(trouvé[1], 10);
      }
      data(present(resume) ? resume : sources, 'docs', refs);
      ligne(liste, 'v2-e062-documentation', 'Documentation locale',
        refs > 0 ? `${refs} référence(s) locale(s)` : 'aucune référence', { docs: String(refs) });
    }

    /* E062-05 — Rang ordinal du point courant, dérivé de aria-current du fil. */
    if (present(titre) && items.length) {
      const pos = items.findIndex((item) => item.getAttribute('aria-current') === 'step'
        || (item.classList && item.classList.contains('is-current')));
      if (pos >= 0) {
        data(titre, 'rang', String(pos + 1).padStart(2, '0'));
        ligne(liste, 'v2-e062-rang', 'Rang du point', `${pos + 1} sur ${items.length}`);
      }
    }

    /* E062-06 — Charge du fil : « N affichés sur M » lu dans #c3a-status. */
    if (present(statut)) {
      const comptage = texte(statut).match(/(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i);
      if (comptage) {
        const affiches = parseInt(comptage[1], 10);
        const total = parseInt(comptage[2], 10);
        const filtre = /\brecherche\b|\btype\b|\bcertitude\b/i.test(texte(statut));
        ligne(liste, 'v2-e062-charge', 'Points affichés',
          `${affiches} sur ${total}${filtre ? ' · filtres actifs' : ''}`,
          filtre ? { filtre: 'actif' } : null);
      }
    }

    /* E062-07 — Échelle typographique : marqueur CSS sur la racine. */
    data(root, 'echelle', '1');

    /* E062-08 — Priorité des commandes d'après leur data-fk réel. */
    if (present(actions)) {
      const priorites = {
        'c3a-next': 'primaire', 'c3a-prev': 'primaire',
        'c3a-play': 'secondaire', 'c3a-restart': 'secondaire',
        'c3a-next-event': 'tertiaire', 'c3a-chrono': 'tertiaire',
      };
      Array.from(actions.querySelectorAll('button')).forEach((bouton) => {
        const fk = bouton.getAttribute('data-fk') || '';
        data(bouton, 'priorite', priorites[fk] || 'secondaire');
      });
    }

    /* E062-09 — Boundary début / fin lu sur l'état disabled des commandes. */
    if (present(actions)) {
      const boutons = Array.from(actions.querySelectorAll('button'));
      const parFk = (fk) => boutons.find((b) => b.getAttribute('data-fk') === fk) || null;
      const prev = parFk('c3a-prev');
      const next = parFk('c3a-next');
      const debut = !!(prev && prev.disabled);
      const fin = !!(next && next.disabled);
      const etat = debut && fin ? 'unique' : debut ? 'debut' : fin ? 'fin' : 'intermediaire';
      const libelle = etat === 'debut' ? 'début du repère'
        : etat === 'fin' ? 'fin du repère'
          : etat === 'unique' ? 'repère à un seul point' : 'point intermédiaire';
      ligne(liste, 'v2-e062-boundaire', 'Position dans le repère', libelle,
        etat === 'intermediaire' ? null : { boundaire: etat });
    }

    /* E062-10 — Contraste forcé : entièrement porté par le bloc @media CSS. */
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
