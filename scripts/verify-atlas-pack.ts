/* Vérifie que le pack binaire restitue exactement les fichiers d'aires. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { parseAtlasPack } from '../src/features/atlasPack/atlasPack';

const ROOT = path.resolve(import.meta.dirname, '..');
const compressed = fs.readFileSync(path.join(ROOT, 'public/atlas-pack/atlas-v1.bin.gz'));
const binary = zlib.gunzipSync(compressed);
const pack = parseAtlasPack(binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength));

const years = [-2000, -1000, -1, 0, 1000, 1500, 1714, 2000];
let failures = 0;
for (const year of years) {
  const expected = JSON.parse(
    zlib.gunzipSync(fs.readFileSync(path.join(ROOT, `api/v1/areas/${String(year)}.gz`))).toString('utf8')
  ) as Record<string, unknown>;
  const actual = pack.getYear(year);
  const expectedKeys = Object.keys(expected);
  const actualKeys = Object.keys(actual);
  const missing = expectedKeys.filter((key) => !(key in actual));
  const extra = actualKeys.filter((key) => !(key in expected));
  const mismatched = expectedKeys.filter((key) => {
    if (!(key in actual)) return false;
    const a = expected[key] as unknown[];
    const b = actual[key] as unknown[];
    const expectedPop = typeof a[4] === 'number' ? a[4] : 0;
    return JSON.stringify([a[0], a[1], a[2], a[3], expectedPop])
      !== JSON.stringify([b[0], b[1], b[2], b[3], b[4]]);
  });
  if (missing.length || extra.length || mismatched.length) {
    failures += 1;
    console.error(year, { missing: missing.length, extra: extra.length, mismatched: mismatched.length });
    console.error(' sample', mismatched.slice(0, 2).map((key) => [key, expected[key], actual[key]]));
  } else {
    console.log(year, 'ok', actualKeys.length);
  }
}
if (failures > 0) {
  console.error(`${String(failures)} année(s) en échec`);
  process.exit(1);
}
console.log(`pack vérifié sur ${String(years.length)} années`);
