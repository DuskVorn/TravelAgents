import { useEffect, useState } from "react";
import Header from "../components/Header";
import { fetchPlans, PlanInfo, startCheckout } from "../lib/api";

const TIER_BLURB: Record<string, string> = {
  free: "Explore the platform with a handful of searches a day.",
  pro: "For frequent travelers who want deeper search volume.",
  elite: "Full access, including private jet charters and priority ranking.",
};

export default function Pricing() {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans()
      .then(setPlans)
      .catch(() => setError("Could not load plans — is the API running?"));
  }, []);

  async function handleSubscribe(tier: "pro" | "elite") {
    setLoadingTier(tier);
    setError(null);
    try {
      const { url } = await startCheckout(tier);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: 56, paddingBottom: 100 }}>
        <section style={{ textAlign: "center", marginBottom: 50 }}>
          <p className="eyebrow" style={{ marginBottom: 14 }}>
            Membership
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)" }}>Choose your tier</h1>
        </section>

        {error && (
          <div className="panel" style={{ padding: 16, marginBottom: 24, borderColor: "var(--danger)", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 22 }}>
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className="panel"
              style={{
                padding: 32,
                border: plan.tier === "elite" ? "1px solid var(--gold-dim)" : undefined,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <p className="eyebrow" style={{ marginBottom: 10 }}>
                {plan.label}
              </p>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", marginBottom: 6 }}>
                ${plan.priceUsd}
                <span style={{ fontSize: "0.9rem", color: "var(--text-faint)" }}>/mo</span>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: 22, minHeight: 40 }}>
                {TIER_BLURB[plan.tier]}
              </p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 26px", flex: 1, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                <li style={{ marginBottom: 10 }}>✓ {plan.searchesPerDay} searches / day</li>
                <li style={{ marginBottom: 10 }}>{plan.jetsAccess ? "✓" : "✕"} Private jet charters</li>
                <li style={{ marginBottom: 10 }}>✓ Flights, hotels &amp; car rentals</li>
              </ul>

              {plan.tier === "free" ? (
                <button className="btn btn-ghost" disabled>
                  Current default
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  disabled={loadingTier === plan.tier}
                  onClick={() => handleSubscribe(plan.tier as "pro" | "elite")}
                >
                  {loadingTier === plan.tier ? "Redirecting…" : `Subscribe to ${plan.label}`}
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
