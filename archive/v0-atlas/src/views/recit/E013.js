import { register } from './registry.js';

/* Lentille E013 — Recherche et filtrage (vue Récit).
 *
 * Dix chantiers E013-01 … E013-10, tous implémentés ici. Rapport :
 * UNIFIED_AUDIT/RECIT/views/E013.md. Lectures seules : src/views/recit.js
 * (DOM : #c3a-search, .c3a-filter, #c3a-status, #c3a-thread,
 * #atlas-recit-live), src/views/recit/registry.js (contrat register/css/el/
 * reducedMotion), src/views/recit/index.js.
 *
 * Greffon strictement additif et idempotent : une seule feuille de style
 * (`css('recit-e013', …)`, rendue idempotente par `cssOnce`), une classe de
 * portée, des attributs `data-e013-*` et des nœuds dédiés. Aucun texte
 * existant n'est réécrit, aucun écouteur n'est ajouté, aucun `aria-pressed`
 * n'est modifié, aucune annonce n'est dupliquée. Zéro réseau, zéro
 * `console.*`, zéro `Math.random` : tout est dérivé du DOM réel.
 *
 * Les lentilles voisines (E012, E032, E042, E069…) utilisent les
 * pseudo-éléments `::before`/`::after` des items du fil et des puces de
 * filtre : E013 n'y touche pas et privilégie des pastilles dédiées, pour
 * éviter toute collision de contenu CSS. Les identifiants créés sont préfixés
 * `e013-` et uniques dans le document.
 */

const CSS_ID = 'recit-e013';
const SCOPE = 'recit-e013-scope';
const CRITERES_ID = 'e013-criteres';
const HORS_ID = 'e013-hors-filtre';
const LIVE_ID = 'atlas-recit-live';
const MIRROR = 'data-e013-miroir';

/* Toutes les règles portent sur des classes préfixées `recit-e013-`. Aucune
 * information n'est portée par la seule couleur : pastilles chiffrées, coche
 * textuelle et mention « hors filtre » accompagnent toujours la couleur. */
const CSS = `
.recit-e013-scope{--e013-filet:var(--gold)}
.recit-e013-criteres{margin:6px 0 8px;padding:5px 9px;border-left:2px solid var(--e013-filet);border-radius:4px;background:rgba(230,185,111,.06);color:var(--muted);font-size:9px;line-height:1.55;font-variant-numeric:tabular-nums}
.recit-e013-coche{margin-left:4px;color:var(--gold-bright);font-size:9px;font-weight:700}
.recit-e013-occ{margin-left:6px;padding:0 4px;border:1px solid var(--line);border-radius:999px;color:var(--gold-bright);font-size:8px;font-variant-numeric:tabular-nums}
.recit-e013-hors-filtre{display:inline-block;margin:-2px 0 6px;padding:1px 6px;border:1px dashed var(--muted-2);border-radius:999px;color:var(--muted);font-size:9px;font-style:normal}
.recit-e013-scope .recit-thread-item.recit-e013-match{box-shadow:inset 3px 0 0 var(--e013-filet)}
.recit-e013-scope.recit-e013-vide .c3a-thread{border:1px dashed var(--line);border-radius:8px}
.recit-e013-scope .recit-actions button.recit-e013-recuperation{border-color:var(--e013-filet);outline:1px dashed rgba(230,185,111,.5);outline-offset:2px}
.recit-e013-live{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media (max-width:620px){
  .recit-e013-criteres{font-size:8px;padding:4px 7px}
  .recit-e013-hors-filtre{margin-top:0;font-size:8px}
}
@media (prefers-reduced-motion:reduce){
  .recit-e013-scope .recit-thread-item,
  .recit-e013-scope .c3a-filter,
  .recit-e013-scope .recit-actions button{transition:none}
}`;

function doc() {
  return typeof document !== 'undefined' ? document : null;
}

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector))
    : [];
}

function txt(node) {
  return node && typeof node.textContent === 'string' ? node.textContent.trim() : '';
}

function addCls(node, cls) {
  if (node && node.classList && typeof node.classList.add === 'function') node.classList.add(cls);
}

function remCls(node, cls) {
  if (node && node.classList && typeof node.classList.remove === 'function') node.classList.remove(cls);
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, String(value));
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function removeNode(node) {
  if (node && node.parentNode && typeof node.parentNode.removeChild === 'function') {
    node.parentNode.removeChild(node);
  }
}

