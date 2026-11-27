import { API_URL, refresh } from "./auth";

const SESSION_KEY = "movie-list.session";
const listeners = new Set();
let session = readSession();
let pendingRefresh;

function isToken(value) {
  return typeof value === "string" && value.length > 0;
}

function hasTokens(value) {
  return isToken(value?.access_token) && isToken(value?.refresh_token);
}

function readSession() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    return hasTokens(stored) ? stored : null;
  } catch {
    return null;
  }
}

function setSession(next) {
  session = next;
  try {
    if (next) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Keep the session in memory if browser storage is unavailable.
  }
  for (const listener of listeners) listener();
}

export function startSession(tokens) {
  if (!hasTokens(tokens)) {
    throw new Error("A API não retornou os tokens da sessão.");
  }
  setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
}

export function endSession() {
  setSession(null);
}

export function getSession() {
  return session;
}

export function subscribeToSession(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function accessTokenExpiresAt(token) {
  try {
    const encoded = token
      .split(".")[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/");
    const { exp } = JSON.parse(atob(encoded));
    return Number.isFinite(exp) ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export async function refreshSession(previous) {
  if (!session || session.refresh_token !== previous.refresh_token) {
    throw new Error("A sessão não está disponível.");
  }
  if (session !== previous) return session;
  if (pendingRefresh?.session === previous) return pendingRefresh.promise;

  const promise = refresh(previous.refresh_token)
    .then((tokens) => {
      if (
        session !== previous ||
        accessTokenExpiresAt(tokens.access_token) <= Date.now()
      ) {
        throw new Error("Não foi possível renovar a sessão.");
      }
      const renewed = { ...previous, access_token: tokens.access_token };
      setSession(renewed);
      return renewed;
    })
    .catch((error) => {
      if (error.status === 401 && session === previous) endSession();
      throw error;
    })
    .finally(() => {
      if (pendingRefresh?.promise === promise) pendingRefresh = undefined;
    });

  pendingRefresh = { session: previous, promise };
  return promise;
}

export async function authenticatedFetch(path, options = {}) {
  if (!path.startsWith("/")) {
    throw new TypeError("Informe um caminho da API que comece com /.");
  }
  const current = getSession();
  if (!current) throw new Error("A sessão não está disponível.");

  const headers = new Headers(options.headers);
  function send(accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(`${API_URL}${path}`, { ...options, headers });
  }

  const active =
    accessTokenExpiresAt(current.access_token) <= Date.now()
      ? await refreshSession(current)
      : current;
  const response = await send(active.access_token);
  if (response.status !== 401) return response;

  const renewed = await refreshSession(active);
  return send(renewed.access_token);
}
