import { useEffect, useMemo, useState } from 'react';
import { Map } from './components/Map';
import { EventPanel } from './components/EventPanel';
import { Legend } from './components/Legend';
import type { Snapshot } from './types';
import './App.css';

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedWref, setSelectedWref] = useState<string | null>(null);

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
      <div className="h-full flex items-center justify-center text-rose-400 text-sm">
        {error}
      </div>
    );
  }
  if (!snapshot) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        Loading Chesapeake attribution data…
      </div>
    );
  }

  const eventCount = snapshot.events.length;
  const beliefCount = snapshot.beliefs.length;

  return (
    <div className="h-full flex flex-col">
      <header className="bg-slate-950 border-b border-slate-800 px-5 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-100">Chesapeake Fish-Kill Attribution</h1>
          <p className="text-xs text-slate-500">Multi-persona causal attribution — NGO · Industry · Agency</p>
        </div>
        <div className="text-xs text-slate-500 text-right">
          <div>{eventCount} events · {beliefCount} beliefs</div>
          <div className="text-slate-600">Updated {new Date(snapshot.generatedAt).toLocaleString()}</div>
        </div>
      </header>
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 relative">
          <Map
            events={snapshot.events}
            beliefs={snapshot.beliefs}
            selectedWref={selectedWref}
            onSelect={setSelectedWref}
          />
          <Legend />
        </div>
        <EventPanel
          event={selected}
          beliefs={snapshot.beliefs}
          onClose={() => setSelectedWref(null)}
        />
      </div>
    </div>
  );
}
