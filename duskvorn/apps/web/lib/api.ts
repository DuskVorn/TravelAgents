// Lightweight client-side types mirroring @duskvorn/core. Kept local (rather
// than importing the workspace package) so the frontend can type-check
// without depending on packages/core being built first.

export type PlanTier = "free" | "pro" | "elite";

export interface SearchParams {
  origin: string;
  destination: string;
  departDate: string;
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
  score: number;
  source: "live" | "mock";
}

export interface FlightResult extends BaseResult {
  type: "flight";
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departTime: string;
  arriveTime: string;
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
  rating: number;
  pricePerNight: number;
  nights: number;
  amenities: string[];
  refundable: boolean;
}

export interface CarResult extends BaseResult {
  type: "car";
  company: string;
  category: string;
  city: string;
  pricePerDay: number;
  days: number;
  transmission: "automatic" | "manual";
  seats: number;
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

export interface PlanInfo {
  tier: PlanTier;
  label: string;
  priceUsd: number;
  searchesPerDay: number;
  jetsAccess: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function getUserId(): string {
  if (typeof window === "undefined") return "demo-user";
  let id = window.localStorage.getItem("duskvorn_user_id");
  if (!id) {
    id = `user-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem("duskvorn_user_id", id);
  }
  return id;
}

export class PaywallError extends Error {
  constructor(message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": getUserId(),
      ...(options.headers || {}),
    },
  });

  if (res.status === 402) {
    const body = await res.json().catch(() => ({}));
    throw new PaywallError(body.error || "Upgrade required to continue searching.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export function runSearch(params: SearchParams): Promise<OrchestratedSearchResponse> {
  return request<OrchestratedSearchResponse>("/api/search", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function fetchPlans(): Promise<PlanInfo[]> {
  return request<PlanInfo[]>("/api/plans");
}

export function fetchMe(): Promise<{ userId: string; tier: PlanTier; searchesToday: number }> {
  return request("/api/billing/me");
}

export function startCheckout(tier: "pro" | "elite"): Promise<{ url: string }> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return request<{ url: string }>("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({
      tier,
      successUrl: `${origin}/?upgraded=1`,
      cancelUrl: `${origin}/pricing`,
    }),
  });
}
