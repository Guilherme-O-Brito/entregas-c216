import { beforeEach, expect, it, vi } from "vitest";
import {
  acceptFriendRequest,
  declineFriendRequest,
  listFriendMovies,
  listFriendRequests,
  listFriends,
  removeFriend,
  sendFriendRequest,
} from "../../src/services/friends";
import { authenticatedFetch } from "../../src/services/session";
import { jsonResponse } from "../helpers/auth";

vi.mock("../../src/services/session", () => ({ authenticatedFetch: vi.fn() }));

beforeEach(() => vi.mocked(authenticatedFetch).mockReset());

it("carrega os amigos pela rota de amizades", async () => {
  const friends = [{ id: 2, name: "Ana" }];
  vi.mocked(authenticatedFetch).mockResolvedValueOnce(
    jsonResponse({ friends }),
  );
  const { signal } = new AbortController();

  await expect(listFriends(signal)).resolves.toEqual(friends);
  expect(authenticatedFetch).toHaveBeenCalledExactlyOnceWith("/friendships/", {
    signal,
  });
});

it("mantém o status solicitado em todas as páginas de filmes do amigo", async () => {
  const first = Array.from({ length: 10 }, (_, index) => ({ id: index + 1 }));
  const second = [{ id: 11 }];
  vi.mocked(authenticatedFetch)
    .mockResolvedValueOnce(jsonResponse({ movies: first }))
    .mockResolvedValueOnce(jsonResponse({ movies: second }));
  const { signal } = new AbortController();

  await expect(listFriendMovies(2, "assistido", signal)).resolves.toEqual([
    ...first,
    ...second,
  ]);
  expect(authenticatedFetch).toHaveBeenCalledTimes(2);
  expect(authenticatedFetch).toHaveBeenNthCalledWith(
    1,
    "/friendships/2/movies?status=assistido&skip=0&limit=10",
    { signal },
  );
  expect(authenticatedFetch).toHaveBeenNthCalledWith(
    2,
    "/friendships/2/movies?status=assistido&skip=10&limit=10",
    { signal },
  );
});

it("propaga a mensagem da API quando o amigo não pode ser consultado", async () => {
  vi.mocked(authenticatedFetch).mockResolvedValueOnce(
    jsonResponse({ detail: "Amigo não encontrado." }, 404),
  );

  await expect(listFriendMovies(2, "quero_assistir")).rejects.toThrow(
    "Amigo não encontrado.",
  );
});

it("remove a amizade pelo ID do amigo e aceita uma resposta vazia", async () => {
  vi.mocked(authenticatedFetch).mockResolvedValueOnce(
    new Response(null, { status: 204 }),
  );

  await expect(removeFriend(2)).resolves.toBeNull();
  expect(authenticatedFetch).toHaveBeenCalledExactlyOnceWith("/friendships/2", {
    method: "DELETE",
  });
});

it("informa a falha ao remover um amigo", async () => {
  vi.mocked(authenticatedFetch).mockRejectedValueOnce(new Error("offline"));

  await expect(removeFriend(2)).rejects.toThrow(
    "Não foi possível remover o amigo.",
  );
});

it("envia o pedido pela rota de amizade com o ID do destinatário", async () => {
  vi.mocked(authenticatedFetch).mockResolvedValueOnce(
    jsonResponse({ id: 1 }, 201),
  );

  await expect(sendFriendRequest(2)).resolves.toEqual({ id: 1 });
  expect(authenticatedFetch).toHaveBeenCalledExactlyOnceWith("/friendships/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: 2 }),
  });
});

it("busca as solicitações de amizade recebidas", async () => {
  const requests = [{ id: 3, requested_by_id: 2, requested_by_name: "Ana" }];
  vi.mocked(authenticatedFetch).mockResolvedValueOnce(
    jsonResponse({ requests }),
  );
  const { signal } = new AbortController();

  await expect(listFriendRequests(signal)).resolves.toEqual(requests);
  expect(authenticatedFetch).toHaveBeenCalledExactlyOnceWith(
    "/friendships/requests",
    { signal },
  );
});

it("aceita uma solicitação pelo ID do pedido", async () => {
  const accepted = { id: 3, status: "accepted" };
  vi.mocked(authenticatedFetch).mockResolvedValueOnce(jsonResponse(accepted));

  await expect(acceptFriendRequest(3)).resolves.toEqual(accepted);
  expect(authenticatedFetch).toHaveBeenCalledExactlyOnceWith(
    "/friendships/requests/3/accept",
    { method: "PATCH" },
  );
});

it("recusa uma solicitação e aceita a resposta 204", async () => {
  vi.mocked(authenticatedFetch).mockResolvedValueOnce(
    new Response(null, { status: 204 }),
  );

  await expect(declineFriendRequest(3)).resolves.toBeNull();
  expect(authenticatedFetch).toHaveBeenCalledExactlyOnceWith(
    "/friendships/requests/3",
    { method: "DELETE" },
  );
});
