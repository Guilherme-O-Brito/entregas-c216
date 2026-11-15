import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import App from "../../src/App";

afterEach(() => vi.unstubAllGlobals());
const response = (data, ok = true) => ({ ok, json: async () => data });

it("carrega e cadastra usuários pela API", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(response({ users: [] }))
    .mockResolvedValueOnce(
      response({
        id: 1,
        name: "Alice",
        email: "alice@example.com",
        admin: false,
      }),
    );
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<App />);
  expect(screen.getByText("Carregando usuários...")).toBeInTheDocument();
  expect(
    await screen.findByText("Nenhum usuário cadastrado."),
  ).toBeInTheDocument();
  await user.type(screen.getByLabelText("Nome"), "Alice");
  await user.type(screen.getByLabelText("E-mail"), "alice@example.com");
  await user.type(screen.getByLabelText("Senha"), "password123");
  await user.click(screen.getByRole("button", { name: "Adicionar" }));
  expect(await screen.findByText("alice@example.com")).toBeInTheDocument();
  expect(screen.getByLabelText("Nome")).toHaveValue("");
  expect(fetchMock.mock.calls[1][1]).toMatchObject({
    method: "POST",
    body: JSON.stringify({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
      admin: false,
    }),
  });
});

it("mostra erro de conexão na listagem", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível conectar à API.",
  );
});

it("exibe o erro de cadastro e mantém os dados", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response({ users: [] }))
      .mockResolvedValueOnce(
        response({ detail: "E-mail já cadastrado." }, false),
      ),
  );
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("Nenhum usuário cadastrado.");
  await user.type(screen.getByLabelText("Nome"), "Alice");
  await user.type(screen.getByLabelText("E-mail"), "alice@example.com");
  await user.type(screen.getByLabelText("Senha"), "password123");
  await user.click(screen.getByRole("button", { name: "Adicionar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "E-mail já cadastrado.",
  );
  expect(screen.getByLabelText("Nome")).toHaveValue("Alice");
});

it("exibe usuários retornados pela API", async () => {
  const data = {
    users: [{ id: 1, name: "Alice", email: "alice@example.com", admin: true }],
  };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(data)));
  render(<App />);
  expect(await screen.findByText("alice@example.com")).toBeInTheDocument();
});
