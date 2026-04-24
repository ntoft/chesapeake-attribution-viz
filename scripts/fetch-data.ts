// Build-time snapshot: pulls FishKillEvents + AttributionBeliefs from the
// curated repo, joins in FishKillReport narratives, resolves cross-repo
// evidence wrefs, and collects per-source pipeline health. Writes
// public/data.json for the Vite app to load at runtime.
//
// Run locally:   WH_TOKEN=... bun scripts/fetch-data.ts
// The WH_TOKEN is never shipped — it only runs on the operator's machine;
// the viz itself is fully static.
import { WarmHubClient } from '@warmhub/sdk-ts';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  EvidenceDetail,
  EvidenceKind,
  EvidenceSource,
  PipelineHealth,
  ReportSummary,
  SourceHealth,
} from '../src/types';

const CURATED = 'fish-kill-attribution/chesapeake-attribution';
const PUBLIC_SOURCES: { repo: string; label: EvidenceSource }[] = [
  { repo: 'fish-kill-attribution/noaa-sst-daily', label: 'NOAA' },
  { repo: 'fish-kill-attribution/usgs-nwis', label: 'USGS' },
  { repo: 'fish-kill-attribution/epa-tri', label: 'EPA' },
  { repo: 'fish-kill-attribution/state-fishkills', label: 'State' },
];

const apiUrl = process.env.WARMHUB_API_URL ?? 'https://api.warmhub.ai';
const token = process.env.WH_TOKEN ?? process.env.WARMHUB_TOKEN;
if (!token) {
  console.error('WH_TOKEN not set — run with `WH_TOKEN=… bun scripts/fetch-data.ts`');
  process.exit(1);
}
const client = new WarmHubClient({ apiUrl, accessToken: () => token });

function splitRepo(repo: string): [string, string] {
  const [o, r] = repo.split('/');
  return [o, r];
}

async function queryAll(repo: string, shape: string, limit = 500): Promise<any[]> {
  const [o, r] = splitRepo(repo);
  try {
    const result = await client.thing.query(o, r, { shape, limit });
    return result.items ?? [];
  } catch (err) {
    console.warn(`[${repo}] query ${shape} failed:`, (err as Error).message);
    return [];
  }
}

