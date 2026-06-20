// Composite ranking: every result type is scored 0-100 on the same three axes
// (price, time, comfort) so the orchestrator can merge and sort heterogeneous
// result types fairly. Each axis is normalized against the result set it came
// from, then combined with a weighted average.

export interface RankWeights {
  price: number;
  time: number;
  comfort: number;
}

export const DEFAULT_WEIGHTS: RankWeights = { price: 0.45, time: 0.3, comfort: 0.25 };

/** Normalizes a value to 0-100 where lower raw values score higher (e.g. price, duration). */
function normalizeInverse(value: number, min: number, max: number): number {
  if (max === min) return 100;
  const clamped = Math.min(Math.max(value, min), max);
  return 100 - ((clamped - min) / (max - min)) * 100;
}

export interface Rankable {
  price: number;
  durationMinutes?: number; // flights/jets/cars use minutes-equivalent or 0 for stays
  comfortScore: number; // 0-100, supplied by caller (cabin class, rating, stops, etc.)
}

/**
 * Scores a list of rankable items against each other on price/time/comfort,
 * mutating nothing — returns parallel array of 0-100 composite scores.
 */
export function rankResults<T extends Rankable>(
  items: T[],
  weights: RankWeights = DEFAULT_WEIGHTS
): number[] {
  if (items.length === 0) return [];

  const prices = items.map((i) => i.price);
  const durations = items.map((i) => i.durationMinutes ?? 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  return items.map((item) => {
    const priceScore = normalizeInverse(item.price, minPrice, maxPrice);
    const timeScore = normalizeInverse(item.durationMinutes ?? 0, minDuration, maxDuration);
    const comfortScore = Math.min(Math.max(item.comfortScore, 0), 100);

    const composite =
      priceScore * weights.price + timeScore * weights.time + comfortScore * weights.comfort;

    return Math.round(composite * 10) / 10;
  });
}

/** Comfort heuristic for flights/jets: fewer stops and higher cabin class score higher. */
export function flightComfortScore(stops: number, cabinClass: string): number {
  const stopPenalty = Math.min(stops, 3) * 18;
  const cabinBonus: Record<string, number> = {
    economy: 0,
    premium: 15,
    business: 30,
    first: 45,
  };
  return Math.max(0, Math.min(100, 70 - stopPenalty + (cabinBonus[cabinClass] ?? 0)));
}

/** Comfort heuristic for hotels: star rating + refundability. */
export function hotelComfortScore(rating: number, refundable: boolean): number {
  return Math.min(100, rating * 18 + (refundable ? 10 : 0));
}

/** Comfort heuristic for cars: category tier + transmission convenience. */
export function carComfortScore(category: string, transmission: string): number {
  const categoryScore: Record<string, number> = {
    economy: 30,
    compact: 40,
    suv: 65,
    luxury: 90,
  };
  return Math.min(100, (categoryScore[category.toLowerCase()] ?? 50) + (transmission === "automatic" ? 10 : 0));
}
