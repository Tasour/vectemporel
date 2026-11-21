import { register } from './registry.js';

/* V2 lentille E033 — Recherche et filtrage (vue Récit).
   Dix chantiers NEUFS, distincts de ceux de la passe 1 (barre dédiée, filtres
   nature/certitude, réinitialisation, annonce live, focus et mouvement réduit).
   Ici le travail porte sur les contrôles NATIFS de la vue : #c3a-search,
   .c3a-group, #c3a-status et #c3a-thread. Facettes, surlignage, vocabulaire
   suggéré, historique, navigation, puces de critères, compteurs, diagnostic
   d'état vide, repères non colorimétriques et volume maximal observé.
   Tout est additif, idempotent et dérivé du DOM réel. Préfixes : ids
   v2-e033-, classes recit-v2-e033-. */

const RULES = `
.recit-v2-e033-assist{margin:6px 0 8px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.025)}
.recit-v2-e033-line{margin:0 0 4px;font-size:9px;line-height:1.55;color:var(--muted-2,#b9a98c);font-variant-numeric:tabular-nums}
.recit-v2-e033-line:last-child{margin-bottom:0}
.recit-v2-e033-tools{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px}
.recit-v2-e033-btn,.recit-v2-e033-chip{min-height:36px;padding:5px 9px;border:1px solid var(--line-strong);border-radius:7px;background:transparent;color:var(--ink);font:inherit;font-size:10px;cursor:pointer}
.recit-v2-e033-btn:hover,.recit-v2-e033-chip:hover{border-color:var(--gold)}
.recit-v2-e033-chip{margin:0 3px 3px 0;border-style:dashed}
.recit-v2-e033-tools :focus-visible,.recit-v2-e033-chip:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}
.recit-v2-e033-mark{background:rgba(230,185,111,.30);color:inherit;padding:0 1px;border-radius:2px}
.recit-v2-e033-count{margin-left:4px;font-size:8px;color:var(--muted-2,#b9a98c);font-variant-numeric:tabular-nums}

/* E033-09 — repères non colorimétriques des types : la forme du liseré
   complète le libellé .thread-kind déjà présent, sans inventer de texte. */
#c3a-thread .c3a-thread-item[data-v2-e033-kind]{border-left-width:3px;border-left-style:solid}
#c3a-thread .c3a-thread-item[data-v2-e033-kind="figure"]{border-left-style:dashed}
#c3a-thread .c3a-thread-item[data-v2-e033-kind="lieu"]{border-left-style:dotted}
#c3a-thread .c3a-thread-item[data-v2-e033-kind="audit"]{border-left-style:double}

@media (max-width:620px){.recit-v2-e033-tools{gap:8px}}
@media (prefers-reduced-motion:reduce){.recit-v2-e033-assist *,.recit-v2-e033-chip{transition:none!important;animation:none!important}}
`;

/* Table de repli accent → base, à correspondance 1 pour 1 : les indices du
   texte replié restent ceux du texte d'origine, ce qui permet de placer les
   <mark> sans décalage. */
const FOLD = {
  à: 'a', â: 'a', ä: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e',
  î: 'i', ï: 'i', ô: 'o', ö: 'o', ù: 'u', û: 'u', ü: 'u',
  ç: 'c', ÿ: 'y', æ: 'a', œ: 'o',
};

/* État de module : volontairement en mémoire, jamais lu depuis le réseau. */
const histoire = [];
const dejaEcoute = new WeakSet();
let volumeMax = 0;

function textOf(node) {
  return node ? String(node.textContent || '') : '';
}

/* Pose un attribut seulement s'il est absent : aucun attribut porté par la
   coque (lang, aria-*, data-fk…) n'est jamais écrasé. */
function setOnce(node, name, value) {
  if (node && node.nodeType === 1 && !node.hasAttribute(name)) node.setAttribute(name, value);
}

/* Récupère un nœud par id, ou le crée une seule fois sous parent. */
function creerSiAbsent(parent, id, tag, classe) {
  if (!parent || !parent.querySelector) return null;
  let node = parent.querySelector('#' + id);
  if (!node) {
    node = document.createElement(tag);
    node.className = classe;
    node.id = id;
    parent.appendChild(node);
  }
  return node;
}

