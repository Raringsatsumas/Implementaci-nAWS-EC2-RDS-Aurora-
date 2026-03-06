import { fetchTracks, loginRequest } from "./api";

describe("api service", () => {
  it("loginRequest devuelve token", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "abc",
        role: "user",
        username: "juan",
      }),
    });

    const data = await loginRequest("juan", "123");
    expect(data.access_token).toBe("abc");
    expect(fetch).toHaveBeenCalled();
  });

  it("fetchTracks devuelve items", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ TrackId: 1, TrackName: "Love Song" }],
      }),
    });

    const data = await fetchTracks("Love");
    expect(data.items).toHaveLength(1);
    expect(data.items[0].TrackName).toBe("Love Song");
  });
});
