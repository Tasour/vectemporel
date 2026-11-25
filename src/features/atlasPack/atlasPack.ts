/**
 * Modèle binaire temporel des aires de jeu.
 *
 * Le pack contient les dictionnaires (provinces, dirigeants, cultures,
 * religions, capitales), un keyframe tous les 100 ans et un delta par année
 * (18 provinces modifiées en moyenne). Il remplace les 4 001 requêtes JSON.
 */

import { ATLAS_PACK_VERSION } from './packVersion';

export type AtlasProvinceData = [string, string, string, string | null, number];
export type AtlasAreaData = Record<string, AtlasProvinceData>;

interface Keyframe {
  year: number;
  offset: number;
}

interface PackIndex {
  yearMin: number;
  yearMax: number;
  yearCount: number;
  provinceNames: string[];
  dictionaries: string[][];
  keyframes: Keyframe[];
  stream: DataView;
  streamOffset: number;
}

const HEADER_BYTES = 30;
const TAG_KEYFRAME = 1;
const TAG_DELTA = 2;
const DELETED = 0x20;

let packPromise: Promise<AtlasPack | null> | null = null;

function readString(view: DataView, offset: number): { value: string; next: number } {
  const length = view.getUint16(offset, true);
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset + 2, length);
  const value = new TextDecoder().decode(bytes);
  return { value, next: offset + 2 + length };
}

function readTable(view: DataView, offset: number): { values: string[]; next: number } {
  const count = view.getUint16(offset, true);
  let cursor = offset + 2;
  const values: string[] = new Array<string>(count);
  for (let index = 0; index < count; index += 1) {
    const entry = readString(view, cursor);
    values[index] = entry.value;
    cursor = entry.next;
  }
  return { values, next: cursor };
}

/** Parse le binaire (non compressé) en index utilisable. */
export function parseAtlasPack(buffer: ArrayBuffer): AtlasPack {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x31504156) {
    // 'VAP1' en little-endian
    throw new Error('Pack atlas invalide');
  }
  const yearMin = view.getInt16(6, true);
  const yearMax = view.getInt16(8, true);
  const yearCount = view.getUint16(10, true);
  const provinceCount = view.getUint16(14, true);
  const dictCounts = [0, 1, 2, 3].map((index) => view.getUint16(16 + index * 2, true));
  const streamLength = view.getUint32(24, true);
  const keyframeCount = view.getUint16(28, true);

  let cursor = HEADER_BYTES;
  const provinces = readTable(view, cursor);
  cursor = provinces.next;
  const dictionaries: string[][] = [];
  for (let dim = 0; dim < 4; dim += 1) {
    const table = readTable(view, cursor);
    dictionaries.push(table.values);
    cursor = table.next;
  }
  const keyframes: Keyframe[] = [];
  const frameCount = view.getUint16(cursor, true);
  if (frameCount !== keyframeCount) throw new Error('Index de keyframes incohérent');
  cursor += 2;
  for (let index = 0; index < frameCount; index += 1) {
    keyframes.push({
      year: view.getInt16(cursor, true),
      offset: view.getUint32(cursor + 2, true),
    });
    cursor += 6;
  }
  const streamOffset = cursor;
  if (provinces.values.length !== provinceCount) {
    throw new Error('Pack atlas incohérent');
  }
  if (streamOffset + streamLength > buffer.byteLength + 4) {
    throw new Error('Pack atlas tronqué');
  }
  return new AtlasPack({
    yearMin,
    yearMax,
    yearCount,
    provinceNames: provinces.values,
    dictionaries,
    keyframes,
    stream: new DataView(buffer, streamOffset),
    streamOffset,
  }, dictCounts);
}

class AtlasPack {
  private readonly index: PackIndex;
  private lastYear = Number.NaN;
  private lastData: AtlasAreaData | null = null;

  constructor(index: PackIndex, dictCounts: number[]) {
    this.index = index;
    if (index.dictionaries.some((dict, dim) => dict.length !== dictCounts[dim])) {
      throw new Error('Dictionnaires du pack incohérents');
    }
  }

  get minYear(): number {
    return this.index.yearMin;
  }

  get maxYear(): number {
    return this.index.yearMax;
  }

  get provinceCount(): number {
    return this.index.provinceNames.length;
  }

