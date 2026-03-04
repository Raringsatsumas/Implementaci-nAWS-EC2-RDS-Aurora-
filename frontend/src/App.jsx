import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "/api";

function money(v) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
  } catch {
    return `$${v}`;
  }
}

export default function App() {
  const [tab, setTab] = useState("tracks"); // tracks | artists | genres
  const [query, setQuery] = useState("Love");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [msg, setMsg] = useState(null); // {type:'success'|'error'|'info', text:''}

  // Compra
  const [customerId, setCustomerId] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [purchasingId, setPurchasingId] = useState(null);

  const endpoint = useMemo(() => {
    if (tab === "tracks") return `${API}/v1/tracks?query=${encodeURIComponent(query)}`;
    if (tab === "artists") return `${API}/v1/artists?query=${encodeURIComponent(query)}`;
    return `${API}/v1/genres?query=${encodeURIComponent(query)}`;
  }, [tab, query]);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch(endpoint);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setItems(data.items || []);
      if ((data.items || []).length === 0) {
        setMsg({ type: "info", text: "Sin resultados. Prueba con otro término." });
      }
    } catch (e) {
      setMsg({ type: "error", text: `Error consultando API: ${e.message}` });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function purchase(trackId) {
    if (!customerId || customerId < 1) {
      setMsg({ type: "error", text: "Customer ID inválido (usa un número >= 1)." });
      return;
    }
    if (!quantity || quantity < 1) {
      setMsg({ type: "error", text: "Cantidad inválida (>= 1)." });
      return;
    }

    setPurchasingId(trackId);
    setMsg(null);

    try {
      const r = await fetch(`${API}/v1/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: Number(customerId),
          track_id: Number(trackId),
          quantity: Number(quantity),
        }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const detail = data?.detail ? ` - ${data.detail}` : "";
        throw new Error(`HTTP ${r.status}${detail}`);
      }

      setMsg({
        type: "success",
        text: `Compra exitosa ✅ Invoice ID: ${data.invoice_id} | Total: ${money(data.total)}`,
      });
    } catch (e) {
      setMsg({ type: "error", text: `No se pudo comprar: ${e.message}` });
    } finally {
      setPurchasingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 6 }}>Chinook Store</h1>
      <div style={{ opacity: 0.75, marginBottom: 16 }}>
        Frontend (EC2) → /api (Nginx proxy) → Backend (EC2) → RDS Chinook
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setTab("tracks")} style={{ padding: "8px 12px", fontWeight: tab === "tracks" ? 700 : 400 }}>
          Tracks
        </button>
        <button onClick={() => setTab("artists")} style={{ padding: "8px 12px", fontWeight: tab === "artists" ? 700 : 400 }}>
          Artists
        </button>
        <button onClick={() => setTab("genres")} style={{ padding: "8px 12px", fontWeight: tab === "genres" ? 700 : 400 }}>
          Genres
        </button>

        <div style={{ flex: 1 }} />

        <button onClick={load} style={{ padding: "8px 12px" }}>
          {loading ? "Cargando..." : "Buscar"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar (ej: Love, Rock, AC/DC)"
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #444" }}
        />

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Customer ID</label>
          <input
            type="number"
            value={customerId}
            min={1}
            onChange={(e) => setCustomerId(e.target.value)}
            style={{ width: 110, padding: 10, borderRadius: 8, border: "1px solid #444" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Qty</label>
          <input
            type="number"
            value={quantity}
            min={1}
            onChange={(e) => setQuantity(e.target.value)}
            style={{ width: 80, padding: 10, borderRadius: 8, border: "1px solid #444" }}
          />
        </div>
      </div>

      {msg && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            marginBottom: 14,
            border: "1px solid #333",
            background:
              msg.type === "success" ? "#0f2f1a" : msg.type === "error" ? "#2f0f12" : "#1a1a1a",
          }}
        >
          <b style={{ textTransform: "capitalize" }}>{msg.type}:</b> {msg.text}
        </div>
      )}

      {tab === "tracks" ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
              <th style={{ padding: 10 }}>Track</th>
              <th style={{ padding: 10 }}>Artist</th>
              <th style={{ padding: 10 }}>Genre</th>
              <th style={{ padding: 10 }}>Price</th>
              <th style={{ padding: 10 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.TrackId} style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{t.TrackName}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{t.AlbumTitle}</div>
                </td>
                <td style={{ padding: 10 }}>{t.ArtistName}</td>
                <td style={{ padding: 10 }}>{t.GenreName || "-"}</td>
                <td style={{ padding: 10 }}>{money(t.UnitPrice)}</td>
                <td style={{ padding: 10, textAlign: "right" }}>
                  <button
                    onClick={() => purchase(t.TrackId)}
                    disabled={purchasingId === t.TrackId}
                    style={{ padding: "8px 12px" }}
                  >
                    {purchasingId === t.TrackId ? "Comprando..." : "Comprar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : tab === "artists" ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
              <th style={{ padding: 10 }}>Artist</th>
              <th style={{ padding: 10 }}>Albums</th>
              <th style={{ padding: 10 }}>Tracks</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.ArtistId} style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: 10, fontWeight: 600 }}>{a.ArtistName}</td>
                <td style={{ padding: 10 }}>{a.Albums}</td>
                <td style={{ padding: 10 }}>{a.Tracks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
              <th style={{ padding: 10 }}>Genre</th>
              <th style={{ padding: 10 }}>Tracks</th>
            </tr>
          </thead>
          <tbody>
            {items.map((g) => (
              <tr key={g.GenreId} style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: 10, fontWeight: 600 }}>{g.GenreName}</td>
                <td style={{ padding: 10 }}>{g.Tracks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 18, fontSize: 12, opacity: 0.7 }}>
        Tip: prueba con <code>Love</code>, <code>Rock</code>, <code>Metal</code>, <code>AC/DC</code>.
      </div>
    </div>
  );
}
