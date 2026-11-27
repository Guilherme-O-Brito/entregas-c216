import { authenticatedFetch } from "./session";

const PAGE_SIZE = 10;

async function request(path, signal, fallback) {
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

export async function listFriends(signal) {
  const { friends } = await request(
    "/friendships/",
    signal,
    "Não foi possível carregar seus amigos.",
  );
  return friends;
}

export async function listFriendMovies(friendId, status, signal) {
  const movies = [];
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const query = new URLSearchParams({ status, skip, limit: PAGE_SIZE });
    const { movies: page } = await request(
      `/friendships/${friendId}/movies?${query}`,
      signal,
      "Não foi possível carregar os filmes do amigo.",
    );
    movies.push(...page);
    if (page.length < PAGE_SIZE) return movies;
  }
}