function insertAfter(node, ref) {
  const parent = ref && ref.parentNode;
  if (!parent || typeof parent.insertBefore !== 'function') return false;
  if (ref.nextSibling) parent.insertBefore(node, ref.nextSibling);
  else if (typeof parent.appendChild === 'function') parent.appendChild(node);
  return true;
}

function motion(reducedMotion) {
  try { return typeof reducedMotion === 'function' && reducedMotion() ? 'reduce' : 'normal'; }
  catch (_) { return 'normal'; }
}

function digitsOf(value) {
  let out = '';
  const s = String(value || '');
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charAt(i);
    if (c >= '0' && c <= '9') out += c;
  }
  return out;
}

register('E013', (ctx) => {
  if (!ctx) return;
  try {
    const { stage, layout, css, el, reducedMotion } = ctx;
    const root = layout || stage;
    if (!root || typeof root.querySelector !== 'function') return;

    /* E013-01 — ancrage de portée et feuille unique. Le corps du récit est
       la racine : aucun sélecteur ne s'échappe hors de la vue. */
    if (typeof css === 'function') css(CSS_ID, CSS);
    const body = q(root, '.recit-body');
    const scope = body || root;
    addCls(scope, SCOPE);
    setAttr(scope, 'data-e013-portee', '1');

    /* Lectures seules : rien n'est modifié ici. */
    const search = q(scope, '#c3a-search, .c3a-search');
    const status = q(scope, '#c3a-status, .c3a-status');
    const statusText = txt(status);
    const query = typeof (search && search.value) === 'string' ? search.value.trim() : '';
    const activeChips = qa(scope, '.c3a-filter[aria-pressed="true"]');
    const filtres = activeChips.map(txt).filter(Boolean);
    const items = qa(scope, '.recit-thread-item');
    const resultats = items.length;
    const marqueur = statusText.indexOf('sur ');
    const total = marqueur >= 0
      ? (Number(digitsOf(statusText.slice(marqueur + 4).split(' ')[0])) || resultats)
      : resultats;
    const vide = resultats === 0;
    const criteresActifs = Boolean(query) || filtres.length > 0;

    /* E013-02 — bandeau de critères, inséré une seule fois et dérivé du DOM. */
    const d = doc();
    let badge = d && typeof d.getElementById === 'function'
      ? d.getElementById(CRITERES_ID)
      : q(scope, '#' + CRITERES_ID);
    if (!badge && typeof el === 'function') {
      badge = el('p', 'recit-e013-criteres');
      if (badge) {
        badge.id = CRITERES_ID;
        const parties = [];
        if (query) parties.push('recherche « ' + query + ' »');
        if (filtres.length) parties.push('filtres : ' + filtres.join(', '));
        if (!parties.length) parties.push('aucun critère actif');
        parties.push(resultats + ' point(s) affiché(s) sur ' + total);
        badge.textContent = 'Critères — ' + parties.join(' · ') + '.';
        const ancre = status || q(scope, '#c3a-tools, .c3a-tools') || scope;
        insertAfter(badge, ancre);
      }
    }

    /* E013-03 — le champ de recherche décrit le bandeau (sans écraser une
       description déjà présente). */
    if (search && badge) {
      const deja = getAttr(search, 'aria-describedby') || '';
      const mots = deja.split(' ').filter(Boolean);
      if (mots.indexOf(CRITERES_ID) === -1) {
        mots.push(CRITERES_ID);
        setAttr(search, 'aria-describedby', mots.join(' '));
      }
    }

    /* E013-04 — occurrences de la requête dans le fil : pastille chiffrée
       dédiée, jamais de pseudo-élément (réservé aux lentilles voisines). */
    const aiguille = query.toLowerCase();
    items.forEach((item) => {
      qa(item, '.recit-e013-occ').forEach(removeNode);
      remCls(item, 'recit-e013-match');
      if (!aiguille) {
        setAttr(item, 'data-e013-occ', '0');
        return;
      }
      const contenu = txt(item).toLowerCase();
      let compte = 0;
      let pos = contenu.indexOf(aiguille);
      while (pos !== -1) {
        compte += 1;
        pos = contenu.indexOf(aiguille, pos + Math.max(1, aiguille.length));
      }
      setAttr(item, 'data-e013-occ', String(compte));
      if (compte > 0) {
        addCls(item, 'recit-e013-match');
        if (typeof el === 'function') {
          const pastille = el('span', 'recit-e013-occ', '⌕ ' + compte);
          if (pastille) item.appendChild(pastille);
        }
      }
    });

    /* E013-05 — état visible des puces de filtre : l'aria-pressed d'origine
       est conservé, une coche textuelle est ajoutée aux puces actives. */
    qa(scope, '.c3a-filter').forEach((chip) => {
      qa(chip, '.recit-e013-coche').forEach(removeNode);
      remCls(chip, 'recit-e013-filtre');
      remCls(chip, 'recit-e013-filtre-actif');
      addCls(chip, 'recit-e013-filtre');
      const actif = getAttr(chip, 'aria-pressed') === 'true';
      if (actif) {
        addCls(chip, 'recit-e013-filtre-actif');
        if (typeof el === 'function') {
          const coche = el('span', 'recit-e013-coche', '✓');
          if (coche) {
            setAttr(coche, 'aria-hidden', 'true');
            chip.appendChild(coche);
          }
        }
      }
      setAttr(chip, 'data-e013-etat', actif ? 'actif' : 'inactif');
    });

    /* E013-06 — compteur de résultats porté par le corps, et état vide. */
    setAttr(scope, 'data-e013-resultats', String(resultats));
    if (vide) addCls(scope, 'recit-e013-vide');
    else remCls(scope, 'recit-e013-vide');

    /* E013-07 — le titre sait si le point courant est hors du filtre actif ;
       l'information est un nœud texte distinct, pas un pseudo-élément. */
    const titre = q(scope, '#recit-point-title, .recit-title');
    const courant = q(scope, '.recit-thread-item.is-current, .recit-thread-item[aria-current="step"]');
    const horsFiltre = Boolean(criteresActifs && resultats > 0 && !courant);
    if (titre) {
      addCls(titre, 'recit-e013-titre');
      setAttr(titre, 'data-e013-resultats', String(resultats));
      setAttr(titre, 'data-e013-hors-filtre', horsFiltre ? '1' : '0');
    }
    const hint = d && typeof d.getElementById === 'function'
      ? d.getElementById(HORS_ID)
      : q(scope, '#' + HORS_ID);
    if (!horsFiltre || !titre) {
      removeNode(hint);
    } else if (!hint && typeof el === 'function') {
      const neuf = el('span', 'recit-e013-hors-filtre', '· hors filtre');
      if (neuf) {
        neuf.id = HORS_ID;
        insertAfter(neuf, titre);
      }
    }

    /* E013-08 — voies de récupération dans la barre d'actions quand le
       filtrage ne renvoie aucun point. */
    qa(scope, '.recit-actions button').forEach((btn) => {
      addCls(btn, 'recit-e013-action');
      const fk = getAttr(btn, 'data-fk') || '';
      setAttr(btn, 'data-e013-action', fk || 'autre');
      remCls(btn, 'recit-e013-recuperation');
      const libelle = txt(btn);
      if (vide && (fk === 'c3a-restart' || fk === 'c3a-next-event'
          || libelle.indexOf('Recommencer') !== -1 || libelle.indexOf('Repère suivant') !== -1)) {
        addCls(btn, 'recit-e013-recuperation');
      }
    });

    /* E013-09 — annonce persistante repérée, jamais réécrite : recit.js reste
       l'unique propriétaire du texte de #atlas-recit-live. */
    const live = (d && typeof d.getElementById === 'function')
      ? d.getElementById(LIVE_ID)
      : q(stage, '#' + LIVE_ID);
    if (live) {
      addCls(live, 'recit-e013-live');
      setAttr(live, 'data-e013-present', '1');
      setAttr(live, 'data-e013-canal', 'point');
    }
    if (badge) setAttr(badge, 'data-e013-annonceur', live ? LIVE_ID : 'aucun');

    /* E013-10 — miroir de synthèse unique, une seule écriture par rendu. */
    if (typeof scope.hasAttribute !== 'function' || !scope.hasAttribute(MIRROR)) {
      const jetons = [
        'css:1',
        'portee:1',
        'criteres:' + (badge ? 1 : 0),
        'occ:' + qa(scope, '.recit-e013-match').length,
        'filtres:' + filtres.length,
        'res:' + resultats,
        'vide:' + (vide ? 1 : 0),
        'hors:' + (horsFiltre ? 1 : 0),
        'recup:' + qa(scope, '.recit-e013-recuperation').length,
        'live:' + (live ? 1 : 0),
        'motion:' + motion(reducedMotion),
      ];
      setAttr(scope, MIRROR, jetons.join(' '));
    }
  } catch (_) {
    /* Une lentille défaillante est neutralisée sans jamais interrompre le rendu. */
  }
});