  /** Retourne les données d'une année, décodées depuis le keyframe précédent. */
  getYear(year: number): AtlasAreaData {
    const clamped = Math.max(this.index.yearMin, Math.min(this.index.yearMax, Math.round(year)));
    if (clamped === this.lastYear && this.lastData) return this.lastData;

    // Keyframe le plus proche ≤ année demandée.
    let frame: Keyframe | undefined;
    for (let index = this.index.keyframes.length - 1; index >= 0; index -= 1) {
      const candidate = this.index.keyframes[index];
      if (candidate && candidate.year <= clamped) {
        frame = candidate;
        break;
      }
    }
    if (!frame) throw new Error('Aucun keyframe pour cette année');
    const provinceCount = this.index.provinceNames.length;
    const ruler = new Uint16Array(provinceCount);
    const culture = new Uint16Array(provinceCount);
    const religion = new Uint16Array(provinceCount);
    const capital = new Uint16Array(provinceCount);
    const population = new Uint32Array(provinceCount);
    const present = new Uint8Array(provinceCount);

    let offset = frame.offset;
    const view = this.index.stream;
    const tag = view.getUint8(offset);
    if (tag !== TAG_KEYFRAME) throw new Error('Keyframe atlas absent');
    offset += 1;
    const frameYear = view.getInt16(offset, true);
    offset += 2;
    const recordCount = view.getUint16(offset, true);
    offset += 2;
    if (frameYear !== frame.year) throw new Error('Keyframe atlas désaligné');
    for (let index = 0; index < recordCount; index += 1) {
      const province = view.getUint16(offset, true);
      ruler[province] = view.getUint16(offset + 2, true);
      culture[province] = view.getUint16(offset + 4, true);
      religion[province] = view.getUint16(offset + 6, true);
      capital[province] = view.getUint16(offset + 8, true);
      population[province] = view.getUint32(offset + 10, true);
      present[province] = 1;
      offset += 14;
    }

    // Applique les deltas jusqu'à l'année demandée.
    while (frame.year < clamped && offset + 1 < view.byteLength) {
      const currentTag = view.getUint8(offset);
      offset += 1;
      if (currentTag === TAG_DELTA) {
        const deltaYear = view.getInt16(offset, true);
        offset += 2;
        const changeCount = view.getUint16(offset, true);
        offset += 2;
        if (deltaYear > clamped) break;
        for (let index = 0; index < changeCount; index += 1) {
          const province = view.getUint16(offset, true);
          const mask = view.getUint8(offset + 2);
          offset += 3;
          if (mask & DELETED) {
            present[province] = 0;
            continue;
          }
          present[province] = 1;
          if (mask & 1) { ruler[province] = view.getUint16(offset, true); offset += 2; }
          if (mask & 2) { culture[province] = view.getUint16(offset, true); offset += 2; }
          if (mask & 4) { religion[province] = view.getUint16(offset, true); offset += 2; }
          if (mask & 8) { capital[province] = view.getUint16(offset, true); offset += 2; }
          if (mask & 16) { population[province] = view.getUint32(offset, true); offset += 4; }
        }
        if (deltaYear >= clamped) break;
      } else {
        break;
      }
    }

    const data: AtlasAreaData = {};
    const rulers = this.index.dictionaries[0] ?? [];
    const cultures = this.index.dictionaries[1] ?? [];
    const religions = this.index.dictionaries[2] ?? [];
    const capitals = this.index.dictionaries[3] ?? [];
    for (let index = 0; index < provinceCount; index += 1) {
      if (!present[index]) continue;
      const name = this.index.provinceNames[index];
      if (!name) continue;
      const capitalName = capitals[capital[index] ?? 0] ?? '';
      data[name] = [
        rulers[ruler[index] ?? 0] ?? '',
        cultures[culture[index] ?? 0] ?? '',
        religions[religion[index] ?? 0] ?? '',
        capitalName,
        population[index] ?? 0,
      ];
    }
    this.lastYear = clamped;
    this.lastData = data;
    return data;
  }
}

export { AtlasPack };

async function decompress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof DecompressionStream === 'undefined') return buffer;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

async function loadPack(): Promise<AtlasPack | null> {
  // En test, on garde le chemin API mocké.
  if (import.meta.env.MODE === 'test') return null;
  try {
    const response = await fetch(`./atlas-pack/atlas-v1.bin.gz?v=${ATLAS_PACK_VERSION}`);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Certains serveurs (Vite, GitHub Pages) ajoutent Content-Encoding: gzip et
    // le navigateur décompresse déjà. On ne décompresse que si la magie gzip
    // est encore présente.
    const raw = bytes.length > 1 && bytes[0] === 0x1f && bytes[1] === 0x8b
      ? await decompress(buffer)
      : buffer;
    return parseAtlasPack(raw);
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[atlas-pack] chargement impossible', error);
    return null;
  }
}

/** Charge le pack une seule fois ; retourne null si absent (repli API). */
export function ensureAtlasPack(): Promise<AtlasPack | null> {
  packPromise ??= loadPack();
  return packPromise;
}

/** Pour les tests : force un pack déjà chargé. */
export function setAtlasPack(pack: AtlasPack | null): void {
  packPromise = Promise.resolve(pack);
}
