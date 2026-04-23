import { Map as MapLibre, Marker, NavigationControl } from 'react-map-gl/maplibre';
import type { FishKillEvent, AttributionBelief } from '../types';
import { CAUSE_COLORS } from '../colors';

interface Props {
  events: FishKillEvent[];
  beliefs: AttributionBelief[];
  selectedWref: string | null;
  onSelect: (wref: string) => void;
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

export function Map({ events, beliefs, selectedWref, onSelect }: Props) {
  return (
    <MapLibre
      initialViewState={{ longitude: -76.4, latitude: 38.3, zoom: 6.6 }}
      mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" />
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
  );
}
