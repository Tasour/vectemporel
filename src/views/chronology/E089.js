import { register } from './registry.js';

/* E089 — annotations et notes personnelles sur les repères.
   Dix chantiers E089-01 à E089-10, tous implémentés dans ce module.
   Zéro réseau, zéro journalisation, zéro tirage aléatoire, zéro boucle rAF,
   zéro timer.
   Les notes restent dans le navigateur : aucun appel réseau, aucune donnée
   envoyée, aucune modification des points vérifiés (chronology.js:461-504). */

const STORAGE_KEY = 'vectemporel-e089-notes';
const store = Object.create(null); /* clé « pays::repère » → { text, updatedAt } */
let hydrated = false;

/* E089-02 : hydratation unique, sous garde module, avec repli mémoire si le
   stockage local est indisponible (mode privé, sandbox). Aucun fetch. */
function hydrate() {
  if (hydrated) return store;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return store;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return store;
    Object.keys(data).forEach((key) => {
      const item = data[key];
      if (item && typeof item.text === 'string') {
        store[key] = { text: item.text, updatedAt: Number(item.updatedAt) || 0 };
      }
    });
  } catch {
    /* Stockage indisponible : le repli mémoire reste silencieux. */
  }
  return store;
}

/* E089-02 : écriture locale unique ; l'échec n'interrompt jamais le rendu. */
function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* Repli mémoire : la note reste vivante pour la session en cours. */
  }
}

function keyFor(countryId, eventId) {
  return `${countryId}::${eventId}`;
}

/* E089-04 : comptage déterministe, sans aléa. */
function wordCount(text) {
  const found = String(text || '').trim().match(/\S+/g);
  return found ? found.length : 0;
}

function plural(count, singular, pluralForm) {
  return count > 1 ? pluralForm : singular;
}

/* E089-04 : horodatage issu de l'horloge locale, sans aucun tirage aléatoire. */
function formatTime(timestamp) {
  if (!timestamp) return 'jamais enregistrée';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'horodatage indisponible';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `enregistrée à ${hours}:${minutes}`;
}

/* E089-01 : identifiant du repère courant. La carte sélectionnée porte
   aria-current="true" et data-event-id (chronology.js:385-410) ; repli sur
   l'identifiant du premier point « point-<id>-<rang> » (chronology.js:475)
   lorsque le filtre masque la carte courante (chronology.js:353-374). */
function selectedEventId(layout) {
  const current = layout.querySelector('#atlas-chrono-events [aria-current="true"]');
  if (current && current.dataset.eventId) return current.dataset.eventId;
  const point = layout.querySelector('#atlas-chrono-aside .point');
  if (point && point.id) {
    const match = /^point-(.+)-\d+$/.exec(point.id);
    if (match) return match[1];
  }
  return null;
}

