import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "/api";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const detail =
      typeof data === "object" && data !== null
        ? data.detail || JSON.stringify(data)
        : data || `HTTP ${res.status}`;
    throw new Error(detail || `HTTP ${res.status}`);
  }

  return data;
}

async function loginRequest(username, password) {
  const body = new URLSearchParams();
  body.append("username", username || "");
  body.append("password", password || "");

  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const detail =
      typeof data === "object" && data !== null
        ? data.detail || JSON.stringify(data)
        : data || `HTTP ${res.status}`;
    throw new Error(detail || `HTTP ${res.status}`);
  }

  return data;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [username, setUsername] = useState(localStorage.getItem("username") || "");

  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [tab, setTab] = useState("tracks");

  const [trackQuery, setTrackQuery] = useState("Love");
  const [tracks, setTracks] = useState([]);

  const [artistsQuery, setArtistsQuery] = useState("");
  const [artists, setArtists] = useState([]);

  const [genresQuery, setGenresQuery] = useState("");
  const [genres, setGenres] = useState([]);

  const [purchases, setPurchases] = useState([]);

  const [createName, setCreateName] = useState("");
  const [createPrice, setCreatePrice] = useState("0.99");
  const [createArtistId, setCreateArtistId] = useState("");
  const [createGenreId, setCreateGenreId] = useState("");
  const [albumMode, setAlbumMode] = useState("existing");
  const [albumId, setAlbumId] = useState("");
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [albums, setAlbums] = useState([]);

  const [editTrackId, setEditTrackId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editGenreId, setEditGenreId] = useState("");

  const authHeaders = token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};

  const purchasedTrackIds = useMemo(() => {
    return new Set((purchases || []).map((p) => Number(p.TrackId)));
  }, [purchases]);

  function clearAlerts() {
    setMsg("");
    setErr("");
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    setToken("");
    setRole("");
    setUsername("");
    setTab("tracks");
    setPurchases([]);
    clearAlerts();
  }

  async function loadTracks(query = trackQuery) {
    try {
      const data = await apiFetch(`/v1/tracks?query=${encodeURIComponent(query || "")}`);
      setTracks(data.items || []);
    } catch (e) {
      setErr(`Buscar tracks falló: ${e.message}`);
    }
  }

  async function loadArtists(query = artistsQuery) {
    try {
      const data = await apiFetch(`/v1/stats/artists?query=${encodeURIComponent(query || "")}`);
      setArtists(data.items || []);
    } catch (e) {
      setErr(`Buscar artistas falló: ${e.message}`);
    }
  }

  async function loadGenres(query = genresQuery) {
    try {
      const data = await apiFetch(`/v1/stats/genres?query=${encodeURIComponent(query || "")}`);
      setGenres(data.items || []);
    } catch (e) {
      setErr(`Buscar géneros falló: ${e.message}`);
    }
  }

  async function loadPurchases() {
    if (!token || role !== "user") return;
    try {
      const data = await apiFetch("/v1/purchases", {
        headers: authHeaders,
      });
      setPurchases(data.items || []);
    } catch (e) {
      setErr(`Cargar compras falló: ${e.message}`);
    }
  }

  async function loadAlbumsByArtist(artistId) {
    if (!artistId) {
      setAlbums([]);
      setAlbumId("");
      return;
    }

    try {
      const data = await apiFetch(`/v1/albums?artist_id=${artistId}&query=`);
      setAlbums(data.items || []);
      setAlbumId("");
    } catch (e) {
      setErr(`Cargar álbumes falló: ${e.message}`);
      setAlbums([]);
    }
  }

  useEffect(() => {
    loadTracks(trackQuery);
    loadArtists("");
    loadGenres("");
  }, []);

  useEffect(() => {
    if (token && role === "user") {
      loadPurchases();
    }
  }, [token, role]);

  useEffect(() => {
    if (role === "admin" && albumMode === "existing" && createArtistId) {
      loadAlbumsByArtist(createArtistId);
    } else if (albumMode !== "existing") {
      setAlbums([]);
      setAlbumId("");
    }
  }, [createArtistId, albumMode, role]);

  async function handleLogin() {
    clearAlerts();
    try {
      const data = await loginRequest(authUsername, authPassword);

      localStorage.setItem("token", data.access_token || "");
      localStorage.setItem("role", data.role || "");
      localStorage.setItem("username", data.username || authUsername || "");

      setToken(data.access_token || "");
      setRole(data.role || "");
      setUsername(data.username || authUsername || "");
      setMsg("Login OK");
      setTab("tracks");

      if ((data.role || "") === "user") {
        await loadPurchases();
      }
    } catch (e) {
      setErr(`Login falló: ${e.message}`);
    }
  }

  async function handleRegister() {
    clearAlerts();
    try {
      await apiFetch("/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: authUsername,
          email: authEmail,
          password: authPassword,
        }),
      });
      setMsg("Registro OK");
    } catch (e) {
      setErr(`Register falló: ${e.message}`);
    }
  }

  async function handleBuy(trackId) {
    clearAlerts();
    if (!token || role !== "user") {
      setErr("Debes iniciar sesión como usuario para comprar");
      return;
    }

    if (purchasedTrackIds.has(Number(trackId))) {
      setErr("Esa canción ya fue comprada");
      return;
    }

    try {
      await apiFetch("/v1/purchases", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          track_id: trackId,
        }),
      });

      setMsg("Compra realizada");
      await loadPurchases();
      await loadTracks(trackQuery);
    } catch (e) {
      setErr(`Compra falló: ${e.message}`);
    }
  }

  function startEdit(track) {
    clearAlerts();
    setEditTrackId(track.TrackId);
    setEditName(track.TrackName || "");
    setEditPrice(String(track.UnitPrice ?? ""));
    setEditGenreId(track.GenreId ? String(track.GenreId) : "");
  }

  function cancelEdit() {
    setEditTrackId(null);
    setEditName("");
    setEditPrice("");
    setEditGenreId("");
  }

  async function saveEdit(trackId) {
    clearAlerts();

    if (!editName.trim()) {
      setErr("El nombre no puede estar vacío");
      return;
    }

    if (editPrice === "" || editPrice === null) {
      setErr("El precio es obligatorio");
      return;
    }

    const parsed = Number(editPrice);
    if (Number.isNaN(parsed)) {
      setErr("El precio es inválido");
      return;
    }

    if (parsed < 0) {
      setErr("El precio no puede ser negativo");
      return;
    }

    try {
      await apiFetch(`/v1/admin/tracks/${trackId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          name: editName.trim(),
          unit_price: parsed,
          genre_id: editGenreId || null,
        }),
      });

      setMsg("Canción actualizada");
      cancelEdit();
      await loadTracks(trackQuery);
    } catch (e) {
      setErr(`Editar falló: ${e.message}`);
    }
  }

  async function deleteTrack(trackId) {
    clearAlerts();

    if (!window.confirm("¿Eliminar esta canción?")) return;

    try {
      await apiFetch(`/v1/admin/tracks/${trackId}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      setMsg("Canción eliminada");
      await loadTracks(trackQuery);
    } catch (e) {
      setErr(`Eliminar falló: ${e.message}`);
    }
  }

  async function createTrack() {
    clearAlerts();

    if (!createName.trim()) {
      setErr("El nombre es obligatorio");
      return;
    }

    if (createPrice === "" || createPrice === null) {
      setErr("El precio es obligatorio");
      return;
    }

    const parsed = Number(createPrice);
    if (Number.isNaN(parsed)) {
      setErr("El precio es inválido");
      return;
    }

    if (parsed < 0) {
      setErr("El precio no puede ser negativo");
      return;
    }

    if (!createArtistId) {
      setErr("Selecciona un artista");
      return;
    }

    if (albumMode === "existing" && !albumId) {
      setErr("Selecciona un álbum existente");
      return;
    }

    if (albumMode === "new" && !newAlbumTitle.trim()) {
      setErr("Escribe el título del nuevo álbum");
      return;
    }

    try {
      await apiFetch("/v1/admin/tracks", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: createName.trim(),
          unit_price: parsed,
          artist_id: createArtistId,
          genre_id: createGenreId || null,
          album_mode: albumMode,
          album_id: albumMode === "existing" ? albumId : null,
          new_album_title: albumMode === "new" ? newAlbumTitle.trim() : "",
        }),
      });

      setMsg("Canción creada");
      setCreateName("");
      setCreatePrice("0.99");
      setCreateArtistId("");
      setCreateGenreId("");
      setAlbumMode("existing");
      setAlbumId("");
      setNewAlbumTitle("");
      setAlbums([]);

      await loadTracks(trackQuery);
      await loadArtists("");
      await loadGenres("");
    } catch (e) {
      setErr(`Crear falló: HTTP 500`);
      console.error(e);
    }
  }

  return (
    <div
      style={{
        maxWidth: 1150,
        margin: "0 auto",
        padding: 20,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: 6 }}>Chinook Store</h1>
      <div style={{ opacity: 0.75, marginBottom: 12 }}>
        Admin CRUD · User compras · Stats Artistas/Géneros
      </div>

      {(err || msg) && (
        <div
          style={{
            marginBottom: 14,
            padding: 14,
            borderRadius: 10,
            background: err ? "#5c0f0f" : "#114d22",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>{err ? `Error: ${err}` : msg}</div>
          <button onClick={clearAlerts}>x</button>
        </div>
      )}

      {token ? (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            Sesión: <b>{username}</b> · Rol: <b>{role}</b>
          </div>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div
          style={{
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <h3>Login / Register</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              placeholder="username"
              style={{ padding: 10, flex: 1 }}
            />
            <input
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="email"
              style={{ padding: 10, flex: 1 }}
            />
            <input
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              type="password"
              placeholder="password"
              style={{ padding: 10, flex: 1 }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button onClick={handleLogin}>Login</button>
            <button onClick={handleRegister}>Register</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button disabled={tab === "tracks"} onClick={() => setTab("tracks")}>
          Tracks
        </button>
        <button disabled={tab === "artists"} onClick={() => setTab("artists")}>
          Artistas
        </button>
        <button disabled={tab === "genres"} onClick={() => setTab("genres")}>
          Géneros
        </button>
        {role === "user" && (
          <button disabled={tab === "purchases"} onClick={() => setTab("purchases")}>
            Mis compras
          </button>
        )}
      </div>

      {role === "admin" && (
        <div
          style={{
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <h3>Admin: Crear canción</h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              placeholder="Nombre canción"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              style={{ padding: 10, flex: 2 }}
            />

            <input
              placeholder="Precio"
              type="number"
              min="0"
              step="0.01"
              value={createPrice}
              onChange={(e) => setCreatePrice(e.target.value)}
              style={{ padding: 10, width: 140 }}
            />

            <select
              value={createArtistId}
              onChange={(e) => setCreateArtistId(e.target.value)}
              style={{ padding: 10, flex: 2 }}
            >
              <option value="">-- Artista --</option>
              {artists.map((a) => (
                <option key={a.ArtistId} value={a.ArtistId}>
                  {a.ArtistName}
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
                  {g.GenreName}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <select
              value={albumMode}
              onChange={(e) => setAlbumMode(e.target.value)}
              style={{ padding: 10, width: 230 }}
            >
              <option value="existing">Usar álbum existente</option>
              <option value="new">Crear nuevo álbum</option>
            </select>

            {albumMode === "existing" ? (
              <select
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                style={{ padding: 10, flex: 2 }}
              >
                <option value="">
                  {createArtistId ? "-- Álbum --" : "Selecciona artista primero"}
                </option>
                {albums.map((a) => (
                  <option key={a.AlbumId} value={a.AlbumId}>
                    {a.Title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                placeholder="Título nuevo álbum"
                value={newAlbumTitle}
                onChange={(e) => setNewAlbumTitle(e.target.value)}
                style={{ padding: 10, flex: 2 }}
              />
            )}

            <button style={{ padding: "10px 14px" }} onClick={createTrack}>
              Crear
            </button>
          </div>
        </div>
      )}

      {tab === "tracks" && (
        <div
          style={{
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <h3>Tracks</h3>

          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input
              value={trackQuery}
              onChange={(e) => setTrackQuery(e.target.value)}
              style={{ flex: 1, padding: 10 }}
            />
            <button style={{ padding: "8px 12px" }} onClick={() => loadTracks(trackQuery)}>
              Buscar
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
              {tracks.map((track) => {
                const isEditing = editTrackId === track.TrackId;
                const purchased = purchasedTrackIds.has(Number(track.TrackId));

                return (
                  <tr key={track.TrackId} style={{ borderBottom: "1px solid #222" }}>
                    <td style={{ padding: 10 }}>
                      {isEditing ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          style={{ padding: 8, width: "100%" }}
                        />
                      ) : (
                        <>
                          <div style={{ fontWeight: 600 }}>{track.TrackName}</div>
                          <div style={{ fontSize: 12, opacity: 0.75 }}>{track.AlbumTitle}</div>
                        </>
                      )}
                    </td>

                    <td style={{ padding: 10 }}>{track.ArtistName}</td>

                    <td style={{ padding: 10 }}>
                      {isEditing ? (
                        <input
                          value={editGenreId}
                          onChange={(e) => setEditGenreId(e.target.value)}
                          style={{ padding: 8, width: 90 }}
                          placeholder="GenreId"
                        />
                      ) : (
                        track.GenreName
                      )}
                    </td>

                    <td style={{ padding: 10 }}>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          style={{ padding: 8, width: 90 }}
                        />
                      ) : (
                        track.UnitPrice
                      )}
                    </td>

                    <td style={{ padding: 10, textAlign: "right" }}>
                      {role === "admin" ? (
                        isEditing ? (
                          <>
                            <button onClick={() => saveEdit(track.TrackId)}>Guardar</button>
                            <button onClick={cancelEdit} style={{ marginLeft: 8 }}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(track)}>Editar</button>
                            <button
                              style={{ marginLeft: 8 }}
                              onClick={() => deleteTrack(track.TrackId)}
                            >
                              Eliminar
                            </button>
                          </>
                        )
                      ) : role === "user" ? (
                        purchased ? (
                          <span>Comprada ✅</span>
                        ) : (
                          <button onClick={() => handleBuy(track.TrackId)}>Comprar</button>
                        )
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "artists" && (
        <div
          style={{
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <h3>Artistas (Álbumes / Canciones)</h3>

          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input
              value={artistsQuery}
              onChange={(e) => setArtistsQuery(e.target.value)}
              placeholder="Buscar artista..."
              style={{ flex: 1, padding: 10 }}
            />
            <button onClick={() => loadArtists(artistsQuery)}>Buscar</button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
                <th style={{ padding: 10 }}>Artista</th>
                <th style={{ padding: 10 }}>Álbumes</th>
                <th style={{ padding: 10 }}>Canciones</th>
              </tr>
            </thead>
            <tbody>
              {artists.map((a) => (
                <tr key={a.ArtistId} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: 10 }}>{a.ArtistName}</td>
                  <td style={{ padding: 10 }}>{a.AlbumCount}</td>
                  <td style={{ padding: 10 }}>{a.TrackCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "genres" && (
        <div
          style={{
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <h3>Géneros (Canciones)</h3>

          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input
              value={genresQuery}
              onChange={(e) => setGenresQuery(e.target.value)}
              placeholder="Buscar género..."
              style={{ flex: 1, padding: 10 }}
            />
            <button onClick={() => loadGenres(genresQuery)}>Buscar</button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
                <th style={{ padding: 10 }}>Género</th>
                <th style={{ padding: 10 }}>Canciones</th>
              </tr>
            </thead>
            <tbody>
              {genres.map((g) => (
                <tr key={g.GenreId} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: 10 }}>{g.GenreName}</td>
                  <td style={{ padding: 10 }}>{g.TrackCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "purchases" && role === "user" && (
        <div
          style={{
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <h3>Mis compras</h3>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
                <th style={{ padding: 10 }}>Track</th>
                <th style={{ padding: 10 }}>Artist</th>
                <th style={{ padding: 10 }}>Genre</th>
                <th style={{ padding: 10 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p, idx) => (
                <tr key={`${p.InvoiceId}-${p.TrackId}-${idx}`} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: 10 }}>{p.TrackName}</td>
                  <td style={{ padding: 10 }}>{p.ArtistName}</td>
                  <td style={{ padding: 10 }}>{p.GenreName}</td>
                  <td style={{ padding: 10 }}>{p.LineTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
