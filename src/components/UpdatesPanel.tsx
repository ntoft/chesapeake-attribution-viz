import { useMemo } from 'react';
import type { Snapshot } from '../types';

interface Props {
  snapshot: Snapshot;
  onSelectEvent: (wref: string) => void;
  onClose: () => void;
}

type UpdateKind = 'opinion' | 'data' | 'event' | 'snapshot' | 'satellite';

interface Entry {
  id: string;
  time: number;
  kind: UpdateKind;
  headline: string;
  detail?: string;
  eventWref?: string;
}

const KIND_COLOR: Record<UpdateKind, string> = {
  opinion: '#a855f7',
  data: '#3b82f6',
  event: '#10b981',
  snapshot: '#94a3b8',
  satellite: '#06b6d4',
};

const KIND_LABEL: Record<UpdateKind, string> = {
  opinion: 'Opinion',
  data: 'Data',
  event: 'Event',
  snapshot: 'Snapshot',
  satellite: 'Satellite',
};

function relativeTime(ms: number, now: number): string {
  const diff = Math.max(0, now - ms) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / (86400 * 7))}w ago`;
  return new Date(ms).toLocaleDateString();
}

function buildEntries(s: Snapshot): Entry[] {
  const entries: Entry[] = [];
  const eventByWref = new Map(s.events.map((e) => [e.wref, e]));
  const beliefByWref = new Map(s.beliefs.map((b) => [b.wref, b]));

  if (s.beliefVersions) {
    for (const [beliefWref, versions] of Object.entries(s.beliefVersions)) {
      const belief = beliefByWref.get(beliefWref);
      if (!belief) continue;
      const event = eventByWref.get(belief.about);
      if (!event) continue;
      for (const v of versions) {
        const persona = v.data.persona.toUpperCase();
        const verb =
          v.operation === 'add'
            ? 'formed belief'
            : v.operation === 'revise'
              ? 'revised belief'
              : 'retracted belief';
        const sharePct = Math.round((v.data.share ?? 0) * 100);
        const detailParts: string[] = [event.data.location_name];
        if (v.commitMessage) detailParts.push(v.commitMessage);
        entries.push({
          id: `${beliefWref}#${v.version}`,
          time: v.commitTime,
          kind: 'opinion',
          headline: `${persona} ${verb} — ${v.data.cause} ${sharePct}%`,
          detail: detailParts.join(' · '),
          eventWref: event.wref,
        });
      }
    }
  }

  for (const e of s.events) {
    const t = new Date(e.data.date).getTime();
    if (Number.isFinite(t)) {
      const detailParts: string[] = [e.data.location_name];
      if (e.data.primary_species) detailParts.push(e.data.primary_species);
      if (e.data.estimated_mortality != null)
        detailParts.push(`~${e.data.estimated_mortality.toLocaleString()} fish`);
      entries.push({
        id: `evt#${e.wref}`,
        time: t,
        kind: 'event',
        headline: 'Fish kill reported',
        detail: detailParts.join(' · '),
        eventWref: e.wref,
      });
    }
  }

  if (s.satelliteScenes) {
    for (const sc of s.satelliteScenes) {
      const t = new Date(sc.data.date).getTime();
      if (Number.isFinite(t)) {
        entries.push({
          id: `sat#${sc.wref}`,
          time: t,
          kind: 'satellite',
          headline: `Satellite SST scene ingested`,
          detail: `${sc.data.dataset} · median ${sc.data.median_sst_c.toFixed(1)}°C`,
        });
      }
    }
  }

  if (s.pipelineHealth) {
    for (const src of s.pipelineHealth.sources) {
      if (!src.lastCommitAt) continue;
      const t = new Date(src.lastCommitAt).getTime();
      if (Number.isFinite(t)) {
        entries.push({
          id: `src#${src.repo}`,
          time: t,
          kind: 'data',
          headline: `${src.label} pipeline ingested`,
          detail: `${src.commitCount24h} commits in last 24h · ${src.status}`,
        });
      }
    }
  }

  const snapTime = new Date(s.generatedAt).getTime();
  if (Number.isFinite(snapTime)) {
    entries.push({
      id: `snap#${s.generatedAt}`,
      time: snapTime,
      kind: 'snapshot',
      headline: 'Snapshot rebuilt',
      detail: `${s.events.length} events · ${s.beliefs.length} beliefs aggregated`,
    });
  }

  entries.sort((a, b) => b.time - a.time);
  return entries;
}

export function UpdatesPanel({ snapshot, onSelectEvent, onClose }: Props) {
  const entries = useMemo(() => buildEntries(snapshot), [snapshot]);
  const now = Date.now();

  return (
    <aside className="flex-none w-full md:w-[380px] lg:w-[460px] xl:w-[540px] md:h-full border-t md:border-t-0 md:border-l border-slate-800 bg-slate-950/80 overflow-y-auto">
      <header className="sticky top-0 z-20 flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div>
          <h2 className="font-serif text-2xl font-medium text-slate-100 leading-tight">
            Updates
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Latest opinions, ingests, and refreshes
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-none w-7 h-7 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 text-lg leading-none flex items-center justify-center border border-slate-700/60"
          aria-label="Close updates"
        >
          ×
        </button>
      </header>

      <ol className="relative px-5 py-4">
        <div
          aria-hidden
          className="absolute left-[26px] top-6 bottom-6 w-px bg-slate-800"
        />
        {entries.map((e) => {
          const clickable = !!e.eventWref;
          const Tag = clickable ? 'button' : 'div';
          return (
            <li key={e.id} className="relative">
              <Tag
                {...(clickable
                  ? {
                      type: 'button' as const,
                      onClick: () => onSelectEvent(e.eventWref!),
                    }
                  : {})}
                className={`relative w-full text-left flex gap-3 py-3 ${
                  clickable
                    ? 'cursor-pointer hover:bg-slate-900/50 -mx-2 px-2 rounded-md transition-colors'
                    : ''
                }`}
              >
                <span
                  aria-hidden
                  className="relative z-10 flex-none mt-1.5 w-3 h-3 rounded-full ring-4 ring-slate-950"
                  style={{ background: KIND_COLOR[e.kind] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    <span style={{ color: KIND_COLOR[e.kind] }}>
                      {KIND_LABEL[e.kind]}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span>{relativeTime(e.time, now)}</span>
                  </div>
                  <div className="text-sm text-slate-100 mt-0.5 leading-snug">
                    {e.headline}
                  </div>
                  {e.detail && (
                    <div className="text-xs text-slate-400 mt-0.5 leading-snug">
                      {e.detail}
                    </div>
                  )}
                </div>
              </Tag>
            </li>
          );
        })}
        {entries.length === 0 && (
          <li className="text-sm text-slate-500 px-3 py-6 text-center">
            No recent updates.
          </li>
        )}
      </ol>
    </aside>
  );
}
