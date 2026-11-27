import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { jsonResponse, SESSION_KEY, tokens } from "../helpers/auth";

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function renderApp() {
  const { default: App } = await import("../../src/App");
  return render(<App />);
}

async function fillCredentials(user) {
  await user.type(screen.getByLabelText("E-mail"), "alice@example.com");
  await user.type(screen.getByLabelText("Senha"), "secret123");
}

function mockRefresh(...responses) {
  const refreshMock = vi.fn();
  for (const response of responses) refreshMock.mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", (url, options) => {
    if (new URL(url).pathname === "/movies/") {
      return Promise.resolve(jsonResponse({ movies: [] }));
    }
    return refreshMock(url, options);
  });
  return refreshMock;
}

it("abre o cadastro a partir do login e retorna com o e-mail preenchido", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      jsonResponse({ id: 1, name: "Alice", email: "alice@example.com" }, 201),
    );
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  await renderApp();
  expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Criar uma conta" }));
  expect(
    screen.getByRole("heading", { name: "Criar conta" }),
  ).toBeInTheDocument();
  await user.type(screen.getByLabelText("Nome"), " Alice ");
  await fillCredentials(user);
  await user.click(screen.getByRole("button", { name: "Cadastrar" }));

  expect(await screen.findByRole("status")).toHaveTextContent("Conta criada.");
  expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
  expect(screen.getByLabelText("E-mail")).toHaveValue("alice@example.com");
  expect(screen.getByLabelText("Senha")).toHaveValue("");
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
    expect.stringMatching(/\/auth\/register$/),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alice@example.com",
        password: "secret123",
        name: "Alice",
      }),
    },
  );
});

it("volta do cadastro para o login sem enviar o formulário", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  await renderApp();

  await user.click(screen.getByRole("button", { name: "Criar uma conta" }));
  await user.click(screen.getByRole("button", { name: "Voltar para o login" }));

  expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("exibe o erro de cadastro e mantém o formulário", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ detail: "E-mail já cadastrado." }, 409),
      ),
  );
  const user = userEvent.setup();
  await renderApp();
  await user.click(screen.getByRole("button", { name: "Criar uma conta" }));
  await user.type(screen.getByLabelText("Nome"), "Alice");
  await fillCredentials(user);

  await user.click(screen.getByRole("button", { name: "Cadastrar" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "E-mail já cadastrado.",
  );
  expect(screen.getByLabelText("Nome")).toHaveValue("Alice");
  expect(window.location.pathname).toBe("/");
});

it("salva os tokens do login e abre a tela de filmes", async () => {
  const session = tokens();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(jsonResponse(session))
    .mockImplementation(async () => jsonResponse({ movies: [] }));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  await renderApp();
  await fillCredentials(user);

  await user.click(screen.getByRole("button", { name: "Entrar" }));

  expect(window.location.pathname).toBe("/inicio");
  expect(
    screen.getByRole("heading", { name: "Meus filmes" }),
  ).toBeInTheDocument();
  expect(
    await screen.findByText("Nenhum filme nesta lista."),
  ).toBeInTheDocument();
  expect(JSON.parse(sessionStorage.getItem(SESSION_KEY))).toEqual(session);
  expect(fetchMock).toHaveBeenNthCalledWith(
    1,
    expect.stringMatching(/\/auth\/login$/),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alice@example.com",
        password: "secret123",
      }),
    },
  );
});

