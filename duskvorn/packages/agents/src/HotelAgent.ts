import { AgentOutput, HotelResult, SearchParams, hotelComfortScore, rankResults, seedFromString, mulberry32, rangeInt, pick } from "@duskvorn/core";
import { runWithFallback } from "./BaseAgent";

const HOTEL_NAMES = [
  "The Carrow Hotel",
  "Meridian Grand",
  "Hotel Lucerne",
  "The Vantage Collection",
  "Ardent House",
  "Castellane Residences",
  "The Northgate Hotel",
];
const AMENITY_POOL = ["Spa", "Rooftop Pool", "Free Breakfast", "Gym", "Airport Shuttle", "Business Center", "Pet Friendly"];

function nightsBetween(depart: string, ret?: string): number {
  if (!ret) return 1;
  const diff = (new Date(ret).getTime() - new Date(depart).getTime()) / 86400000;
  return Math.max(1, Math.round(diff));
}

async function liveHotelSearch(params: SearchParams): Promise<HotelResult[]> {
  const res = await fetch("https://distribution-xml.booking.com/json/bookings.getHotels", {
    method: "GET",
    headers: { Authorization: `Bearer ${process.env.BOOKING_API_KEY}` },
  });
  if (!res.ok) throw new Error(`booking provider failed: ${res.status}`);
  const data = await res.json();
  const nights = nightsBetween(params.departDate, params.returnDate);
  const hotels = (data.hotels ?? data.result ?? []) as any[];

  const raw = hotels.map((h, idx) => {
    const pricePerNight = h.price_per_night ?? h.min_total_price ?? 0;
    return {
      id: `hotel-live-${h.hotel_id ?? idx}`,
      provider: "Booking Partner API",
      price: Math.round(pricePerNight * nights),
      currency: h.currency ?? "USD",
      source: "live" as const,
      type: "hotel" as const,
      name: h.name,
      city: params.destination,
      rating: h.review_score ? h.review_score / 2 : 4,
      pricePerNight,
      nights,
      amenities: h.amenities ?? [],
      refundable: Boolean(h.is_free_cancellable),
    };
  });

  const scores = rankResults(
    raw.map((r) => ({ price: r.price, durationMinutes: 0, comfortScore: hotelComfortScore(r.rating, r.refundable) }))
  );
  return raw.map((r, i) => ({ ...r, score: scores[i] }));
}

function mockHotelSearch(params: SearchParams): HotelResult[] {
  const rand = mulberry32(seedFromString(`hotel:${params.destination}:${params.departDate}`));
  const nights = nightsBetween(params.departDate, params.returnDate);
  const count = rangeInt(rand, 5, 8);

  const raw = Array.from({ length: count }, (_, i) => {
    const rating = Math.round((rangeInt(rand, 30, 50) / 10) * 10) / 10; // 3.0-5.0
    const pricePerNight = rangeInt(rand, 90, 850);
    const refundable = rand() < 0.6;
    const amenityCount = rangeInt(rand, 2, 5);
    const amenities = Array.from(new Set(Array.from({ length: amenityCount }, () => pick(rand, AMENITY_POOL))));

    return {
      id: `hotel-mock-${i}`,
      provider: "DuskvorN Stays",
      price: pricePerNight * nights,
      currency: "USD",
      source: "mock" as const,
      type: "hotel" as const,
      name: `${pick(rand, HOTEL_NAMES)} ${params.destination}`,
      city: params.destination,
      rating,
      pricePerNight,
      nights,
      amenities,
      refundable,
    };
  });

  const scores = rankResults(
    raw.map((r) => ({ price: r.price, durationMinutes: 0, comfortScore: hotelComfortScore(r.rating, r.refundable) }))
  );
  return raw.map((r, i) => ({ ...r, score: scores[i] }));
}

export class HotelAgent {
  async execute(params: SearchParams): Promise<AgentOutput<HotelResult>> {
    const hasLiveProvider = Boolean(process.env.BOOKING_API_KEY);
    return runWithFallback(
      "HotelAgent",
      hasLiveProvider,
      () => liveHotelSearch(params),
      () => mockHotelSearch(params)
    );
  }
}
