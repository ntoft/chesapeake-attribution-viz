import { useMemo } from 'react';
import type { BeliefVersion } from '../types';

interface Props {
  // Union of all belief versions for the selected event. The scrubber builds
  // one tick per distinct commitTime and clamps to [min, max] of those times.
  versions: BeliefVersion[];
  // Epoch-ms currently selected, or null when pinned to HEAD ("Now").
  selectedTime: number | null;
  onChange: (t: number | null) => void;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Scrubber({ versions, selectedTime, onChange }: Props) {
  const { min, max, ticks } = useMemo(() => {
    const times = Array.from(new Set(versions.map((v) => v.commitTime))).sort((a, b) => a - b);
    return {
      min: times[0] ?? 0,
      max: times[times.length - 1] ?? 0,
      ticks: times,
    };
  }, [versions]);

  if (ticks.length < 2) return null;

  const current = selectedTime ?? max;
  const isLive = selectedTime === null;
  const range = max - min || 1;

  return (
    <div className="sticky top-0 z-10 pl-5 pr-12 py-3 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Timeline
          </span>
          <span className="text-xs text-slate-300 font-mono truncate">
            {formatTime(current)}
          </span>
          {!isLive && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              rewound
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={isLive}
          className="flex-none text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Now
        </button>
      </div>
      <div className="relative h-6">
        {/* Tick marks — one per revision commit */}
        <div aria-hidden className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-slate-800" />
        {ticks.map((t) => {
          const pct = ((t - min) / range) * 100;
          return (
            <div
              key={t}
              aria-hidden
              className="absolute top-1/2 -translate-y-1/2 w-px h-2 bg-slate-600"
              style={{ left: `${pct}%` }}
            />
          );
        })}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={current}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(v >= max ? null : v);
          }}
          aria-label="Rewind attribution to an earlier point in time"
          className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-runnable-track]:h-6 [&::-webkit-slider-runnable-track]:bg-transparent
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded [&::-webkit-slider-thumb]:bg-slate-200
            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab
            [&::-webkit-slider-thumb]:active:cursor-grabbing
            [&::-moz-range-track]:h-6 [&::-moz-range-track]:bg-transparent
            [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:rounded [&::-moz-range-thumb]:bg-slate-200
            [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:active:cursor-grabbing"
        />
      </div>
      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-600 font-mono">
        <span>{formatTime(min)}</span>
        <span>{formatTime(max)}</span>
      </div>
    </div>
  );
}
