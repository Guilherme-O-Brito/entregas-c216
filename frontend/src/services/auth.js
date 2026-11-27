export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

class AuthRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, values, fallback) {
  let response;
  try {
    response = await fetch(`${API_URL}/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
  } catch {
    throw new Error("Não foi possível conectar à API.");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    throw new AuthRequestError(
      typeof body?.detail === "string" ? body.detail : fallback,
      response.status,
    );
  }

  return body;
}

export function login(values) {
  return request("login", values, "Não foi possível entrar.");
}

export function register(values) {
  return request("register", values, "Não foi possível criar a conta.");
}

export function refresh(refreshToken) {
  return request(
    "refresh",
    { refresh_token: refreshToken },
    "Não foi possível renovar a sessão.",
  );
}
