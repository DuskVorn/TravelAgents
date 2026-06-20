import Stripe from "stripe";
import { PlanTier } from "@duskvorn/core";

let stripeClient: Stripe | null = null;

/** Returns a Stripe client, or null if STRIPE_SECRET_KEY isn't configured. */
export function getStripeClient(): Stripe | null {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  stripeClient = new Stripe(key);
  return stripeClient;
}

export function priceIdForTier(tier: PlanTier): string | undefined {
  if (tier === "pro") return process.env.STRIPE_PRICE_ID_PRO;
  if (tier === "elite") return process.env.STRIPE_PRICE_ID_ELITE;
  return undefined;
}

export function tierForPriceId(priceId: string | undefined | null): PlanTier {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ID_ELITE) return "elite";
  return "free";
}
