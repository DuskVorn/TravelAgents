import { OrchestratedSearchResponse, PlanTier, SearchParams } from "@duskvorn/core";
import { FlightAgent } from "./FlightAgent";
import { JetAgent } from "./JetAgent";
import { HotelAgent } from "./HotelAgent";
import { CarAgent } from "./CarAgent";

const flightAgent = new FlightAgent();
const jetAgent = new JetAgent();
const hotelAgent = new HotelAgent();
const carAgent = new CarAgent();

async function generateSummary(
  params: SearchParams,
  cheapestFlightPrice: number | null,
  bestHotelName: string | null,
  jetsIncluded: boolean
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Deterministic rule-based fallback — no LLM call needed.
    const parts: string[] = [`Results ready for ${params.origin} → ${params.destination} on ${params.departDate}.`];
    if (cheapestFlightPrice !== null) parts.push(`Flights start from $${cheapestFlightPrice}.`);
    if (bestHotelName) parts.push(`Top-ranked stay: ${bestHotelName}.`);
    if (jetsIncluded) parts.push(`Private jet options included for this search.`);
    return parts.join(" ");
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You write a single concise, upbeat sentence summarizing a travel search for a luxury travel dashboard. No markdown.",
          },
          {
            role: "user",
            content: `Trip: ${params.origin} to ${params.destination}, departing ${params.departDate}${params.returnDate ? `, returning ${params.returnDate}` : ""}, ${params.travelers} traveler(s). Cheapest flight: $${cheapestFlightPrice ?? "n/a"}. Top hotel: ${bestHotelName ?? "n/a"}. Jets included: ${jetsIncluded}.`,
          },
        ],
        max_tokens: 80,
        temperature: 0.6,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI request failed: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? "Results ready.";
  } catch {
    return `Results ready for ${params.origin} → ${params.destination} on ${params.departDate}.`;
  }
}

export class OrchestratorAgent {
  /**
   * Runs all relevant agents in parallel, merges their output, and applies
   * tier-based gating (jets are excluded entirely for non-Elite tiers rather
   * than fetched-then-hidden, to avoid wasted provider calls).
   */
  async search(params: SearchParams, tier: PlanTier): Promise<OrchestratedSearchResponse> {
    const start = Date.now();
    const jetsAllowed = tier === "elite" && Boolean(params.includeJets ?? true);

    const [flightOutput, hotelOutput, carOutput, jetOutput] = await Promise.all([
      flightAgent.execute(params),
      hotelAgent.execute(params),
      carAgent.execute(params),
      jetsAllowed ? jetAgent.execute(params) : Promise.resolve(null),
    ]);

    const warnings = [flightOutput.warning, hotelOutput.warning, carOutput.warning, jetOutput?.warning].filter(
      (w): w is string => Boolean(w)
    );

    const flights = [...flightOutput.results].sort((a, b) => b.score - a.score);
    const hotels = [...hotelOutput.results].sort((a, b) => b.score - a.score);
    const cars = [...carOutput.results].sort((a, b) => b.score - a.score);
    const jets = jetOutput ? [...jetOutput.results].sort((a, b) => b.score - a.score) : [];

    const cheapestFlightPrice = flights.length ? Math.min(...flights.map((f) => f.price)) : null;
    const bestHotelName = hotels[0]?.name ?? null;

    const summary = await generateSummary(params, cheapestFlightPrice, bestHotelName, jets.length > 0);

    return {
      query: params,
      flights,
      jets,
      hotels,
      cars,
      summary,
      meta: {
        tookMs: Date.now() - start,
        tier,
        jetsLocked: tier !== "elite",
        warnings,
      },
    };
  }
}
