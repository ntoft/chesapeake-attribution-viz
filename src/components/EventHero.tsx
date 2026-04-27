import { useEffect, useMemo, useState } from 'react';
import type { AttributionBelief, FishKillEvent } from '../types';
import { CAUSE_COLORS } from '../colors';

interface Props {
  event: FishKillEvent;
  beliefs: AttributionBelief[];
}

interface Slide {
  key: string;
  caption: string;
}

interface ImageResult {
  url: string;
  pageUrl: string;
  title: string;
}

type ImageState =
  | { status: 'loading' }
  | { status: 'ok'; url: string; pageUrl: string; title: string }
  | { status: 'missing' };

// Compute the dominant cause across all personas (mean of per-persona shares),
// mirroring ConsensusStrip so the headline and the consensus bar agree.
function topCauseFromBeliefs(beliefs: AttributionBelief[]) {
  if (beliefs.length === 0) return null;
  const perCause = new Map<string, number[]>();
  for (const b of beliefs) {
    const list = perCause.get(b.data.cause) ?? [];
    list.push(b.data.share);
    perCause.set(b.data.cause, list);
  }
  const rows = [...perCause.entries()]
    .map(([cause, shares]) => ({
      cause,
      mean: shares.reduce((a, b) => a + b, 0) / shares.length,
    }))
    .sort((a, b) => b.mean - a.mean);
  return rows[0] ?? null;
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

// Build an ordered list of Wikipedia query candidates from a free-form
// location string like "Choptank River near Cambridge, MD". We try the
// waterbody first because that's the more specific subject of the event;
// if no candidate yields a ground-level photo we fall back to the named
// town/city.
function locationCandidates(locationName: string): string[] {
  if (!locationName) return [];
  const out: string[] = [];

  const [beforeNear, afterNear] = locationName.split(/\s+near\s+/i);
  const waterPart = (beforeNear ?? locationName).trim();
  const placePart = (afterNear ?? '').trim();

  if (waterPart) {
    const hasFeature = /(river|creek|sound|bay|lake|reservoir|pond|estuary|inlet|harbor)/i.test(waterPart);
    const stripped = waterPart
      .replace(/^(lower|upper|middle|north|south|east|west|ne|nw|se|sw|n\.?|s\.?|e\.?|w\.?)\s+/i, '')
      .trim();
    if (stripped) {
      out.push(hasFeature ? stripped : `${stripped} River`);
    }
  }

  if (placePart) {
    const m = placePart.match(/^(.+?),\s*([A-Z]{2})$/);
    if (m) {
      const town = m[1].trim();
      const stateFull = STATE_NAMES[m[2].toUpperCase()];
      if (town && stateFull) out.push(`${town}, ${stateFull}`);
      if (town) out.push(town);
    } else {
      out.push(placePart);
    }
  }

  return [...new Set(out)];
}

// Filename-level filter — catches obvious non-photos like SVGs, locator maps,
// flags, seals. Generic filenames (e.g. "Albemarle_Sound.jpg") slip through
// here; we rely on caption-based filtering below to catch those.
function looksLikeMapByUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.endsWith('.svg')) return true;
  if (lower.endsWith('.svg.png')) return true;
  return /(^|[\W_])(map|locator|watershed|basin|topo|cartogram|area_in|wpdmap|locationmap|diagram|schematic|flag|seal_of|coat_of_arms|emblem)([\W_]|$)/.test(lower);
}

// Caption-level filter — Wikipedia's media-list endpoint includes the article
// caption for each image, which usually says "Satellite image of …" or "Map
// of …". This is more reliable than filenames for body-of-water articles
// where the lead image often has a generic name like "Albemarle_Sound.jpg".
function captionLooksMappy(caption: string): boolean {
  if (!caption) return false;
  return /\b(satellite|aerial|map|locator|watershed|topograph|orbital|from\s+space|nasa|landsat|modis|sentinel|diagram|schematic|flag|seal|coat\s+of\s+arms)\b/i.test(caption);
}

interface MediaListItem {
  title?: string;
  type?: string;
  leadImage?: boolean;
  caption?: { text?: string };
  srcset?: { src?: string }[];
}

