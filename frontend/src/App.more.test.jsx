import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

function byTextContent(text) {
  const normalize = (value) => value.replace(/\s+/g, " ").trim();

  return (_, node) => {
    if (!node) return false;

    const nodeText = normalize(node.textContent || "");
    const children = Array.from(node.children || []);
    const childrenDontMatch = children.every(
      (child) => !normalize(child.textContent || "").includes(text)
    );

    return nodeText.includes(text) && childrenDontMatch;
  };
}

function setupFetchMock() {
  const state = {
    purchases: [],
    tracks: [
      {
        TrackId: 1,
        TrackName: "Love Song",
        AlbumTitle: "Album 1",
        ArtistName: "Artist 1",
        GenreName: "Rock",
        UnitPrice: 0.99,
      },
      {
        TrackId: 2,
        TrackName: "Another Love",
        AlbumTitle: "Album 2",
        ArtistName: "Artist 2",
        GenreName: "Pop",
        UnitPrice: 1.99,
      },
    ],
    artists: [
      { ArtistId: 1, ArtistName: "U2", AlbumCount: 3, TrackCount: 25 },
      { ArtistId: 2, ArtistName: "Coldplay", AlbumCount: 2, TrackCount: 10 },
    ],
    genres: [
      { GenreId: 1, GenreName: "Rock", TrackCount: 120 },
      { GenreId: 2, GenreName: "Pop", TrackCount: 80 },
    ],
    albums: [
      { AlbumId: 1, Title: "War", ArtistId: 1 },
      { AlbumId: 2, Title: "The Joshua Tree", ArtistId: 1 },
    ],
  };

  global.fetch = vi.fn(async (url, options = {}) => {
    const u = String(url);
    const method = (options.method || "GET").toUpperCase();

    if (u.includes("/v1/auth/login") && method === "POST") {
      return {
        ok: true,
        json: async () => ({
          access_token: "token123",
          role: "user",
          username: "juan",
        }),
      };
    }

    if (u.includes("/v1/auth/register") && method === "POST") {
      return {
        ok: true,
        json: async () => ({
          ok: true,
        }),
      };
    }

    if (u.includes("/v1/tracks")) {
      return {
        ok: true,
        json: async () => ({
          items: state.tracks,
        }),
      };
    }

    if (u.includes("/v1/purchases") && method === "GET") {
      return {
        ok: true,
        json: async () => ({
          items: state.purchases,
        }),
      };
    }

    if (u.includes("/v1/purchases") && method === "POST") {
      const body = JSON.parse(options.body);
      const track = state.tracks.find((t) => t.TrackId === body.track_id);

      state.purchases = [
        {
          InvoiceId: 1,
          TrackId: track.TrackId,
          TrackName: track.TrackName,
          ArtistName: track.ArtistName,
          GenreName: track.GenreName,
          Quantity: 1,
          LineTotal: track.UnitPrice,
        },
      ];

      return {
        ok: true,
        json: async () => ({
          ok: true,
          total: track.UnitPrice,
        }),
      };
    }

    if (u.includes("/v1/stats/artists")) {
      return {
        ok: true,
        json: async () => ({
          items: state.artists,
        }),
      };
    }

    if (u.includes("/v1/stats/genres")) {
      return {
        ok: true,
        json: async () => ({
          items: state.genres,
        }),
      };
    }

    if (u.includes("/v1/albums")) {
      return {
        ok: true,
        json: async () => ({
          items: state.albums,
        }),
      };
    }

    if (u.includes("/v1/admin/tracks") && method === "POST") {
      return {
        ok: true,
        json: async () => ({
          track_id: 999,
        }),
      };
    }

    if (u.includes("/v1/admin/tracks/") && method === "PUT") {
      return {
        ok: true,
        json: async () => ({
          ok: true,
        }),
      };
    }

    if (u.includes("/v1/admin/tracks/") && method === "DELETE") {
      return {
        ok: true,
        json: async () => ({
          ok: true,
        }),
      };
    }

    return {
      ok: true,
      json: async () => ({}),
    };
  });
}

