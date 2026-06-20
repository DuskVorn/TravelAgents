import { useState, ReactNode } from "react";
import { CarResult, FlightResult, HotelResult, JetResult, OrchestratedSearchResponse } from "../lib/api";

type TabKey = "flights" | "jets" | "hotels" | "cars";

interface ResultsTabsProps {
  data: OrchestratedSearchResponse;
  jetsLocked: boolean;
  onUpgradeClick: () => void;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function SourceBadge({ source }: { source: "live" | "mock" }) {
  return (
    <span
      style={{
        fontSize: "0.62rem",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: source === "live" ? "var(--success)" : "var(--text-faint)",
        border: `1px solid ${source === "live" ? "var(--success)" : "var(--hairline)"}`,
        borderRadius: 10,
        padding: "2px 7px",
      }}
    >
      {source === "live" ? "Live fare" : "Estimated"}
    </span>
  );
}

function ResultRow({ children, score }: { children: ReactNode; score: number }) {
  return (
    <div
      className="panel"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        gap: 16,
      }}
    >
      <div style={{ flex: 1 }}>{children}</div>
      <div style={{ textAlign: "right", minWidth: 64 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--gold)" }}>{score}</div>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "var(--text-faint)", textTransform: "uppercase" }}>match score</div>
      </div>
    </div>
  );
}

function FlightCard({ f }: { f: FlightResult }) {
  return (
    <ResultRow score={f.score}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <strong style={{ fontSize: "0.95rem" }}>{f.airline}</strong>
        <span style={{ color: "var(--text-faint)", fontSize: "0.8rem" }}>{f.flightNumber}</span>
        <SourceBadge source={f.source} />
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
        {fmtTime(f.departTime)} {f.origin} → {fmtTime(f.arriveTime)} {f.destination} · {fmtDuration(f.durationMinutes)} ·{" "}
        {f.stops === 0 ? "Nonstop" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`} · {f.cabinClass}
      </div>
      <div style={{ marginTop: 8, fontFamily: "var(--font-display)", fontSize: "1.4rem" }}>
        ${f.price.toLocaleString()}
      </div>
    </ResultRow>
  );
}

function JetCard({ j }: { j: JetResult }) {
  return (
    <ResultRow score={j.score}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <strong style={{ fontSize: "0.95rem" }}>{j.operator}</strong>
        <span style={{ color: "var(--text-faint)", fontSize: "0.8rem" }}>{j.aircraft}</span>
        {j.emptyLeg && (
          <span className="eyebrow" style={{ fontSize: "0.6rem" }}>
            Empty leg
          </span>
        )}
        <SourceBadge source={j.source} />
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
        {fmtTime(j.departTime)} {j.origin} → {fmtTime(j.arriveTime)} {j.destination} · {fmtDuration(j.durationMinutes)} · {j.seats} seats
      </div>
      <div style={{ marginTop: 8, fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--gold)" }}>
        ${j.price.toLocaleString()}
      </div>
    </ResultRow>
  );
}

function HotelCard({ h }: { h: HotelResult }) {
  return (
    <ResultRow score={h.score}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <strong style={{ fontSize: "0.95rem" }}>{h.name}</strong>
        <span style={{ color: "var(--gold)", fontSize: "0.8rem" }}>{"★".repeat(Math.round(h.rating))}</span>
        <SourceBadge source={h.source} />
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
        {h.city} · ${h.pricePerNight}/night × {h.nights} night{h.nights > 1 ? "s" : ""} · {h.refundable ? "Refundable" : "Non-refundable"}
        {h.amenities.length ? ` · ${h.amenities.slice(0, 3).join(", ")}` : ""}
      </div>
      <div style={{ marginTop: 8, fontFamily: "var(--font-display)", fontSize: "1.4rem" }}>
        ${h.price.toLocaleString()}
      </div>
    </ResultRow>
  );
}

function CarCard({ c }: { c: CarResult }) {
  return (
    <ResultRow score={c.score}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <strong style={{ fontSize: "0.95rem" }}>{c.company}</strong>
        <span style={{ color: "var(--text-faint)", fontSize: "0.8rem", textTransform: "capitalize" }}>{c.category}</span>
        <SourceBadge source={c.source} />
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
        {c.city} · ${c.pricePerDay}/day × {c.days} day{c.days > 1 ? "s" : ""} · {c.transmission} · {c.seats} seats
      </div>
      <div style={{ marginTop: 8, fontFamily: "var(--font-display)", fontSize: "1.4rem" }}>
        ${c.price.toLocaleString()}
      </div>
    </ResultRow>
  );
}

export default function ResultsTabs({ data, jetsLocked, onUpgradeClick }: ResultsTabsProps) {
  const [tab, setTab] = useState<TabKey>("flights");

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "flights", label: "Flights", count: data.flights.length },
    { key: "jets", label: "Private Jets", count: data.jets.length },
    { key: "hotels", label: "Hotels", count: data.hotels.length },
    { key: "cars", label: "Cars", count: data.cars.length },
  ];

  return (
    <div>
      <div className="panel" style={{ padding: "16px 20px", marginBottom: 18, fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>
        {data.summary}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, borderBottom: "1px solid var(--hairline)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "10px 16px",
              fontFamily: "var(--font-body)",
              fontSize: "0.85rem",
              fontWeight: 600,
              letterSpacing: "0.03em",
              color: tab === t.key ? "var(--gold)" : "var(--text-muted)",
              borderBottom: tab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === "jets" && jetsLocked ? (
        <div className="panel" style={{ padding: 32, textAlign: "center" }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>
            Elite feature
          </p>
          <h3 style={{ fontSize: "1.3rem", marginBottom: 10 }}>Private jet charters are reserved for Elite members</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: 18 }}>
            Upgrade to unlock empty-leg deals and full-cabin charters across our partner network.
          </p>
          <button className="btn btn-primary" onClick={onUpgradeClick}>
            Upgrade to Elite
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tab === "flights" && data.flights.map((f) => <FlightCard key={f.id} f={f} />)}
          {tab === "jets" && data.jets.map((j) => <JetCard key={j.id} j={j} />)}
          {tab === "hotels" && data.hotels.map((h) => <HotelCard key={h.id} h={h} />)}
          {tab === "cars" && data.cars.map((c) => <CarCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}
