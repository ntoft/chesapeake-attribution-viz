export interface FishKillEvent {
  wref: string;
  data: {
    lat: number;
    lon: number;
    date: string;
    status: string;
    location_name: string;
    primary_species?: string | null;
    estimated_mortality?: number;
    source_report?: string;
  };
}

export type Persona = 'ngo' | 'industry' | 'agency';

export interface AttributionBeliefData {
  cause: string;
  share: number;
  persona: Persona;
  model: string;
  rationale: string;
  sl_belief: number;
  sl_disbelief: number;
  sl_uncertainty: number;
  sl_base_rate?: number;
  evidence_ids?: string[];
}

export interface AttributionBelief {
  wref: string;
  about: string;
  data: AttributionBeliefData;
}

// One historical version of a belief. `commitTime` is epoch-ms — the scrubber
// picks the last version at or before a selected time. `operation` separates
// the original `add` from a subsequent correction-reactor `revise`.
export interface BeliefVersion {
  version: number;
  commitTime: number;
  commitId: string;
  commitMessage?: string;
  operation: 'add' | 'revise' | 'retract';
  data: AttributionBeliefData;
}

// One state-fishkills report, joined to an event by slug. Carries the human
// narrative (agency notes, reported cause hint, species list) that the
// NarrativeBanner surfaces above the persona columns.
export interface ReportSummary {
  wref: string;
  reporter?: string;
  narrative?: string;
  reported_cause?: string;
  waterbody?: string;
  event_date?: string;
  url?: string;
}

// Resolved cross-repo evidence wref. Lets the evidence chip row show a
// readable label ("NOAA SST · station 44042 · 2025-11-12") instead of the
// raw wref string.
export type EvidenceKind = 'observation' | 'release' | 'report' | 'unknown';
export type EvidenceSource = 'NOAA' | 'USGS' | 'EPA' | 'State' | 'unknown';

export interface EvidenceDetail {
  wref: string;
  kind: EvidenceKind;
  source: EvidenceSource;
  label: string;
  data?: Record<string, unknown>;
}

// Per-source freshness card shown in the header strip.
export interface SourceHealth {
  repo: string;
  label: EvidenceSource;
  lastCommitAt: string | null;
  commitCount24h: number;
  failureCount: number;
  status: 'healthy' | 'stale' | 'failing' | 'unknown';
}

export interface PipelineHealth {
  sources: SourceHealth[];
  collectedAt: string;
}

// Daily satellite SST scene covering the ingest bbox. preview_png_url renders
// as a map raster overlay; thumbnails on the event Details modal link to the
// same image bounded to a per-event sub-bbox.
export interface SatelliteScene {
  wref: string;
  data: {
    date: string;
    dataset: string;
    bbox_min_lat: number;
    bbox_max_lat: number;
    bbox_min_lon: number;
    bbox_max_lon: number;
    median_sst_c: number;
    mean_sst_c: number;
    p10_sst_c: number;
    p90_sst_c: number;
    pixel_count: number;
    preview_png_url: string;
    wms_url: string;
    source_url: string;
  };
}

export interface Snapshot {
  generatedAt: string;
  events: FishKillEvent[];
  beliefs: AttributionBelief[];
  // New enrichment bundles — optional so old data.json files still load.
  reports?: Record<string, ReportSummary>;      // keyed by event slug
  evidence?: Record<string, EvidenceDetail>;    // keyed by evidence wref
  pipelineHealth?: PipelineHealth;
  satelliteScenes?: SatelliteScene[];           // sorted by date desc
  // Per-belief version history (keyed by belief wref). Sorted ascending by
  // commitTime. Only present for beliefs that were revised at least once —
  // single-version beliefs are omitted to keep data.json small.
  beliefVersions?: Record<string, BeliefVersion[]>;
}