it.each([
  ["credenciais inválidas", "E-mail ou senha inválidos."],
  ["sem conexão", "Não foi possível conectar à API."],
])("mantém o login quando a API falha: %s", async (failure, message) => {
  const fetchMock = vi.fn();
  if (failure === "sem conexão") {
    fetchMock.mockRejectedValue(new Error("offline"));
  } else {
    fetchMock.mockResolvedValue(jsonResponse({ detail: message }, 401));
  }
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  await renderApp();
  await fillCredentials(user);

  await user.click(screen.getByRole("button", { name: "Entrar" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(message);
  expect(window.location.pathname).toBe("/");
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
});

it("restaura a sessão quando a aplicação abre com um access token vigente", async () => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(tokens()));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(jsonResponse({ movies: [] })),
  );

  await renderApp();

  expect(
    await screen.findByText("Nenhum filme nesta lista."),
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe("/inicio");
});

it("carrega as páginas da lista e separa filmes pelo status", async () => {
  const session = tokens();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  const cover = "https://images.example.com/arrival.jpg";
  const firstPage = [
    { id: 1, title: "Arrival", movie_cover: cover },
    ...Array.from({ length: 9 }, (_, index) => ({
      id: index + 2,
      title: `Filme ${index + 2}`,
      movie_cover: null,
    })),
  ];
  const fetchMock = vi.fn(async (url, { headers }) => {
    expect(headers.get("Authorization")).toBe(`Bearer ${session.access_token}`);
    const { pathname, searchParams } = new URL(url);
    if (pathname === "/movies/") {
      expect(searchParams.get("limit")).toBe("10");
      if (searchParams.get("skip") === "0") {
        return jsonResponse({ movies: firstPage });
      }
      expect(searchParams.get("skip")).toBe("10");
      return jsonResponse({
        movies: [{ id: 11, title: "Alien", movie_cover: null }],
      });
    }
    return jsonResponse({
      status: pathname === "/movies/1" ? "quero_assistir" : "assistido",
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  await renderApp();

  const title = await screen.findByText("Arrival");
  const card = within(title.closest("li"));
  expect(card.getByAltText("")).toHaveAttribute("src", cover);
  expect(screen.queryByText("Alien")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Já assistidos" }));

  expect(screen.queryByText("Arrival")).not.toBeInTheDocument();
  const alien = screen.getByText("Alien");
  expect(within(alien.closest("li")).getByText("Sem capa")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(10);
  expect(fetchMock).toHaveBeenCalledTimes(13);
});

it("renova automaticamente o access token quando ele vence", async () => {
  vi.useFakeTimers();
  const now = Math.floor(Date.now() / 1000);
  const original = tokens(now + 5);
  const fresh = tokens(now + 3600);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(original));
  const fetchMock = mockRefresh(
    jsonResponse({ access_token: fresh.access_token }),
  );
  await renderApp();
  expect(fetchMock).not.toHaveBeenCalled();

  await act(() => vi.advanceTimersByTimeAsync(5_000));

  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
    expect.stringMatching(/\/auth\/refresh$/),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: original.refresh_token }),
    },
  );
  expect(JSON.parse(sessionStorage.getItem(SESSION_KEY))).toEqual(fresh);
  expect(window.location.pathname).toBe("/inicio");
});

it("mantém a sessão durante uma falha temporária e tenta renovar novamente", async () => {
  vi.useFakeTimers();
  const original = tokens(Math.floor(Date.now() / 1000) + 5);
  const fresh = tokens();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(original));
  const fetchMock = mockRefresh(
    jsonResponse({}, 503),
    jsonResponse({ access_token: fresh.access_token }),
  );
  await renderApp();

  await act(() => vi.advanceTimersByTimeAsync(5_000));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(window.location.pathname).toBe("/inicio");
  expect(JSON.parse(sessionStorage.getItem(SESSION_KEY))).toEqual(original);

  await act(() => vi.advanceTimersByTimeAsync(30_000));
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(JSON.parse(sessionStorage.getItem(SESSION_KEY))).toEqual(fresh);
});

it("volta ao login e cancela a renovação automática ao sair", async () => {
  vi.useFakeTimers();
  const original = tokens(Math.floor(Date.now() / 1000) + 30);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(original));
  const refreshMock = mockRefresh();
  await renderApp();

  fireEvent.click(screen.getByRole("button", { name: "Sair" }));

  expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Meus filmes" })).toBeNull();
  expect(window.location.pathname).toBe("/");
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();

  await act(() => vi.advanceTimersByTimeAsync(30_000));
  expect(refreshMock).not.toHaveBeenCalled();
});

it("volta ao login e limpa o armazenamento se o refresh for rejeitado", async () => {
  vi.useFakeTimers();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(tokens(1)));
  mockRefresh(jsonResponse({ detail: "Refresh inválido." }, 401));
  await renderApp();

  await act(() => vi.advanceTimersByTimeAsync(1));

  expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
  expect(window.location.pathname).toBe("/");
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
});
