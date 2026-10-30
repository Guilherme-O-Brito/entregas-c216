import { expect, test } from "@playwright/test";

test("valida e cadastra um item", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Gerenciador de Itens" }),
  ).toBeVisible();
  await expect(page.getByText("Nenhum item cadastrado.")).toBeVisible();
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByRole("alert")).toHaveText("O nome é obrigatório.");
  await page.getByLabel("Nome").fill("Notebook");
  await page.getByLabel("Descrição").fill("14 polegadas");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByRole("listitem")).toContainText("Notebook");
  await expect(page.getByRole("listitem")).toContainText("14 polegadas");
  await expect(page.getByText("Nenhum item cadastrado.")).toBeHidden();
});
