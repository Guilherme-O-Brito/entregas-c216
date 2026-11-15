import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ItemForm } from "../../src/components/ItemForm";

it("mostra erros e não envia campos inválidos", async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(<ItemForm onAdd={onAdd} />);
  await user.click(screen.getByRole("button", { name: "Adicionar" }));
  expect(screen.getByText("O nome é obrigatório.")).toBeInTheDocument();
  expect(onAdd).not.toHaveBeenCalled();
});
