import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

async function signIn(page) {
  const password = "secret123";
  await page.goto("/");
  await page.getByRole("button", { name: "Criar uma conta" }).click();
  await page.getByLabel("Nome").fill("Usuário E2E");
  await page.getByLabel("E-mail").fill(`e2e-${randomUUID()}@example.com`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByRole("status")).toContainText("Conta criada.");
  await page.getByLabel("Senha").fill(password);
  const login = page.waitForResponse(
    (response) =>
      response.url().endsWith("/auth/login") && response.status() === 200,
  );
  await page.getByRole("button", { name: "Entrar" }).click();
  const loggedIn = await login;
  const { access_token: ownerToken } = await loggedIn.json();

  async function send(path, method, data, token) {
    const response = await page.request.fetch(
      new URL(path, loggedIn.url()).href,
      {
        method,
        data,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    expect(response.ok()).toBe(true);
    return response.json();
  }

  return { password, ownerToken, send };
}

test("abre os detalhes do filme do amigo e remove a amizade", async ({
  page,
}) => {
  const { password, ownerToken, send } = await signIn(page);
  const email = `e2e-${randomUUID()}@example.com`;
  const friend = await send("/auth/register", "POST", {
    name: "Ana",
    email,
    password,
  });
  const { access_token: friendToken } = await send("/auth/login", "POST", {
    email,
    password,
  });
  const request = await send(
    "/friendships/",
    "POST",
    { user_id: friend.id },
    ownerToken,
  );
  await send(
    `/friendships/requests/${request.id}/accept`,
    "PATCH",
    undefined,
    friendToken,
  );
  for (const movie of [
    { title: "Arrival", status: "quero_assistir" },
    { title: "Alien", status: "assistido", rating: 9, review: "Ótimo filme." },
  ]) {
    await send("/movies/", "POST", movie, friendToken);
  }

  const pending = await send("/auth/register", "POST", {
    name: "Pedido pendente",
    email: `e2e-${randomUUID()}@example.com`,
    password,
  });
  await send("/friendships/", "POST", { user_id: pending.id }, ownerToken);

  await page.getByRole("button", { name: "Amigos" }).click();
  await expect(page).toHaveURL(/\/inicio\/amigos$/);
  await expect(
    page.getByRole("button", { name: "Adicionar amigo" }),
  ).toBeEnabled();
  const card = page.getByRole("listitem").filter({ hasText: "Ana" });
  await expect(
    card.getByRole("button", { name: "Remover amigo" }),
  ).toBeEnabled();
  await expect(page.getByText("Pedido pendente")).toHaveCount(0);
  await card.getByRole("button", { name: "Ana" }).click();

  await expect(page).toHaveURL(/\/inicio\/amigos\/\d+\/filmes$/);
  await expect(
    page.getByRole("heading", { name: "Filmes de Ana" }),
  ).toBeVisible();
  await expect(page.getByText("Arrival")).toBeVisible();
  await expect(page.getByText("Alien")).toHaveCount(0);
  await page.getByRole("button", { name: "Já assistidos" }).click();
  await expect(page.getByText("Alien")).toBeVisible();
  await expect(page.getByText("Arrival")).toHaveCount(0);

  await page.getByRole("button", { name: "Alien" }).click();
  await expect(page).toHaveURL(
    /\/inicio\/amigos\/\d+\/filmes\/assistido\/\d+$/,
  );
  const detailsPath = new URL(page.url()).pathname;
  await expect(page.getByRole("heading", { name: "Alien" })).toBeVisible();
  await expect(page.getByText("Filme de Ana")).toBeVisible();
  await expect(page.getByText("9/10")).toBeVisible();
  await expect(page.getByText("Ótimo filme.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Alien" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(
    page.getByRole("heading", { name: "Filmes de Ana" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Já assistidos" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByRole("heading", { name: "Amigos" })).toBeVisible();
  await card.getByRole("button", { name: "Remover amigo" }).click();
  await expect(card).toHaveCount(0);
  await expect(
    page.getByText("Você ainda não tem amigos cadastrados."),
  ).toBeVisible();

  await page.goto(detailsPath);
  await expect(page.getByRole("alert")).toHaveText("Amigo não encontrado.");
  await expect(page.getByRole("heading", { name: "Alien" })).toHaveCount(0);
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByRole("heading", { name: "Amigos" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(
    page.getByRole("heading", { name: "Meus filmes" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/inicio$/);
});

test("pesquisa usuários, navega pelas páginas e envia um pedido pelo modal", async ({
  page,
}) => {
  const { password, ownerToken, send } = await signIn(page);
  const prefix = `Catálogo ${randomUUID().slice(0, 8)}`;
  const users = [];
  for (let index = 1; index <= 11; index += 1) {
    const name = `${prefix} ${String(index).padStart(2, "0")}`;
    const email = `e2e-${randomUUID()}@example.com`;
    const user = await send("/auth/register", "POST", {
      name,
      email,
      password,
    });
    users.push(user);
  }

  await page.getByRole("button", { name: "Amigos" }).click();
  await page.getByRole("button", { name: "Adicionar amigo" }).click();
  const dialog = page.getByRole("dialog", { name: "Adicionar amigos" });
  const search = dialog.getByRole("searchbox", { name: "Buscar por nome" });
  await search.fill(prefix);
  await expect(dialog.getByRole("listitem")).toHaveCount(10);
  await expect(dialog.getByText("Página 1")).toBeVisible();
  await dialog.getByRole("button", { name: "Próxima" }).click();
  await expect(dialog.getByText("Página 2")).toBeVisible();
  await expect(dialog.getByRole("listitem")).toHaveCount(1);
  await expect(dialog.getByRole("button", { name: "Próxima" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Anterior" }).click();
  await expect(dialog.getByRole("listitem")).toHaveCount(10);

  const target = users[10];
  await search.fill(target.name);
  const add = dialog.getByRole("button", { name: `Adicionar ${target.name}` });
  await expect(add).toBeVisible();
  await expect(dialog.getByRole("listitem")).toHaveCount(1);
  await add.click();
  await expect(dialog.getByRole("status")).toHaveText(
    `Pedido enviado para ${target.name}.`,
  );
  await expect(add).toHaveCount(0);
  await dialog.getByRole("button", { name: "Fechar" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByText("Você ainda não tem amigos cadastrados."),
  ).toBeVisible();

  const { access_token: targetToken } = await send("/auth/login", "POST", {
    email: target.email,
    password,
  });
  const { requests } = await send(
    "/friendships/requests",
    "GET",
    undefined,
    targetToken,
  );
  const owner = await send("/auth/me", "GET", undefined, ownerToken);
  expect(requests).toEqual([
    expect.objectContaining({ requested_by_id: owner.id }),
  ]);
});
