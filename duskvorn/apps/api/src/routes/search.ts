import { Router, Request, Response } from "express";
import { z } from "zod";
import { OrchestratorAgent } from "@duskvorn/agents";
import { PLAN_LIMITS } from "@duskvorn/core";
import { HttpError } from "../middleware/errorHandler";
import { incrementSearchCount } from "../lib/userStore";

export const searchRouter = Router();
const orchestrator = new OrchestratorAgent();

const searchSchema = z.object({
  origin: z.string().min(3).max(8),
  destination: z.string().min(3).max(8),
  departDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "departDate must be YYYY-MM-DD"),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "returnDate must be YYYY-MM-DD")
    .optional(),
  travelers: z.number().int().min(1).max(20).default(1),
  cabinClass: z.enum(["economy", "premium", "business", "first"]).optional(),
  includeJets: z.boolean().optional(),
});

searchRouter.post("/", async (req: Request, res: Response) => {
  const params = searchSchema.parse(req.body);
  const { tier, searchesToday, userId } = req.user;
  const limit = PLAN_LIMITS[tier];

  if (searchesToday >= limit.searchesPerDay) {
    throw new HttpError(
      402,
      `Daily search limit reached for the ${tier} plan (${limit.searchesPerDay}/day). Upgrade to search more.`
    );
  }

  const result = await orchestrator.search(params, tier);
  incrementSearchCount(userId);

  res.json(result);
});
