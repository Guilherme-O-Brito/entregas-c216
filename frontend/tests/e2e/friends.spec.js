import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("lista amigos aceitos e abre os filmes deles com os dois filtros", async ({
  page,
}) => {
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
    { title: "Alien", status: "assistido" },
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
  ).toBeDisabled();
  const card = page.getByRole("listitem").filter({ hasText: "Ana" });
  await expect(
    card.getByRole("button", { name: "Remover amigo" }),
  ).toBeDisabled();
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

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Filmes de Ana" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByRole("heading", { name: "Amigos" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(
    page.getByRole("heading", { name: "Meus filmes" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/inicio$/);
});
