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
      <header className="flex-none bg-slate-950 border-b border-slate-800 px-4 md:px-5 py-3 flex items-center justify-between gap-4 md:gap-6">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="flex-none w-9 h-9 text-emerald-300/90"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" />
            <path d="M18 12v.5" />
            <path d="M16 17.93a9.77 9.77 0 0 1 0-11.86" />
            <path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .47 6.5-1.47 1.5-1.47 5-.47 6.5C5.58 18.03 7 16 7 13.33" />
          </svg>
          <div className="min-w-0">
            <h1 className="font-serif text-2xl md:text-[26px] font-medium text-slate-100 truncate leading-tight tracking-tight">
              Fish-Kill Attribution
            </h1>
            <p className="text-xs text-slate-500 truncate">Multi-persona causal attribution — NGO · Industry · Agency</p>
          </div>
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="flex-none text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            About
          </button>
        </div>
        <div className="flex items-center gap-4 md:gap-6 flex-none">
          <div className="hidden md:block">
            <FreshnessStrip health={snapshot.pipelineHealth} />
          </div>
          <div className="text-xs text-slate-500 text-right border-l border-slate-800 pl-4 md:pl-6 whitespace-nowrap">
            <div>{eventCount} events · {beliefCount} beliefs</div>
            <div className="text-slate-600 hidden sm:block">Snapshot {new Date(snapshot.generatedAt).toLocaleString()}</div>
          </div>
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
