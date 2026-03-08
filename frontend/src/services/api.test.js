import { fetchTracks, loginRequest } from "./api";

describe("api service", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("loginRequest devuelve token", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "abc",
        role: "user",
        username: "juan",
      }),
    });

    const data = await loginRequest("juan", "123");

    expect(data.access_token).toBe("abc");
    expect(data.role).toBe("user");
    expect(data.username).toBe("juan");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("fetchTracks devuelve items", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ TrackId: 1, TrackName: "Love Song" }],
      }),
    });

    const data = await fetchTracks("Love");

    expect(data.items).toHaveLength(1);
    expect(data.items[0].TrackName).toBe("Love Song");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("loginRequest lanza error si API responde 401", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Credenciales inválidas" }),
    });

    await expect(loginRequest("juan", "mala")).rejects.toThrow("Credenciales inválidas");
  });

  it("fetchTracks lanza error si API responde 500", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: "Error interno" }),
    });

    await expect(fetchTracks("Love")).rejects.toThrow("Error interno");
  });
});
