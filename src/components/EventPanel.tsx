import type {
  FishKillEvent,
  AttributionBelief,
  EvidenceDetail,
  Persona,
  ReportSummary,
  SatelliteScene,
} from '../types';
import { BeliefColumn } from './BeliefColumn';
import { NarrativeBanner } from './NarrativeBanner';
import { ConsensusStrip } from './ConsensusStrip';

interface Props {
  event: FishKillEvent | null;
  beliefs: AttributionBelief[];
  reports?: Record<string, ReportSummary>;
  evidence?: Record<string, EvidenceDetail>;
  satelliteScenes?: SatelliteScene[];
  onClose: () => void;
}

const PERSONAS: Persona[] = ['ngo', 'industry', 'agency'];

function eventSlug(wref: string): string {
  return wref.replace(/^FishKillEvent\//, '');
}

export function EventPanel({ event, beliefs, reports, evidence, satelliteScenes, onClose }: Props) {
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

  const eventBeliefs = beliefs.filter((b) => b.about === event.wref);
  const byPersona = (p: Persona) => eventBeliefs.filter((b) => b.data.persona === p);
  const report = reports?.[eventSlug(event.wref)];

  return (
    <aside className="flex-none w-full md:w-[380px] lg:w-[460px] xl:w-[540px] md:h-full border-t md:border-t-0 md:border-l border-slate-800 bg-slate-950/80 overflow-y-auto">
      <header className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-100 truncate">{event.data.location_name}</h2>
          <p className="text-xs text-slate-400 mt-1">
            {event.data.date}
            {event.data.primary_species && ` · ${event.data.primary_species}`}
            {event.data.estimated_mortality != null && ` · ~${event.data.estimated_mortality.toLocaleString()} fish`}
          </p>
          <p className="text-[10px] text-slate-600 mt-1 font-mono truncate">{event.wref}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 text-xl leading-none flex-none"
          aria-label="Close"
        >
          ×
        </button>
      </header>
      <NarrativeBanner report={report} />
      <ConsensusStrip beliefs={eventBeliefs} />
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
