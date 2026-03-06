const API = import.meta.env.VITE_API_URL || "/api";

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || `HTTP ${response.status}`);
  }
  return data;
}

export async function loginRequest(username, password) {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  const r = await fetch(`${API}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  return readJson(r);
}

export async function fetchTracks(query) {
  const r = await fetch(`${API}/v1/tracks?query=${encodeURIComponent(query)}`);
  return readJson(r);
}