// Pick the highest-resolution entry from a Wikimedia srcset and absolute-ize
// the URL. We can't reliably synthesize a custom width since Wikimedia only
// serves pre-generated thumbnail sizes (and 400s on others) — so we take the
// best size that's already available.
function bestSrc(srcset: { src?: string }[] | undefined): string | null {
  if (!srcset || srcset.length === 0) return null;
  const raw = srcset[srcset.length - 1]?.src ?? srcset[0]?.src;
  if (!raw) return null;
  return raw.startsWith('//') ? `https:${raw}` : raw;
}

// Pull the best ground-level photo from a Wikipedia article using the
// media-list endpoint (which includes captions). Returns null if no usable
// photo is found — meaning the page is all maps/satellite/diagrams or the
// page doesn't exist.
async function fetchPhotoFromMediaList(
  title: string,
  signal: AbortSignal,
): Promise<ImageResult | null> {
  const encoded = encodeURIComponent(title);
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/media-list/${encoded}?redirect=true`,
    { signal },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { items?: MediaListItem[]; title?: string };
  const items = json.items ?? [];
  for (const item of items) {
    if (item.type !== 'image') continue;
    const url = bestSrc(item.srcset);
    if (!url) continue;
    if (looksLikeMapByUrl(url)) continue;
    if (captionLooksMappy(item.caption?.text ?? '')) continue;
    return {
      url,
      pageUrl: `https://en.wikipedia.org/wiki/${encoded}`,
      title: json.title ?? title,
    };
  }
  return null;
}

// Wikipedia REST summary endpoint — CORS-enabled, returns thumbnail/originalimage
// when the page has a lead image. Used for species lookups, where the lead
// image is reliably a photo of the animal.
async function fetchSummaryImage(
  query: string,
  signal: AbortSignal,
): Promise<ImageResult | null> {
  const title = encodeURIComponent(query);
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}?redirect=true`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    type?: string;
    title?: string;
    thumbnail?: { source?: string };
    originalimage?: { source?: string };
    content_urls?: { desktop?: { page?: string } };
  };
  if (json.type === 'disambiguation') return null;
  const src = json.originalimage?.source ?? json.thumbnail?.source;
  if (!src) return null;
  return {
    url: src,
    pageUrl: json.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${title}`,
    title: json.title ?? query,
  };
}

// Walk the candidate list, prefer the first usable photo. If every candidate's
// page is a wash (only maps/satellite/no images), fall back to whatever the
// summary endpoint returns for the first candidate so the user at least sees
// something rather than "Image not available".
async function fetchBestLocationImage(
  candidates: string[],
  signal: AbortSignal,
): Promise<ImageResult | null> {
  for (const c of candidates) {
    const photo = await fetchPhotoFromMediaList(c, signal);
    if (photo) return photo;
  }
  for (const c of candidates) {
    const lead = await fetchSummaryImage(c, signal);
    if (lead) return lead;
  }
  return null;
}

function useSpeciesImage(query: string | null): ImageState {
  const [state, setState] = useState<ImageState>(query ? { status: 'loading' } : { status: 'missing' });
  useEffect(() => {
    if (!query) {
      setState({ status: 'missing' });
      return;
    }
    setState({ status: 'loading' });
    const ctrl = new AbortController();
    fetchSummaryImage(query, ctrl.signal)
      .then((res) => {
        if (ctrl.signal.aborted) return;
        if (!res) setState({ status: 'missing' });
        else setState({ status: 'ok', ...res });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState({ status: 'missing' });
      });
    return () => ctrl.abort();
  }, [query]);
  return state;
}

