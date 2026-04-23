import { CAUSE_COLORS } from '../colors';

export function Legend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-slate-950/90 backdrop-blur border border-slate-700 rounded-lg p-3 text-xs">
      <div className="text-slate-400 uppercase text-[10px] tracking-wider mb-2">Dominant cause</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {Object.entries(CAUSE_COLORS).map(([cause, color]) => (
          <div key={cause} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-slate-300 capitalize">{cause}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
