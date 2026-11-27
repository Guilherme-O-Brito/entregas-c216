import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { jsonResponse, SESSION_KEY, tokens } from "../helpers/auth";

const session = tokens();
const friends = [
  { id: 2, name: "Ana" },
  { id: 3, name: "Bruno" },
];

beforeEach(() => {
  vi.resetModules();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.history.replaceState(null, "", "/inicio");
});

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

async function renderApp() {
  const { default: App } = await import("../../src/App");
  return render(<App />);
}

function mockFriendsApi(friendList = friends) {
  const cover = "https://images.example.com/arrival.jpg";
  const fetchMock = vi.fn(async (url, { headers }) => {
    expect(headers.get("Authorization")).toBe(`Bearer ${session.access_token}`);
    const { pathname, searchParams } = new URL(url);
    if (pathname === "/movies/") return jsonResponse({ movies: [] });
    if (pathname === "/friendships/")
      return jsonResponse({ friends: friendList });
    if (pathname === "/friendships/2/movies") {
      const status = searchParams.get("status");
      const movie =
        status === "quero_assistir"
          ? { id: 10, title: "Arrival", movie_cover: cover }
          : { id: 11, title: "Alien", movie_cover: null };
      return jsonResponse({ movies: [movie] });
    }
    throw new Error(`Rota inesperada: ${pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, cover };
}

it("abre os filmes de um amigo por status e preserva a aba do usuário ao voltar", async () => {
  const user = userEvent.setup();
  const { fetchMock, cover } = mockFriendsApi();
  await renderApp();
  await user.click(screen.getByRole("button", { name: "Já assistidos" }));
  await user.click(screen.getByRole("button", { name: "Amigos" }));

  expect(window.location.pathname).toBe("/inicio/amigos");
  expect(screen.getByRole("heading", { name: "Amigos" })).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Adicionar amigo" }),
  ).toBeDisabled();
  expect(await screen.findByRole("button", { name: "Bruno" })).toBeVisible();
  const ana = screen.getByRole("button", { name: "Ana" });
  expect(
    within(ana.closest("li")).getByRole("button", { name: "Remover amigo" }),
  ).toBeDisabled();

  await user.click(ana);

  expect(window.location.pathname).toBe("/inicio/amigos/2/filmes");
  expect(screen.getByRole("heading", { name: "Filmes de Ana" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Novo filme" })).toBeNull();
  const title = await screen.findByText("Arrival");
  expect(within(title.closest("li")).getByAltText("")).toHaveAttribute(
    "src",
    cover,
  );
  expect(screen.queryByRole("button", { name: "Arrival" })).toBeNull();

  await user.click(screen.getByRole("button", { name: "Já assistidos" }));
  expect(await screen.findByText("Alien")).toBeVisible();
  expect(screen.queryByText("Arrival")).toBeNull();
  expect(screen.getByText("Sem capa")).toBeVisible();
  expect(
    fetchMock.mock.calls
      .map(([url]) => url)
      .filter((url) => url.includes("/2/movies")),
  ).toEqual([
    expect.stringContaining("status=quero_assistir"),
    expect.stringContaining("status=assistido"),
  ]);

  await user.click(screen.getByRole("button", { name: "Voltar" }));
  expect(await screen.findByRole("heading", { name: "Amigos" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Voltar" }));
  expect(
    await screen.findByRole("heading", { name: "Meus filmes" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Já assistidos" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(window.location.pathname).toBe("/inicio");
});

it("mostra a lista vazia e mantém o botão de adicionar desabilitado", async () => {
  window.history.replaceState(null, "", "/inicio/amigos");
  mockFriendsApi([]);
  await renderApp();

  expect(
    await screen.findByText("Você ainda não tem amigos cadastrados."),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Adicionar amigo" }),
  ).toBeDisabled();
});

it("resolve o nome do amigo quando os filmes são abertos por link direto", async () => {
  window.history.replaceState(null, "", "/inicio/amigos/2/filmes");
  mockFriendsApi();
  await renderApp();

  expect(
    await screen.findByRole("heading", { name: "Filmes de Ana" }),
  ).toBeVisible();
  expect(await screen.findByText("Arrival")).toBeVisible();
});

it("bloqueia o link de filmes de quem não está na lista de amigos", async () => {
  window.history.replaceState(null, "", "/inicio/amigos/99/filmes");
  const { fetchMock } = mockFriendsApi();
  await renderApp();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Amigo não encontrado.",
  );
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
    expect.stringMatching(/\/friendships\/$/),
    expect.anything(),
  );
});
