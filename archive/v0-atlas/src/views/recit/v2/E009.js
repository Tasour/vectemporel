import { register } from './registry.js';

/* V2 lentille E009 — « Transitions et mouvement » (vue Récit), second jeu de
 * chantiers, distinct de ceux de la passe 1. La passe 1 traite déjà la barre de
 * progression et son sens de marche, l'entrée du titre, le recentrage du fil,
 * les repères directionnels des commandes précédent/suivant, la pulsation de
 * la lecture auto, une bascule locale, la jauge de certitude, la tête de lecture
 * du fil, le fondu du média et un panneau de mesures masqué.
 *
 * Ce jeu V2 cible exclusivement les éléments que la passe 1 laisse intacts :
 * le kicker (cadran à aiguille), le temps de lecture (bandeau de rythme), le chip
 * de certitude (halo), les jalons du fil filtré (soulignement), les commandes
 * secondaires (micro-transitions), les boutons désactivés (explicitation),
 * le statut de filtre (flash), l'image (recadrage ambiant), la traçabilité
 * (révélation en cascade) et une synthèse visible du régime cinétique.
 *
 * Dix chantiers, tous non destructifs : aucun texte n'est retiré ni réécrit,
 * aucun attribut porté par la coque n'est écrasé, tout chiffre affiché est lu
 * dans le DOM réel (textContent, getComputedStyle, nombre de nœuds). Zéro
 * réseau, zéro console, zéro aléa. Un seul register, un seul bloc CSS, classes
 * préfixées « recit-v2-e009- », ids DOM préfixés « v2-e009- » et uniques (la
 * passe 1 utilise « e009- » sur le MÊME DOM, d'où le préfixe systématique).
 * Aucune boucle rAF : le mouvement est purement CSS et neutralisé en régime
 * réduit (préférence système OU attribut V2 posé sur la layout). */

