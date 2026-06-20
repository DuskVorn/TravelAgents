import { AgentOutput, JetResult, SearchParams, rankResults, seedFromString, mulberry32, rangeInt, pick } from "@duskvorn/core";
import { runWithFallback } from "./BaseAgent";

const OPERATORS = ["NetJets", "VistaJet", "Flexjet", "Wheels Up", "Air Partner", "Jet Linx"];
const AIRCRAFT = [
  { model: "Citation CJ3+", seats: 6 },
  { model: "Phenom 300E", seats: 8 },
  { model: "Challenger 350", seats: 9 },
  { model: "Gulfstream G280", seats: 10 },
  { model: "Global 6000", seats: 13 },
];

async function liveJetSearch(params: SearchParams): Promise<JetResult[]> {
  const baseUrl = process.env.JET_CHARTER_API_URL;
  if (!baseUrl) throw new Error("JET_CHARTER_API_URL not configured");

  const res = await fetch(`${baseUrl}/v1/availability`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.JET_CHARTER_API_KEY}`,
    },
    body: JSON.stringify({
      origin: params.origin,
      destination: params.destination,
      date: params.departDate,
      passengers: params.travelers,
    }),
  });
  if (!res.ok) throw new Error(`jet charter API failed: ${res.status}`);
  const data = await res.json();
  const offers = (data.offers ?? []) as any[];

  const raw = offers.map((offer, idx) => ({
    id: `jet-live-${offer.id ?? idx}`,
    provider: offer.operator ?? "Charter Partner",
    price: offer.price,
    currency: offer.currency ?? "USD",
    source: "live" as const,
    type: "jet" as const,
    operator: offer.operator,
    aircraft: offer.aircraftModel,
    origin: params.origin,
    destination: params.destination,
    departTime: offer.departTime,
    arriveTime: offer.arriveTime,
    durationMinutes: offer.durationMinutes,
    seats: offer.seats,
    emptyLeg: Boolean(offer.emptyLeg),
  }));

  const scores = rankResults(
    raw.map((r) => ({ price: r.price, durationMinutes: r.durationMinutes, comfortScore: 95 }))
  );
  return raw.map((r, i) => ({ ...r, score: scores[i] }));
}

function mockJetSearch(params: SearchParams): JetResult[] {
  const rand = mulberry32(seedFromString(`jet:${params.origin}:${params.destination}:${params.departDate}`));
  const count = rangeInt(rand, 3, 6);

  const raw = Array.from({ length: count }, (_, i) => {
    const aircraft = pick(rand, AIRCRAFT);
    const operator = pick(rand, OPERATORS);
    const durationMinutes = rangeInt(rand, 60, 540);
    const emptyLeg = rand() < 0.25;
    const baseRate = rangeInt(rand, 2800, 6500); // $ per flight-hour equivalent, baked into price below
    const price = Math.round((emptyLeg ? baseRate * 0.45 : baseRate) * (durationMinutes / 60));
    const departHour = rangeInt(rand, 5, 22);
    const departTime = new Date(`${params.departDate}T${String(departHour).padStart(2, "0")}:00:00Z`);
    const arriveTime = new Date(departTime.getTime() + durationMinutes * 60000);

    return {
      id: `jet-mock-${i}`,
      provider: "DuskvorN Charter Network",
      price,
      currency: "USD",
      source: "mock" as const,
      type: "jet" as const,
      operator,
      aircraft: aircraft.model,
      origin: params.origin,
      destination: params.destination,
      departTime: departTime.toISOString(),
      arriveTime: arriveTime.toISOString(),
      durationMinutes,
      seats: aircraft.seats,
      emptyLeg,
    };
  });

  const scores = rankResults(
    raw.map((r) => ({ price: r.price, durationMinutes: r.durationMinutes, comfortScore: r.emptyLeg ? 80 : 96 }))
  );
  return raw.map((r, i) => ({ ...r, score: scores[i] }));
}

export class JetAgent {
  async execute(params: SearchParams): Promise<AgentOutput<JetResult>> {
    const hasLiveProvider = Boolean(process.env.JET_CHARTER_API_KEY && process.env.JET_CHARTER_API_URL);
    return runWithFallback(
      "JetAgent",
      hasLiveProvider,
      () => liveJetSearch(params),
      () => mockJetSearch(params)
    );
  }
}
