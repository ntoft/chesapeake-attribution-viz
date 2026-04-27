import { useMemo, useState } from 'react';
import type {
  FishKillEvent,
  AttributionBelief,
  BeliefVersion,
  EvidenceDetail,
  Persona,
  ReportSummary,
  SatelliteScene,
} from '../types';
import { BeliefColumn } from './BeliefColumn';
import { EventHero } from './EventHero';
import { NarrativeBanner } from './NarrativeBanner';
import { ConsensusStrip } from './ConsensusStrip';
import { Scrubber } from './Scrubber';

interface Props {
  event: FishKillEvent | null;
  beliefs: AttributionBelief[];
  beliefVersions?: Record<string, BeliefVersion[]>;
  reports?: Record<string, ReportSummary>;
  evidence?: Record<string, EvidenceDetail>;
  satelliteScenes?: SatelliteScene[];
  onClose: () => void;
}

const PERSONAS: Persona[] = ['ngo', 'industry', 'agency'];

function eventSlug(wref: string): string {
  return wref.replace(/^FishKillEvent\//, '');
}

// Given a belief and a selected time, return the data as it was at that
// moment. Falls back to HEAD when the time is after the latest revision,
// returns null when the time is before the belief's first version (it didn't
// exist yet).
function beliefAtTime(
  head: AttributionBelief,
  versions: BeliefVersion[] | undefined,
  selectedTime: number | null,
): AttributionBelief | null {
  if (selectedTime === null || !versions || versions.length === 0) return head;
  const match = [...versions].reverse().find((v) => v.commitTime <= selectedTime);
  if (!match) return null; // belief didn't exist yet at that time
  return { ...head, data: match.data };
}

export function EventPanel({
  event,
  beliefs,
  beliefVersions,
  reports,
  evidence,
  satelliteScenes,
  onClose,
}: Props) {
  const [selectedTime, setSelectedTime] = useState<number | null>(null);

  const eventBeliefs = useMemo(
    () => (event ? beliefs.filter((b) => b.about === event.wref) : []),
    [beliefs, event],
  );

  // Union of every revision touching any belief on this event — feeds the
  // scrubber's tick positions and its [min, max] range.
  const eventVersions = useMemo(() => {
    if (!beliefVersions) return [];
    const out: BeliefVersion[] = [];
    for (const b of eventBeliefs) {
      const v = beliefVersions[b.wref];
      if (v) out.push(...v);
    }
    return out;
  }, [beliefVersions, eventBeliefs]);

  // Rewrite each belief to its version at selectedTime. Drop beliefs that
  // didn't exist yet.
  const timeScopedBeliefs = useMemo(() => {
    if (selectedTime === null) return eventBeliefs;
    return eventBeliefs
      .map((b) => beliefAtTime(b, beliefVersions?.[b.wref], selectedTime))
      .filter((b): b is AttributionBelief => b !== null);
  }, [eventBeliefs, beliefVersions, selectedTime]);

  if (!event) {
    return (
      <aside className="flex-none w-full md:w-[380px] lg:w-[460px] xl:w-[540px] md:h-full border-t md:border-t-0 md:border-l border-slate-800 bg-slate-950/80 overflow-y-auto">
        <div className="h-full min-h-[180px] flex items-center justify-center text-center text-slate-500 text-sm px-6 py-10">
          <div>
            <p className="mb-2">Click a marker to see attribution beliefs</p>
            <p className="text-xs text-slate-600">Color = dominant cause across all personas</p>
          </div>
        </div>
      </aside>
    );
  }

  const byPersona = (p: Persona) => timeScopedBeliefs.filter((b) => b.data.persona === p);
  const report = reports?.[eventSlug(event.wref)];

  return (
    <aside className="flex-none w-full md:w-[380px] lg:w-[460px] xl:w-[540px] md:h-full border-t md:border-t-0 md:border-l border-slate-800 bg-slate-950/80 overflow-y-auto">
      <button
        onClick={onClose}
        className="sticky top-2 float-right mr-2 z-20 w-7 h-7 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 text-lg leading-none flex items-center justify-center border border-slate-700/60 backdrop-blur-sm"
        aria-label="Close"
      >
        ×
      </button>
      <EventHero event={event} beliefs={timeScopedBeliefs} />
      <p className="px-4 mt-2 text-[10px] text-slate-600 font-mono truncate">{event.wref}</p>
      <Scrubber versions={eventVersions} selectedTime={selectedTime} onChange={setSelectedTime} />
      <NarrativeBanner report={report} />
      <ConsensusStrip beliefs={timeScopedBeliefs} />
      <div className="p-4 space-y-3">
        {PERSONAS.map((p) => (
          <BeliefColumn
            key={p}
            persona={p}
            event={event}
            beliefs={byPersona(p)}
            evidence={evidence}
            satelliteScenes={satelliteScenes}
          />
        ))}
      </div>
    </aside>
  );
}
