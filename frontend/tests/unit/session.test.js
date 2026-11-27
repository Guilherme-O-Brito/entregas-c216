import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  accessToken,
  jsonResponse,
  SESSION_KEY,
  tokens,
} from "../helpers/auth";

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
});

afterEach(() => vi.unstubAllGlobals());

it("lê o horário de expiração do access token", async () => {
  const { accessTokenExpiresAt } = await import("../../src/services/session");

  expect(accessTokenExpiresAt(accessToken(2_000_000_000))).toBe(
    2_000_000_000_000,
  );
  expect(accessTokenExpiresAt("invalido")).toBe(0);
});

it("restaura os tokens salvos no navegador", async () => {
  const stored = tokens();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored));

  const { getSession } = await import("../../src/services/session");

  expect(getSession()).toEqual(stored);
});

it("trata dados corrompidos no armazenamento como sessão ausente", async () => {
  sessionStorage.setItem(SESSION_KEY, "invalido");

  const { getSession } = await import("../../src/services/session");

  expect(getSession()).toBeNull();
});

it("exige os dois tokens antes de gravar uma sessão", async () => {
  const { getSession, startSession } = await import(
    "../../src/services/session"
  );

  expect(() => startSession({ access_token: tokens().access_token })).toThrow(
    "A API não retornou os tokens da sessão.",
  );
  expect(getSession()).toBeNull();
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
});

it("encerra a sessão local sem enviar uma requisição", async () => {
  const { authenticatedFetch, endSession, getSession, startSession } =
    await import("../../src/services/session");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  startSession(tokens());

  endSession();

  expect(getSession()).toBeNull();
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  await expect(authenticatedFetch("/movies/")).rejects.toThrow(
    "A sessão não está disponível.",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

it("ignora uma renovação que termina depois que o usuário sai", async () => {
  const { endSession, getSession, refreshSession, startSession } = await import(
    "../../src/services/session"
  );
  const request = Promise.withResolvers();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => request.promise),
  );
  startSession(tokens(1));
  const refresh = refreshSession(getSession());

  endSession();
  request.resolve(jsonResponse({ access_token: tokens().access_token }));

  await expect(refresh).rejects.toThrow("Não foi possível renovar a sessão.");
  expect(getSession()).toBeNull();
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
});

it("renova uma única vez quando há chamadas de refresh simultâneas", async () => {
  const { getSession, refreshSession, startSession } = await import(
    "../../src/services/session"
  );
  const original = tokens(1);
  const fresh = tokens();
  const request = Promise.withResolvers();
  const fetchMock = vi.fn(() => request.promise);
  vi.stubGlobal("fetch", fetchMock);
  startSession(original);

  const first = refreshSession(getSession());
  const second = refreshSession(getSession());
  request.resolve(jsonResponse({ access_token: fresh.access_token }));

  const expected = { ...original, access_token: fresh.access_token };
  expect(await Promise.all([first, second])).toEqual([expected, expected]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(JSON.parse(sessionStorage.getItem(SESSION_KEY))).toEqual(expected);
});

it("envia o novo access token antes de fazer uma chamada com token vencido", async () => {
  const { authenticatedFetch, startSession } = await import(
    "../../src/services/session"
  );
  const fresh = tokens();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(jsonResponse({ access_token: fresh.access_token }))
    .mockResolvedValueOnce(jsonResponse({ movies: [] }));
  vi.stubGlobal("fetch", fetchMock);
  startSession(tokens(1));

  const response = await authenticatedFetch("/movies/");

  expect(await response.json()).toEqual({ movies: [] });
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/refresh$/);
  expect(fetchMock.mock.calls[1][1].headers.get("Authorization")).toBe(
    `Bearer ${fresh.access_token}`,
  );
});

it("repete a requisição original apenas uma vez depois de receber 401", async () => {
  const { authenticatedFetch, getSession, startSession } = await import(
    "../../src/services/session"
  );
  const original = tokens();
  const fresh = tokens(Math.floor(Date.now() / 1000) + 7200);
  const authorization = [];
  const fetchMock = vi.fn(async (url, options) => {
    if (url.endsWith("/auth/refresh")) {
      return jsonResponse({ access_token: fresh.access_token });
    }
    authorization.push(options.headers.get("Authorization"));
    return jsonResponse({ detail: "Não autorizado." }, 401);
  });
  vi.stubGlobal("fetch", fetchMock);
  startSession(original);

  const body = JSON.stringify({ title: "Arrival" });
  const response = await authenticatedFetch("/movies/1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });

  expect(response.status).toBe(401);
  expect(authorization).toEqual([
    `Bearer ${original.access_token}`,
    `Bearer ${fresh.access_token}`,
  ]);
  expect(fetchMock).toHaveBeenCalledTimes(3);
  for (const index of [0, 2]) {
    const [url, options] = fetchMock.mock.calls[index];
    expect(url).toMatch(/\/movies\/1$/);
    expect(options).toMatchObject({ method: "PATCH", body });
    expect(options.headers.get("Content-Type")).toBe("application/json");
  }
  expect(getSession().refresh_token).toBe(original.refresh_token);
});

it("limpa a sessão quando a API rejeita o refresh token", async () => {
  const { getSession, refreshSession, startSession } = await import(
    "../../src/services/session"
  );
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: "Refresh inválido." }, 401)),
  );
  startSession(tokens());

  await expect(refreshSession(getSession())).rejects.toMatchObject({
    status: 401,
  });
  expect(getSession()).toBeNull();
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
});

it.each(["offline", "servidor indisponível"])(
  "mantém a sessão quando a renovação falha por problema temporário: %s",
  async (failure) => {
    const { getSession, refreshSession, startSession } = await import(
      "../../src/services/session"
    );
    const fetchMock = vi.fn();
    if (failure === "offline") {
      fetchMock.mockRejectedValue(new Error("offline"));
    } else {
      fetchMock.mockResolvedValue(jsonResponse({}, 503));
    }
    vi.stubGlobal("fetch", fetchMock);
    const original = tokens();
    startSession(original);

    await expect(refreshSession(getSession())).rejects.toThrow();
    expect(getSession()).toEqual(original);
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY))).toEqual(original);
  },
);
