import { register } from './registry.js';

/* V2 lentille E023 — « Observatoire de la recherche et du filtrage » (vue Récit).
   Complément neuf de la lentille passe 1 de même numéro (« Recherche et filtrage »)
   qui, elle, ajoutait son propre champ et ses propres listes déroulantes. La V2
   n'ajoute AUCUN nouveau contrôle de recherche : elle OBSERVE l'état réel du
   système de recherche/filtrage déjà présent (#c3a-search, .c3a-filter,
   #c3a-status, #c3a-empty) et le restitue dans un bandeau de lecture visible.

   Dix chantiers neufs et distincts de la passe 1 :
     requête active, longueur de la requête, type retenu, certitude retenue,
     couverture du fil, synthèse des critères, retour au fil, signalement
     « aucun résultat », repère du champ actif, mouvement réduit V2.

   Toutes les valeurs sont RECALCULÉES depuis le DOM réellement rendu : valeur du
   champ, attributs aria-pressed, texte du statut, présence du nœud vide. Aucun
   chiffre historique n'est inventé. Une seule inscription, une seule feuille de
   style regroupant toutes les règles.

   Préfixes : classes recit-v2-e023-, ids DOM v2-e023- (jamais e023- de la passe 1).
   Zéro journalisation, zéro réseau, zéro aléa, aucune injection de balisage.
   Enrichissement strictement additif : sans ce module la vue reste intégralement
   lisible. Chaque chantier est isolé par safe(); un try/catch global protège le
   rendu. Aucun fichier partagé n'est modifié. */

const CSS = `
/* E023-01 — Requête active observée et bandeau d'observation. */
.recit-v2-e023-observatoire{margin:8px 0 12px;padding:8px 10px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:8px;background:rgba(255,255,255,.02)}
.recit-v2-e023-observatoire h2{margin:0 0 6px;color:var(--gold,#e6b96f);font-size:10px;letter-spacing:.08em;text-transform:uppercase}
.recit-v2-e023-lecture{margin:2px 0;color:var(--muted-2,#9a8b73);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E023-02 — Longueur de la requête, en chiffres tabulaires. */
.recit-v2-e023-longueur{font-variant-numeric:tabular-nums}

/* E023-03 — Type retenu, mis en évidence. */
.recit-v2-e023-type{color:var(--gold,#e6b96f)}

/* E023-04 — Certitude retenue, mise en évidence. */
.recit-v2-e023-certitude{color:var(--gold,#e6b96f)}

/* E023-05 — Couverture du fil chiffrée. */
.recit-v2-e023-couverture{font-variant-numeric:tabular-nums}

/* E023-06 — Synthèse des critères actifs, séparée du détail. */
.recit-v2-e023-synthese{margin-top:6px;padding-top:6px;border-top:1px solid var(--line,rgba(255,255,255,.1));color:var(--gold-bright,#f5e9d0);font-weight:700}

/* E023-07 — Retour au fil : cible tactile conforme et focus visible. */
.recit-v2-e023-retour{min-height:36px;margin-top:8px;padding:6px 10px;border:1px solid var(--line-strong,var(--line));border-radius:6px;background:transparent;color:var(--ink);font:inherit;font-size:11px;cursor:pointer}
.recit-v2-e023-retour:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}

/* E023-08 — Signalement « aucun résultat » dans un paragraphe visible. */
.recit-v2-e023-vide{color:var(--gold-bright,#f5e9d0)}
.recit-layout .recit-v2-e023-sans-resultat{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.06)}

/* E023-09 — Repère visuel du champ de recherche actif. */
.recit-layout .c3a-search.recit-v2-e023-en-recherche{border-left:3px solid var(--gold,#e6b96f)}
.recit-layout .c3a-search.recit-v2-e023-en-recherche:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}

/* E023-10 — Mouvement réduit propre à la V2. */
.recit-v2-e023-lecture{transition:opacity .2s linear}
.recit-layout[data-v2-e023-motion="reduce"] .recit-v2-e023-lecture{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e023-lecture{transition:none}}
`;