register('E089', (ctx) => {
  /* Le greffon est rejoué à chaque rendu (registry.js:28-43, appel en
     chronology.js:539). Il ne touche à aucun fichier partagé. */
  if (ctx.viewId && ctx.viewId !== 'chronology') return;
  const { stage, layout, css, el } = ctx;
  if (!layout || !stage) return;

  const doc = layout.ownerDocument || document;
  const countryId = layout.dataset.countryId || 'inconnu'; /* chronology.js:215 */
  const notes = hydrate();

  /* E089-09 : une seule injection CSS, via ctx.css (registry.js:13-19). */
  css('chronology-e089', `
.e089-panel{margin-top:16px;padding:12px;border:1px solid var(--line-strong);border-radius:10px;background:rgba(230,185,111,.04)}
.e089-heading{margin:0 0 6px;color:var(--gold);font-family:var(--serif);font-size:13px;font-weight:450}
.e089-intro{margin:0 0 8px;color:var(--muted);font-size:9px;line-height:1.5}
.e089-label{display:block;margin:0 0 4px;color:var(--ink-soft);font-size:9px;font-weight:600}
.e089-textarea{display:block;width:100%;min-height:84px;resize:vertical;padding:8px 9px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--ink);font:inherit;font-size:11px;line-height:1.45}
.e089-textarea::placeholder{color:var(--muted-2)}
.e089-textarea:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e089-textarea:disabled{opacity:.55;cursor:not-allowed}
.e089-hint{margin:5px 0 0;color:var(--muted-2);font-size:8px;line-height:1.45}
.e089-meta{display:flex;flex-wrap:wrap;gap:4px 10px;margin:7px 0 0;color:var(--muted);font-size:8px;font-variant-numeric:tabular-nums}
.e089-time{color:var(--muted-2)}
.e089-actions{display:flex;gap:6px;margin-top:9px}
.e089-btn{min-height:36px;padding:0 11px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font-size:9px;cursor:pointer}
.e089-btn:hover{border-color:var(--gold);background:rgba(230,185,111,.08)}
.e089-btn:disabled{opacity:.45;cursor:not-allowed}
.e089-status{min-height:14px;margin:7px 0 0;color:var(--gold-bright);font-size:8px;line-height:1.4}
.e089-recap{margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
.e089-recap-title{margin:0 0 6px;color:var(--ink-soft);font-family:var(--serif);font-size:11px;font-weight:450}
.e089-list{list-style:none;margin:0;padding:0}
.e089-item{display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--line)}
.e089-item-text{flex:1;min-width:0;color:var(--muted);font-size:9px;line-height:1.35;overflow-wrap:anywhere}
.e089-goto{min-height:36px;padding:0 8px;font-size:8px}
.e089-item-empty{padding:5px 0;color:var(--muted-2);font-size:9px;font-style:italic}
.e089-badge{display:inline-block;margin-top:6px;padding:2px 6px;border:1px solid var(--line-strong);border-radius:999px;color:var(--gold-bright);font-size:7px;letter-spacing:.04em;white-space:nowrap;transition:border-color .15s ease,background-color .15s ease}
.e089-badge:hover{border-color:var(--gold);background:rgba(230,185,111,.08)}
[data-e089-reduced="1"] .e089-badge{transition:none}
@media (max-width:1000px){.e089-panel{padding:10px}}
`);

  /* E089-08 : la préférence est relue à chaque application ; aucun écouteur
     matchMedia dupliqué, aucune animation propre au greffon. */
  let reduced = false;
  try {
    reduced = Boolean(typeof ctx.reducedMotion === 'function' && ctx.reducedMotion());
  } catch {
    reduced = false;
  }
  layout.dataset.e089Reduced = reduced ? '1' : '0';

  /* E089-09 : tous les identifiants sont préfixés e089 et réutilisés sous
     garde d'existence. Un nœud déjà présent dans le parent n'est pas recréé,
     ce qui évite doublons d'ID et annonces live dédoublées. */
  function ensure(parent, id, tag, className, text) {
    let node = parent.querySelector(`#${id}`);
    if (!node) {
      node = el(tag, className, text);
      node.id = id;
      parent.appendChild(node);
    } else {
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
    }
    return node;
  }

  const aside = layout.querySelector('#atlas-chrono-aside') || layout;
  const eventId = selectedEventId(layout);
  const notesKey = eventId ? keyFor(countryId, eventId) : null;
  const currentEntry = notesKey ? notes[notesKey] : null;
  const currentText = currentEntry ? currentEntry.text : '';

  const asideTitle = layout.querySelector('#atlas-chrono-event-title');
  let eventLabel = eventId || 'ce repère';
  if (asideTitle && asideTitle.textContent.trim()) eventLabel = asideTitle.textContent.trim();

  /* E089-01 : panneau d'annotation du repère courant, ajouté à la fiche sans
     écraser les points vérifiés ni les actions (chronology.js:461-526). */
  const panel = ensure(aside, 'e089-panel', 'section', 'e089-panel');
  panel.setAttribute('aria-labelledby', 'e089-heading');
  panel.dataset.e089Country = countryId;
  ensure(panel, 'e089-heading', 'h3', 'e089-heading', 'Mes notes sur ce repère');
  ensure(
    panel,
    'e089-intro',
    'p',
    'e089-intro',
    'Espace personnel : votre note ne modifie pas les points vérifiés du repère et reste sur cet appareil.'
  );

  let label = panel.querySelector('label[for="e089-textarea"]');
  if (!label) {
    label = el('label', 'e089-label', 'Votre note personnelle');
    label.setAttribute('for', 'e089-textarea');
    panel.appendChild(label);
  }

  const area = ensure(panel, 'e089-textarea', 'textarea', 'e089-textarea');
  area.setAttribute('aria-describedby', 'e089-hint e089-status');
  area.dataset.e089Key = notesKey || '';
  area.dataset.e089Label = eventLabel;
  area.placeholder = eventId
    ? 'Écrivez ici votre observation, votre question ou votre lien de lecture…'
    : 'Sélectionnez un repère pour pouvoir l’annoter.';
  area.disabled = !eventId;
  if (area.value !== currentText) area.value = currentText;

  ensure(
    panel,
    'e089-hint',
    'p',
    'e089-hint',
    'Enregistrement automatique à chaque frappe. Aucune donnée ne quitte ce navigateur.'
  );

  const meta = ensure(panel, 'e089-meta', 'p', 'e089-meta');
  const count = ensure(meta, 'e089-count', 'span', 'e089-count', '');
  const time = ensure(meta, 'e089-time', 'span', 'e089-time', '');
  meta.append(count, time);

  const actions = ensure(panel, 'e089-actions', 'div', 'e089-actions');
  const clear = ensure(actions, 'e089-clear', 'button', 'e089-btn', 'Effacer cette note');
  clear.type = 'button';

  /* E089-05 : région live locale, unique, annoncée seulement sur action
     explicite (sauvegarde, effacement, localisation) — jamais sur survol. */
  const status = ensure(panel, 'e089-status', 'p', 'e089-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  /* E089-07 : synthèse des repères annotés du pays courant, afin qu'une note
     posée dans une autre ère reste découvrable malgré le filtrage ère par ère
     de chronology.js:235-242. */
  const recap = ensure(panel, 'e089-recap', 'div', 'e089-recap');
  ensure(recap, 'e089-recap-title', 'h4', 'e089-recap-title', 'Repères annotés de ce pays');
  const list = ensure(recap, 'e089-list', 'ul', 'e089-list');

  const labelMap = Object.create(null);
  layout.querySelectorAll('#atlas-chrono-events .event-card').forEach((card) => {
    if (!card.dataset.eventId) return;
    const strong = card.querySelector('strong');
    labelMap[card.dataset.eventId] = strong ? strong.textContent.trim() : card.dataset.eventId;
  });
  function labelFor(id) {
    if (id === eventId && asideTitle && asideTitle.textContent.trim()) {
      return asideTitle.textContent.trim();
    }
    return labelMap[id] || id;
  }

  /* E089-03 : marqueur textuel (glyphe + mot + nombre), jamais porté par la
     seule couleur. Il vit dans un span non interactif pour ne pas voler le
     clic de la carte (chronology.js:406-409). */
  function refreshBadges() {
    const prefix = `${panel.dataset.e089Country || countryId}::`;
    layout.querySelectorAll('#atlas-chrono-events .event-card').forEach((card) => {
      const id = card.dataset.eventId;
      if (!id) return;
      const entry = notes[`${prefix}${id}`];
      let badge = card.querySelector('.e089-badge');
      if (entry && String(entry.text || '').trim()) {
        const words = wordCount(entry.text);
        const text = `✎ note · ${words} ${plural(words, 'mot', 'mots')}`;
        if (!badge) {
          badge = el('span', 'e089-badge', text);
          card.appendChild(badge);
        } else if (badge.textContent !== text) {
          badge.textContent = text;
        }
        badge.setAttribute('aria-label', `Note personnelle : ${words} ${plural(words, 'mot', 'mots')}`);
        if (card.parentElement) card.parentElement.dataset.e089Annotated = '1';
      } else if (badge) {
        badge.remove();
        if (card.parentElement) delete card.parentElement.dataset.e089Annotated;
      }
    });

    const annotated = Object.keys(notes)
      .filter((key) => key.indexOf(prefix) === 0 && notes[key] && String(notes[key].text || '').trim())
      .sort();
    list.textContent = '';
    annotated.forEach((key) => {
      const id = key.slice(prefix.length);
      const words = wordCount(notes[key].text);
      const item = el('li', 'e089-item');
      item.appendChild(el(
        'span',
        'e089-item-text',
        `${labelFor(id)} — ${words} ${plural(words, 'mot', 'mots')}`
      ));
      const goto = el('button', 'e089-btn e089-goto', 'Localiser');
      goto.type = 'button';
      goto.dataset.e089Goto = id;
      if (goto.dataset.e089Bound !== '1') {
        goto.addEventListener('click', () => {
          const target = doc.getElementById(`event-btn-${goto.dataset.e089Goto}`);
          if (target) {
            target.focus();
            target.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            status.textContent = `Repère « ${labelFor(goto.dataset.e089Goto)} » localisé dans la liste.`;
          } else {
            status.textContent = `Le repère « ${labelFor(goto.dataset.e089Goto)} » n’est pas visible dans le filtre courant.`;
          }
        });
        goto.dataset.e089Bound = '1';
      }
      item.appendChild(goto);
      list.appendChild(item);
    });
    if (!annotated.length) {
      list.appendChild(el('li', 'e089-item-empty', 'Aucune note enregistrée pour ce pays.'));
    }
  }

  /* E089-04 : mesures textuelles mises à jour à chaque frappe. */
  function refreshMeta() {
    const length = area.value.length;
    const words = wordCount(area.value);
    count.textContent = `${length} ${plural(length, 'caractère', 'caractères')} · ${words} ${plural(words, 'mot', 'mots')}`;
    const stamp = notes[area.dataset.e089Key] ? notes[area.dataset.e089Key].updatedAt : 0;
    time.textContent = `Dernière sauvegarde : ${formatTime(stamp)}.`;
    clear.disabled = !area.value.trim();
  }

  /* E089-02 : chaque frappe écrit dans le stockage local, sans réseau. */
  if (area.dataset.e089Bound !== '1') {
    area.addEventListener('input', () => {
      const key = area.dataset.e089Key;
      if (!key) return;
      const value = area.value;
      if (value.trim()) store[key] = { text: value, updatedAt: Date.now() };
      else delete store[key];
      persist();
      refreshMeta();
      refreshBadges();
      status.textContent = value.trim()
        ? `Note enregistrée pour ${area.dataset.e089Label}.`
        : `Note effacée pour ${area.dataset.e089Label}.`;
    });
    area.dataset.e089Bound = '1';
  }

  /* E089-06 : effacement explicite, puis retour du focus dans le champ pour
     enchaîner la saisie sans déplacement de focus parasite. */
  if (clear.dataset.e089Bound !== '1') {
    clear.addEventListener('click', () => {
      const key = area.dataset.e089Key;
      if (!key) return;
      area.value = '';
      delete store[key];
      persist();
      refreshMeta();
      refreshBadges();
      status.textContent = `Note effacée pour ${area.dataset.e089Label}.`;
      area.focus();
    });
    clear.dataset.e089Bound = '1';
  }

  refreshMeta();
  refreshBadges();
});