describe("App additional coverage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    setupFetchMock();
  });

  it("permite hacer login y muestra sesión", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(
        screen.getByText(byTextContent("Sesión: juan · Rol: user"))
      ).toBeInTheDocument();
    });
  });

  it("permite hacer register y muestra mensaje exitoso", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("Register"));

    await waitFor(() => {
      expect(screen.getByText(/Registro OK/)).toBeInTheDocument();
    });
  });

  it("cambia a pestaña Artistas y renderiza resultados", async () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("role", "user");
    localStorage.setItem("username", "juan");

    render(<App />);

    fireEvent.click(screen.getByText("Artistas"));

    await waitFor(() => {
      expect(screen.getByText("U2")).toBeInTheDocument();
      expect(screen.getByText("Coldplay")).toBeInTheDocument();
    });
  });

  it("cambia a pestaña Géneros y renderiza resultados", async () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("role", "user");
    localStorage.setItem("username", "juan");

    render(<App />);

    fireEvent.click(screen.getByText("Géneros"));

    await waitFor(() => {
      expect(screen.getByText("Rock")).toBeInTheDocument();
      expect(screen.getByText("Pop")).toBeInTheDocument();
    });
  });

  it("permite logout y vuelve a login", async () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("role", "user");
    localStorage.setItem("username", "juan");

    render(<App />);

    fireEvent.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(screen.getByText("Login / Register")).toBeInTheDocument();
    });
  });

  it("usuario puede comprar una canción y luego aparece Comprada", async () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("role", "user");
    localStorage.setItem("username", "juan");

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText("Comprar").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText("Comprar")[0]);

    await waitFor(() => {
      expect(screen.getByText("Comprada ✅")).toBeInTheDocument();
    });
  });

  it("muestra la pestaña Mis compras para user y renderiza compras", async () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("role", "user");
    localStorage.setItem("username", "juan");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Mis compras")).toBeInTheDocument();
    });
  });

  it("admin ve formulario para crear canción", async () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("role", "admin");
    localStorage.setItem("username", "admin");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Admin: Crear canción")).toBeInTheDocument();
      expect(screen.getByText("Usar álbum existente")).toBeInTheDocument();
    });
  });

  it("admin puede crear canción con álbum existente", async () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("role", "admin");
    localStorage.setItem("username", "admin");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Admin: Crear canción")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Nombre canción"), {
      target: { value: "Nueva Canción" },
    });

    fireEvent.change(screen.getByPlaceholderText("Precio"), {
      target: { value: "1.99" },
    });

    let selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "1" } }); // artista
    fireEvent.change(selects[1], { target: { value: "1" } }); // género

    await waitFor(() => {
      const albumsCall = global.fetch.mock.calls.find(
        ([url]) => String(url).includes("/v1/albums?artist_id=1")
      );
      expect(albumsCall).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "War" })).toBeInTheDocument();
    });

    selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[3], { target: { value: "1" } }); // álbum existente

    fireEvent.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => {
      const postCall = global.fetch.mock.calls.find(
        ([url, options]) =>
          String(url).includes("/v1/admin/tracks") &&
          options?.method === "POST"
      );
      expect(postCall).toBeTruthy();
    });
  });

  it("admin puede entrar a editar una canción y guardar", async () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("role", "admin");
    localStorage.setItem("username", "admin");

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText("Editar").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText("Editar")[0]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      const putCall = global.fetch.mock.calls.find(
        ([url, options]) =>
          String(url).includes("/v1/admin/tracks/") &&
          options?.method === "PUT"
      );
      expect(putCall).toBeTruthy();
    });
  });

  it("admin puede eliminar una canción", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    localStorage.setItem("token", "abc");
    localStorage.setItem("role", "admin");
    localStorage.setItem("username", "admin");

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText("Eliminar").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText("Eliminar")[0]);

    await waitFor(() => {
      const deleteCall = global.fetch.mock.calls.find(
        ([url, options]) =>
          String(url).includes("/v1/admin/tracks/") &&
          options?.method === "DELETE"
      );
      expect(deleteCall).toBeTruthy();
    });
  });

  it("permite buscar tracks con el botón Buscar", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Buscar" }).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Buscar" })[0]);

    await waitFor(() => {
      expect(screen.getByText("Love Song")).toBeInTheDocument();
    });
  });
});
