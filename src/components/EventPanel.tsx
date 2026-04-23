import type { FishKillEvent, AttributionBelief, Persona } from '../types';
import { BeliefColumn } from './BeliefColumn';

interface Props {
  event: FishKillEvent | null;
  beliefs: AttributionBelief[];
  onClose: () => void;
}

const PERSONAS: Persona[] = ['ngo', 'industry', 'agency'];

export function EventPanel({ event, beliefs, onClose }: Props) {
  if (!event) {
    return (
      <aside className="w-full lg:w-[560px] shrink-0 bg-slate-950/80 border-l border-slate-800 p-6 overflow-y-auto">
        <div className="h-full flex items-center justify-center text-center text-slate-500 text-sm">
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

  return (
    <aside className="w-full lg:w-[560px] shrink-0 bg-slate-950/80 border-l border-slate-800 overflow-y-auto">
      <header className="sticky top-0 bg-slate-950/95 backdrop-blur px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{event.data.location_name}</h2>
          <p className="text-xs text-slate-400 mt-1">
            {event.data.date}
            {event.data.primary_species && ` · ${event.data.primary_species}`}
            {event.data.estimated_mortality != null && ` · ~${event.data.estimated_mortality.toLocaleString()} fish`}
          </p>
          <p className="text-[10px] text-slate-600 mt-1 font-mono">{event.wref}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </header>
      <div className="p-4 grid grid-cols-1 gap-3">
        {PERSONAS.map((p) => (
          <BeliefColumn key={p} persona={p} beliefs={byPersona(p)} />
        ))}
      </div>
    </aside>
  );
}
