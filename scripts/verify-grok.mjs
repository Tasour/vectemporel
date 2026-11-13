import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8'), context);
const { countries } = context.window.VECTEMPOREL_DATA;

const jobs = [];
for (const country of countries) {
  for (const event of country.events) {
    if (event.grok) jobs.push({ country: country.name, event });
  }
}

const missing = [];
let done = 0;
const concurrency = 4;
let index = 0;

async function worker() {
  while (index < jobs.length) {
    const job = jobs[index++];
    const url = `https://grokipedia.com/page/${encodeURIComponent(job.event.grok)}`;
    let status = 0;
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: {
          'user-agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
        },
      });
      status = response.status;
    } catch (error) {
      status = -1;
    }
    done += 1;
    if (status !== 200) {
      missing.push({ status, id: job.event.id, title: job.event.title, slug: job.event.grok, country: job.country });
      console.log(`✗ ${status} ${job.event.id} — ${job.event.grok}`);
    } else {
      process.stdout.write(`\r${done}/${jobs.length} vérifiés   `);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
console.log(`\n\n${jobs.length - missing.length}/${jobs.length} pages Grokipedia directes valides.`);
if (missing.length) {
  console.log('\nÀ corriger ou à traiter via la recherche :');
  for (const item of missing) console.log(`${item.status}\t${item.id}\t${item.slug}\t${item.title}`);
}
