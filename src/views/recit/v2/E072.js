import { register } from './registry.js';

/* V2 lentille E072 — Hiérarchie visuelle et informationnelle (complément de la
 * passe 1). Thème repris de la passe 1, mais dix chantiers V2 neufs et
 * distincts : fil d'Ariane parent/enfant, degré de certitude hiérarchisé, fil à
 * deux niveaux par type, hiérarchie des commandes, chapeau subordonné,
 * légende à deux niveaux, hiérarchie des preuves, suite du repère, rang affiché
 * dans le fil et robustesse (contraste forcé / mouvement réduit / mobile).
 * Tous non destructifs : sans ce module, la vue Récit reste intégralement
 * lisible. Chiffres affichés dérivés du seul DOM réel (textContent, attributs,
 * position des nœuds), jamais inventés.
 * Préfixes : classes recit-v2-e072-, ids DOM v2-e072- (jamais e072- de la
 * passe 1, qui tourne sur le même DOM), attributs data-v2-e072-.
 * Zéro réseau, zéro console, zéro aléa, aucun fichier partagé modifié. */

const CSS = `
.recit-v2-e072-root{
  --v2-e072-gold:var(--gold-bright,#f0cd90);
  --v2-e072-ink:var(--ink,#eee8dc);
  --v2-e072-soft:var(--muted,#a89f8e);
  --v2-e072-dim:var(--muted-2,#7a7367);
}

/* E072-01 — Fil d'Ariane contextuel : le repère (parent) puis l'étape (enfant). */
.recit-v2-e072-readout{margin:3px 0 0;color:var(--v2-e072-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums;transition:opacity .18s linear}
.recit-layout .recit-v2-e072-breadcrumb{margin:0 0 6px;color:var(--v2-e072-soft);font-size:10px;line-height:1.5}
.recit-layout .recit-v2-e072-breadcrumb::before{content:'↳ ';color:var(--v2-e072-gold)}

/* E072-02 — Degré de certitude hiérarchisé, rang lu sur la pastille. */
.recit-layout .recit-conf.recit-v2-e072-conf-4{box-shadow:inset 0 0 0 1px var(--v2-e072-gold)}
.recit-layout .recit-conf.recit-v2-e072-conf-3{box-shadow:inset 0 0 0 1px rgba(240,205,144,.6)}
.recit-layout .recit-conf.recit-v2-e072-conf-2{box-shadow:inset 0 0 0 1px var(--v2-e072-soft)}
.recit-layout .recit-conf.recit-v2-e072-conf-1{box-shadow:inset 0 0 0 1px var(--v2-e072-dim)}

/* E072-03 — Fil à deux niveaux : un marqueur de type ouvre chaque groupe. */
.recit-v2-e072-groupe{
  list-style:none;margin:8px 0 3px;padding:2px 0;
  border-top:1px solid var(--line);
  color:var(--v2-e072-gold);font-size:9px;font-weight:700;
  letter-spacing:.14em;text-transform:uppercase;
}
.recit-v2-e072-groupe:first-child{margin-top:0;border-top:0}

/* E072-04 — Hiérarchie des commandes : une action principale, le reste en retrait. */
.recit-layout .recit-v2-e072-commandes button.recit-v2-e072-cmd-principale{
  border-color:var(--gold);color:var(--v2-e072-gold);
  background:rgba(230,185,111,.12);font-weight:700;
}
.recit-layout .recit-v2-e072-commandes button.recit-v2-e072-cmd-secondaire{opacity:.85}

/* E072-05 — Le chapeau devient un niveau subordonné du titre. */
.recit-layout .recit-v2-e072-contexte-subordonne .recit-context{
  margin-left:2px;padding-left:12px;border-left:2px solid var(--v2-e072-dim);
}

/* E072-06 — Légende à deux niveaux : consigne principale, détails en retrait. */
.recit-layout .recit-v2-e072-legende-niveaux .recit-legend p:first-child{color:var(--v2-e072-ink);font-weight:600}
.recit-layout .recit-v2-e072-legende-niveaux .recit-legend p:not(:first-child){padding-left:12px}

/* E072-07 — Hiérarchie des preuves : présentes ou absentes. */
.recit-layout .recit-v2-e072-preuves-vides{color:var(--v2-e072-dim)}

/* E072-08 — Suite du repère, accrochée aux commandes. */
.recit-layout .recit-v2-e072-restantes{color:var(--v2-e072-gold)}

/* E072-09 — Rang affiché dans le fil (position après filtrage). */
.recit-v2-e072-rang{
  display:inline-block;min-width:15px;margin-right:5px;padding:0 3px;
  border-radius:4px;background:rgba(255,255,255,.06);
  color:var(--v2-e072-gold);font-size:8px;font-weight:700;
  font-variant-numeric:tabular-nums;text-align:center;
}

/* E072-10 — Contraintes fortes : contraste forcé, mouvement réduit, mobile. */
.recit-v2-e072-root[data-v2-e072-motion="reduce"] .recit-v2-e072-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e072-readout{transition:none}}
@media (forced-colors:active){
  .recit-v2-e072-groupe{border-color:CanvasText;color:CanvasText}
  .recit-layout .recit-v2-e072-contexte-subordonne .recit-context{border-left-color:CanvasText}
  .recit-v2-e072-rang{background:Canvas;color:CanvasText;border:1px solid CanvasText}
  .recit-layout .recit-conf[class*="recit-v2-e072-conf-"]{box-shadow:none;outline:1px solid CanvasText}
}
@media (max-width:620px){
  .recit-layout .recit-v2-e072-breadcrumb{font-size:9px}
  .recit-layout .recit-v2-e072-contexte-subordonne .recit-context{padding-left:8px}
}
`;