// Parse `wh:org/repo/Shape/name` into parts. Returns null for local wrefs.
function parseCrossRepoWref(wref: string): { org: string; repo: string; shape: string; name: string } | null {
  const m = wref.match(/^wh:([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { org: m[1], repo: m[2], shape: m[3], name: m[4] };
}

function classifyEvidence(repo: string, shape: string): { kind: EvidenceKind; source: EvidenceSource } {
  const match = PUBLIC_SOURCES.find((s) => s.repo.endsWith(`/${repo}`) || s.repo === repo);
  const source = match?.label ?? 'unknown';
  if (shape === 'Observation') return { kind: 'observation', source };
  if (shape === 'Release' || shape === 'ToxicRelease') return { kind: 'release', source };
  if (shape === 'FishKillReport') return { kind: 'report', source };
  return { kind: 'unknown', source };
}

// Short display string for an observation / release / report.
function labelForEvidence(shape: string, name: string, data: Record<string, unknown> | undefined, source: EvidenceSource): string {
  const d = data ?? {};
  if (shape === 'Observation') {
    const measured = d.parameter ?? d.variable ?? d.metric;
    const value = d.value ?? d.measurement;
    const unit = d.unit ?? d.units ?? '';
    const when = d.date ?? d.timestamp ?? d.observed_at;
    const pieces = [source, measured, value != null ? `${value}${unit ? ' ' + unit : ''}` : null, when].filter(Boolean);
    return pieces.length > 1 ? pieces.join(' · ') : `${source} · ${name}`;
  }
  if (shape === 'Release' || shape === 'ToxicRelease') {
    const facility = d.facility_name ?? d.facility ?? d.site;
    const chemical = d.chemical ?? d.pollutant ?? d.substance;
    const amount = d.amount ?? d.pounds ?? d.quantity;
    const pieces = [source, facility, chemical, amount].filter(Boolean);
    return pieces.length > 1 ? pieces.join(' · ') : `${source} · ${name}`;
  }
  if (shape === 'FishKillReport') {
    const water = d.waterbody ?? d.location ?? d.reporter;
    return [source, 'report', water].filter(Boolean).join(' · ');
  }
  return `${source} · ${shape}/${name}`;
}

async function collectSourceHealth(repo: string, label: EvidenceSource): Promise<SourceHealth> {
  const [o, r] = splitRepo(repo);
  let lastCommitAt: string | null = null;
  let commitCount24h = 0;
  let failureCount = 0;
  try {
    const commits = await client.commit.log(o, r, { limit: 50 });
    const now = Date.now();
    for (const c of commits.items ?? []) {
      const ts = c.createdAt;                             // number ms
      if (typeof ts !== 'number') continue;
      if (!lastCommitAt) lastCommitAt = new Date(ts).toISOString();
      if (now - ts <= 24 * 60 * 60 * 1000) commitCount24h += 1;
    }
  } catch (err) {
    console.warn(`[${repo}] commit log failed:`, (err as Error).message);
  }
  try {
    const notifs = await client.action.listNotifications(o, r, { limit: 50 });
    // Notifications endpoint surfaces both deliveries and failures; treat
    // anything whose status isn't explicitly "resolved" / "ok" as a signal
    // worth flagging in the header strip.
    failureCount = (notifs ?? []).filter(
      (n) => n.status !== 'resolved' && n.status !== 'ok',
    ).length;
  } catch (err) {
    console.warn(`[${repo}] notifications unavailable:`, (err as Error).message);
  }

  const ageHours = lastCommitAt
    ? (Date.now() - new Date(lastCommitAt).getTime()) / 3_600_000
    : Infinity;
  const status: SourceHealth['status'] = failureCount > 0
    ? 'failing'
    : ageHours < 48
      ? 'healthy'
      : lastCommitAt
        ? 'stale'
        : 'unknown';

  return { repo, label, lastCommitAt, commitCount24h, failureCount, status };
}

async function resolveEvidence(wrefs: Set<string>): Promise<Record<string, EvidenceDetail>> {
  // Group wrefs by (repo, shape) so we can fetch in a small number of
  // batched shape-scoped queries instead of N round-trips.
  const out: Record<string, EvidenceDetail> = {};
  const byRepoShape = new Map<string, { org: string; repo: string; shape: string; names: string[] }>();
  const localOnly: string[] = [];
  for (const wref of wrefs) {
    const parsed = parseCrossRepoWref(wref);
    if (!parsed) {
      localOnly.push(wref);
      continue;
    }
    const key = `${parsed.org}/${parsed.repo}#${parsed.shape}`;
    const existing = byRepoShape.get(key);
    if (existing) existing.names.push(parsed.name);
    else byRepoShape.set(key, { org: parsed.org, repo: parsed.repo, shape: parsed.shape, names: [parsed.name] });
  }

  for (const { org, repo, shape, names } of byRepoShape.values()) {
    let rows: any[] = [];
    try {
      const r = await client.thing.query(org, repo, { shape, limit: 500 });
      rows = r.items ?? [];
    } catch (err) {
      console.warn(`[${org}/${repo}] query ${shape} failed:`, (err as Error).message);
    }
    const byName = new Map<string, any>();
    for (const row of rows) {
      const n = row.name ?? row.wref?.split('/')?.slice(-1)?.[0];
      if (n) byName.set(n, row);
    }
    for (const name of names) {
      const wref = `wh:${org}/${repo}/${shape}/${name}`;
      const row = byName.get(name);
      const data = (row?.data ?? row?.head?.data) as Record<string, unknown> | undefined;
      const { kind, source } = classifyEvidence(repo, shape);
      out[wref] = {
        wref,
        kind,
        source,
        label: labelForEvidence(shape, name, data, source),
        data,
      };
    }
  }

  // Local wrefs: punt with a best-effort label.
  for (const wref of localOnly) {
    out[wref] = { wref, kind: 'unknown', source: 'unknown', label: wref };
  }
  return out;
}

function slugFromEventWref(wref: string): string {
  return wref.replace(/^FishKillEvent\//, '');
}

// FishKillReports live in state-fishkills and are named either by the same
// slug as the event or by report ID. Prefer slug match; fall back to fuzzy
// substring match when the sprite used a different naming scheme.
function joinReportsToEvents(
  reports: any[],
  eventSlugs: Set<string>,
): Record<string, ReportSummary> {
  const out: Record<string, ReportSummary> = {};
  for (const r of reports) {
    const name: string = r.name ?? r.wref?.split('/')?.slice(-1)?.[0] ?? '';
    const data = (r.data ?? r.head?.data ?? {}) as Record<string, unknown>;
    const wref = r.wref ?? `wh:fish-kill-attribution/state-fishkills/FishKillReport/${name}`;
    const summary: ReportSummary = {
      wref,
      reporter: (data.source_agency ?? data.reporter) as string | undefined,
      narrative: (data.raw_payload ?? data.narrative ?? data.description ?? data.notes) as string | undefined,
      reported_cause: (data.official_cause ?? data.reported_cause ?? data.cause) as string | undefined,
      waterbody: data.waterbody as string | undefined,
      event_date: (data.event_date ?? data.date) as string | undefined,
      url: (data.url ?? data.source_url) as string | undefined,
    };
    if (eventSlugs.has(name)) {
      out[name] = summary;
      continue;
    }
    for (const slug of eventSlugs) {
      if (name.includes(slug) || slug.includes(name)) {
        if (!out[slug]) out[slug] = summary;
      }
    }
  }
  return out;
}

async function main() {
  const [eventRows, beliefRows, reportRows, sceneRows, healthResults] = await Promise.all([
    queryAll(CURATED, 'FishKillEvent'),
    queryAll(CURATED, 'AttributionBelief', 500),
    queryAll('fish-kill-attribution/state-fishkills', 'FishKillReport', 500),
    queryAll('fish-kill-attribution/noaa-sst-daily', 'SatelliteScene', 120),
    Promise.all(PUBLIC_SOURCES.map((s) => collectSourceHealth(s.repo, s.label))),
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
  const eventByName = new Map(events.map((e) => [slugFromEventWref(e.wref), e.wref]));
  const beliefs = beliefRows.map((r: any) => {
    const wref = r.wref ?? `AttributionBelief/${r.name}`;
    const name = wref.replace(/^AttributionBelief\//, '');
    const persona = (r.data?.persona ?? '') as string;
    const cause = (r.data?.cause ?? '') as string;
    const suffix = persona && cause ? `-${persona}-${cause}` : '';
    const slug = suffix && name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
    const about = r.about ?? r.data?.about ?? eventByName.get(slug) ?? '';
    return { wref, about, data: r.data ?? r.head?.data ?? {} };
  });

  const evidenceWrefs = new Set<string>();
  for (const b of beliefs) {
    for (const e of b.data.evidence_ids ?? []) {
      if (e) evidenceWrefs.add(e);
    }
  }
  const evidence = await resolveEvidence(evidenceWrefs);

  const eventSlugs = new Set([...eventByName.keys()]);
  const reports = joinReportsToEvents(reportRows, eventSlugs);

  const pipelineHealth: PipelineHealth = {
    sources: healthResults,
    collectedAt: new Date().toISOString(),
  };

  const satelliteScenes = sceneRows
    .map((r: any) => ({
      wref: r.wref ?? `wh:fish-kill-attribution/noaa-sst-daily/SatelliteScene/${r.name}`,
      data: r.data ?? r.head?.data ?? {},
    }))
    .filter((sc: any) => typeof sc.data?.date === 'string' && typeof sc.data?.preview_png_url === 'string')
    .sort((a: any, b: any) => (b.data.date as string).localeCompare(a.data.date as string));

  const out = {
    generatedAt: new Date().toISOString(),
    events,
    beliefs,
    reports,
    evidence,
    pipelineHealth,
    satelliteScenes,
  };

  const path = 'public/data.json';
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(out, null, 2));
  console.log(
    `Wrote ${events.length} events + ${beliefs.length} beliefs + ${Object.keys(reports).length} reports + ${Object.keys(evidence).length} evidence entries + ${satelliteScenes.length} satellite scenes → ${path}`,
  );
  console.log(
    `Pipeline health: ${pipelineHealth.sources.map((s) => `${s.label}=${s.status} (${s.commitCount24h} in 24h${s.failureCount ? `, ${s.failureCount} failures` : ''})`).join(' · ')}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
