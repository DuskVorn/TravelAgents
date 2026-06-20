import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Header from "../components/Header";
import SearchForm from "../components/SearchForm";
import ResultsTabs from "../components/ResultsTabs";
import PaywallModal from "../components/PaywallModal";
import { fetchMe, OrchestratedSearchResponse, PaywallError, runSearch, SearchParams } from "../lib/api";

export default function Dashboard() {
  const router = useRouter();
  const [tier, setTier] = useState<"free" | "pro" | "elite">("free");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OrchestratedSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paywallMessage, setPaywallMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMe()
      .then((me) => setTier(me.tier))
      .catch(() => {
        /* API not reachable yet — default to free tier UI */
      });
  }, []);

  async function handleSearch(params: SearchParams) {
    setLoading(true);
    setError(null);
    try {
      const data = await runSearch(params);
      setResults(data);
    } catch (err) {
      if (err instanceof PaywallError) {
        setPaywallMessage(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Search failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header tier={tier} />

      <main className="container" style={{ paddingTop: 56, paddingBottom: 100 }}>
        <section style={{ textAlign: "center", marginBottom: 44 }}>
          <p className="eyebrow" style={{ marginBottom: 14 }}>
            Flights · Private Jets · Hotels · Cars
          </p>
          <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.4rem)", marginBottom: 16 }}>
            Journeys reimagined, <span style={{ color: "var(--gold)" }}>experiences elevated</span>.
          </h1>
          <p style={{ color: "var(--text-muted)", maxWidth: 560, margin: "0 auto" }}>
            One search, four agents working in parallel — flights, charters, stays, and cars ranked together by
            price, time, and comfort.
          </p>
          <div className="gold-divider" style={{ margin: "36px auto 0", maxWidth: 280 }} />
        </section>

        <SearchForm onSearch={handleSearch} loading={loading} jetsAvailable={tier === "elite"} />

        {error && (
          <div className="panel" style={{ padding: 16, marginTop: 20, borderColor: "var(--danger)", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        {results && (
          <div style={{ marginTop: 36 }}>
            <ResultsTabs data={results} jetsLocked={results.meta.jetsLocked} onUpgradeClick={() => router.push("/pricing")} />
          </div>
        )}
      </main>

      {paywallMessage && (
        <PaywallModal
          message={paywallMessage}
          onClose={() => setPaywallMessage(null)}
          onUpgrade={() => router.push("/pricing")}
        />
      )}
    </>
  );
}