function useLocationImage(candidates: string[]): ImageState {
  const key = candidates.join('|');
  const [state, setState] = useState<ImageState>(candidates.length ? { status: 'loading' } : { status: 'missing' });
  useEffect(() => {
    if (candidates.length === 0) {
      setState({ status: 'missing' });
      return;
    }
    setState({ status: 'loading' });
    const ctrl = new AbortController();
    fetchBestLocationImage(candidates, ctrl.signal)
      .then((res) => {
        if (ctrl.signal.aborted) return;
        if (!res) setState({ status: 'missing' });
        else setState({ status: 'ok', ...res });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState({ status: 'missing' });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

function CausePill({ cause }: { cause: string }) {
  const color = CAUSE_COLORS[cause] ?? '#cbd5e1';
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide"
      style={{ backgroundColor: `${color}26`, color }}
    >
      {cause}
    </span>
  );
}

function SlideFrame({ state, caption }: { state: ImageState; caption: string }) {
  if (state.status === 'loading') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-500 text-xs">
        Loading image…
      </div>
    );
  }
  if (state.status === 'missing') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500 text-xs gap-1">
        <span>Image not available</span>
        <span className="text-slate-600 text-[10px]">{caption}</span>
      </div>
    );
  }
  return (
    <>
      <img
        src={state.url}
        alt={state.title}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent px-3 py-2 flex items-end justify-between gap-2">
        <span className="text-[11px] text-slate-200 leading-tight">{caption}</span>
        <a
          href={state.pageUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-sky-300/80 hover:text-sky-200 whitespace-nowrap"
        >
          Wikipedia ↗
        </a>
      </div>
    </>
  );
}

export function EventHero({ event, beliefs }: Props) {
  const top = useMemo(() => topCauseFromBeliefs(beliefs), [beliefs]);

  const headline = useMemo(() => {
    const species = event.data.primary_species;
    const mortality = event.data.estimated_mortality;
    const subject = species
      ? `${species} kill`
      : mortality
        ? `Fish kill (~${mortality.toLocaleString()})`
        : 'Fish kill';
    const place = event.data.location_name?.split(/,\s*[A-Z]{2}$/)[0] ?? event.data.location_name ?? '';
    return place ? `${subject} — ${place}` : subject;
  }, [event]);

  const slides: Slide[] = useMemo(
    () => [
      { key: 'species', caption: event.data.primary_species ?? 'Species unknown' },
      { key: 'location', caption: event.data.location_name ?? 'Location unknown' },
    ],
    [event],
  );

  const speciesQuery = event.data.primary_species ?? null;
  const locationQueries = useMemo(
    () => locationCandidates(event.data.location_name ?? ''),
    [event.data.location_name],
  );
  const speciesImg = useSpeciesImage(speciesQuery);
  const locationImg = useLocationImage(locationQueries);
  const slideStates: ImageState[] = [speciesImg, locationImg];

  const [index, setIndex] = useState(0);
  // selectedWref change already remounts EventPanel today; keep this as a
  // defensive reset in case that ever stops being true.
  useEffect(() => setIndex(0), [event.wref]);

  const total = slides.length;
  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);

  return (
    <section className="px-4 pt-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-2xl font-medium text-slate-100 leading-snug tracking-tight">
            {headline}
          </h2>
          <div className="mt-2 flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-400">
            <span>{event.data.date}</span>
            {event.data.estimated_mortality != null && (
              <>
                <span className="text-slate-700">·</span>
                <span>~{event.data.estimated_mortality.toLocaleString()} fish</span>
              </>
            )}
            {top && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-slate-500">Top cause:</span>
                <CausePill cause={top.cause} />
                <span className="text-slate-500">{(top.mean * 100).toFixed(0)}%</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-slate-800 bg-slate-900">
        {slides.map((s, i) => (
          <div
            key={s.key}
            className={`absolute inset-0 transition-opacity duration-300 ${i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            aria-hidden={i !== index}
          >
            <SlideFrame state={slideStates[i]} caption={s.caption} />
          </div>
        ))}

        <button
          type="button"
          onClick={goPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/60 hover:bg-slate-950/80 text-slate-200 text-lg leading-none flex items-center justify-center backdrop-blur-sm border border-slate-700/60"
          aria-label="Previous image"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/60 hover:bg-slate-950/80 text-slate-200 text-lg leading-none flex items-center justify-center backdrop-blur-sm border border-slate-700/60"
          aria-label="Next image"
        >
          ›
        </button>

        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-950/70 border border-slate-700/60 text-[10px] uppercase tracking-wide text-slate-300">
          {index === 0 ? 'Species' : 'Location'}
        </div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-slate-100' : 'w-1.5 bg-slate-500/70 hover:bg-slate-300'}`}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
