import { authenticatedFetch } from "./session";

const PAGE_SIZE = 10;

async function request(path, options, fallback) {
  let response;
  try {
    response = await authenticatedFetch(path, options);
  } catch {
    throw new Error(fallback);
  }
  if (response.status === 204) return null;

  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    throw new Error(typeof body?.detail === "string" ? body.detail : fallback);
  }
  return body;
}

export async function listFriends(signal) {
  const { friends } = await request(
    "/friendships/",
    { signal },
    "Não foi possível carregar seus amigos.",
  );
  return friends;
}

export function removeFriend(friendId) {
  return request(
    `/friendships/${friendId}`,
    { method: "DELETE" },
    "Não foi possível remover o amigo.",
  );
}

export function sendFriendRequest(userId) {
  return request(
    "/friendships/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    },
    "Não foi possível enviar o pedido de amizade.",
  );
}

export async function listFriendRequests(signal) {
  const { requests } = await request(
    "/friendships/requests",
    { signal },
    "Não foi possível carregar as solicitações de amizade.",
  );
  return requests;
}

export function acceptFriendRequest(requestId) {
  return request(
    `/friendships/requests/${requestId}/accept`,
    { method: "PATCH" },
    "Não foi possível aceitar a solicitação.",
  );
}

export function declineFriendRequest(requestId) {
  return request(
    `/friendships/requests/${requestId}`,
    { method: "DELETE" },
    "Não foi possível recusar a solicitação.",
  );
}

export async function listFriendMovies(friendId, status, signal) {
  const movies = [];
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const query = new URLSearchParams({ status, skip, limit: PAGE_SIZE });
    const { movies: page } = await request(
      `/friendships/${friendId}/movies?${query}`,
      { signal },
      "Não foi possível carregar os filmes do amigo.",
    );
    movies.push(...page);
    if (page.length < PAGE_SIZE) return movies;
  }
}
