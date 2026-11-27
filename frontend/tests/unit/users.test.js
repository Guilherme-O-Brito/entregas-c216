import { beforeEach, expect, it, vi } from "vitest";
import { authenticatedFetch } from "../../src/services/session";
import { getCurrentUser, listUsers } from "../../src/services/users";
import { jsonResponse } from "../helpers/auth";

vi.mock("../../src/services/session", () => ({ authenticatedFetch: vi.fn() }));

beforeEach(() => vi.mocked(authenticatedFetch).mockReset());

it("carrega o perfil autenticado para identificar a própria conta", async () => {
  const user = { id: 1, name: "Alice", email: "alice@example.com" };
  vi.mocked(authenticatedFetch).mockResolvedValueOnce(jsonResponse(user));
  const { signal } = new AbortController();

  await expect(getCurrentUser(signal)).resolves.toEqual(user);
  expect(authenticatedFetch).toHaveBeenCalledExactlyOnceWith("/auth/me", {
    signal,
  });
});

it("usa o nome e o deslocamento ao pesquisar usuários", async () => {
  const users = [{ id: 11, name: "Ana Maria" }];
  vi.mocked(authenticatedFetch).mockResolvedValueOnce(jsonResponse({ users }));
  const { signal } = new AbortController();

  await expect(
    listUsers({ name: " Ana Maria ", page: 1, signal }),
  ).resolves.toEqual({
    users,
    hasNext: false,
  });
  expect(authenticatedFetch).toHaveBeenCalledExactlyOnceWith(
    "/users/?skip=10&limit=10&name=Ana+Maria",
    { signal },
  );
});

it.each([true, false])(
  "confere a existência de mais usuários após uma página cheia: %s",
  async (hasNext) => {
    const users = Array.from({ length: 10 }, (_, index) => ({ id: index + 1 }));
    vi.mocked(authenticatedFetch)
      .mockResolvedValueOnce(jsonResponse({ users }))
      .mockResolvedValueOnce(
        jsonResponse({ users: hasNext ? [{ id: 11 }] : [] }),
      );
    const { signal } = new AbortController();

    await expect(listUsers({ name: " ", page: 0, signal })).resolves.toEqual({
      users,
      hasNext,
    });
    expect(authenticatedFetch).toHaveBeenNthCalledWith(
      1,
      "/users/?skip=0&limit=10",
      { signal },
    );
    expect(authenticatedFetch).toHaveBeenNthCalledWith(
      2,
      "/users/?skip=10&limit=1",
      { signal },
    );
  },
);
