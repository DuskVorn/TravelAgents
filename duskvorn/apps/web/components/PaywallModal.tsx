interface PaywallModalProps {
  message: string;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function PaywallModal({ message, onClose, onUpgrade }: PaywallModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="panel"
        style={{ maxWidth: 420, padding: 36, textAlign: "center" }}
      >
        <p className="eyebrow" style={{ marginBottom: 12 }}>
          Search limit reached
        </p>
        <h3 style={{ fontSize: "1.5rem", marginBottom: 14 }}>You've hit today's limit</h3>
        <p style={{ color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Not now
          </button>
          <button className="btn btn-primary" onClick={onUpgrade}>
            View plans
          </button>
        </div>
      </div>
    </div>
  );
}