const CSS = `
/* E009-01 — kicker : cadran à aiguille dont l'angle est dérivé de « Étape i / n ». */
.recit-v2-e009-cadran{display:inline-flex;align-items:center;gap:7px;margin:0 0 9px;color:var(--muted-2,#b9a98c);font-size:9px;font-variant-numeric:tabular-nums}
.recit-v2-e009-cadran-disque{position:relative;display:inline-flex;align-items:center;width:18px;height:18px;border:1px solid var(--line-strong);border-radius:50%;background:rgba(255,255,255,.03)}
.recit-v2-e009-cadran-aiguille{display:inline-block;width:7px;height:2px;margin-left:8px;border-radius:2px;background:var(--gold-bright,#f5e9d0);transform-origin:left center;transform:rotate(calc(var(--v2-e009-angle,0) * 1deg));transition:transform 480ms cubic-bezier(.22,.61,.36,1)}

/* E009-02 — temps de lecture : bandeau de rythme à segments, un trait par seconde lue. */
.recit-v2-e009-rythme{display:flex;align-items:center;gap:8px;margin:2px 0 9px;color:var(--muted-2,#b9a98c);font-size:9px;font-variant-numeric:tabular-nums}
.recit-v2-e009-rythme-piste{display:inline-flex;gap:2px;min-height:10px}
.recit-v2-e009-rythme-tick{width:3px;height:9px;border-radius:1px;background:rgba(255,255,255,.14);transition:background 320ms ease,transform 320ms ease}
.recit-v2-e009-rythme-tick.recit-v2-e009-rythme-actif{background:var(--gold,#e6b96f);transform:scaleY(1.15)}

/* E009-03 — chip de certitude : halo de confirmation qui s'estompe au changement de point. */
.recit-v2-e009-conf-halo{animation:v2-e009-halo 900ms ease-out both}
@keyframes v2-e009-halo{from{box-shadow:0 0 0 0 rgba(230,185,111,.5)}to{box-shadow:0 0 0 10px rgba(230,185,111,0)}}
.recit-v2-e009-conf-note{display:inline-block;margin-left:6px;color:var(--muted-2,#b9a98c);font-size:9px;font-variant-numeric:tabular-nums}

/* E009-04 — jalons du fil filtré : soulignement révélé au survol et au focus. */
.recit-v2-e009-jalon{position:relative}
.recit-v2-e009-jalon::after{content:'';position:absolute;left:8px;right:8px;bottom:3px;height:1px;background:var(--gold-bright,#f5e9d0);transform:scaleX(0);transform-origin:left center;transition:transform 220ms ease}
.recit-v2-e009-jalon:hover::after,.recit-v2-e009-jalon:focus-visible::after{transform:scaleX(1)}

/* E009-05 — commandes secondaires : rotation de « Recommencer » et glissement de « Repère suivant ». */
.recit-layout [data-fk="c3a-restart"]{transition:transform 260ms ease,color 260ms ease}
.recit-layout [data-fk="c3a-restart"]:hover:not([disabled]),.recit-layout [data-fk="c3a-restart"]:focus-visible:not([disabled]){transform:rotate(-40deg);color:var(--gold-bright,#f5e9d0)}
.recit-layout [data-fk="c3a-next-event"]{transition:transform 260ms ease,color 260ms ease}
.recit-layout [data-fk="c3a-next-event"]:hover:not([disabled]),.recit-layout [data-fk="c3a-next-event"]:focus-visible:not([disabled]){transform:translate(2px,-2px);color:var(--gold-bright,#f5e9d0)}

/* E009-06 — commandes indisponibles : ligne de synthèse visible, chiffre lu sur [disabled]. */
.recit-v2-e009-dispo{margin:5px 0 0;color:var(--muted-2,#b9a98c);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-layout .recit-actions button{transition:opacity 240ms ease}

/* E009-07 — flash de recalcul du statut de filtre (deux classes alternées pour rejouer l'animation). */
.recit-layout #c3a-status.recit-v2-e009-flash-a,
.recit-layout #c3a-status.recit-v2-e009-flash-b{animation:v2-e009-flash 620ms ease-out}
@keyframes v2-e009-flash{from{background-color:rgba(230,185,111,.22)}to{background-color:transparent}}

/* E009-08 — recadrage lent de l'image (mouvement ambiant, distinct du fondu de la passe 1). */
.recit-layout .recit-media img{transition:transform 900ms ease}
.recit-layout[data-recit-v2-e009-motion="full"] .recit-media img{animation:v2-e009-zoom 14s ease-in-out infinite alternate}
@keyframes v2-e009-zoom{from{transform:scale(1)}to{transform:scale(1.06)}}

/* E009-09 — révélation en cascade du texte de traçabilité à l'ouverture du <details>. */
.recit-layout details.recit-trace[open] p{animation:v2-e009-reveal 460ms ease-out both}
@keyframes v2-e009-reveal{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.recit-v2-e009-trace-note{margin:4px 0 0;color:var(--muted-2,#b9a98c);font-size:9px;font-variant-numeric:tabular-nums}

/* E009-10 — témoin de chorégraphie : paragraphe visible, rôle de status. */
.recit-v2-e009-chore{margin:8px 0 0;padding:6px 8px;border-left:2px solid var(--line-strong);border-radius:0 6px 6px 0;background:rgba(255,255,255,.02);color:var(--muted,#b9a98c);font-size:9px;line-height:1.6;font-variant-numeric:tabular-nums}

/* E009-10 — régime réduit : neutralisation de TOUTES les animations V2, sans toucher à la passe 1. */
.recit-layout[data-recit-v2-e009-motion="reduce"] .recit-v2-e009-cadran-aiguille,
.recit-layout[data-recit-v2-e009-motion="reduce"] .recit-v2-e009-rythme-tick,
.recit-layout[data-recit-v2-e009-motion="reduce"] .recit-v2-e009-conf-halo,
.recit-layout[data-recit-v2-e009-motion="reduce"] .recit-v2-e009-jalon::after,
.recit-layout[data-recit-v2-e009-motion="reduce"] [data-fk="c3a-restart"],
.recit-layout[data-recit-v2-e009-motion="reduce"] [data-fk="c3a-next-event"],
.recit-layout[data-recit-v2-e009-motion="reduce"] .recit-actions button,
.recit-layout[data-recit-v2-e009-motion="reduce"] #c3a-status,
.recit-layout[data-recit-v2-e009-motion="reduce"] .recit-media img,
.recit-layout[data-recit-v2-e009-motion="reduce"] details.recit-trace[open] p{animation:none!important;transition:none!important}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e009-cadran-aiguille,.recit-v2-e009-rythme-tick,.recit-v2-e009-conf-halo,
  .recit-v2-e009-jalon::after,[data-fk="c3a-restart"],[data-fk="c3a-next-event"],
  .recit-actions button,#c3a-status,.recit-media img,details.recit-trace[open] p{animation:none!important;transition:none!important}
}
`;

