import { Router, Request, Response } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { PlanTier } from "@duskvorn/core";
import { getStripeClient, priceIdForTier, tierForPriceId } from "../stripe/plans";
import { HttpError } from "../middleware/errorHandler";
import { linkStripeCustomer, setUserTier, findUserIdByStripeCustomer } from "../lib/userStore";

export const billingRouter = Router();

const checkoutSchema = z.object({
  tier: z.enum(["pro", "elite"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

billingRouter.post("/checkout", async (req: Request, res: Response) => {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new HttpError(503, "Stripe is not configured on this server (missing STRIPE_SECRET_KEY).");
  }

  const { tier, successUrl, cancelUrl } = checkoutSchema.parse(req.body);
  const priceId = priceIdForTier(tier as PlanTier);
  if (!priceId) {
    throw new HttpError(500, `No Stripe price configured for tier "${tier}". Set STRIPE_PRICE_ID_${tier.toUpperCase()}.`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: req.user.userId,
    customer_email: undefined,
    metadata: { userId: req.user.userId, tier },
  });

  res.json({ url: session.url });
});

billingRouter.get("/me", (req: Request, res: Response) => {
  res.json({
    userId: req.user.userId,
    tier: req.user.tier,
    searchesToday: req.user.searchesToday,
  });
});

/**
 * Mounted separately in index.ts with express.raw() (NOT express.json()) —
 * Stripe signature verification requires the untouched request body.
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    res.status(503).json({ error: "Stripe webhook not configured" });
    return;
  }

  const signature = req.headers["stripe-signature"];
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature as string, webhookSecret);
  } catch (err) {
    res.status(400).json({ error: `Webhook signature verification failed: ${(err as Error).message}` });
    return;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.userId;
      const tier = (session.metadata?.tier as PlanTier) ?? "pro";
      if (userId) {
        setUserTier(userId, tier, session.customer as string, session.subscription as string);
        if (session.customer) linkStripeCustomer(userId, session.customer as string);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = findUserIdByStripeCustomer(sub.customer as string);
      const priceId = sub.items.data[0]?.price?.id;
      if (userId) setUserTier(userId, tierForPriceId(priceId));
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = findUserIdByStripeCustomer(sub.customer as string);
      if (userId) setUserTier(userId, "free");
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
}
