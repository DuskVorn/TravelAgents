import {
  AgentOutput,
  FlightResult,
  SearchParams,
  flightComfortScore,
  rankResults,
  seedFromString,
  mulberry32,
  rangeInt,
  pick,
} from "@duskvorn/core";
import { runWithFallback } from "./BaseAgent";

const AIRLINES = [
  { code: "DL", name: "Delta Air Lines" },
  { code: "UA", name: "United Airlines" },
  { code: "AA", name: "American Airlines" },
  { code: "BA", name: "British Airways" },
  { code: "EK", name: "Emirates" },
  { code: "SQ", name: "Singapore Airlines" },
  { code: "LH", name: "Lufthansa" },
];

let cachedAmadeusToken: { token: string; expiresAt: number } | null = null;

async function getAmadeusToken(): Promise<string> {
  if (cachedAmadeusToken && cachedAmadeusToken.expiresAt > Date.now()) {
    return cachedAmadeusToken.token;
  }
  const res = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_API_KEY ?? "",
      client_secret: process.env.AMADEUS_API_SECRET ?? "",
    }),
  });
  if (!res.ok) throw new Error(`amadeus auth failed: ${res.status}`);
  const data = (await res.json()) as any;
  cachedAmadeusToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 30) * 1000 };
  return cachedAmadeusToken.token;
}

async function liveFlightSearch(params: SearchParams): Promise<FlightResult[]> {
  const token = await getAmadeusToken();
  const url = new URL("https://test.api.amadeus.com/v2/shopping/flight-offers");
  url.searchParams.set("originLocationCode", params.origin);
  url.searchParams.set("destinationLocationCode", params.destination);
  url.searchParams.set("departureDate", params.departDate);
  if (params.returnDate) url.searchParams.set("returnDate", params.returnDate);
  url.searchParams.set("adults", String(params.travelers || 1));
  url.searchParams.set("max", "10");

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`amadeus search failed: ${res.status}`);
  const data = (await res.json()) as any;

  const cabin = params.cabinClass ?? "economy";
  const offers = (data.data ?? []) as any[];

  const raw = offers.map((offer, idx) => {
    const itinerary = offer.itineraries[0];
    const segments = itinerary.segments;
    const first = segments[0];
    const last = segments[segments.length - 1];
    const durationMinutes = parseIsoDurationToMinutes(itinerary.duration);
    return {
      id: `flight-live-${offer.id ?? idx}`,
      provider: "Amadeus",
      price: parseFloat(offer.price.total),
      currency: offer.price.currency,
      source: "live" as const,
      type: "flight" as const,
      airline: first.carrierCode,
      flightNumber: `${first.carrierCode}${first.number}`,
      origin: first.departure.iataCode,
      destination: last.arrival.iataCode,
      departTime: first.departure.at,
      arriveTime: last.arrival.at,
      durationMinutes,
      stops: segments.length - 1,
      cabinClass: cabin,
    };
  });

  const scores = rankResults(
    raw.map((r) => ({
      price: r.price,
      durationMinutes: r.durationMinutes,
      comfortScore: flightComfortScore(r.stops, r.cabinClass),
    }))
  );

  return raw.map((r, i) => ({ ...r, score: scores[i] }));
}

function parseIsoDurationToMinutes(iso: string): number {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso);
  const hours = match?.[1] ? parseInt(match[1], 10) : 0;
  const minutes = match?.[2] ? parseInt(match[2], 10) : 0;
  return hours * 60 + minutes;
}

function mockFlightSearch(params: SearchParams): FlightResult[] {
  const rand = mulberry32(seedFromString(`flight:${params.origin}:${params.destination}:${params.departDate}`));
  const cabin = params.cabinClass ?? "economy";
  const count = rangeInt(rand, 5, 8);

  const raw = Array.from({ length: count }, (_, i) => {
    const airline = pick(rand, AIRLINES);
    const stops = rangeInt(rand, 0, 2);
    const durationMinutes = rangeInt(rand, 95, 780) + stops * 60;
    const basePrice = rangeInt(rand, 140, 1200);
    const cabinMultiplier: Record<string, number> = { economy: 1, premium: 1.6, business: 2.8, first: 4.2 };
    const price = Math.round(basePrice * (cabinMultiplier[cabin] ?? 1));
    const departHour = rangeInt(rand, 0, 23);
    const departTime = new Date(`${params.departDate}T${String(departHour).padStart(2, "0")}:00:00Z`);
    const arriveTime = new Date(departTime.getTime() + durationMinutes * 60000);

    return {
      id: `flight-mock-${i}`,
      provider: "DuskvorN Mock Fares",
      price,
      currency: "USD",
      source: "mock" as const,
      type: "flight" as const,
      airline: airline.name,
      flightNumber: `${airline.code}${rangeInt(rand, 100, 2899)}`,
      origin: params.origin,
      destination: params.destination,
      departTime: departTime.toISOString(),
      arriveTime: arriveTime.toISOString(),
      durationMinutes,
      stops,
      cabinClass: cabin,
    };
  });

  const scores = rankResults(
    raw.map((r) => ({
      price: r.price,
      durationMinutes: r.durationMinutes,
      comfortScore: flightComfortScore(r.stops, r.cabinClass),
    }))
  );

  return raw.map((r, i) => ({ ...r, score: scores[i] }));
}

export class FlightAgent {
  async execute(params: SearchParams): Promise<AgentOutput<FlightResult>> {
    const hasLiveProvider = Boolean(process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET);
    return runWithFallback(
      "FlightAgent",
      hasLiveProvider,
      () => liveFlightSearch(params),
      () => mockFlightSearch(params)
    );
  }
}
