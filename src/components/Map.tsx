import { useEffect, useRef, useState } from 'react';
import { Map as MapLibre, Marker, NavigationControl, Source, Layer, useMap } from 'react-map-gl/maplibre';
import type { FishKillEvent, AttributionBelief, SatelliteScene } from '../types';
import { CAUSE_COLORS } from '../colors';

interface Props {
  events: FishKillEvent[];
  beliefs: AttributionBelief[];
  selectedWref: string | null;
  onSelect: (wref: string) => void;
  satelliteScenes?: SatelliteScene[];
}

// Dominant cause = highest share across all 3 personas (averaged).
function dominantCause(eventWref: string, beliefs: AttributionBelief[]): string {
  const relevant = beliefs.filter((b) => b.about === eventWref);
  if (relevant.length === 0) return 'unknown';
  const totals: Record<string, number> = {};
  for (const b of relevant) {
    totals[b.data.cause] = (totals[b.data.cause] ?? 0) + b.data.share;
  }
  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
}

// Watches the map container for size changes (including CSS-driven ones like
// sibling panel width changes) and calls map.resize() so the canvas stays in
// sync. react-map-gl only listens for window resize by default, which misses
// container-only resizes.
function ContainerResizeWatcher({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const { current: map } = useMap();
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !map) return;
    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [map, containerRef]);
  return null;
}

export function Map({ events, beliefs, selectedWref, onSelect, satelliteScenes }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showSatellite, setShowSatellite] = useState(false);
  const latestScene = satelliteScenes?.[0];

  return (
    <div ref={containerRef} className="absolute inset-0">
      <MapLibre
        initialViewState={{ longitude: -76.2, latitude: 36.5, zoom: 5.9 }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        style={{ width: '100%', height: '100%' }}
      >
        <ContainerResizeWatcher containerRef={containerRef} />
        <NavigationControl position="top-right" />
        {showSatellite && latestScene && (
          <Source
            id="satellite-sst"
            type="image"
            url={latestScene.data.preview_png_url}
            coordinates={[
              [latestScene.data.bbox_min_lon, latestScene.data.bbox_max_lat],
              [latestScene.data.bbox_max_lon, latestScene.data.bbox_max_lat],
              [latestScene.data.bbox_max_lon, latestScene.data.bbox_min_lat],
              [latestScene.data.bbox_min_lon, latestScene.data.bbox_min_lat],
            ]}
          >
            <Layer
              id="satellite-sst-layer"
              type="raster"
              source="satellite-sst"
              paint={{ 'raster-opacity': 0.62, 'raster-fade-duration': 200 }}
            />
          </Source>
        )}
        {events.map((ev) => {
          const cause = dominantCause(ev.wref, beliefs);
          const color = CAUSE_COLORS[cause] ?? CAUSE_COLORS.unknown;
          const selected = ev.wref === selectedWref;
          return (
            <Marker
              key={ev.wref}
              longitude={ev.data.lon}
              latitude={ev.data.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onSelect(ev.wref);
              }}
            >
              <div
                title={ev.data.location_name}
                style={{
                  width: selected ? 22 : 14,
                  height: selected ? 22 : 14,
                  borderRadius: '50%',
                  background: color,
                  border: selected ? '3px solid white' : '2px solid rgba(255,255,255,0.7)',
                  boxShadow: selected ? '0 0 16px rgba(255,255,255,0.6)' : '0 0 6px rgba(0,0,0,0.4)',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              />
            </Marker>
          );
        })}
      </MapLibre>
      {latestScene && (
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <button
            type="button"
            onClick={() => setShowSatellite((v) => !v)}
            className={`pointer-events-auto inline-flex items-center gap-2 rounded-md border text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1.5 transition-colors backdrop-blur ${
              showSatellite
                ? 'bg-sky-500/20 border-sky-400/60 text-sky-100 hover:bg-sky-500/30'
                : 'bg-slate-900/70 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
            aria-pressed={showSatellite}
            title={`Satellite SST · ${latestScene.data.dataset}`}
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                background: showSatellite ? '#38bdf8' : '#64748b',
                boxShadow: showSatellite ? '0 0 6px rgba(56,189,248,0.8)' : 'none',
              }}
            />
            Satellite SST
          </button>
          {showSatellite && (
            <div className="pointer-events-auto mt-1.5 px-2 py-1 rounded bg-slate-900/80 backdrop-blur text-[10px] text-slate-300 font-mono border border-slate-700">
              {latestScene.data.dataset} · {latestScene.data.date} · median{' '}
              {latestScene.data.median_sst_c.toFixed(1)}°C
            </div>
          )}
        </div>
      )}
    </div>
  );
}
