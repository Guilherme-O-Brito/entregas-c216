import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { jsonResponse, SESSION_KEY, tokens } from "../helpers/auth";

const session = tokens();
const viewer = { id: 1, name: "Minha conta" };
const friend = { id: 2, name: "Amigo atual" };

beforeEach(() => {
  vi.resetModules();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.history.replaceState(null, "", "/inicio/amigos");
});

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

function mockDirectory(users) {
  const requests = vi.fn(() =>
    jsonResponse({ id: 20, status: "pending" }, 201),
  );
  const directory = vi.fn(({ skip, limit, name }) => {
    const matches = name
      ? users.filter((user) =>
          user.name.toLowerCase().includes(name.toLowerCase()),
        )
      : users;
    return jsonResponse({ users: matches.slice(skip, skip + limit) });
  });
  const fetchMock = vi.fn(async (url, { headers, method, body }) => {
    expect(headers.get("Authorization")).toBe(`Bearer ${session.access_token}`);
    const { pathname, searchParams } = new URL(url);
    if (pathname === "/auth/me") return jsonResponse(viewer);
    if (pathname === "/friendships/" && method === "POST") {
      return requests(JSON.parse(body));
    }
    if (pathname === "/friendships/")
      return jsonResponse({ friends: [friend] });
    if (pathname === "/users/") {
      return directory({
        skip: Number(searchParams.get("skip")),
        limit: Number(searchParams.get("limit")),
        name: searchParams.get("name"),
      });
    }
    throw new Error(`Rota inesperada: ${pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { directory, fetchMock, requests };
}

async function openDialog(user) {
  const { default: App } = await import("../../src/App");
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Adicionar amigo" }));
  return within(screen.getByRole("dialog", { name: "Adicionar amigos" }));
}

it("pesquisa usuários e volta à primeira página quando o nome muda", async () => {
  const user = userEvent.setup();
  const entries = Array.from({ length: 11 }, (_, index) => ({
    id: index + 3,
    name: `Candidato ${String(index + 1).padStart(2, "0")}`,
  }));
  const { directory, fetchMock } = mockDirectory([viewer, friend, ...entries]);
  const dialog = await openDialog(user);

  expect(
    await dialog.findByRole("button", { name: "Adicionar Candidato 01" }),
  ).toBeVisible();
  expect(dialog.queryByText(viewer.name)).toBeNull();
  expect(dialog.queryByText(friend.name)).toBeNull();
  expect(dialog.getAllByRole("listitem")).toHaveLength(8);
  expect(dialog.getByRole("button", { name: "Anterior" })).toBeDisabled();
  await user.click(dialog.getByRole("button", { name: "Próxima" }));
  expect(
    await dialog.findByRole("button", { name: "Adicionar Candidato 11" }),
  ).toBeVisible();
  expect(dialog.getByText("Página 2")).toBeVisible();
  expect(dialog.getByRole("button", { name: "Próxima" })).toBeDisabled();

  await user.type(
    dialog.getByRole("searchbox", { name: "Buscar por nome" }),
    "candidato 11",
  );

  expect(
    await dialog.findByRole("button", { name: "Adicionar Candidato 11" }),
  ).toBeVisible();
  expect(dialog.getByText("Página 1")).toBeVisible();
  expect(dialog.getAllByRole("listitem")).toHaveLength(1);
  expect(directory).toHaveBeenLastCalledWith({
    skip: 0,
    limit: 10,
    name: "candidato 11",
  });
  expect(
    fetchMock.mock.calls.filter(([url]) => url.endsWith("/auth/me")),
  ).toHaveLength(1);
});

it("envia o pedido para a pessoa selecionada e não a inclui entre os amigos", async () => {
  const user = userEvent.setup();
  const { requests, fetchMock } = mockDirectory([
    viewer,
    { id: 7, name: "Ana" },
  ]);
  const dialog = await openDialog(user);
  await user.click(
    await dialog.findByRole("button", { name: "Adicionar Ana" }),
  );

  expect(await dialog.findByText("Pedido enviado para Ana.")).toBeVisible();
  expect(requests).toHaveBeenCalledExactlyOnceWith({ user_id: 7 });
  expect(dialog.queryByRole("button", { name: "Adicionar Ana" })).toBeNull();
  await user.click(dialog.getByRole("button", { name: "Fechar" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByRole("button", { name: "Ana" })).toBeNull();
  expect(screen.queryByText("Pedido enviado para Ana.")).toBeNull();
  expect(
    fetchMock.mock.calls.some(([url]) => url.includes("/friendships/requests")),
  ).toBe(false);
});

it("exibe o erro da API e mantém o resultado se o pedido falhar", async () => {
  const user = userEvent.setup();
  const { requests } = mockDirectory([{ id: 7, name: "Ana" }]);
  requests.mockReturnValueOnce(
    jsonResponse({ detail: "Já existe um pedido." }, 409),
  );
  const dialog = await openDialog(user);
  await user.click(
    await dialog.findByRole("button", { name: "Adicionar Ana" }),
  );

  expect(await dialog.findByRole("alert")).toHaveTextContent(
    "Já existe um pedido.",
  );
  expect(dialog.getByRole("button", { name: "Adicionar Ana" })).toBeEnabled();
});

it("permite tentar carregar usuários novamente após uma falha", async () => {
  const user = userEvent.setup();
  const { directory } = mockDirectory([{ id: 7, name: "Ana" }]);
  directory.mockReturnValueOnce(jsonResponse({}, 503));
  const dialog = await openDialog(user);

  expect(await dialog.findByRole("alert")).toHaveTextContent(
    "Não foi possível carregar os usuários.",
  );
  await user.click(dialog.getByRole("button", { name: "Tentar novamente" }));
  expect(
    await dialog.findByRole("button", { name: "Adicionar Ana" }),
  ).toBeVisible();
  await waitFor(() => expect(directory).toHaveBeenCalledTimes(2));
});