/* Ids et classes des lectures de synthèse, dans un ordre stable. */
const LECTURES = [
  ['v2-e023-requete', 'recit-v2-e023-requete'],
  ['v2-e023-longueur', 'recit-v2-e023-longueur'],
  ['v2-e023-type', 'recit-v2-e023-type'],
  ['v2-e023-certitude', 'recit-v2-e023-certitude'],
  ['v2-e023-couverture', 'recit-v2-e023-couverture'],
  ['v2-e023-synthese', 'recit-v2-e023-synthese'],
  ['v2-e023-vide', 'recit-v2-e023-vide'],
];

/* Un chantier défaillant est neutralisé : les autres continuent, le rendu reste intact. */
function safe(fn) {
  try { return fn(); } catch { return null; }
}

function ecrit(noeud, valeur) {
  if (noeud && noeud.textContent !== valeur) noeud.textContent = valeur;
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function retireClasse(noeud, nom) {
  if (noeud && noeud.classList && noeud.classList.contains(nom)) noeud.classList.remove(nom);
}

/* Crée le bandeau une seule fois par rendu ; le réutilise si la coque repasse. */
function prepareBandeau(body, el) {
  if (!body || typeof body.insertBefore !== 'function') return null;
  let bandeau = typeof document !== 'undefined' ? document.getElementById('v2-e023-observatoire') : null;
  if (!bandeau) {
    bandeau = el('section', 'recit-v2-e023-observatoire');
    bandeau.id = 'v2-e023-observatoire';
    bandeau.setAttribute('aria-label', 'Observatoire de la recherche et du filtrage — complément V2');
    bandeau.appendChild(el('h2', '', 'Recherche et filtres · état observé (V2)'));
    LECTURES.forEach(([id, classe]) => {
      const p = el('p', `recit-v2-e023-lecture ${classe}`);
      p.id = id;
      bandeau.appendChild(p);
    });
    const bouton = el('button', 'recit-v2-e023-retour', 'Voir les résultats du fil');
    bouton.type = 'button';
    bouton.id = 'v2-e023-retour';
    bandeau.appendChild(bouton);
  }
  const ancre = body.querySelector('#c3a-status') || body.querySelector('#c3a-tools') || body.querySelector('.recit-thread');
  const cible = ancre && ancre.parentNode === body ? ancre.nextSibling : null;
  if (bandeau.parentNode !== body || (cible && bandeau.nextSibling !== cible)) {
    body.insertBefore(bandeau, cible);
  }
  return bandeau;
}

register('E023', (ctx) => {
  try {
    const { layout, css, el, reducedMotion } = ctx;
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;

    /* Une seule feuille, regroupant toutes les règles de la lentille. */
    safe(() => css('recit-v2-e023', CSS));

    const body = layout.querySelector('.recit-body');
    if (!body) return; /* garde d'existence : pas de corps = aucun enrichissement. */

    const search = body.querySelector('#c3a-search') || body.querySelector('.c3a-search');
    const status = body.querySelector('#c3a-status') || body.querySelector('.c3a-status');
    const filters = Array.from(body.querySelectorAll('.c3a-filter'));
    const vide = body.querySelector('#c3a-empty') || body.querySelector('.c3a-empty');

    const bandeau = prepareBandeau(body, el);
    const n = (id) => (bandeau ? bandeau.querySelector(`#${id}`) : null);

    const requete = search ? String(search.value || '').trim() : '';
    const typesActifs = [];
    const confsActives = [];

    /* E023-01 — requête lue directement dans #c3a-search, sans la modifier. */
    safe(() => {
      ecrit(n('v2-e023-requete'), requete
        ? `Recherche saisie : « ${requete} ».`
        : 'Aucune recherche saisie dans le fil.');
    });

    /* E023-02 — longueur de la requête, dérivée du texte réel du champ. */
    safe(() => {
      const nb = requete.length;
      ecrit(n('v2-e023-longueur'), `Longueur de la requête : ${nb} caractère${nb > 1 ? 's' : ''}.`);
    });

    /* E023-03 — types retenus lus sur les boutons aria-pressed, hors bouton « Tous ». */
    safe(() => {
      filters.forEach((b) => {
        if (b.getAttribute('aria-pressed') !== 'true') return;
        const fk = b.dataset ? b.dataset.fk || '' : '';
        const libelle = String(b.textContent || '').trim();
        if (fk.indexOf('c3a-kind-') === 0 && fk !== 'c3a-kind-all' && libelle) typesActifs.push(libelle);
      });
      ecrit(n('v2-e023-type'), typesActifs.length
        ? `Type retenu : ${typesActifs.join(', ')}.`
        : 'Aucun type retenu.');
    });

    /* E023-04 — certitudes retenues lues sur les mêmes boutons, hors « Toutes ». */
    safe(() => {
      filters.forEach((b) => {
        if (b.getAttribute('aria-pressed') !== 'true') return;
        const fk = b.dataset ? b.dataset.fk || '' : '';
        const libelle = String(b.textContent || '').trim();
        if (fk.indexOf('c3a-conf-') === 0 && fk !== 'c3a-conf-all' && libelle) confsActives.push(libelle);
      });
      ecrit(n('v2-e023-certitude'), confsActives.length
        ? `Certitude retenue : ${confsActives.join(', ')}.`
        : 'Aucune certitude retenue.');
    });

    /* E023-05 — couverture calculée depuis le texte de #c3a-status. */
    safe(() => {
      const t = status ? String(status.textContent || '') : '';
      const m = t.match(/(\d+)\s+point\(s\)\s+affiché\(s\)\s+sur\s+(\d+)/i);
      if (m) {
        const affiches = parseInt(m[1], 10);
        const total = parseInt(m[2], 10);
        const pct = total > 0 ? Math.round((affiches / total) * 100) : 0;
        ecrit(n('v2-e023-couverture'), `Couverture du fil : ${affiches} point(s) affiché(s) sur ${total}, soit ${pct} %.`);
      } else {
        ecrit(n('v2-e023-couverture'), 'Couverture du fil : non mesurable.');
      }
    });

    /* E023-06 — synthèse falsifiable : nombre de critères actifs, en toutes lettres. */
    safe(() => {
      const criteres = [];
      if (requete) criteres.push('recherche');
      if (typesActifs.length) criteres.push('type');
      if (confsActives.length) criteres.push('certitude');
      const nb = criteres.length;
      const detail = nb ? criteres.join(', ') : 'aucun';
      ecrit(n('v2-e023-synthese'), `Synthèse : ${nb} critère${nb > 1 ? 's' : ''} actif${nb > 1 ? 's' : ''} (${detail}).`);
    });

    /* E023-07 — bouton de retour au fil, posé une seule fois par bouton. */
    safe(() => {
      const bouton = bandeau ? bandeau.querySelector('#v2-e023-retour') : null;
      if (!bouton || bouton.hasAttribute('data-v2-e023-ecoute')) return;
      bouton.setAttribute('data-v2-e023-ecoute', '1');
      bouton.addEventListener('click', () => {
        try {
          const liste = document.getElementById('c3a-thread') || document.querySelector('.recit-thread');
          if (!liste) return;
          let reduit = false;
          try { reduit = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
          catch { reduit = false; }
          if (typeof liste.scrollIntoView === 'function') {
            liste.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' });
          }
          const premier = liste.querySelector ? liste.querySelector('.c3a-thread-item:not([disabled])') : null;
          if (premier && typeof premier.focus === 'function') premier.focus({ preventScroll: reduit });
        } catch { /* navigation neutralisée : le rendu reste intact */ }
      });
    });

    /* E023-08 — état « aucun résultat » déduit de la présence de #c3a-empty. */
    safe(() => {
      if (!bandeau) return;
      if (vide) {
        ajouteClasse(bandeau, 'recit-v2-e023-sans-resultat');
        ecrit(n('v2-e023-vide'), 'Aucun point ne correspond aux critères ; retirez un filtre ou élargissez la recherche.');
      } else {
        retireClasse(bandeau, 'recit-v2-e023-sans-resultat');
        ecrit(n('v2-e023-vide'), 'Le fil contient des points affichables.');
      }
    });

    /* E023-09 — repère visuel du champ de recherche lorsqu'il est renseigné. */
    safe(() => {
      if (!search) return;
      if (requete) ajouteClasse(search, 'recit-v2-e023-en-recherche');
      else retireClasse(search, 'recit-v2-e023-en-recherche');
    });

    /* E023-10 — mouvement réduit, publié sous un attribut propre à la V2. */
    safe(() => {
      let reduit = false;
      try { reduit = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
      catch { reduit = false; }
      const voulu = reduit ? 'reduce' : 'normal';
      if (layout.getAttribute('data-v2-e023-motion') !== voulu) {
        layout.setAttribute('data-v2-e023-motion', voulu);
      }
    });
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