function fold(value) {
  const source = String(value || '');
  let out = '';
  for (let i = 0; i < source.length; i += 1) {
    const c = source.charAt(i);
    const lower = c.toLowerCase();
    out += FOLD[c] !== undefined ? FOLD[c] : (FOLD[lower] !== undefined ? FOLD[lower] : lower);
  }
  return out;
}

function countOccurrences(haystack, needle) {
  const h = fold(haystack);
  const n = fold(needle).trim();
  if (!n) return 0;
  let count = 0;
  let from = 0;
  for (;;) {
    const at = h.indexOf(n, from);
    if (at < 0) break;
    count += 1;
    from = at + n.length;
  }
  return count;
}

/* Critères actifs lus sur les contrôles réels : valeur du champ de recherche
   et bouton aria-pressed="true" de chaque groupe .c3a-group. */
function activeCriteria(body) {
  const search = body.querySelector('#c3a-search');
  const query = search ? String(search.value || '').trim() : '';
  let kind = '';
  let conf = '';
  const groups = body.querySelectorAll('.c3a-tools .c3a-group');
  Array.prototype.forEach.call(groups, (group) => {
    const label = textOf(group.querySelector('.c3a-group-label')).trim();
    const pressed = group.querySelector('.c3a-filter[aria-pressed="true"]');
    const value = pressed ? textOf(pressed).trim() : '';
    const neutral = /^tout/i.test(value) || !value;
    if (label === 'Type') kind = neutral ? '' : value;
    else if (label === 'Certitude') conf = neutral ? '' : value;
  });
  return { query, kind, conf };
}

/* Retire un critère en actionnant le contrôle natif de la vue, jamais en
   modifiant l'état interne de celle-ci. */
