/* État unique de V-ATLAS. Aucune vue ne possède son propre état permanent. */
import { DATASET } from '../data/dataset.js';

const listeners = new Set();

export const state = {
  view: 'globe',        // globe | chronology | recit | geography | constellation
  countryId: null,
  eraIndex: 0,
  eventIndex: 0,
  pointIndex: 0,
  placeIndex: 0,
  scope: 'era',         // era | country
  playing: false,
  detailOpen: false,
};

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(reason) {
  for (const listener of listeners) listener(state, reason);
}

export function set(patch, reason = 'update') {
  Object.assign(state, patch);
  emit(reason);
}

export function selectCountry(id) {
  const country = DATASET.countries.find((item) => item.id === id);
  if (!country) return false;
  set({
    countryId: id,
    eraIndex: 0,
    eventIndex: 0,
    pointIndex: 0,
    placeIndex: 0,
    scope: 'era',
    detailOpen: false,
    view: 'chronology',
  }, 'country');
  return true;
}

export function selectEra(index) {
  const country = currentCountry();
  if (!country || !country.eras.length) return;
  const eraIndex = Math.max(0, Math.min(country.eras.length - 1, index));
  const first = country.events.findIndex((event) => event.eraId === country.eras[eraIndex].id);
  set({
    eraIndex,
    eventIndex: first >= 0 ? first : 0,
    pointIndex: 0,
    placeIndex: 0,
    detailOpen: false,
  }, 'era');
}

export function selectEvent(index) {
  const country = currentCountry();
  if (!country || !country.events.length) return;
  const eventIndex = Math.max(0, Math.min(country.events.length - 1, index));
  const event = country.events[eventIndex];
  const eraIndex = country.eras.findIndex((era) => era.id === event.eraId);
  set({ eventIndex, eraIndex: eraIndex >= 0 ? eraIndex : 0, pointIndex: 0, placeIndex: 0 }, 'event');
}

export function stepEvent(delta) {
  selectEvent(state.eventIndex + delta);
}

export function stepEra(delta) {
  selectEra(state.eraIndex + delta);
}

export function goView(view) {
  if (!['globe', 'chronology', 'recit', 'geography', 'constellation'].includes(view)) return;
  set({ view, detailOpen: false, playing: false }, 'view');
}

export function currentCountry() {
  return DATASET.countries.find((country) => country.id === state.countryId) || null;
}

export function currentEra() {
  return currentCountry()?.eras[state.eraIndex] || null;
}

export function currentEvent() {
  return currentCountry()?.events[state.eventIndex] || null;
}

export function currentPoint() {
  return currentEvent()?.points[state.pointIndex] || null;
}

export function currentPlaces() {
  const country = currentCountry();
  if (!country) return [];
  const event = currentEvent();
  const linked = event?.places || [];
  return (state.scope === 'country' ? country.places : linked).filter((place) => place.lat !== null && place.lon !== null);
}

export function countryByCode(code) {
  return DATASET.countries.find((country) => country.code === code) || null;
}
