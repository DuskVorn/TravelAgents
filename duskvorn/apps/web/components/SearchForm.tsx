import { FormEvent, useState } from "react";
import { SearchParams } from "../lib/api";

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
  jetsAvailable: boolean;
}

export default function SearchForm({ onSearch, loading, jetsAvailable }: SearchFormProps) {
  const [origin, setOrigin] = useState("JFK");
  const [destination, setDestination] = useState("CDG");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [travelers, setTravelers] = useState(1);
  const [cabinClass, setCabinClass] = useState<SearchParams["cabinClass"]>("business");
  const [includeJets, setIncludeJets] = useState(true);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!departDate) return;
    onSearch({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departDate,
      returnDate: returnDate || undefined,
      travelers,
      cabinClass,
      includeJets: jetsAvailable && includeJets,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="panel" style={{ padding: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 18 }}>
        <div>
          <label>Origin</label>
          <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="JFK" maxLength={4} required />
        </div>
        <div>
          <label>Destination</label>
          <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="CDG" maxLength={4} required />
        </div>
        <div>
          <label>Depart</label>
          <input type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)} required />
        </div>
        <div>
          <label>Return (optional)</label>
          <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
        </div>
        <div>
          <label>Travelers</label>
          <input
            type="number"
            min={1}
            max={20}
            value={travelers}
            onChange={(e) => setTravelers(parseInt(e.target.value || "1", 10))}
          />
        </div>
        <div>
          <label>Cabin</label>
          <select value={cabinClass} onChange={(e) => setCabinClass(e.target.value as SearchParams["cabinClass"])}>
            <option value="economy">Economy</option>
            <option value="premium">Premium</option>
            <option value="business">Business</option>
            <option value="first">First</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: 0,
            textTransform: "none",
            letterSpacing: 0,
            fontSize: "0.85rem",
            color: jetsAvailable ? "var(--text-muted)" : "var(--text-faint)",
          }}
        >
          <input
            type="checkbox"
            checked={includeJets}
            disabled={!jetsAvailable}
            onChange={(e) => setIncludeJets(e.target.checked)}
            style={{ width: "auto" }}
          />
          Include private jet charters {!jetsAvailable && "(Elite only)"}
        </label>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search journeys"}
        </button>
      </div>
    </form>
  );
}
