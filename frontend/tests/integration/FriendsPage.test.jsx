import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { jsonResponse, SESSION_KEY, tokens } from "../helpers/auth";

const session = tokens();
const friends = [
  { id: 2, name: "Ana" },
  { id: 3, name: "Bruno" },
];
const received = [
  { id: 12, requested_by_id: 4, requested_by_name: "Carla" },
  { id: 13, requested_by_id: 5, requested_by_name: "Diego" },
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

function mockFriendsApi(friendList = friends, requestList = []) {
  const cover = "https://images.example.com/arrival.jpg";
  let currentFriends = [...friendList];
  let pending = [...requestList];
  const listRequests = vi.fn(() => jsonResponse({ requests: pending }));
  const accept = vi.fn((id) => {
    const request = pending.find((entry) => entry.id === id);
    currentFriends.push({
      id: request.requested_by_id,
      name: request.requested_by_name,
    });
    pending = pending.filter((entry) => entry.id !== id);
    return jsonResponse({ id, status: "accepted" });
  });
  const decline = vi.fn((id) => {
    pending = pending.filter((entry) => entry.id !== id);
    return new Response(null, { status: 204 });
  });
  const remove = vi.fn((id) => {
    currentFriends = currentFriends.filter((friend) => friend.id !== id);
    return new Response(null, { status: 204 });
  });
  const fetchMock = vi.fn(async (url, { headers, method }) => {
    expect(headers.get("Authorization")).toBe(`Bearer ${session.access_token}`);
    const { pathname, searchParams } = new URL(url);
    if (pathname === "/movies/") return jsonResponse({ movies: [] });
    if (pathname === "/friendships/requests") return listRequests();
    const requestPath = /^\/friendships\/requests\/(\d+)(\/accept)?$/.exec(
      pathname,
    );
    if (requestPath) {
      const [, id, acceptPath] = requestPath;
      if (method === "PATCH" && acceptPath) return accept(Number(id));
      if (method === "DELETE" && !acceptPath) return decline(Number(id));
    }
    if (pathname === "/friendships/")
      return jsonResponse({ friends: currentFriends });
    if (method === "DELETE" && pathname === "/friendships/2") return remove(2);
    if (pathname === "/friendships/2/movies") {
      const status = searchParams.get("status");
      const movie =
        status === "quero_assistir"
          ? {
              id: 10,
              title: "Arrival",
              status,
              movie_cover: cover,
              rating: null,
              review: null,
            }
          : {
              id: 11,
              title: "Alien",
              status,
              movie_cover: null,
              rating: 9,
              review: "Ótima ficção científica.",
            };
      return jsonResponse({ movies: [movie] });
    }
    throw new Error(`Rota inesperada: ${pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, cover, remove, listRequests, accept, decline };
}

it("abre os filmes de um amigo por status e preserva a aba do usuário ao voltar", async () => {
  const user = userEvent.setup();
  const { fetchMock, cover } = mockFriendsApi();
  await renderApp();
  await user.click(screen.getByRole("button", { name: "Já assistidos" }));
  await user.click(screen.getByRole("button", { name: "Amigos" }));

  expect(window.location.pathname).toBe("/inicio/amigos");
  expect(screen.getByRole("heading", { name: "Amigos" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Adicionar amigo" })).toBeEnabled();
  expect(await screen.findByRole("button", { name: "Bruno" })).toBeVisible();
  const ana = screen.getByRole("button", { name: "Ana" });
  expect(
    within(ana.closest("li")).getByRole("button", { name: "Remover amigo" }),
  ).toBeEnabled();

  await user.click(ana);

  expect(window.location.pathname).toBe("/inicio/amigos/2/filmes");
  expect(screen.getByRole("heading", { name: "Filmes de Ana" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Novo filme" })).toBeNull();
  const title = await screen.findByText("Arrival");
  expect(within(title.closest("li")).getByAltText("")).toHaveAttribute(
    "src",
    cover,
  );
  expect(screen.getByRole("button", { name: "Arrival" })).toBeVisible();

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

  await user.click(screen.getByRole("button", { name: "Alien" }));
  expect(screen.getByRole("heading", { name: "Alien" })).toBeVisible();
  expect(screen.getByText("Filme de Ana")).toBeVisible();
  expect(screen.getByText("9/10")).toBeVisible();
  expect(screen.getByText("Ótima ficção científica.")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
  expect(window.location.pathname).toBe("/inicio/amigos/2/filmes/assistido/11");

  await user.click(screen.getByRole("button", { name: "Voltar" }));
  expect(
    await screen.findByRole("heading", { name: "Filmes de Ana" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Já assistidos" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

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

it("remove somente o amigo do card clicado após a confirmação da API", async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, "", "/inicio/amigos");
  const { remove } = mockFriendsApi();
  await renderApp();
  const ana = await screen.findByRole("button", { name: "Ana" });

  await user.click(
    within(ana.closest("li")).getByRole("button", { name: "Remover amigo" }),
  );

  expect(remove).toHaveBeenCalledExactlyOnceWith(2);
  expect(screen.queryByRole("button", { name: "Ana" })).toBeNull();
  expect(screen.getByRole("button", { name: "Bruno" })).toBeVisible();
});

it("mantém o amigo na lista se a API rejeitar a remoção", async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, "", "/inicio/amigos");
  const { remove } = mockFriendsApi([friends[0]]);
  remove.mockReturnValueOnce(jsonResponse({ detail: "Tente novamente." }, 503));
  await renderApp();
  await screen.findByRole("button", { name: "Ana" });

  await user.click(screen.getByRole("button", { name: "Remover amigo" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Tente novamente.",
  );
  expect(screen.getByRole("button", { name: "Ana" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Remover amigo" })).toBeEnabled();
});

it("permite adicionar amigos mesmo quando a lista está vazia", async () => {
  window.history.replaceState(null, "", "/inicio/amigos");
  mockFriendsApi([]);
  await renderApp();

  expect(
    await screen.findByText("Você ainda não tem amigos cadastrados."),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Adicionar amigo" })).toBeEnabled();
  expect(
    await screen.findByText("Nenhuma solicitação de amizade recebida."),
  ).toBeVisible();
});

it("aceita um pedido recebido e atualiza a lista de amigos", async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, "", "/inicio/amigos");
  const { accept, decline } = mockFriendsApi(friends, received);
  await renderApp();
  const requests = within(
    screen.getByRole("region", { name: "Solicitações de amizade" }),
  );
  const acceptCarla = await requests.findByRole("button", {
    name: "Aceitar pedido de Carla",
  });
  expect(screen.queryByRole("button", { name: "Carla" })).toBeNull();

  await user.click(acceptCarla);

  expect(await screen.findByRole("button", { name: "Carla" })).toBeVisible();
  expect(requests.queryByText("Carla")).toBeNull();
  expect(requests.getByText("Diego")).toBeVisible();
  expect(accept).toHaveBeenCalledExactlyOnceWith(12);
  expect(decline).not.toHaveBeenCalled();
});

it("recusa o pedido sem adicionar a pessoa à lista de amigos", async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, "", "/inicio/amigos");
  const { accept, decline } = mockFriendsApi(friends, [received[1]]);
  await renderApp();

  await user.click(
    await screen.findByRole("button", { name: "Recusar pedido de Diego" }),
  );

  expect(
    await screen.findByText("Nenhuma solicitação de amizade recebida."),
  ).toBeVisible();
  expect(screen.queryByRole("button", { name: "Diego" })).toBeNull();
  expect(decline).toHaveBeenCalledExactlyOnceWith(13);
  expect(accept).not.toHaveBeenCalled();
});

it("mantém a solicitação visível quando a API rejeita a ação", async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, "", "/inicio/amigos");
  const { accept } = mockFriendsApi([], [received[0]]);
  accept.mockReturnValueOnce(
    jsonResponse({ detail: "Não foi possível aceitar agora." }, 503),
  );
  await renderApp();
  const button = await screen.findByRole("button", {
    name: "Aceitar pedido de Carla",
  });

  await user.click(button);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível aceitar agora.",
  );
  expect(button).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Carla" })).toBeNull();
});

it("permite tentar carregar as solicitações novamente após uma falha", async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, "", "/inicio/amigos");
  const { listRequests } = mockFriendsApi([], [received[0]]);
  listRequests.mockReturnValueOnce(jsonResponse({}, 503));
  await renderApp();
  const requests = within(
    screen.getByRole("region", { name: "Solicitações de amizade" }),
  );

  expect(await requests.findByRole("alert")).toHaveTextContent(
    "Não foi possível carregar as solicitações de amizade.",
  );
  await user.click(requests.getByRole("button", { name: "Tentar novamente" }));

  expect(await requests.findByText("Carla")).toBeVisible();
  expect(listRequests).toHaveBeenCalledTimes(2);
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

it("abre um detalhe por link direto usando o status do filme", async () => {
  window.history.replaceState(null, "", "/inicio/amigos/2/filmes/assistido/11");
  const { fetchMock } = mockFriendsApi();
  await renderApp();

  expect(await screen.findByRole("heading", { name: "Alien" })).toBeVisible();
  expect(screen.getByText("Filme de Ana")).toBeVisible();
  expect(fetchMock).toHaveBeenLastCalledWith(
    expect.stringContaining("/friendships/2/movies?status=assistido"),
    expect.anything(),
  );
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
