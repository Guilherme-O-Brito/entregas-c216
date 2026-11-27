import { act, render, screen } from "@testing-library/react";
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

it("salva os tokens do login e abre a tela inicial vazia", async () => {
  const session = tokens();
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse(session));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  await renderApp();
  await fillCredentials(user);

  await user.click(screen.getByRole("button", { name: "Entrar" }));

  expect(window.location.pathname).toBe("/inicio");
  expect(screen.getByRole("main")).toBeEmptyDOMElement();
  expect(JSON.parse(sessionStorage.getItem(SESSION_KEY))).toEqual(session);
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
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

  await renderApp();

  expect(screen.getByRole("main")).toBeEmptyDOMElement();
  expect(window.location.pathname).toBe("/inicio");
});

it("renova automaticamente o access token quando ele vence", async () => {
  vi.useFakeTimers();
  const now = Math.floor(Date.now() / 1000);
  const original = tokens(now + 5);
  const fresh = tokens(now + 3600);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(original));
  const fetchMock = vi
    .fn()
    .mockResolvedValue(jsonResponse({ access_token: fresh.access_token }));
  vi.stubGlobal("fetch", fetchMock);
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
  const original = tokens(1);
  const fresh = tokens();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(original));
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(jsonResponse({}, 503))
    .mockResolvedValueOnce(jsonResponse({ access_token: fresh.access_token }));
  vi.stubGlobal("fetch", fetchMock);
  await renderApp();

  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(window.location.pathname).toBe("/inicio");
  expect(JSON.parse(sessionStorage.getItem(SESSION_KEY))).toEqual(original);

  await act(() => vi.advanceTimersByTimeAsync(30_000));
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(JSON.parse(sessionStorage.getItem(SESSION_KEY))).toEqual(fresh);
});

it("volta ao login e limpa o armazenamento se o refresh for rejeitado", async () => {
  vi.useFakeTimers();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(tokens(1)));
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: "Refresh inválido." }, 401)),
  );
  await renderApp();

  await act(() => vi.advanceTimersByTimeAsync(1));

  expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
  expect(window.location.pathname).toBe("/");
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
});
