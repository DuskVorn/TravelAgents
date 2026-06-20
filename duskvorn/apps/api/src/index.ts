import "dotenv/config";
import express from "express";
import cors from "cors";
import { identifyUser } from "./middleware/identifyUser";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { searchRouter } from "./routes/search";
import { plansRouter } from "./routes/plans";
import { billingRouter, handleStripeWebhook } from "./routes/billing";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(cors());

// Stripe webhook needs the raw, unparsed body for signature verification —
// mount it BEFORE express.json() so the JSON parser never touches it.
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

app.use(express.json());
app.use(identifyUser);

app.get("/health", (_req, res) => res.json({ status: "ok", service: "duskvorn-api" }));

app.use("/api/search", searchRouter);
app.use("/api/plans", plansRouter);
app.use("/api/billing", billingRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`DuskvorN API listening on port ${PORT}`);
});
