import { authenticatedFetch } from "./session";

const PAGE_SIZE = 10;

async function get(path, signal, fallback) {
  let response;
  try {
    response = await authenticatedFetch(path, { signal });
  } catch {
    throw new Error(fallback);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    throw new Error(typeof body?.detail === "string" ? body.detail : fallback);
  }
  return body;
}

export function getCurrentUser(signal) {
  return get("/auth/me", signal, "Não foi possível carregar sua conta.");
}

async function getUsers(name, skip, limit, signal) {
  const query = new URLSearchParams({ skip, limit });
  if (name) query.set("name", name);
  const { users } = await get(
    `/users/?${query}`,
    signal,
    "Não foi possível carregar os usuários.",
  );
  return users;
}

export async function listUsers({ name, page, signal }) {
  const skip = page * PAGE_SIZE;
  const searchName = name.trim();
  const users = await getUsers(searchName, skip, PAGE_SIZE, signal);
  const hasNext =
    users.length === PAGE_SIZE &&
    (await getUsers(searchName, skip + PAGE_SIZE, 1, signal)).length > 0;
  return { users, hasNext };
}
