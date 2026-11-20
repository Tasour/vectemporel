import { register } from './registry.js';

/* V2 — lentille E042 : hiérarchie visuelle et informationnelle, vague V2.
 *
 * Dix chantiers neufs, distincts de la passe 1 (src/views/recit/E042.js) :
 * couches d'orientation (fil d'Ariane, chapeau, position), étiquettes de champs,
 * ordinaux et marqueur du point courant dans le fil, récapitulatif des types,
 * jauge de répartition des certitudes, hiérarchie fonctionnelle des commandes
 * et groupes sémantiques d'outillage.
 *
 * Contrat : un seul point d'entrée, une seule feuille de style regroupant toutes
 * les règles, ids préfixés « v2-e042- », classes préfixées « recit-v2-e042- ».
 * La passe 1 et la V2 partagent le même DOM : aucun id ni attribut de la passe 1
 * n'est réutilisé ou écrasé (setOnce). Zéro réseau, zéro console, zéro aléa,
 * zéro minuteur, zéro canvas. Tout chiffre affiché est dérivé du DOM réel.
 */

const CSS = `
/* E042-01 — fil d'Ariane de contexte au sommet du corps du récit. */
.recit-layout.recit-v2-e042-scope .recit-v2-e042-head{margin:0 0 10px;padding:0 0 8px;border-bottom:1px solid var(--line)}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-crumb{margin:0;color:var(--muted-2);font-size:9px;letter-spacing:.03em}

/* E042-02 — chapeau synthétique : niveau d'introduction du repère. */
.recit-layout.recit-v2-e042-scope .recit-v2-e042-lead{margin:5px 0 0;color:var(--ink-soft);font-size:11px;line-height:1.4}

/* E042-03 — compteur de position et jauge de progression bornée. */
.recit-layout.recit-v2-e042-scope .recit-v2-e042-position{margin:4px 0 0;color:var(--muted);font-size:9px;line-height:1.4;font-variant-numeric:tabular-nums}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-jauge{display:inline-block;width:64px;height:5px;margin-left:6px;border:1px solid var(--line-strong);border-radius:999px;vertical-align:middle;overflow:hidden}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-jauge-fill{display:block;height:100%;background:var(--gold)}

/* E042-04 — rubriques étiquetées des lignes d'information du repère. */
.recit-layout.recit-v2-e042-scope .recit-v2-e042-field::before{margin-right:5px;color:var(--gold-bright);font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-field-repere::before{content:"REPÈRE · "}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-field-timing::before{content:"LECTURE · "}

/* E042-05 — ordinaux structurels des points affichés dans le fil. */
.recit-layout.recit-v2-e042-scope .recit-thread-item[data-v2-e042-ordinal]::after{content:attr(data-v2-e042-ordinal);margin-left:6px;color:var(--muted-2);font-size:8px;font-variant-numeric:tabular-nums}

/* E042-06 — marqueur explicite du point courant sur l'élément de liste. */
.recit-layout.recit-v2-e042-scope .recit-thread-list li.recit-v2-e042-current::before{content:"▶ ICI";display:block;margin-bottom:2px;color:var(--gold-bright);font-size:8px;font-weight:700;letter-spacing:.1em}

/* E042-07 — récapitulatif des types réellement présents dans le fil. */
.recit-layout.recit-v2-e042-scope .recit-v2-e042-kinds{margin:0 0 6px;color:var(--muted-2);font-size:9px;line-height:1.4;font-variant-numeric:tabular-nums}

/* E042-08 — jauge de répartition des certitudes, doublée d'une légende textuelle. */
.recit-layout.recit-v2-e042-scope .recit-v2-e042-repartition{margin:6px 0 8px}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-bar{display:flex;width:100%;height:6px;border:1px solid var(--line);border-radius:999px;overflow:hidden}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-seg{display:block;height:100%}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-seg-v-erifie{background:var(--gold-bright)}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-seg-v-certain{background:var(--gold)}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-seg-v-probable{background:var(--muted)}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-seg-v-disputed{background:var(--muted-2)}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-seg-v-autre{background:var(--line-strong)}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-bar-cap{margin:3px 0 0;color:var(--muted-2);font-size:9px;line-height:1.4;font-variant-numeric:tabular-nums}

/* E042-09 — hiérarchie fonctionnelle des commandes (rôle visible + titre). */
.recit-layout.recit-v2-e042-scope .recit-v2-e042-cmd::before{margin-right:5px;color:var(--gold-bright);font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-cmd-navigation::before{content:attr(data-v2-e042-role)}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-cmd-lecture::before{content:attr(data-v2-e042-role)}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-cmd-vue::before{content:attr(data-v2-e042-role)}
.recit-layout.recit-v2-e042-scope .recit-v2-e042-cmd-action::before{content:attr(data-v2-e042-role)}

/* E042-10 — groupes sémantiques d'outillage, étiquetés sans écraser d'attribut. */
.recit-layout.recit-v2-e042-scope .recit-v2-e042-group[data-v2-e042-group-label]::before{content:attr(data-v2-e042-group-label);display:block;margin-bottom:4px;color:var(--gold-bright);font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}

@media (max-width:620px){
  .recit-layout.recit-v2-e042-scope .recit-v2-e042-jauge{width:48px}
  .recit-layout.recit-v2-e042-scope .recit-v2-e042-bar-cap{font-size:9px}
}
@media (forced-colors:active){
  .recit-layout.recit-v2-e042-scope .recit-v2-e042-head,
  .recit-layout.recit-v2-e042-scope .recit-v2-e042-bar,
  .recit-layout.recit-v2-e042-scope .recit-v2-e042-jauge{border-color:CanvasText}
  .recit-layout.recit-v2-e042-scope .recit-v2-e042-seg{border-right:1px solid CanvasText}
  .recit-layout.recit-v2-e042-scope .recit-v2-e042-jauge-fill{background:CanvasText}
}
`;

