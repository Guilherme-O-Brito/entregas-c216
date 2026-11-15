import { expect, test } from "@playwright/test";

test("cadastra um usuário e mantém os dados após recarregar", async ({
  page,
}) => {
  const email = `teste-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await page.goto("/");
  await page.getByLabel("Nome").fill("Usuário E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("password123");
  await page.getByRole("button", { name: "Adicionar" }).click();
  const user = page.getByRole("listitem").filter({ hasText: email });
  await expect(user).toBeVisible();
  await page.reload();
  await expect(user).toBeVisible();
});
