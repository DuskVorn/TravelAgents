import Link from "next/link";

interface HeaderProps {
  tier?: "free" | "pro" | "elite";
}

export default function Header({ tier }: HeaderProps) {
  return (
    <header style={{ borderBottom: "1px solid var(--hairline)", position: "sticky", top: 0, background: "rgba(10,9,8,0.92)", backdropFilter: "blur(8px)", zIndex: 10 }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
        <Link href="/" style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", letterSpacing: "0.12em", color: "var(--text)" }}>
            DUSKVOR<span style={{ color: "var(--gold)" }}>N</span>
          </span>
          <span style={{ fontSize: "0.58rem", letterSpacing: "0.18em", color: "var(--text-faint)", textTransform: "uppercase", marginTop: 2 }}>
            Journeys reimagined
          </span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Link href="/" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Dashboard
          </Link>
          <Link href="/pricing" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Pricing
          </Link>
          {tier && (
            <span
              className="eyebrow"
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                border: "1px solid var(--gold-dim)",
                color: "var(--gold)",
              }}
            >
              {tier} plan
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
