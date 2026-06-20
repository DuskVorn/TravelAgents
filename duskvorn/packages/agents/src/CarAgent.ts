import { AgentOutput, CarResult, SearchParams, carComfortScore, rankResults, seedFromString, mulberry32, rangeInt, pick } from "@duskvorn/core";
import { runWithFallback } from "./BaseAgent";

const COMPANIES = ["Hertz", "Avis", "Enterprise", "Sixt", "Budget", "Europcar"];
const CATEGORIES = ["economy", "compact", "suv", "luxury"];

function daysBetween(depart: string, ret?: string): number {
  if (!ret) return 1;
  const diff = (new Date(ret).getTime() - new Date(depart).getTime()) / 86400000;
  return Math.max(1, Math.round(diff));
}

async function liveCarSearch(params: SearchParams): Promise<CarResult[]> {
  const res = await fetch("https://api.cartrawler.com/v2/availability", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CAR_RENTAL_API_KEY}`,
    },
    body: JSON.stringify({
      location: params.destination,
      pickupDate: params.departDate,
      dropoffDate: params.returnDate ?? params.departDate,
    }),
  });
  if (!res.ok) throw new Error(`car rental provider failed: ${res.status}`);
  const data = await res.json();
  const days = daysBetween(params.departDate, params.returnDate);
  const vehicles = (data.vehicles ?? []) as any[];

  const raw = vehicles.map((v, idx) => ({
    id: `car-live-${v.id ?? idx}`,
    provider: v.company ?? "Rental Partner",
    price: Math.round((v.pricePerDay ?? 0) * days),
    currency: v.currency ?? "USD",
    source: "live" as const,
    type: "car" as const,
    company: v.company,
    category: v.category ?? "economy",
    city: params.destination,
    pricePerDay: v.pricePerDay,
    days,
    transmission: v.transmission === "manual" ? "manual" : "automatic",
    seats: v.seats ?? 5,
  }));

  const scores = rankResults(
    raw.map((r) => ({ price: r.price, durationMinutes: 0, comfortScore: carComfortScore(r.category, r.transmission) }))
  );
  return raw.map((r, i) => ({ ...r, score: scores[i] }));
}

function mockCarSearch(params: SearchParams): CarResult[] {
  const rand = mulberry32(seedFromString(`car:${params.destination}:${params.departDate}`));
  const days = daysBetween(params.departDate, params.returnDate);
  const count = rangeInt(rand, 5, 8);

  const raw = Array.from({ length: count }, (_, i) => {
    const category = pick(rand, CATEGORIES);
    const basePricePerDay: Record<string, number> = { economy: 38, compact: 48, suv: 78, luxury: 165 };
    const pricePerDay = Math.round((basePricePerDay[category] ?? 50) * (0.85 + rand() * 0.4));
    const transmission = rand() < 0.85 ? "automatic" : "manual";
    const seatsByCategory: Record<string, number> = { economy: 4, compact: 5, suv: 7, luxury: 5 };

    return {
      id: `car-mock-${i}`,
      provider: pick(rand, COMPANIES),
      price: pricePerDay * days,
      currency: "USD",
      source: "mock" as const,
      type: "car" as const,
      company: pick(rand, COMPANIES),
      category,
      city: params.destination,
      pricePerDay,
      days,
      transmission: transmission as "automatic" | "manual",
      seats: seatsByCategory[category] ?? 5,
    };
  });

  const scores = rankResults(
    raw.map((r) => ({ price: r.price, durationMinutes: 0, comfortScore: carComfortScore(r.category, r.transmission) }))
  );
  return raw.map((r, i) => ({ ...r, score: scores[i] }));
}

export class CarAgent {
  async execute(params: SearchParams): Promise<AgentOutput<CarResult>> {
    const hasLiveProvider = Boolean(process.env.CAR_RENTAL_API_KEY);
    return runWithFallback(
      "CarAgent",
      hasLiveProvider,
      () => liveCarSearch(params),
      () => mockCarSearch(params)
    );
  }
}
