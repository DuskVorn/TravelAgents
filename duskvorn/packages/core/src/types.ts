// Shared domain types for the DuskvorN platform.
// Imported by @duskvorn/agents, apps/api, and (via type-only import) apps/web.

export type PlanTier = "free" | "pro" | "elite";

export interface SearchParams {
  origin: string;
  destination: string;
  departDate: string; // ISO date, e.g. "2026-07-04"
  returnDate?: string;
  travelers: number;
  cabinClass?: "economy" | "premium" | "business" | "first";
  includeJets?: boolean;
}

export interface BaseResult {
  id: string;
  provider: string;
  price: number;
  currency: string;
  score: number; // 0-100 composite ranking score, set by the orchestrator
  source: "live" | "mock"; // whether this came from a real provider or the deterministic fallback
}

export interface FlightResult extends BaseResult {
  type: "flight";
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departTime: string; // ISO datetime
  arriveTime: string; // ISO datetime
  durationMinutes: number;
  stops: number;
  cabinClass: string;
}

export interface JetResult extends BaseResult {
  type: "jet";
  operator: string;
  aircraft: string;
  origin: string;
  destination: string;
  departTime: string;
  arriveTime: string;
  durationMinutes: number;
  seats: number;
  emptyLeg: boolean;
}

export interface HotelResult extends BaseResult {
  type: "hotel";
  name: string;
  city: string;
  rating: number; // 1-5
  pricePerNight: number;
  nights: number;
  amenities: string[];
  refundable: boolean;
}

export interface CarResult extends BaseResult {
  type: "car";
  company: string;
  category: string; // economy, suv, luxury, etc.
  city: string;
  pricePerDay: number;
  days: number;
  transmission: "automatic" | "manual";
  seats: number;
}

export type TravelResult = FlightResult | JetResult | HotelResult | CarResult;

export interface AgentOutput<T extends TravelResult> {
  agent: string;
  tookMs: number;
  results: T[];
  warning?: string; // e.g. "provider key missing — using mock data"
}

export interface OrchestratedSearchResponse {
  query: SearchParams;
  flights: FlightResult[];
  jets: JetResult[];
  hotels: HotelResult[];
  cars: CarResult[];
  summary: string;
  meta: {
    tookMs: number;
    tier: PlanTier;
    jetsLocked: boolean;
    warnings: string[];
  };
}

export const PLAN_LIMITS: Record<PlanTier, { searchesPerDay: number; jetsAccess: boolean }> = {
  free: { searchesPerDay: 5, jetsAccess: false },
  pro: { searchesPerDay: 100, jetsAccess: false },
  elite: { searchesPerDay: 1000, jetsAccess: true },
};

export const PLAN_PRICING: Record<PlanTier, { label: string; priceUsd: number }> = {
  free: { label: "Free", priceUsd: 0 },
  pro: { label: "Pro", priceUsd: 19 },
  elite: { label: "Elite", priceUsd: 49 },
};
