/* Épiques Chronas locaux : pastilles sur la frise et sélection accessible.
 * Aucune infobulle, aucun réseau, aucun poster. */
import { CHRONAS_EPICS } from '../data/chronas-epics.js';

const MIN_YEAR = -2000;
const MAX_YEAR = 2000;
const COLORS = { ew: '#dd7165', ei: '#e6b96f', ps: '#b28bdd' };

export const EPICS = CHRONAS_EPICS.epics;

export function categoryOf(subtype) {
  if (subtype === 'ew') return 'guerre';
  if (subtype === 'ei') return 'empire';
  if (subtype === 'ps') return 'personne';
  return 'autre';
}

export function epicYear(epic) {
  const [, , start, end] = epic;
  return end && end > start ? Math.round((start + end) / 2) : start;
}

export function createEpicTimeline(host, select) {
  const track = document.createElement('div');
  track.className = 'epic-track';
  track.setAttribute('aria-hidden', 'true');
  for (const epic of EPICS) {
    const year = epicYear(epic);
    const tick = document.createElement('span');
    tick.className = 'epic-tick';
    tick.style.left = `${((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%`;
    tick.style.background = COLORS[epic[4]] || '#7f9cff';
    track.appendChild(tick);
  }

  const picker = document.createElement('select');
  picker.className = 'epic-select';
  picker.id = 'epic-select';
  picker.setAttribute('aria-label', 'Choisir un événement historique');
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = 'Événements historiques…';
  picker.appendChild(empty);
  EPICS.forEach((epic, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${epic[1]} · ${epic[2]}`;
    picker.appendChild(option);
  });

  picker.addEventListener('change', () => {
    const epic = EPICS[Number(picker.value)];
    if (!epic) return;
    select(epic);
    picker.value = '';
  });

  track.addEventListener('click', (event) => {
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const target = MIN_YEAR + ratio * (MAX_YEAR - MIN_YEAR);
    let best = null;
    let bestDistance = Infinity;
    for (const epic of EPICS) {
      const distance = Math.abs(epicYear(epic) - target);
      if (distance < bestDistance) { bestDistance = distance; best = epic; }
    }
    if (best && bestDistance <= 60) select(best);
  });

  host.append(track, picker);
  return { track, picker, count: EPICS.length };
}
