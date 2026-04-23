// Build-time snapshot: pulls FishKillEvents + AttributionBeliefs from WarmHub
// and writes them to public/data.json for the Vite app to load at runtime.
//
// Run locally:   WH_TOKEN=... bun scripts/fetch-data.ts
// The WH_TOKEN is never shipped — it only runs on the operator's machine;
// the viz itself is fully static.
import { WarmHubClient } from '@warmhub/sdk-ts';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const REPO = 'fish-kill-attribution/chesapeake-attribution';
const [orgName, repoName] = REPO.split('/');
const apiUrl = process.env.WARMHUB_API_URL ?? 'https://api.warmhub.ai';
const token = process.env.WH_TOKEN ?? process.env.WARMHUB_TOKEN;
if (!token) {
  console.error('WH_TOKEN not set — run with `WH_TOKEN=… bun scripts/fetch-data.ts`');
  process.exit(1);
}
const client = new WarmHubClient({ apiUrl, accessToken: () => token });

async function queryAll(shape: string, limit = 500): Promise<any[]> {
  const result = await client.thing.query(orgName, repoName, { shape, limit });
  return result.items ?? [];
}

async function main() {
  const [eventRows, beliefRows] = await Promise.all([
    queryAll('FishKillEvent'),
    queryAll('AttributionBelief', 500),
  ]);

  const events = eventRows.map((r: any) => ({
    wref: r.wref ?? `FishKillEvent/${r.name}`,
    data: r.data ?? r.head?.data ?? {},
  }));

  // Belief naming: AttributionBelief/<eventSlug>-<persona>-<cause>
  // Event naming:   FishKillEvent/<eventSlug>
  // Events + beliefs live in the same repo and use the same slug, so we can
  // reconstruct the about-link from the belief name when the API doesn't
  // surface it (thing.query doesn't inline assertion.about).
  const eventByName = new Map(events.map((e) => [e.wref.replace(/^FishKillEvent\//, ''), e.wref]));
  const beliefs = beliefRows.map((r: any) => {
    const wref = r.wref ?? `AttributionBelief/${r.name}`;
    const name = wref.replace(/^AttributionBelief\//, '');
    const persona = (r.data?.persona ?? '') as string;
    const cause = (r.data?.cause ?? '') as string;
    // Strip trailing `-<persona>-<cause>` to recover the event slug.
    const suffix = persona && cause ? `-${persona}-${cause}` : '';
    const slug = suffix && name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
    const about = r.about ?? r.data?.about ?? eventByName.get(slug) ?? '';
    return { wref, about, data: r.data ?? r.head?.data ?? {} };
  });

  const out = {
    generatedAt: new Date().toISOString(),
    events,
    beliefs,
  };

  const path = 'public/data.json';
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(out, null, 2));
  console.log(`Wrote ${events.length} events + ${beliefs.length} beliefs → ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
