export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const USERS_URL = `${API_URL}/users/`;

async function request(options, fallback) {
  let response;
  try {
    response = await fetch(USERS_URL, options);
  } catch {
    throw new Error("Não foi possível conectar à API.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : fallback);
  }
  return response.json();
}

export async function listUsers() {
  const data = await request(undefined, "Erro ao carregar os usuários.");
  return data.users;
}

export function createUser(user) {
  return request(
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    },
    "Erro ao cadastrar o usuário.",
  );
}
