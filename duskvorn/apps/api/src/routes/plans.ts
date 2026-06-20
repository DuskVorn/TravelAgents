import { Router, Request, Response } from "express";
import { PLAN_LIMITS, PLAN_PRICING, PlanTier } from "@duskvorn/core";

export const plansRouter = Router();

plansRouter.get("/", (_req: Request, res: Response) => {
  const tiers: PlanTier[] = ["free", "pro", "elite"];
  res.json(
    tiers.map((tier) => ({
      tier,
      ...PLAN_PRICING[tier],
      ...PLAN_LIMITS[tier],
    }))
  );
});
