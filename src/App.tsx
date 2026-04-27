import { useEffect, useMemo, useState } from 'react';
import { Map } from './components/Map';
import { EventPanel } from './components/EventPanel';
import { Legend } from './components/Legend';
import { FreshnessStrip } from './components/FreshnessStrip';
import { AboutModal } from './components/AboutModal';
import type { Snapshot } from './types';
import './App.css';

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedWref, setSelectedWref] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    fetch('/data.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load data.json: ${r.status}`);
        return r.json();
      })
      .then((d: Snapshot) => setSnapshot(d))
      .catch((e: Error) => setError(e.message));
  }, []);

  const selected = useMemo(
    () => snapshot?.events.find((e) => e.wref === selectedWref) ?? null,
    [snapshot, selectedWref],
  );

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-rose-400 text-sm">
        {error}
      </div>
    );
  }
  if (!snapshot) {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-slate-500 text-sm">
        Loading attribution data…
      </div>
    );
  }

  const eventCount = snapshot.events.length;
  const beliefCount = snapshot.beliefs.length;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-950">
      <header className="relative flex-none bg-slate-950 border-b border-slate-800 px-4 md:px-5 py-3 flex items-center justify-between gap-4 md:gap-6">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl md:text-[26px] font-medium text-slate-100 truncate leading-tight tracking-tight">
            Fish-Kill Attribution
          </h1>
          <p className="text-xs text-slate-500 truncate">Multi-persona causal attribution — NGO · Industry · Agency</p>
        </div>
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wider px-4 py-1.5 rounded-md border border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          About
        </button>
        <div className="flex items-center gap-4 md:gap-6 flex-none">
          <div className="hidden md:block">
            <FreshnessStrip health={snapshot.pipelineHealth} />
          </div>
          <div className="text-xs text-slate-500 text-right border-l border-slate-800 pl-4 md:pl-6 whitespace-nowrap">
            <div>{eventCount} events · {beliefCount} beliefs</div>
            <div className="text-slate-600 hidden sm:block">Snapshot {new Date(snapshot.generatedAt).toLocaleString()}</div>
          </div>
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="md:hidden flex-none text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            About
          </button>
        </div>
      </header>
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 min-h-[240px] md:min-h-0 relative">
          <Map
            events={snapshot.events}
            beliefs={snapshot.beliefs}
            selectedWref={selectedWref}
            onSelect={setSelectedWref}
            satelliteScenes={snapshot.satelliteScenes}
          />
          <Legend />
        </div>
        <EventPanel
          key={selectedWref ?? 'empty'}
          event={selected}
          beliefs={snapshot.beliefs}
          beliefVersions={snapshot.beliefVersions}
          reports={snapshot.reports}
          evidence={snapshot.evidence}
          satelliteScenes={snapshot.satelliteScenes}
          onClose={() => setSelectedWref(null)}
        />
      </div>
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
