import { beforeEach, expect, it, vi } from "vitest";
import { listFriendMovies, listFriends } from "../../src/services/friends";
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
