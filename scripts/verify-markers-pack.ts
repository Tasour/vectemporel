/* Vérifie que le pack marqueurs restitue exactement les fichiers par année. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { parseMarkersPack } from '../src/features/atlasPack/markersPack';

const ROOT = path.resolve(import.meta.dirname, '..');
const compressed = fs.readFileSync(path.join(ROOT, 'public/atlas-pack/markers-v1.bin.gz'));
const binary = zlib.gunzipSync(compressed);
const pack = parseMarkersPack(binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength));

const years = [-2000, -1000, 0, 1000, 1714, 2000];
let failures = 0;
for (const year of years) {
  const expected = JSON.parse(
    fs.readFileSync(path.join(ROOT, `api/v1/raw/markers_year_${String(year)}.json`), 'utf8')
  ) as Array<Record<string, unknown>>;
  const actual = pack.getYear(year);
  const near = (a: unknown, b: unknown): boolean => {
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((value, index) => {
        const other = b[index];
        if (typeof value === 'number' && Number.isNaN(value)) return typeof other === 'number' && Number.isNaN(other);
        return near(value, other);
      });
    }
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-3;
    return a === b;
  };
  const actualById = new Map(actual.map((marker) => [marker._id, marker]));
  const mismatch = expected.findIndex((marker) => {
    const got = actualById.get(String(marker['_id']));
    if (!got) return true;
    return marker['name'] !== got.name
      || marker['year'] !== got.year
      || (marker['end'] ?? undefined) !== got.end
      || marker['type'] !== got.type
      || !near(Array.isArray(marker['coo']) ? marker['coo'] : [Number.NaN, Number.NaN], got.coo)
      || !near(marker['coo2'], got.coo2);
  });
  if (expected.length !== actual.length || mismatch !== -1) {
    failures += 1;
    console.error(year, { expected: expected.length, actual: actual.length, mismatch });
    console.error(' expected', expected[mismatch]);
    console.error(' actual', actualById.get(expected[mismatch]?.['_id'] as string));
  } else {
    console.log(year, 'ok', actual.length);
  }
}
if (failures > 0) {
  console.error(`${String(failures)} année(s) en échec`);
  process.exit(1);
}
console.log(`pack marqueurs vérifié sur ${String(years.length)} années`);
