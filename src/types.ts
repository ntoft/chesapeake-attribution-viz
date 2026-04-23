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

export interface AttributionBelief {
  wref: string;
  about: string;
  data: {
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
  };
}

export interface Snapshot {
  generatedAt: string;
  events: FishKillEvent[];
  beliefs: AttributionBelief[];
}
