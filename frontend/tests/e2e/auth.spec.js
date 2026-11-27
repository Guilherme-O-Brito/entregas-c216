import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { accessToken, SESSION_KEY, tokens } from "../helpers/auth.js";

async function readSession(page) {
  return page.evaluate((key) => {
    return JSON.parse(sessionStorage.getItem(key));
  }, SESSION_KEY);
}

async function saveSession(page, session) {
  await page.evaluate(
    ({ key, value }) => {
      sessionStorage.setItem(key, JSON.stringify(value));
    },
    { key: SESSION_KEY, value: session },
  );
}

async function openRegistration(page, email) {
  await page.getByRole("button", { name: "Criar uma conta" }).click();
  await page.getByLabel("Nome").fill("Usuário E2E");
  await page.getByLabel("E-mail").fill(email);
}

test("cadastra, faz login e restaura a sessão após recarregar", async ({
  page,
}) => {
  const email = `e2e-${randomUUID()}@example.com`;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await openRegistration(page, email);
  const password = page.getByLabel("Senha");
  await password.pressSequentially("curta");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(
    page.getByRole("heading", { name: "Criar conta" }),
  ).toBeVisible();
  expect(await password.evaluate((input) => input.validity.tooShort)).toBe(
    true,
  );

  await password.fill("secret123");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByRole("status")).toContainText("Conta criada.");
  await expect(page.getByLabel("E-mail")).toHaveValue(email);
  expect(await readSession(page)).toBeNull();

  await password.fill("errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "E-mail ou senha inválidos.",
  );
  await password.fill("secret123");
  const loginResponse = page.waitForResponse((response) => {
    return response.url().endsWith("/auth/login") && response.status() === 200;
  });
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(
    page.getByRole("heading", { name: "Meus filmes" }),
  ).toBeVisible();
  await expect(page.getByText("Nenhum filme nesta lista.")).toBeVisible();
  const session = await readSession(page);
  expect(session).toEqual({
    access_token: expect.any(String),
    refresh_token: expect.any(String),
  });

  const api = new URL("/movies/", (await loginResponse).url()).href;
  const cover = "https://images.example.com/arrival.png";
  await page.route(cover, (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSt8AAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  for (const movie of [
    { title: "Arrival", status: "quero_assistir", movie_cover: cover },
    { title: "Alien", status: "assistido" },
  ]) {
    const response = await page.request.post(api, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      data: movie,
    });
    expect(response.status()).toBe(201);
  }

  await page.reload();
  await expect(page).toHaveURL(/\/inicio$/);
  const arrival = page.getByRole("listitem").filter({ hasText: "Arrival" });
  await expect(arrival).toBeVisible();
  await expect(arrival.locator("img")).toHaveAttribute("src", cover);
  await expect(arrival.locator("img")).toHaveCSS("object-fit", "cover");

  await page.getByRole("button", { name: "Já assistidos" }).click();
  const alien = page.getByRole("listitem").filter({ hasText: "Alien" });
  await expect(alien.getByText("Sem capa")).toBeVisible();
  await expect(arrival).toHaveCount(0);
  expect(await readSession(page)).toEqual(session);

  const expiredAccess = accessToken(1);
  await saveSession(page, { ...session, access_token: expiredAccess });
  const refreshResponse = page.waitForResponse((response) => {
    return (
      response.url().endsWith("/auth/refresh") &&
      response.request().method() === "POST"
    );
  });
  await page.reload();
  expect((await refreshResponse).status()).toBe(200);
  await expect
    .poll(async () => (await readSession(page))?.access_token)
    .not.toBe(expiredAccess);
  expect((await readSession(page)).refresh_token).toBe(session.refresh_token);
  await expect(page).toHaveURL(/\/inicio$/);
});

test("sai da conta e continua no login após recarregar", async ({ page }) => {
  await page.goto("/");
  await openRegistration(page, `e2e-${randomUUID()}@example.com`);
  await page.getByLabel("Senha").fill("secret123");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByRole("status")).toContainText("Conta criada.");
  await page.getByLabel("Senha").fill("secret123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(
    page.getByRole("heading", { name: "Meus filmes" }),
  ).toBeVisible();
  expect(await readSession(page)).not.toBeNull();

  await page.getByRole("button", { name: "Sair" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toHaveValue("");
  expect(await readSession(page)).toBeNull();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  expect(await readSession(page)).toBeNull();
});

test("volta ao login quando a API rejeita o refresh token", async ({
  page,
}) => {
  await page.goto("/");
  await saveSession(page, tokens(1));

  await page.reload();

  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(await readSession(page)).toBeNull();
});

test("renova automaticamente após falha de rede sem perder a sessão", async ({
  page,
}) => {
  const now = Math.floor(Date.now() / 1000);
  await page.clock.install({ time: new Date(now * 1000) });
  await page.goto("/");
  const session = tokens(now + 10);
  const fresh = tokens(now + 3600);
  await saveSession(page, session);
  await page.route(
    (url) => url.pathname === "/movies/",
    (route) =>
      route.fulfill({
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Authorization",
        },
        json: { movies: [] },
      }),
  );
  const attempts = [];
  await page.route("**/auth/refresh", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
      return;
    }
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) {
      await route.abort("internetdisconnected");
      return;
    }
    await route.fulfill({
      headers: { "Access-Control-Allow-Origin": "*" },
      json: { access_token: fresh.access_token },
    });
  });
  await page.reload();
  await expect(page).toHaveURL(/\/inicio$/);

  await page.clock.fastForward(10_000);
  await expect.poll(() => attempts.length).toBe(1);
  await expect(page).toHaveURL(/\/inicio$/);
  expect(await readSession(page)).toEqual(session);

  await page.clock.fastForward(31_000);
  await expect.poll(() => readSession(page)).toEqual(fresh);
  expect(attempts).toEqual([
    { refresh_token: session.refresh_token },
    { refresh_token: session.refresh_token },
  ]);
  await expect(page).toHaveURL(/\/inicio$/);
});
