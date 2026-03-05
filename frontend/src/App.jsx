import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "/api";

function Alert({ msg, onClose }) {
  if (!msg) return null;
  const bg = msg.type === "success" ? "#0f2f1a" : msg.type === "error" ? "#2f0f12" : "#1a1a1a";
  return (
    <div style={{ padding: 12, borderRadius: 10, marginBottom: 14, border: "1px solid #333", background: bg }}>
      <b style={{ textTransform: "capitalize" }}>{msg.type}:</b> {msg.text}
      <button onClick={onClose} style={{ float: "right" }}>x</button>
    </div>
  );
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function App() {
  // auth state
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [username, setUsername] = useState(localStorage.getItem("username") || "");

  // alerts
  const [msg, setMsg] = useState(null);

  // login/register forms
  const [u, setU] = useState("admin");
  const [p, setP] = useState("Admin123!");
  const [email, setEmail] = useState("admin@chinook.local");

  // search
  const [query, setQuery] = useState("Love");
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  // purchases
  const [purchases, setPurchases] = useState([]);
  const [qty, setQty] = useState(1);

  // admin create/update/delete
  const [newTrack, setNewTrack] = useState({ name: "", album_id: 1, media_type_id: 1, milliseconds: 200000, unit_price: 0.99 });
  const [editTrackId, setEditTrackId] = useState("");
  const [editPayload, setEditPayload] = useState({ name: "", unit_price: "", milliseconds: "" });
  const [deleteTrackId, setDeleteTrackId] = useState("");

  async function doRegister() {
    setMsg(null);
    try {
      const r = await fetch(`${API}/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, email, password: p }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);
      setMsg({ type: "success", text: "Registro OK. Ahora haz login." });
    } catch (e) {
      setMsg({ type: "error", text: `Registro falló: ${e.message}` });
    }
  }

  async function doLogin() {
    setMsg(null);
    try {
      const body = new URLSearchParams();
      body.set("username", u);
      body.set("password", p);

      const r = await fetch(`${API}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);

      setToken(data.access_token);
      setRole(data.role);
      setUsername(data.username);

      setMsg({ type: "success", text: `Login OK como ${data.username} (${data.role})` });
    } catch (e) {
      setMsg({ type: "error", text: `Login falló: ${e.message}` });
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    setToken("");
    setRole("");
    setUsername("");
    setPurchases([]);
    setMsg({ type: "info", text: "Sesión cerrada." });
  }

  async function loadTracks() {
    setLoadingTracks(true);
    setMsg(null);
    try {
      const r = await fetch(`${API}/v1/tracks?query=${encodeURIComponent(query)}`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);
      setTracks(data.items || []);
      if ((data.items || []).length === 0) setMsg({ type: "info", text: "Sin resultados." });
    } catch (e) {
      setMsg({ type: "error", text: `Buscar falló: ${e.message}` });
    } finally {
      setLoadingTracks(false);
    }
  }

  async function loadPurchases() {
    if (!token) return;
    try {
      const r = await fetch(`${API}/v1/purchases`, { headers: { ...authHeaders(token) } });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);
      setPurchases(data.items || []);
    } catch (e) {
      setMsg({ type: "error", text: `Cargar compras falló: ${e.message}` });
    }
  }

  async function buy(trackId) {
    setMsg(null);
    try {
      const r = await fetch(`${API}/v1/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ track_id: trackId, quantity: Number(qty) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);
      setMsg({ type: "success", text: `Compra OK ✅ Total: ${data.total} | Invoice: ${data.invoice_id ?? "N/A"}` });
      await loadPurchases(); // refresca lista de comprados
    } catch (e) {
      setMsg({ type: "error", text: `Compra falló: ${e.message}` });
    }
  }

  async function adminCreate() {
    setMsg(null);
    try {
      const r = await fetch(`${API}/v1/admin/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          name: newTrack.name,
          album_id: Number(newTrack.album_id),
          media_type_id: Number(newTrack.media_type_id),
          milliseconds: Number(newTrack.milliseconds),
          unit_price: Number(newTrack.unit_price),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);
      setMsg({ type: "success", text: `Track creado ✅ ID: ${data.track_id}` });
    } catch (e) {
      setMsg({ type: "error", text: `Crear track falló: ${e.message}` });
    }
  }

  async function adminUpdate() {
    setMsg(null);
    try {
      const payload = {};
      if (editPayload.name) payload.name = editPayload.name;
      if (editPayload.unit_price !== "") payload.unit_price = Number(editPayload.unit_price);
      if (editPayload.milliseconds !== "") payload.milliseconds = Number(editPayload.milliseconds);

      const r = await fetch(`${API}/v1/admin/tracks/${encodeURIComponent(editTrackId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);
      setMsg({ type: "success", text: "Track actualizado ✅" });
    } catch (e) {
      setMsg({ type: "error", text: `Actualizar track falló: ${e.message}` });
    }
  }

  async function adminDelete() {
    setMsg(null);
    try {
      const r = await fetch(`${API}/v1/admin/tracks/${encodeURIComponent(deleteTrackId)}`, {
        method: "DELETE",
        headers: { ...authHeaders(token) },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);
      setMsg({ type: "success", text: "Track eliminado ✅" });
    } catch (e) {
      setMsg({ type: "error", text: `Eliminar track falló: ${e.message}` });
    }
  }

  useEffect(() => { loadTracks(); }, []);
  useEffect(() => { if (token) loadPurchases(); }, [token]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1>Chinook Store</h1>
      <div style={{ opacity: 0.75, marginBottom: 12 }}>
        Auth + Roles (admin/user) · Front → /api → Back → RDS
      </div>

      <Alert msg={msg} onClose={() => setMsg(null)} />

      {!token ? (
        <div style={{ border: "1px solid #333", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <h3>Login / Register</h3>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input value={u} onChange={(e) => setU(e.target.value)} placeholder="username" style={{ flex: 1, padding: 10 }} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" style={{ flex: 1, padding: 10 }} />
            <input value={p} onChange={(e) => setP(e.target.value)} placeholder="password" type="password" style={{ flex: 1, padding: 10 }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={doLogin} style={{ padding: "8px 12px" }}>Login</button>
            <button onClick={doRegister} style={{ padding: "8px 12px" }}>Register</button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
            Default demo: admin/Admin123! · user1/User123!
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div>Sesión: <b>{username}</b> · Rol: <b>{role}</b></div>
          <button onClick={logout}>Logout</button>
        </div>
      )}

      <div style={{ border: "1px solid #333", borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <h3>Búsqueda (pública)</h3>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, padding: 10 }} />
          <button onClick={loadTracks} style={{ padding: "8px 12px" }}>{loadingTracks ? "Cargando..." : "Buscar"}</button>
        </div>
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
            {tracks.map((t) => (
              <tr key={t.TrackId} style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{t.TrackName}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{t.AlbumTitle}</div>
                </td>
                <td style={{ padding: 10 }}>{t.ArtistName}</td>
                <td style={{ padding: 10 }}>{t.GenreName || "-"}</td>
                <td style={{ padding: 10 }}>{t.UnitPrice}</td>
                <td style={{ padding: 10, textAlign: "right" }}>
                  {token && role === "user" && (
                    <>
                      <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)}
                             style={{ width: 70, padding: 6, marginRight: 8 }} />
                      <button onClick={() => buy(t.TrackId)}>Comprar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {token && role === "user" && (
        <div style={{ border: "1px solid #333", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <h3>Mis compras</h3>
          <button onClick={loadPurchases} style={{ marginBottom: 10 }}>Refrescar</button>
          <ul>
            {purchases.map((p) => (
              <li key={p.id}>
                <b>{p.TrackName}</b> — {p.ArtistName} · {p.GenreName} · qty {p.quantity} · total {p.total}
              </li>
            ))}
          </ul>
        </div>
      )}

      {token && role === "admin" && (
        <div style={{ border: "1px solid #333", borderRadius: 12, padding: 14 }}>
          <h3>Admin CRUD Tracks</h3>

          <h4>Crear</h4>
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <input placeholder="name" value={newTrack.name} onChange={(e) => setNewTrack({ ...newTrack, name: e.target.value })} style={{ padding: 10 }} />
            <input type="number" placeholder="album_id" value={newTrack.album_id} onChange={(e) => setNewTrack({ ...newTrack, album_id: e.target.value })} style={{ padding: 10 }} />
            <input type="number" placeholder="media_type_id" value={newTrack.media_type_id} onChange={(e) => setNewTrack({ ...newTrack, media_type_id: e.target.value })} style={{ padding: 10 }} />
            <input type="number" placeholder="milliseconds" value={newTrack.milliseconds} onChange={(e) => setNewTrack({ ...newTrack, milliseconds: e.target.value })} style={{ padding: 10 }} />
            <input type="number" step="0.01" placeholder="unit_price" value={newTrack.unit_price} onChange={(e) => setNewTrack({ ...newTrack, unit_price: e.target.value })} style={{ padding: 10 }} />
            <button onClick={adminCreate}>Crear</button>
          </div>

          <h4>Editar</h4>
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <input placeholder="track_id" value={editTrackId} onChange={(e) => setEditTrackId(e.target.value)} style={{ padding: 10 }} />
            <input placeholder="new name (optional)" value={editPayload.name} onChange={(e) => setEditPayload({ ...editPayload, name: e.target.value })} style={{ padding: 10 }} />
            <input placeholder="new unit_price" value={editPayload.unit_price} onChange={(e) => setEditPayload({ ...editPayload, unit_price: e.target.value })} style={{ padding: 10 }} />
            <input placeholder="new milliseconds" value={editPayload.milliseconds} onChange={(e) => setEditPayload({ ...editPayload, milliseconds: e.target.value })} style={{ padding: 10 }} />
            <button onClick={adminUpdate}>Actualizar</button>
          </div>

          <h4>Eliminar</h4>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="track_id" value={deleteTrackId} onChange={(e) => setDeleteTrackId(e.target.value)} style={{ padding: 10 }} />
            <button onClick={adminDelete}>Eliminar</button>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Nota: algunos tracks no se pueden borrar si tienen referencias (InvoiceLine, etc.).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
