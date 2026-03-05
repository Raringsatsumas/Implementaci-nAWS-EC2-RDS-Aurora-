import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "/api";

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function Alert({ msg, onClose }) {
  if (!msg) return null;
  const bg =
    msg.type === "success"
      ? "#0f2f1a"
      : msg.type === "error"
      ? "#2f0f12"
      : "#1a1a1a";

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        marginBottom: 14,
        border: "1px solid #333",
        background: bg,
      }}
    >
      <b style={{ textTransform: "capitalize" }}>{msg.type}:</b> {msg.text}
      <button onClick={onClose} style={{ float: "right" }}>
        x
      </button>
    </div>
  );
}

export default function App() {
  // auth state
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [username, setUsername] = useState(localStorage.getItem("username") || "");

  // alert
  const [msg, setMsg] = useState(null);

  // login/register form
  const [u, setU] = useState("admin");
  const [email, setEmail] = useState("admin@chinook.local");
  const [p, setP] = useState("Admin123!");

  // tracks search (public)
  const [query, setQuery] = useState("Love");
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  // user purchases
  const [qty, setQty] = useState(1);
  const [purchases, setPurchases] = useState([]);

  // admin: artists/genres for select
  const [artists, setArtists] = useState([]);
  const [genres, setGenres] = useState([]);

  // admin: create track form
  const [createName, setCreateName] = useState("");
  const [createPrice, setCreatePrice] = useState("0.99");
  const [createArtistId, setCreateArtistId] = useState("");
  const [createGenreId, setCreateGenreId] = useState("");

  // admin: inline edit/delete on each row
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  // -------------------------
  // AUTH
  // -------------------------
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

      setMsg({
        type: "success",
        text: `Login OK como ${data.username} (${data.role})`,
      });
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

  // -------------------------
  // CATALOG (public)
  // -------------------------
  async function loadTracks() {
    setLoadingTracks(true);
    setMsg(null);
    try {
      const r = await fetch(`${API}/v1/tracks?query=${encodeURIComponent(query)}`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);
      setTracks(data.items || []);
      if ((data.items || []).length === 0) {
        setMsg({ type: "info", text: "Sin resultados." });
      }
    } catch (e) {
      setMsg({ type: "error", text: `Buscar falló: ${e.message}` });
    } finally {
      setLoadingTracks(false);
    }
  }

  // -------------------------
  // USER PURCHASES
  // -------------------------
  async function loadPurchases() {
    if (!token) return;
    try {
      const r = await fetch(`${API}/v1/purchases`, {
        headers: { ...authHeaders(token) },
      });
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

      setMsg({
        type: "success",
        text: `Compra OK ✅ Total: ${data.total} | Invoice: ${data.invoice_id ?? "N/A"}`,
      });
      await loadPurchases();
    } catch (e) {
      setMsg({ type: "error", text: `Compra falló: ${e.message}` });
    }
  }

  // -------------------------
  // ADMIN: load artists/genres
  // -------------------------
  async function loadArtists() {
    const r = await fetch(`${API}/v1/artists?query=`);
    const data = await r.json().catch(() => ({}));
    setArtists(data.items || []);
  }

  async function loadGenres() {
    const r = await fetch(`${API}/v1/genres?query=`);
    const data = await r.json().catch(() => ({}));
    setGenres(data.items || []);
  }

  // -------------------------
  // ADMIN: create / edit / delete
  // -------------------------
  async function adminCreateTrack() {
    setMsg(null);
    try {
      if (!createName || !createArtistId || !createPrice) {
        throw new Error("Faltan campos: nombre, artista, precio");
      }

      const r = await fetch(`${API}/v1/admin/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          name: createName,
          unit_price: Number(createPrice),
          artist_id: Number(createArtistId),
          genre_id: createGenreId ? Number(createGenreId) : 0,
        }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);

      setMsg({ type: "success", text: `Canción creada ✅ ID=${data.track_id}` });
      setCreateName("");
      setCreatePrice("0.99");
      setCreateArtistId("");
      setCreateGenreId("");
      await loadTracks();
    } catch (e) {
      setMsg({ type: "error", text: `Crear falló: ${e.message}` });
    }
  }

  async function adminSaveEdit(trackId) {
    setMsg(null);
    try {
      const payload = {
        name: editName,
        unit_price: Number(editPrice),
      };

      const r = await fetch(`${API}/v1/admin/tracks/${trackId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);

      setMsg({ type: "success", text: "Canción actualizada ✅" });
      setEditingId(null);
      await loadTracks();
    } catch (e) {
      setMsg({ type: "error", text: `Editar falló: ${e.message}` });
    }
  }

  async function adminDeleteTrack(trackId) {
    setMsg(null);
    try {
      const r = await fetch(`${API}/v1/admin/tracks/${trackId}`, {
        method: "DELETE",
        headers: { ...authHeaders(token) },
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);

      setMsg({ type: "success", text: "Canción eliminada ✅" });
      await loadTracks();
    } catch (e) {
      setMsg({ type: "error", text: `Eliminar falló: ${e.message}` });
    }
  }

  // -------------------------
  // effects
  // -------------------------
  useEffect(() => {
    loadTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (token) loadPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (token && role === "admin") {
      loadArtists().catch(() => {});
      loadGenres().catch(() => {});
    }
  }, [token, role]);

  // helper: show proper name keys
  function artistLabel(a) {
    return a.ArtistName ?? a.Name ?? `Artist ${a.ArtistId}`;
  }
  function genreLabel(g) {
    return g.GenreName ?? g.Name ?? `Genre ${g.GenreId}`;
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 6 }}>Chinook Store</h1>
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
          <div>
            Sesión: <b>{username}</b> · Rol: <b>{role}</b>
          </div>
          <button onClick={logout}>Logout</button>
        </div>
      )}

      {/* ADMIN CREATE FORM */}
      {token && role === "admin" && (
        <div style={{ border: "1px solid #333", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <h3>Admin: Crear canción</h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              placeholder="Nombre canción"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              style={{ padding: 10, flex: 2 }}
            />

            <input
              type="number"
              step="0.01"
              placeholder="Precio"
              value={createPrice}
              onChange={(e) => setCreatePrice(e.target.value)}
              style={{ padding: 10, width: 140 }}
            />

            <select
              value={createArtistId}
              onChange={(e) => setCreateArtistId(e.target.value)}
              style={{ padding: 10, flex: 2 }}
            >
              <option value="">-- Selecciona artista --</option>
              {artists.map((a) => (
                <option key={a.ArtistId} value={a.ArtistId}>
                  {artistLabel(a)}
                </option>
              ))}
            </select>

            <select
              value={createGenreId}
              onChange={(e) => setCreateGenreId(e.target.value)}
              style={{ padding: 10, flex: 1 }}
            >
              <option value="">-- Género (opcional) --</option>
              {genres.map((g) => (
                <option key={g.GenreId} value={g.GenreId}>
                  {genreLabel(g)}
                </option>
              ))}
            </select>

            <button onClick={adminCreateTrack} style={{ padding: "10px 14px" }}>
              Crear
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
            Nota: El Album se decide automáticamente según el artista.
          </div>
        </div>
      )}

      {/* SEARCH */}
      <div style={{ border: "1px solid #333", borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <h3>Búsqueda (pública)</h3>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, padding: 10 }} />
          <button onClick={loadTracks} style={{ padding: "8px 12px" }}>
            {loadingTracks ? "Cargando..." : "Buscar"}
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
              <th style={{ padding: 10 }}>Track</th>
              <th style={{ padding: 10 }}>Artist</th>
              <th style={{ padding: 10 }}>Genre</th>
              <th style={{ padding: 10 }}>Price</th>
              <th style={{ padding: 10, textAlign: "right" }}>Acciones</th>
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
                  {/* ADMIN actions per row */}
                  {token && role === "admin" && (
                    <>
                      {editingId === t.TrackId ? (
                        <>
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{ width: 220, padding: 6, marginRight: 8 }}
                            placeholder="Nuevo nombre"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            style={{ width: 110, padding: 6, marginRight: 8 }}
                            placeholder="Precio"
                          />
                          <button onClick={() => adminSaveEdit(t.TrackId)}>Guardar</button>
                          <button onClick={() => setEditingId(null)} style={{ marginLeft: 6 }}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(t.TrackId);
                              setEditName(t.TrackName);
                              setEditPrice(String(t.UnitPrice));
                            }}
                          >
                            Editar
                          </button>
                          <button onClick={() => adminDeleteTrack(t.TrackId)} style={{ marginLeft: 8 }}>
                            Eliminar
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {/* USER actions per row */}
                  {token && role === "user" && (
                    <>
                      <input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        style={{ width: 70, padding: 6, marginRight: 8 }}
                      />
                      <button onClick={() => buy(t.TrackId)}>Comprar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* USER PURCHASES */}
      {token && role === "user" && (
        <div style={{ border: "1px solid #333", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <h3>Mis compras</h3>
          <button onClick={loadPurchases} style={{ marginBottom: 10 }}>
            Refrescar
          </button>
          {purchases.length === 0 ? (
            <div style={{ opacity: 0.7 }}>Aún no tienes compras.</div>
          ) : (
            <ul>
              {purchases.map((p) => (
                <li key={p.id}>
                  <b>{p.TrackName}</b> — {p.ArtistName} · {p.GenreName} · qty {p.quantity} · total {p.total}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
