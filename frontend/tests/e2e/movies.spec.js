import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("cadastra, abre o detalhe, edita e volta à aba anterior", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Criar uma conta" }).click();
  await page.getByLabel("Nome").fill("Usuário E2E");
  await page.getByLabel("E-mail").fill(`e2e-${randomUUID()}@example.com`);
  await page.getByLabel("Senha").fill("secret123");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByRole("status")).toContainText("Conta criada.");
  await page.getByLabel("Senha").fill("secret123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio$/);

  const newMovie = page.getByRole("button", { name: "Novo filme" });
  await newMovie.click();
  const create = page.getByRole("dialog", { name: "Novo filme" });
  await expect(create.getByLabel("Status")).toHaveValue("quero_assistir");
  await page.keyboard.press("Escape");
  await expect(create).toHaveCount(0);

  const watched = page.getByRole("button", { name: "Já assistidos" });
  await watched.click();
  await newMovie.click();
  await expect(create.getByLabel("Status")).toHaveValue("assistido");
  await create.getByLabel("Título").fill("Arrival");
  await create.getByLabel("Nota (0 a 10)").fill("11");
  await create.getByRole("button", { name: "Cadastrar filme" }).click();
  await expect(create).toBeVisible();
  expect(
    await create
      .getByLabel("Nota (0 a 10)")
      .evaluate((input) => input.validity.rangeOverflow),
  ).toBe(true);

  const cover = "https://images.example.com/arrival.jpg";
  await page.route(cover, (route) => route.abort());
  await create.getByLabel("Nota (0 a 10)").fill("8");
  await create.getByLabel("Resenha").fill("Ficção científica");
  await create.getByLabel("Link da capa").fill(cover);
  await create.getByRole("button", { name: "Cadastrar filme" }).click();
  await expect(create).toHaveCount(0);
  await page.getByRole("button", { name: "Arrival" }).click();

  await expect(page).toHaveURL(/\/inicio\/filmes\/\d+$/);
  await expect(page.getByRole("heading", { name: "Arrival" })).toBeVisible();
  await expect(page.getByText("8/10")).toBeVisible();
  await expect(page.getByText("Ficção científica")).toBeVisible();
  await expect(page.getByRole("link", { name: cover })).toHaveAttribute(
    "href",
    cover,
  );

  const edit = page.getByRole("dialog", { name: "Editar filme" });
  await page.getByRole("button", { name: "Editar" }).click();
  await expect(edit.getByLabel("Título")).toHaveValue("Arrival");
  await edit.getByLabel("Título").fill("A Chegada");
  await edit.getByLabel("Nota (0 a 10)").fill("10");
  await edit.getByLabel("Resenha").fill("Minha resenha atualizada");
  await edit.getByLabel("Link da capa").clear();
  await edit.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("heading", { name: "A Chegada" })).toBeVisible();
  await expect(page.getByText("10/10")).toBeVisible();
  await expect(page.getByText("Nenhum link cadastrado")).toBeVisible();
  await expect(page.getByText("Minha resenha atualizada")).toBeVisible();

  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(watched).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "A Chegada" }).click();

  await page.getByRole("button", { name: "Editar" }).click();
  await edit.getByLabel("Status").selectOption("quero_assistir");
  await expect(edit.getByLabel("Resenha")).toBeHidden();
  await edit.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Sem nota")).toBeVisible();
  await expect(page.getByText("Sem resenha")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "A Chegada" })).toBeVisible();
  await expect(page.getByText("Quero assistir")).toBeVisible();
  await expect(page.getByText("Sem nota")).toBeVisible();
  await expect(page.getByText("Sem resenha")).toBeVisible();
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.getByRole("button", { name: "A Chegada" })).toBeVisible();
});