/* Ajoute une classe sans jamais écraser les classes existantes du nœud. */
function cls(noeud, nom) {
  try {
    if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
        && !noeud.classList.contains(nom)) noeud.classList.add(nom);
  } catch { /* enrichissement facultatif */ }
}

/* Écrit un attribut propre à la lentille ; n'écrase aucun attribut de la coque. */
function attr(noeud, nom, valeur) {
  try {
    if (noeud && typeof noeud.setAttribute === 'function') noeud.setAttribute(nom, valeur);
  } catch { /* enrichissement facultatif */ }
}

function creer(el, tag, classe, texte) {
  try {
    if (typeof el !== 'function') return null;
    return el(tag, classe, texte) || null;
  } catch { return null; }
}

function qa(noeud, selecteur) {
  return noeud && typeof noeud.querySelectorAll === 'function'
    ? Array.from(noeud.querySelectorAll(selecteur)) : [];
}

/* Dépose (ou réutilise) un paragraphe de synthèse visible, à un emplacement
   stable : avant l'ancre si `avant`, sinon immédiatement après. Le nœud est
   réutilisé par id, donc jamais de doublon quand runEnhancements repasse. */
function place(el, id, classe, parent, ancre, texte, avant) {
  if (!parent || typeof parent.insertBefore !== 'function' || typeof document === 'undefined') return null;
  let noeud = document.getElementById(id);
  if (!noeud) noeud = creer(el, 'p', `recit-v2-e072-readout ${classe}`, texte);
  if (!noeud) return null;
  noeud.textContent = texte;
  const cible = (ancre && ancre.parentNode === parent)
    ? (avant ? ancre : ancre.nextSibling)
    : null;
  if (noeud.parentNode !== parent || noeud.nextSibling !== cible) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

/* « Étape X / Y » lu sur le kicker, sans modifier son texte. */
function lireEtape(noeud) {
  const texte = String((noeud && noeud.textContent) || '');
  const trouve = texte.match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
  return trouve ? { rang: trouve[1], total: trouve[2] } : null;
}

/* Le meta est « Titre · Année · pastille » : on ne retient que titre et année. */
function lireMeta(noeud) {
  const parties = String((noeud && noeud.textContent) || '')
    .split('·').map((partie) => partie.trim()).filter(Boolean);
  return { titre: parties[0] || '', annee: parties[1] || '' };
}

/* Le type du point figure en fin de kicker (« … · figure »). */
function lireKind(noeud) {
  const trouve = String((noeud && noeud.textContent) || '')
    .match(/·\s*([^\s·]+)\s*$/);
  return trouve ? trouve[1] : '';
}

register('E072', (ctx) => {
  try {
    if (!ctx || typeof ctx !== 'object') return;
    const { layout, css, el, reducedMotion } = ctx;
    if (!layout || typeof layout.querySelector !== 'function') return;
    if (typeof document === 'undefined') return;

    /* Un seul appel CSS pour toute la lentille (cssOnce garantit l'idempotence). */
    if (typeof css === 'function') css('recit-v2-e072', CSS);

    cls(layout, 'recit-v2-e072-root');
    attr(layout, 'data-v2-e072-motion',
      typeof reducedMotion === 'function' && reducedMotion() ? 'reduce' : 'normal');

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const kicker = corps.querySelector('.view-kicker');
    const meta = corps.querySelector('.recit-meta');
    const confChip = corps.querySelector('.recit-conf');
    const contexte = corps.querySelector('.recit-context');
    const thread = corps.querySelector('#c3a-thread') || corps.querySelector('.recit-thread-list');
    const threadTitre = corps.querySelector('.recit-thread-title');
    const actions = corps.querySelector('.recit-actions');
    const sources = corps.querySelector('.recit-sources');
    const trace = corps.querySelector('.recit-trace');
    const legende = corps.querySelector('.recit-legend');
    const items = qa(thread, '.recit-thread-item');
    const etape = lireEtape(kicker);

    /* E072-01 — Fil d'Ariane : repère parent (titre · année) puis étape enfant. */
    if (kicker) {
      const { titre, annee } = lireMeta(meta);
      const amont = [titre, annee].filter(Boolean).join(' · ');
      const aval = [etape ? `Étape ${etape.rang} / ${etape.total}` : '', lireKind(kicker)]
        .filter(Boolean).join(' · ');
      const texte = [amont, aval].filter(Boolean).join(' › ');
      if (texte) place(el, 'v2-e072-breadcrumb', 'recit-v2-e072-breadcrumb', corps, kicker, texte, true);
    }

    /* E072-02 — Degré de certitude : rang déduit du libellé réel de la pastille. */
    if (confChip) {
      const brut = String(confChip.textContent || '').trim();
      let rang = 0;
      let libelle = brut;
      if (/vérifié/i.test(brut)) { rang = 4; libelle = 'Vérifié'; }
      else if (/certain/i.test(brut)) { rang = 3; libelle = 'Certain'; }
      else if (/probable/i.test(brut)) { rang = 2; libelle = 'Probable'; }
      else if (/contest/i.test(brut)) { rang = 1; libelle = 'Contesté'; }
      cls(confChip, `recit-v2-e072-conf-${rang}`);
      attr(confChip, 'data-v2-e072-conf-rang', String(rang));
      if (meta && libelle) {
        place(el, 'v2-e072-conf', 'recit-v2-e072-conf', corps, meta,
          `Degré de certitude : ${libelle}.`, false);
      }
    }

    /* E072-03 — Fil à deux niveaux : un marqueur de type précède chaque
       nouveau groupe quand le data-kind change dans l'ordre affiché. */
    if (thread && items.length && !thread.querySelector('.recit-v2-e072-groupe')) {
      let precedent = null;
      items.forEach((item) => {
        let genre = 'point';
        try { genre = item.getAttribute('data-kind') || 'point'; } catch { /* repli */ }
        if (genre !== precedent) {
          const marqueur = creer(el, 'li', 'recit-v2-e072-groupe', genre);
          if (marqueur) {
            attr(marqueur, 'aria-hidden', 'true');
            try { item.parentNode.insertBefore(marqueur, item); } catch { /* inchangé */ }
          }
          precedent = genre;
        }
      });
    }

    /* E072-04 — Hiérarchie des commandes : « Point suivant » passe en action
       principale, les autres restent des actions secondaires. */
    if (actions) {
      cls(actions, 'recit-v2-e072-commandes');
      qa(actions, 'button').forEach((bouton) => {
        const texte = String(bouton.textContent || '');
        cls(bouton, /point\s+suivant/i.test(texte)
          ? 'recit-v2-e072-cmd-principale'
          : 'recit-v2-e072-cmd-secondaire');
      });
    }

    /* E072-05 — Le chapeau est un niveau subordonné du titre. */
    if (contexte) cls(corps, 'recit-v2-e072-contexte-subordonne');

    /* E072-06 — Légende à deux niveaux : consigne principale, détails en retrait. */
    if (legende) cls(corps, 'recit-v2-e072-legende-niveaux');

    /* E072-07 — Hiérarchie des preuves : nombre lu sur le résumé de
       traçabilité, ou zéro déduit du message « Aucun identifiant ». */
    if (trace || sources) {
      let nb = null;
      if (trace) {
        const resume = trace.querySelector('summary');
        const trouve = String((resume && resume.textContent) || '')
          .match(/(\d+)\s*référence/i);
        if (trouve) nb = trouve[1];
      }
      if (nb === null && sources && /aucun identifiant/i.test(String(sources.textContent || ''))) nb = 0;
      if (nb !== null) {
        const noeud = place(el, 'v2-e072-preuves', 'recit-v2-e072-preuves',
          corps, trace || sources, `Preuves : ${nb} référence(s) locale(s).`, false);
        cls(noeud, nb === '0' ? 'recit-v2-e072-preuves-vides' : 'recit-v2-e072-preuves-pleines');
      }
    }

    /* E072-08 — Suite du repère : points restants calculés depuis le kicker. */
    if (etape) {
      const restants = Math.max(0, parseInt(etape.total, 10) - parseInt(etape.rang, 10));
      place(el, 'v2-e072-restantes', 'recit-v2-e072-restantes', corps,
        actions || legende, `Suite du repère : ${restants} point(s) après celui-ci.`, true);
    }

    /* E072-09 — Rang affiché dans le fil : position 1-based après filtrage,
       distincte du numéro d'origine du point. Décoratif pour les lecteurs d'écran. */
    if (items.length) {
      items.forEach((item, i) => {
        if (!item.querySelector('.recit-v2-e072-rang')) {
          const badge = creer(el, 'span', 'recit-v2-e072-rang', String(i + 1));
          if (badge) {
            attr(badge, 'aria-hidden', 'true');
            try { item.prepend(badge); } catch { /* item inchangé */ }
          }
        }
      });
    }

    /* E072-10 — Le mouvement est lu une seule fois par rendu via l'attribut
       posé plus haut ; les règles forced-colors / mobile sont dans le CSS. */
    void threadTitre;
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
