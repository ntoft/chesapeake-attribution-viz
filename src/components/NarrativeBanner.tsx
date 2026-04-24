import type { ReportSummary } from '../types';

interface Props {
  report: ReportSummary | undefined;
}

// Shows the original state-fishkills report inline so the reader knows
// what each persona was reacting to. When no report was joined (raw event
// created without a matching FishKillReport), we render a tight fallback.
export function NarrativeBanner({ report }: Props) {
  if (!report) {
    return (
      <section className="mx-4 mt-4 rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-500 italic">
        No matching state-fishkills report for this event — personas ran on raw event data.
      </section>
    );
  }
  const { reporter, narrative, reported_cause, waterbody, url } = report;
  return (
    <section className="mx-4 mt-4 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-slate-500">
        <span>State report{reporter ? ` · ${reporter}` : ''}{waterbody ? ` · ${waterbody}` : ''}</span>
        {reported_cause && (
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 normal-case tracking-normal">
            Reported: {reported_cause}
          </span>
        )}
      </div>
      {narrative && (
        <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">{narrative}</p>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-block text-[10px] text-sky-400 hover:text-sky-300"
        >
          Open source ↗
        </a>
      )}
    </section>
  );
}