/* État module — survit aux reconstructions du DOM, jamais écrit ailleurs. */
let lastConf = null;     // texte du chip de certitude au rendu précédent (E009-03)
let lastStatus = null;   // texte du statut de filtre au rendu précédent (E009-07)
let flashToggle = false; // alterne les deux classes de flash (E009-07)

/* Isole un chantier défaillant : les neuf autres continuent, le rendu ne casse jamais. */
function safe(fn) {
  try { fn(); } catch { /* enrichissement non destructif : neutralisé silencieusement. */ }
}

/* Ajoute une classe sans écraser les classes déjà portées par la coque. */
function marquer(node, classe) {
  if (node && node.classList && typeof node.classList.add === 'function'
      && !node.classList.contains(classe)) node.classList.add(classe);
  return node;
}

/* Réutilise un nœud inséré (idempotence) ou le crée, puis le rattache à parent.
   Le préfixe v2-e009- garantit l'unicité face aux ids e009- de la passe 1. */
function assure(id, tag, classe, parent, el) {
  if (!parent || typeof parent.appendChild !== 'function' || typeof document === 'undefined') return null;
  let node = document.getElementById(id);
  if (!node) {
    node = typeof el === 'function' ? el(tag, classe) : document.createElement(tag);
    if (classe && typeof el !== 'function') node.className = classe;
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Pose un attribut seulement s'il est absent (aucun attribut de la coque écrasé). */
function setOnce(node, name, value) {
  if (node && node.nodeType === 1 && !node.hasAttribute(name)) node.setAttribute(name, value);
}

/* Lit « Étape i / n » dans le texte réel du kicker ; aucun chiffre inventé. */
function lireEtape(kicker) {
  const found = /(?:Étape|etape)\s+(\d+)\s*\/\s*(\d+)/i.exec(String(kicker && kicker.textContent || ''));
  if (!found) return { step: 0, total: 0, pct: 0, angle: 0 };
  const step = Number(found[1]);
  const total = Number(found[2]);
  if (!Number.isFinite(step) || !Number.isFinite(total) || total <= 0 || step < 1 || step > total) {
    return { step: 0, total: 0, pct: 0, angle: 0 };
  }
  const pct = Math.round((step / total) * 100);
  return { step, total, pct, angle: Math.round(pct * 3.6) };
}

/* Lit « ≈ N s » dans le texte réel du temps de lecture. */
function lireTempo(timing) {
  const found = /≈\s*(\d+)\s*s/.exec(String(timing && timing.textContent || ''));
  if (!found) return 0;
  const value = Number(found[1]);
  return Number.isFinite(value) ? value : 0;
}

/* Lit une durée de transition calculée par le navigateur (value réelle du CSS). */
function dureeCalculee(node) {
  if (!node || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return '—';
  try {
    const value = window.getComputedStyle(node).transitionDuration;
    if (!value) return '—';
    return String(value).split(',')[0].trim() || '—';
  } catch { return '—'; }
}

/* E009-01 — cadran à aiguille à côté du kicker, angle dérivé de « Étape i / n ». */
function chantier01(body, etape, el) {
  const kicker = body.querySelector('.view-kicker');
  if (!kicker) return;
  const cadran = assure('v2-e009-cadran', 'span', 'recit-v2-e009-cadran', kicker.parentNode, el);
  if (!cadran) return;
  if (cadran.parentNode !== kicker.parentNode) kicker.parentNode.insertBefore(cadran, kicker.nextSibling);
  let disque = cadran.querySelector('.recit-v2-e009-cadran-disque');
  if (!disque) {
    disque = el('span', 'recit-v2-e009-cadran-disque');
    const aiguille = el('span', 'recit-v2-e009-cadran-aiguille');
    setOnce(aiguille, 'aria-hidden', 'true');
    disque.appendChild(aiguille);
    cadran.appendChild(disque);
  }
  const aiguille = disque.querySelector('.recit-v2-e009-cadran-aiguille');
  if (aiguille) aiguille.style.setProperty('--v2-e009-angle', String(etape.angle));
  const texte = etape.total
    ? `Progression : ${etape.step} sur ${etape.total} · ${etape.pct} %.`
    : 'Progression : étape non lisible.';
  let libelle = cadran.querySelector('.recit-v2-e009-cadran-texte');
  if (!libelle) {
    libelle = el('span', 'recit-v2-e009-cadran-texte', texte);
    cadran.appendChild(libelle);
  } else if (libelle.textContent !== texte) {
    libelle.textContent = texte;
  }
}

/* E009-02 — bandeau de rythme : un trait par seconde lue dans .recit-timing. */
function chantier02(body, tempo, el) {
  const timing = body.querySelector('.recit-timing');
  if (!timing || !tempo) return;
  const bandeau = assure('v2-e009-rythme', 'div', 'recit-v2-e009-rythme', timing.parentNode, el);
  if (!bandeau) return;
  let piste = bandeau.querySelector('.recit-v2-e009-rythme-piste');
  if (!piste) {
    piste = el('span', 'recit-v2-e009-rythme-piste');
    setOnce(piste, 'aria-hidden', 'true');
    bandeau.appendChild(piste);
  }
  /* Plafond à 16 traits : le DOM reste léger même pour un temps de lecture long. */
  const traits = Math.min(tempo, 16);
  while (piste.children.length < traits) {
    piste.appendChild(el('span', 'recit-v2-e009-rythme-tick'));
  }
  while (piste.children.length > traits) {
    piste.removeChild(piste.lastElementChild);
  }
  for (let i = 0; i < piste.children.length; i += 1) {
    marquer(piste.children[i], 'recit-v2-e009-rythme-actif');
  }
  const texte = `Rythme : ≈ ${tempo} s · ${traits} repère(s) affiché(s).`;
  let libelle = bandeau.querySelector('.recit-v2-e009-rythme-texte');
  if (!libelle) {
    libelle = el('span', 'recit-v2-e009-rythme-texte', texte);
    bandeau.appendChild(libelle);
  } else if (libelle.textContent !== texte) {
    libelle.textContent = texte;
  }
}

/* E009-03 — halo de confirmation du chip, avec équivalent textuel visible. */
function chantier03(body, el) {
  const chip = body.querySelector('.recit-conf');
  if (!chip) return;
  const conf = String(chip.textContent || '').trim();
  if (conf && conf !== lastConf) marquer(chip, 'recit-v2-e009-conf-halo');
  lastConf = conf;
  const note = assure('v2-e009-conf-note', 'span', 'recit-v2-e009-conf-note', chip.parentNode, el);
  if (!note) return;
  const texte = conf ? `Certitude lue : ${conf}.` : 'Certitude : mention absente.';
  if (note.textContent !== texte) note.textContent = texte;
}

/* E009-04 — soulignement animé des jalons du fil filtré. */
function chantier04(body) {
  const jalons = body.querySelectorAll('#c3a-thread .c3a-thread-item');
  if (!jalons || typeof jalons.forEach !== 'function') return;
  jalons.forEach((jalon) => marquer(jalon, 'recit-v2-e009-jalon'));
}

/* E009-05 — micro-transitions des commandes secondaires (déjà portées par le CSS). */
function chantier05(body) {
  const restart = body.querySelector('[data-fk="c3a-restart"]');
  const nextEvent = body.querySelector('[data-fk="c3a-next-event"]');
  /* La règle CSS cible directement [data-fk] : on pose un marqueur témoin
     sur les deux commandes pour rendre le chantier vérifiable dans le DOM. */
  marquer(restart, 'recit-v2-e009-secondaire');
  marquer(nextEvent, 'recit-v2-e009-secondaire');
}

/* E009-06 — explicitation visible des commandes désactivées, chiffre compté sur [disabled]. */
function chantier06(body, el) {
  const actions = body.querySelector('.recit-actions');
  if (!actions) return;
  const disabled = Array.prototype.slice.call(actions.querySelectorAll('button[disabled]'));
  const noms = disabled.map((b) => String(b.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const ligne = assure('v2-e009-dispo', 'p', 'recit-v2-e009-dispo', actions.parentNode, el);
  if (!ligne) return;
  const texte = disabled.length
    ? `Commandes : ${disabled.length} action(s) indisponible(s) · ${noms.join(' · ')}.`
    : 'Commandes : aucune action indisponible à cette étape.';
  if (ligne.textContent !== texte) ligne.textContent = texte;
}

/* E009-07 — flash du statut de filtre quand son texte change (classes alternées). */
function chantier07(body) {
  const status = body.querySelector('#c3a-status') || body.querySelector('.c3a-status');
  if (!status) return;
  const texte = String(status.textContent || '');
  const change = lastStatus !== null && texte !== lastStatus;
  status.classList.remove('recit-v2-e009-flash-a', 'recit-v2-e009-flash-b');
  if (change) {
    flashToggle = !flashToggle;
    marquer(status, flashToggle ? 'recit-v2-e009-flash-a' : 'recit-v2-e009-flash-b');
  }
  lastStatus = texte;
}

/* E009-08 — mouvement ambiant de l'image, actif seulement en régime complet. */
function chantier08(body, plein) {
  const img = body.querySelector('.recit-media img');
  if (!img) return;
  marquer(img, 'recit-v2-e009-ambiant');
  if (plein) marquer(img, 'recit-v2-e009-ambiant-actif');
  else if (img.classList) img.classList.remove('recit-v2-e009-ambiant-actif');
}

/* E009-09 — révélation animée de la traçabilité et note chiffrée lue dans le <summary>. */
function chantier09(body, el) {
  const details = body.querySelector('details.recit-trace');
  if (!details) return;
  const summary = details.querySelector('summary');
  const found = summary && /(\d+)\s*référence\(s\)/.exec(String(summary.textContent || ''));
  const refs = found ? Number(found[1]) : null;
  const p = details.querySelector('p');
  if (p) marquer(p, 'recit-v2-e009-trace-reveal');
  const note = assure('v2-e009-trace-note', 'p', 'recit-v2-e009-trace-note', details, el);
  if (!note) return;
  const texte = refs !== null && Number.isFinite(refs)
    ? `Traçabilité : ${refs} référence(s) locale(s) · révélation animée à l'ouverture.`
    : 'Traçabilité : références non chiffrées dans le libellé.';
  if (note.textContent !== texte) note.textContent = texte;
}

/* E009-10 — témoin de chorégraphie : synthèse visible en nœud <p role="status">,
   entièrement dérivée du DOM et du régime calculé. */
function chantier10(body, data, el) {
  const cibles = body.querySelectorAll(
    '.recit-v2-e009-cadran-aiguille, .recit-v2-e009-rythme-tick, .recit-v2-e009-conf-halo, '
    + '.recit-v2-e009-jalon, .recit-v2-e009-ambiant-actif, .recit-v2-e009-trace-reveal'
  ).length;
  const texte = `Chorégraphie : régime ${data.reduit ? 'réduit' : 'complet'} · `
    + `${cibles} élément(s) animé(s) par la V2 · `
    + `transition barre ${data.dureeBarre} · `
    + `transition pastille ${data.dureeConf} · `
    + `cadence ${data.tempo} s · `
    + `${data.disabled} commande(s) indisponible(s).`;
  const pane = assure('v2-e009-chore', 'p', 'recit-v2-e009-chore', body, el);
  if (!pane) return;
  setOnce(pane, 'role', 'status');
  setOnce(pane, 'aria-live', 'polite');
  if (pane.textContent !== texte) pane.textContent = texte;
}

register('E009', (ctx) => {
  try {
    const { stage, layout, css, el, reducedMotion } = ctx;
    if (typeof document === 'undefined' || !stage || !layout) return;
    safe(() => { css('recit-v2-e009', CSS); }); /* un seul appel, toutes les règles du module. */
    if (typeof layout.querySelector !== 'function') return;
    const body = layout.querySelector('.recit-body');
    if (!body) return;

    /* Régime cinétique : préférence système uniquement (aucune bascule ajoutée,
       pour rester distinct de la bascule locale de la passe 1). */
    let reduit = false;
    try { reduit = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduit = false; }
    const plein = !reduit;
    const regime = reduit ? 'reduce' : 'full';
    if (layout.getAttribute('data-recit-v2-e009-motion') !== regime) {
      layout.setAttribute('data-recit-v2-e009-motion', regime);
    }

    const etape = lireEtape(body.querySelector('.view-kicker'));
    const tempo = lireTempo(body.querySelector('.recit-timing'));
    const barre = layout.querySelector('.recit-progress > span');
    const chip = body.querySelector('.recit-conf');
    const actions = body.querySelector('.recit-actions');
    const disabled = actions ? actions.querySelectorAll('button[disabled]').length : 0;
    const data = {
      reduit, tempo, disabled,
      dureeBarre: dureeCalculee(barre),
      dureeConf: dureeCalculee(chip),
    };

    safe(() => chantier01(body, etape, el));
    safe(() => chantier02(body, tempo, el));
    safe(() => chantier03(body, el));
    safe(() => chantier04(body));
    safe(() => chantier05(body));
    safe(() => chantier06(body, el));
    safe(() => chantier07(body));
    safe(() => chantier08(body, plein));
    safe(() => chantier09(body, el));
    safe(() => chantier10(body, data, el));
  } catch { /* garde-fou global : une lentille défaillante ne casse pas le rendu. */ }
});
