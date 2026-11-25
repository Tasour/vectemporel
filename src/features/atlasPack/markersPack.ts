/**
 * Pack binaire des marqueurs : 68 473 fiches uniques + index année → indices.
 * Remplace les 4 001 requêtes `/markers?year=…`.
 */

import type { Marker } from '../../api/types';
import { MARKERS_PACK_VERSION } from './markersPackVersion';

interface YearBlock {
  offset: number;
  count: number;
}

interface MarkersIndex {
  yearMin: number;
  yearMax: number;
  markerCount: number;
  ids: string[];
  names: string[];
  types: string[];
  records: DataView;
  blocks: Map<number, YearBlock>;
}

const HEADER_BYTES = 24;
const RECORD_BYTES = 30;

let packPromise: Promise<MarkersPack | null> | null = null;

function readStrings(view: DataView, offset: number): { values: string[]; next: number } {
  const count = view.getUint32(offset, true);
  let cursor = offset + 4;
  const values: string[] = new Array<string>(count);
  for (let index = 0; index < count; index += 1) {
    const length = view.getUint16(cursor, true);
    const bytes = new Uint8Array(view.buffer, view.byteOffset + cursor + 2, length);
    values[index] = new TextDecoder().decode(bytes);
    cursor += 2 + length;
  }
  return { values, next: cursor };
}

export function parseMarkersPack(buffer: ArrayBuffer): MarkersPack {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x31504d56) {
    throw new Error('Pack marqueurs invalide');
  }
  const yearMin = view.getInt16(6, true);
  const yearMax = view.getInt16(8, true);
  const yearCount = view.getUint16(10, true);
  const markerCount = view.getUint32(12, true);

  let cursor = HEADER_BYTES;
  const ids = readStrings(view, cursor); cursor = ids.next;
  const names = readStrings(view, cursor); cursor = names.next;
  const types = readStrings(view, cursor); cursor = types.next;
  const recordsOffset = cursor;
  const blocksOffset = recordsOffset + markerCount * RECORD_BYTES;

  const blocks = new Map<number, YearBlock>();
  let blockCursor = blocksOffset;
  for (let index = 0; index < yearCount; index += 1) {
    const year = view.getInt16(blockCursor, true);
    const count = view.getUint32(blockCursor + 2, true);
    blocks.set(year, { offset: blockCursor + 6, count });
    blockCursor += 6 + count * 4;
  }

  return new MarkersPack({
    yearMin,
    yearMax,
    markerCount,
    ids: ids.values,
    names: names.values,
    types: types.values,
    records: new DataView(buffer, recordsOffset),
    blocks,
  });
}

class MarkersPack {
  private readonly index: MarkersIndex;
  private lastYear = Number.NaN;
  private lastMarkers: Marker[] | null = null;

  constructor(index: MarkersIndex) {
    this.index = index;
  }

  getYear(year: number): Marker[] {
    const clamped = Math.max(this.index.yearMin, Math.min(this.index.yearMax, Math.round(year)));
    if (clamped === this.lastYear && this.lastMarkers) return this.lastMarkers;
    const block = this.index.blocks.get(clamped);
    if (!block) return [];
    const view = this.index.records;
    // Les offsets de blocs sont absolus dans le buffer du pack.
    const global = new DataView(this.index.records.buffer);
    const result: Marker[] = new Array<Marker>(block.count);
    for (let position = 0; position < block.count; position += 1) {
      const markerIndex = global.getUint32(block.offset + position * 4, true);
      const offset = markerIndex * RECORD_BYTES;
      const idIndex = view.getUint32(offset, true);
      const nameIndex = view.getUint32(offset + 4, true);
      const lat = view.getFloat32(offset + 8, true);
      const lon = view.getFloat32(offset + 12, true);
      const c2lat = view.getFloat32(offset + 16, true);
      const c2lon = view.getFloat32(offset + 20, true);
      const start = view.getInt16(offset + 24, true);
      const end = view.getInt16(offset + 26, true);
      const typeIndex = view.getUint8(offset + 28);
      const flags = view.getUint8(offset + 29);
      const hasCoo2 = (flags & 1) === 1;
      const hasCoo = (flags & 2) === 2;
      const marker: Marker = {
        _id: this.index.ids[idIndex] ?? '',
        name: this.index.names[nameIndex] ?? '',
        coo: hasCoo ? [lon, lat] : [Number.NaN, Number.NaN],
        year: start,
        type: typeIndex === 0xff ? '' : this.index.types[typeIndex] ?? '',
      };
      if (end !== 0x7fff) marker.end = end;
      if (hasCoo2) marker.coo2 = [c2lon, c2lat];
      result[position] = marker;
    }
    this.lastYear = clamped;
    this.lastMarkers = result;
    return result;
  }
}

export { MarkersPack };

async function decompress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof DecompressionStream === 'undefined') return buffer;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

async function loadPack(): Promise<MarkersPack | null> {
  if (import.meta.env.MODE === 'test') return null;
  try {
    const response = await fetch(`./atlas-pack/markers-v1.bin.gz?v=${MARKERS_PACK_VERSION}`);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const raw = bytes.length > 1 && bytes[0] === 0x1f && bytes[1] === 0x8b
      ? await decompress(buffer)
      : buffer;
    return parseMarkersPack(raw);
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[markers-pack] chargement impossible', error);
    return null;
  }
}

export function ensureMarkersPack(): Promise<MarkersPack | null> {
  packPromise ??= loadPack();
  return packPromise;
}

export function setMarkersPack(pack: MarkersPack | null): void {
  packPromise = Promise.resolve(pack);
}