function q(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function addClasse(node, ...names) {
  if (!node || !node.classList) return;
  names.forEach((name) => { if (!node.classList.contains(name)) node.classList.add(name); });
}

function setOnce(node, attr, value) {
  if (node && typeof node.setAttribute === 'function' && !node.hasAttribute(attr)) {
    node.setAttribute(attr, value);
  }
}

function fabrique(ctx, tag, className, text) {
  if (ctx && typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* Toutes les valeurs sont lues sur le DOM rendu : aucun chiffre n'est inventé. */
function litFacts(layout) {
  const body = q(layout, '.recit-body') || layout;
  const kicker = q(body, '.view-kicker');
  const meta = q(body, '.recit-meta');
  const kickerTxt = kicker ? String(kicker.textContent || '') : '';
  const metaTxt = meta ? String(meta.textContent || '') : '';
  const etape = kickerTxt.match(/Étape\s+(\d+)\s*\/\s*(\d+)/);
  const type = kickerTxt.match(/·\s*([^\s·][^·]*)$/);
  const annee = metaTxt.match(/(\d{1,4}\s*av\.\s*J\.-C\.|\b\d{3,4}\b)/);
  const items = qa(q(layout, '.recit-thread'), '.recit-thread-item');
  const types = {};
  const certitudes = {};
  items.forEach((item) => {
    const k = item.getAttribute('data-kind') || 'point';
    const c = item.getAttribute('data-confidence') || 'autre';
    types[k] = (types[k] || 0) + 1;
    certitudes[c] = (certitudes[c] || 0) + 1;
  });
  const trace = q(body, '.recit-trace');
  const summary = q(trace, 'summary');
  const ref = summary ? String(summary.textContent || '').match(/(\d+)\s*référence/) : null;
  return {
    body, kicker, meta,
    etape: etape ? Number(etape[1]) : null,
    total: etape ? Number(etape[2]) : null,
    type: type ? type[1].trim() : '',
    annee: annee ? annee[1].replace(/\s+/g, ' ') : '',
    items, types, certitudes,
    references: ref ? Number(ref[1]) : 0,
  };
}

/* Chantier 1 — fil d'Ariane : le chemin « Récit › étape › type › année ». */
function filAriane(ctx, f) {
  if (!f.body) return null;
  let head = q(f.body, '.recit-v2-e042-head');
  if (!head) {
    head = fabrique(ctx, 'div', 'recit-v2-e042-head');
    head.id = 'v2-e042-head';
    f.body.insertBefore(head, f.body.firstChild);
  }
  let crumb = q(head, '.recit-v2-e042-crumb');
  if (!crumb) {
    crumb = fabrique(ctx, 'p', 'recit-v2-e042-crumb');
    crumb.id = 'v2-e042-crumbs';
    head.appendChild(crumb);
  }
  const parts = ['Récit'];
  if (f.etape !== null && f.total !== null) parts.push(`Étape ${f.etape} / ${f.total}`);
  if (f.type) parts.push(f.type);
  if (f.annee) parts.push(f.annee);
  crumb.textContent = parts.join('  ›  ');
  return head;
}

/* Chantier 2 — chapeau : résumé d'introduction, sourcé du DOM. */
function chapeau(ctx, f, head) {
  if (!head) return;
  let lead = q(head, '.recit-v2-e042-lead');
  if (!lead) {
    lead = fabrique(ctx, 'p', 'recit-v2-e042-lead');
    lead.id = 'v2-e042-lead';
    head.appendChild(lead);
  }
  const parts = ['Vue Récit'];
  if (f.type) parts.push(f.type);
  if (f.annee) parts.push(f.annee);
  if (f.etape !== null && f.total !== null) parts.push(`étape ${f.etape} sur ${f.total}`);
  if (f.items.length) parts.push(`${f.items.length} point(s) affiché(s)`);
  if (f.references) parts.push(`${f.references} référence(s) locale(s)`);
  lead.textContent = `${parts.join(' · ')}.`;
}

/* Chantier 3 — position dans le repère et jauge bornée 0–100 %. */
function position(ctx, f, head) {
  if (!head || f.etape === null || f.total === null || f.total <= 0) return;
  const pct = Math.max(0, Math.min(100, Math.round((f.etape / f.total) * 100)));
  let pos = q(head, '.recit-v2-e042-position');
  if (!pos) {
    pos = fabrique(ctx, 'p', 'recit-v2-e042-position');
    pos.id = 'v2-e042-position';
    head.appendChild(pos);
  }
  pos.textContent = '';
  pos.appendChild(document.createTextNode(`Position : ${f.etape} sur ${f.total} · ≈ ${pct} % du repère.`));
  const jauge = fabrique(ctx, 'span', 'recit-v2-e042-jauge');
  setOnce(jauge, 'aria-hidden', 'true');
  const remplissage = fabrique(ctx, 'span', 'recit-v2-e042-jauge-fill');
  remplissage.style.width = `${pct}%`;
  jauge.appendChild(remplissage);
  pos.appendChild(jauge);
}

/* Chantier 4 — étiquettes de rubriques sur les lignes de métadonnées. */
function champs(ctx, f) {
  addClasse(f.meta, 'recit-v2-e042-field', 'recit-v2-e042-field-repere');
  addClasse(q(f.body, '.recit-timing'), 'recit-v2-e042-field', 'recit-v2-e042-field-timing');
}

/* Chantier 5 — ordinal de chaque point affiché, dans l'ordre du DOM. */
function ordinaux(f) {
  f.items.forEach((item, i) => {
    setOnce(item, 'data-v2-e042-ordinal', String(i + 1).padStart(2, '0'));
  });
}

/* Chantier 6 — marqueur « ICI » porté par la li du point courant. */
function courant(f) {
  const actuel = q(f.body, '.recit-thread-item.is-current');
  if (actuel && actuel.parentElement) addClasse(actuel.parentElement, 'recit-v2-e042-current');
}

/* Chantier 7 — récapitulatif des types présents, distinct du profil de la passe 1. */
function typesDuFil(ctx, f) {
  const thread = q(f.body, '.recit-thread');
  if (!thread) return;
  let ligne = q(thread, '.recit-v2-e042-kinds');
  if (!ligne) {
    ligne = fabrique(ctx, 'p', 'recit-v2-e042-kinds');
    ligne.id = 'v2-e042-kinds';
    const titre = q(thread, '.recit-thread-title');
    if (titre && titre.parentNode) titre.parentNode.insertBefore(ligne, titre.nextSibling);
    else thread.appendChild(ligne);
  }
  const connus = ['récit', 'figure', 'lieu', 'audit', 'point'];
  const presents = connus.filter((k) => f.types[k] > 0);
  const autres = Object.keys(f.types).filter((k) => !connus.includes(k));
  const detail = presents.map((k) => `${k} ×${f.types[k]}`)
    .concat(autres.map((k) => `${k} ×${f.types[k]}`)).join(' · ');
  ligne.textContent = `Types du fil (${f.items.length}) : ${detail || 'aucun point'}.`;
}

/* Chantier 8 — jauge de répartition des certitudes + légende textuelle. */
function repartition(ctx, f) {
  const thread = q(f.body, '.recit-thread');
  if (!thread || !f.items.length) return;
  const ancre = q(thread, '.recit-v2-e042-kinds') || q(thread, '.recit-thread-title');
  let bloc = q(thread, '.recit-v2-e042-repartition');
  if (!bloc) {
    bloc = fabrique(ctx, 'div', 'recit-v2-e042-repartition');
    bloc.id = 'v2-e042-repartition';
    if (ancre && ancre.parentNode) ancre.parentNode.insertBefore(bloc, ancre.nextSibling);
    else thread.appendChild(bloc);
  }
  bloc.textContent = '';
  const barre = fabrique(ctx, 'div', 'recit-v2-e042-bar');
  barre.id = 'v2-e042-bar';
  setOnce(barre, 'aria-hidden', 'true');
  const echelle = [
    ['vérifié', 'v-erifie'], ['certain', 'v-certain'], ['probable', 'v-probable'],
    ['disputed', 'v-disputed'], ['autre', 'v-autre'],
  ];
  echelle.forEach(([cle, classe]) => {
    const n = f.certitudes[cle] || 0;
    if (!n) return;
    const segment = fabrique(ctx, 'span', `recit-v2-e042-seg recit-v2-e042-seg-${classe}`);
    segment.style.width = `${((n / f.items.length) * 100).toFixed(1)}%`;
    setOnce(segment, 'title', `${cle === 'disputed' ? 'contesté' : cle} : ${n} point(s)`);
    barre.appendChild(segment);
  });
  bloc.appendChild(barre);
  const legende = fabrique(ctx, 'p', 'recit-v2-e042-bar-cap');
  legende.id = 'v2-e042-bar-cap';
  const detail = echelle.filter(([cle]) => (f.certitudes[cle] || 0) > 0).map(([cle]) => {
    const n = f.certitudes[cle];
    return `${cle === 'disputed' ? 'contesté' : cle} ${Math.round((n / f.items.length) * 100)} %`;
  }).join(' · ');
  legende.textContent = `Répartition des certitudes affichées : ${detail || 'aucun point'}.`;
  bloc.appendChild(legende);
}

/* Chantier 9 — rôle fonctionnel des commandes, visible et non destructif. */
function commandes(f) {
  const roles = {
    'c3a-prev': 'navigation', 'c3a-next': 'navigation', 'c3a-restart': 'navigation',
    'c3a-next-event': 'navigation', 'c3a-play': 'lecture', 'c3a-chrono': 'vue',
  };
  const libelles = {
    navigation: 'Commande de navigation du récit',
    lecture: 'Commande de lecture automatique',
    vue: 'Commande de changement de vue',
    action: 'Commande du récit',
  };
  qa(f.body, '.recit-actions button').forEach((btn) => {
    const role = roles[btn.getAttribute('data-fk')] || 'action';
    setOnce(btn, 'data-v2-e042-role', role);
    addClasse(btn, 'recit-v2-e042-cmd', `recit-v2-e042-cmd-${role}`);
    setOnce(btn, 'title', libelles[role]);
  });
}

/* Chantier 10 — regroupement sémantique des zones d'outillage. */
function groupes(f) {
  const zones = [
    [q(f.body, '.c3a-tools'), 'Outils de filtrage du fil', 'FILTRES'],
    [q(f.body, '.recit-actions'), 'Commandes du récit', ''],
    [q(f.body, '.recit-legend'), 'Légende et aide à la lecture', ''],
  ];
  zones.forEach(([zone, libelle, visible]) => {
    if (!zone) return;
    setOnce(zone, 'role', 'group');
    setOnce(zone, 'aria-label', libelle);
    addClasse(zone, 'recit-v2-e042-group');
    if (visible) setOnce(zone, 'data-v2-e042-group-label', visible);
  });
}

register('E042', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const layout = ctx.layout && ctx.layout.classList ? ctx.layout : q(ctx.stage, '.recit-layout');
    if (!layout || typeof layout.querySelector !== 'function') return;
    addClasse(layout, 'recit-v2-e042-scope');
    if (typeof ctx.css === 'function') ctx.css('recit-v2-e042', CSS);
    else if (!document.getElementById('recit-v2-e042')) {
      const style = document.createElement('style');
      style.id = 'recit-v2-e042';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    const faits = litFacts(layout);
    const head = filAriane(ctx, faits);
    chapeau(ctx, faits, head);
    position(ctx, faits, head);
    champs(ctx, faits);
    ordinaux(faits);
    courant(faits);
    typesDuFil(ctx, faits);
    repartition(ctx, faits);
    commandes(faits);
    groupes(faits);
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