function removeCriterion(body, key) {
  if (key === 'query') {
    const search = body.querySelector('#c3a-search');
    if (!search) return;
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  const fk = key === 'kind' ? 'c3a-kind-all' : 'c3a-conf-all';
  const bouton = body.querySelector('[data-fk="' + fk + '"]');
  if (bouton) bouton.click();
}

/* E033-01 — récapitulatif des facettes du fil, compté sur les items réels. */
function chantier01(body, el) {
  const status = body.querySelector('#c3a-status');
  const host = creerSiAbsent(body, 'v2-e033-assist', 'div', 'recit-v2-e033-assist');
  if (!host) return;
  if (status && status.parentNode && status.nextSibling !== host) {
    status.parentNode.insertBefore(host, status.nextSibling);
  }
  const items = body.querySelectorAll('#c3a-thread .c3a-thread-item');
  const kinds = {};
  const confs = {};
  Array.prototype.forEach.call(items, (item) => {
    const kind = item.getAttribute('data-kind') || 'point';
    const conf = item.getAttribute('data-confidence') || 'non renseignée';
    kinds[kind] = (kinds[kind] || 0) + 1;
    confs[conf] = (confs[conf] || 0) + 1;
  });
  const format = (map) => Object.keys(map).map((key) => key + ' ' + map[key]).join(', ');
  const texte = items.length
    ? 'Répartition du fil : types — ' + format(kinds) + ' ; certitudes — ' + format(confs) + '.'
    : 'Aucun point affiché dans le fil.';
  const line = host.querySelector('#v2-e033-facets');
  if (!line) {
    const node = el('p', 'recit-v2-e033-line', texte);
    node.id = 'v2-e033-facets';
    host.appendChild(node);
  } else {
    line.textContent = texte;
  }
}

/* E033-02 — surlignage des correspondances, sans écriture HTML directe : seuls
   les nœuds texte sont découpés et enveloppés dans <mark>, le texte est conservé. */
function highlightIn(button, needle) {
  const n = fold(needle).trim();
  if (!n || !button) return;
  const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT, {
    acceptNode(texte) {
      const parent = texte.parentNode;
      if (!parent || parent.nodeType !== 1) return NodeFilter.FILTER_REJECT;
      if (parent.closest && (parent.closest('.thread-kind') || parent.closest('.recit-v2-e033-mark'))) {
        return NodeFilter.FILTER_REJECT;
      }
      return fold(texte.nodeValue).indexOf(n) >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const cibles = [];
  while (walker.nextNode()) cibles.push(walker.currentNode);
  cibles.forEach((texte) => {
    const source = texte.nodeValue;
    const repli = fold(source);
    const frag = document.createDocumentFragment();
    let curseur = 0;
    while (curseur < source.length) {
      const at = repli.indexOf(n, curseur);
      if (at < 0) {
        frag.appendChild(document.createTextNode(source.slice(curseur)));
        break;
      }
      if (at > curseur) frag.appendChild(document.createTextNode(source.slice(curseur, at)));
      const mark = document.createElement('mark');
      mark.className = 'recit-v2-e033-mark';
      mark.textContent = source.slice(at, at + n.length);
      frag.appendChild(mark);
      curseur = at + n.length;
    }
    if (texte.parentNode) texte.parentNode.replaceChild(frag, texte);
  });
}

function chantier02(body) {
  const search = body.querySelector('#c3a-search');
  const query = search ? String(search.value || '') : '';
  if (!query.trim()) return;
  const items = body.querySelectorAll('#c3a-thread .c3a-thread-item');
  Array.prototype.forEach.call(items, (item) => highlightIn(item, query));
}

/* E033-03 — vocabulaire suggéré : mots réellement présents dans les libellés
   du fil, proposés via un <datalist> attaché sans écraser un list existant. */
function chantier03(body) {
  const search = body.querySelector('#c3a-search');
  if (!search || !document.body) return;
  let list = document.getElementById('v2-e033-vocab');
  if (!list) {
    list = document.createElement('datalist');
    list.id = 'v2-e033-vocab';
    document.body.appendChild(list);
  }
  const words = {};
  const items = body.querySelectorAll('#c3a-thread .c3a-thread-item');
  Array.prototype.forEach.call(items, (item) => {
    const label = item.getAttribute('aria-label') || textOf(item);
    String(label).split(/[^A-Za-zÀ-ÿ0-9]+/).forEach((mot) => {
      const propre = mot.trim().toLowerCase();
      if (propre.length >= 3) words[propre] = (words[propre] || 0) + 1;
    });
  });
  const tries = Object.keys(words).sort((a, b) => words[b] - words[a] || a.localeCompare(b, 'fr')).slice(0, 12);
  const signature = tries.join('|');
  if (list.getAttribute('data-v2-e033-signature') !== signature) {
    Array.prototype.forEach.call(list.querySelectorAll('option'), (option) => option.remove());
    tries.forEach((mot) => {
      const option = document.createElement('option');
      option.value = mot;
      list.appendChild(option);
    });
    list.setAttribute('data-v2-e033-signature', signature);
  }
  setOnce(search, 'list', list.id);
}

/* E033-04 — historique des recherches récentes, alimenté uniquement par les
    saisies réelles du champ natif et rejouable en un clic. */
function chantier04(body, el) {
  const tools = body.querySelector('#c3a-tools');
  if (!tools) return;
  const search = body.querySelector('#c3a-search');
  if (search && !dejaEcoute.has(search)) {
    dejaEcoute.add(search);
    search.addEventListener('input', (event) => {
      const valeur = String((event.target && event.target.value) || '').trim();
      if (!valeur) return;
      const deja = histoire.indexOf(valeur);
      if (deja >= 0) histoire.splice(deja, 1);
      histoire.unshift(valeur);
      if (histoire.length > 5) histoire.length = 5;
    });
  }
  const host = creerSiAbsent(tools, 'v2-e033-history', 'div', 'recit-v2-e033-tools recit-v2-e033-history');
  if (!host) return;
  setOnce(host, 'role', 'group');
  setOnce(host, 'aria-label', 'Recherches récentes');
  Array.prototype.forEach.call(host.querySelectorAll('.recit-v2-e033-btn, .recit-v2-e033-line'), (n) => n.remove());
  if (!histoire.length) {
    host.appendChild(el('p', 'recit-v2-e033-line', 'Aucune recherche enregistrée dans cette session.'));
    return;
  }
  histoire.forEach((requete) => {
    const bouton = el('button', 'recit-v2-e033-btn', requete);
    bouton.type = 'button';
    bouton.setAttribute('aria-label', 'Rejouer la recherche « ' + requete + ' »');
    bouton.addEventListener('click', () => {
      const champ = body.querySelector('#c3a-search');
      if (!champ) return;
      champ.value = requete;
      champ.dispatchEvent(new Event('input', { bubbles: true }));
    });
    host.appendChild(bouton);
  });
}

/* E033-05 — navigation entre correspondances : parcelle les items réellement
   affichés et déplace le focus, sans toucher à l'état du lecteur. */
function chantier05(body, el) {
  const tools = body.querySelector('#c3a-tools');
  if (!tools) return;
  const host = creerSiAbsent(tools, 'v2-e033-nav', 'div', 'recit-v2-e033-tools recit-v2-e033-nav');
  if (!host) return;
  setOnce(host, 'role', 'group');
  setOnce(host, 'aria-label', 'Navigation entre les correspondances');
  Array.prototype.forEach.call(host.querySelectorAll('.recit-v2-e033-btn, .recit-v2-e033-line'), (n) => n.remove());

  const tous = Array.prototype.slice.call(body.querySelectorAll('#c3a-thread .c3a-thread-item'));
  const search = body.querySelector('#c3a-search');
  const query = search ? String(search.value || '').trim() : '';
  let cibles = tous.map((_, i) => i);
  if (query) {
    const filtres = tous.map((item, i) => (
      countOccurrences(item.getAttribute('aria-label') || textOf(item), query) > 0 ? i : -1
    )).filter((i) => i >= 0);
    if (filtres.length) cibles = filtres;
  }
  host.appendChild(el('p', 'recit-v2-e033-line', 'Correspondances parcourables : ' + cibles.length + ' sur ' + tous.length + '.'));

  const avancer = (sens) => {
    const items = Array.prototype.slice.call(body.querySelectorAll('#c3a-thread .c3a-thread-item'));
    if (!items.length) return;
    const actif = items.indexOf(document.activeElement);
    let pos = actif >= 0 ? actif : (sens > 0 ? -1 : 0);
    for (let garde = 0; garde <= items.length; garde += 1) {
      pos = (pos + sens + items.length) % items.length;
      if (cibles.indexOf(pos) >= 0) break;
    }
    if (items[pos]) items[pos].focus();
  };
  const precedent = el('button', 'recit-v2-e033-btn', '← Précédente');
  precedent.type = 'button';
  precedent.setAttribute('aria-label', 'Aller à la correspondance précédente');
  precedent.addEventListener('click', () => avancer(-1));
  const suivant = el('button', 'recit-v2-e033-btn', 'Suivante →');
  suivant.type = 'button';
  suivant.setAttribute('aria-label', 'Aller à la correspondance suivante');
  suivant.addEventListener('click', () => avancer(1));
  host.append(precedent, suivant);
}

/* E033-06 — puces des critères actifs, chacune amovible via le contrôle natif. */
function chantier06(body, el) {
  const host = creerSiAbsent(body, 'v2-e033-chips', 'p', 'recit-v2-e033-line recit-v2-e033-chips');
  if (!host) return;
  const criteres = activeCriteria(body);
  const cles = ['query', 'kind', 'conf'].filter((cle) => criteres[cle]);
  const libelles = {
    query: 'recherche « ' + criteres.query + ' »',
    kind: 'type ' + criteres.kind,
    conf: 'certitude ' + criteres.conf,
  };
  Array.prototype.forEach.call(host.querySelectorAll('.recit-v2-e033-chip'), (n) => n.remove());
  if (!cles.length) {
    host.textContent = 'Filtres actifs : aucun.';
    return;
  }
  host.textContent = '';
  host.appendChild(document.createTextNode('Filtres actifs : '));
  cles.forEach((cle) => {
    const bouton = el('button', 'recit-v2-e033-chip', libelles[cle] + ' ×');
    bouton.type = 'button';
    bouton.setAttribute('aria-label', 'Retirer le critère ' + libelles[cle]);
    bouton.addEventListener('click', () => removeCriterion(body, cle));
    host.appendChild(bouton);
  });
}

/* E033-07 — compteur d'occurrences par item, lu sur l'aria-label réel après
   retrait du préfixe « Point i sur n, type : » posé par la vue. */
function chantier07(body, el) {
  const search = body.querySelector('#c3a-search');
  const query = search ? String(search.value || '').trim() : '';
  if (!query) return;
  const items = body.querySelectorAll('#c3a-thread .c3a-thread-item');
  Array.prototype.forEach.call(items, (item) => {
    const brut = item.getAttribute('aria-label') || textOf(item);
    const texte = String(brut).replace(/^Point\s+\d+\s+sur\s+\d+,\s*[^:]*:\s*/, '');
    const n = countOccurrences(texte, query);
    let badge = item.querySelector('.recit-v2-e033-count');
    if (!badge) {
      badge = el('span', 'recit-v2-e033-count', '');
      badge.setAttribute('aria-hidden', 'true');
      item.appendChild(badge);
    }
    badge.textContent = n ? '×' + n : '';
  });
}

/* E033-08 — diagnostic de l'état vide, décrit depuis les seuls critères
   réellement actifs et sans chiffre inventé. */
function chantier08(body, el) {
  const empty = body.querySelector('.c3a-empty');
  if (!empty) return;
  const criteres = activeCriteria(body);
  const lignes = [];
  if (criteres.query) lignes.push('Recherche : « ' + criteres.query + ' »');
  if (criteres.kind) lignes.push('Type : ' + criteres.kind);
  if (criteres.conf) lignes.push('Certitude : ' + criteres.conf);
  if (!lignes.length) lignes.push('Aucun critère actif.');
  lignes.push('Assouplir un critère pour retrouver des points.');
  let node = empty.querySelector('#v2-e033-empty-detail');
  if (!node) {
    node = el('p', 'recit-v2-e033-line', '');
    node.id = 'v2-e033-empty-detail';
    empty.appendChild(node);
  }
  node.textContent = lignes.join(' · ');
}

/* E033-09 — marquage non destructif du type sur chaque item ; la mise en forme
   (liseré plein / tireté / pointillé / double) est assurée par la feuille V2. */
function chantier09(body) {
  const items = body.querySelectorAll('#c3a-thread .c3a-thread-item');
  Array.prototype.forEach.call(items, (item) => {
    setOnce(item, 'data-v2-e033-kind', item.getAttribute('data-kind') || 'point');
  });
}

/* E033-10 — volume maximal du fil observé au fil des rendus, comparé au
   nombre d'items affichés cette fois-ci (les deux nombres viennent du DOM). */
function chantier10(body, el) {
  const count = body.querySelectorAll('#c3a-thread .c3a-thread-item').length;
  if (count > volumeMax) volumeMax = count;
  const host = creerSiAbsent(body, 'v2-e033-volume', 'p', 'recit-v2-e033-line');
  if (!host) return;
  host.textContent = 'Fil : ' + count + ' point(s) affiché(s) cette fois · volume maximal observé : ' + volumeMax + '.';
}

/* Un chantier défaillant est isolé : les neuf autres continuent. */
function safe(fn) {
  try { fn(); }
  catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

register('E033', (ctx) => {
  try {
    const { layout, css, el } = ctx;
    if (typeof document === 'undefined' || !layout) return;
    safe(() => css('recit-v2-e033', RULES));
    const body = layout.querySelector('.recit-body') || layout;
    safe(() => chantier01(body, el));
    safe(() => chantier02(body));
    safe(() => chantier03(body));
    safe(() => chantier04(body, el));
    safe(() => chantier05(body, el));
    safe(() => chantier06(body, el));
    safe(() => chantier07(body, el));
    safe(() => chantier08(body, el));
    safe(() => chantier09(body));
    safe(() => chantier10(body, el));
  } catch { /* neutralisé : la vue reste lisible et inchangée */ }
});
