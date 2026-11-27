import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { AuthForm } from "../../src/components/AuthForm";

it("exige e-mail e senha antes de enviar o login", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<AuthForm onSubmit={onSubmit} />);

  await user.click(screen.getByRole("button", { name: "Entrar" }));
  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByLabelText("E-mail")).toBeInvalid();
  expect(screen.getByLabelText("Senha")).toBeInvalid();

  await user.type(screen.getByLabelText("E-mail"), "invalido");
  await user.type(screen.getByLabelText("Senha"), "secret123");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  expect(onSubmit).not.toHaveBeenCalled();
});

it("rejeita nome composto apenas por espaços no cadastro", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<AuthForm registering onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText("Nome"), "   ");
  await user.type(screen.getByLabelText("E-mail"), "alice@example.com");
  await user.type(screen.getByLabelText("Senha"), "secret123");
  await user.click(screen.getByRole("button", { name: "Cadastrar" }));

  expect(screen.getByRole("alert")).toHaveTextContent("Informe seu nome.");
  expect(onSubmit).not.toHaveBeenCalled();
});

it("bloqueia os botões enquanto o login está em andamento", async () => {
  const user = userEvent.setup();
  const submission = Promise.withResolvers();
  const onChangeMode = vi.fn();
  const onSubmit = vi.fn(() => submission.promise);
  render(
    <AuthForm
      initialEmail="alice@example.com"
      onSubmit={onSubmit}
      onChangeMode={onChangeMode}
    />,
  );
  await user.type(screen.getByLabelText("Senha"), " secret123 ");
  await user.click(screen.getByRole("button", { name: "Entrar" }));

  expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
    email: "alice@example.com",
    password: " secret123 ",
  });
  expect(screen.getByRole("button", { name: "Aguarde..." })).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Criar uma conta" }),
  ).toBeDisabled();

  submission.resolve();
  expect(await screen.findByRole("button", { name: "Entrar" })).toBeEnabled();
});
