import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

function mockFetch() {
  global.fetch = vi.fn((url) => {
    const u = String(url);

    if (u.includes("/v1/tracks")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          items: [
            {
              TrackId: 1,
              TrackName: "Love Song",
              AlbumTitle: "Album 1",
              ArtistName: "Artist 1",
              GenreName: "Rock",
              UnitPrice: 0.99,
            },
          ],
        }),
      });
    }

    if (u.includes("/v1/purchases")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ items: [] }),
      });
    }

    if (u.includes("/v1/stats/artists")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          items: [{ ArtistId: 1, ArtistName: "U2", AlbumCount: 3, TrackCount: 25 }],
        }),
      });
    }

    if (u.includes("/v1/stats/genres")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          items: [{ GenreId: 1, GenreName: "Rock", TrackCount: 120 }],
        }),
      });
    }

    if (u.includes("/v1/albums")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          items: [{ AlbumId: 1, Title: "War", ArtistId: 1 }],
        }),
      });
    }

    return Promise.resolve({
      ok: true,
      json: async () => ({}),
    });
  });
}

describe("App extra coverage", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it("muestra estadísticas de artistas al cambiar de pestaña", async () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("role", "user");
    localStorage.setItem("username", "juan");

    render(<App />);
    fireEvent.click(screen.getByText("Artistas"));

    await waitFor(() => {
      expect(screen.getByText("U2")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
    });
  });

  it("muestra estadísticas de géneros al cambiar de pestaña", async () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("role", "user");
    localStorage.setItem("username", "juan");

    render(<App />);
    fireEvent.click(screen.getByText("Géneros"));

    await waitFor(() => {
      expect(screen.getByText("Rock")).toBeInTheDocument();
      expect(screen.getByText("120")).toBeInTheDocument();
    });
  });

  it("logout limpia la sesión y vuelve a mostrar login", async () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("role", "user");
    localStorage.setItem("username", "juan");

    render(<App />);
    fireEvent.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(screen.getByText("Login / Register")).toBeInTheDocument();
    });
  });

  it("admin ve el formulario de crear canción", async () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("role", "admin");
    localStorage.setItem("username", "admin");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Admin: Crear canción")).toBeInTheDocument();
      expect(screen.getByText("Usar álbum existente")).toBeInTheDocument();
    });
  });

  it("usuario sin compras ve botón Comprar", async () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("role", "user");
    localStorage.setItem("username", "juan");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Comprar")).toBeInTheDocument();
    });
  });
});
