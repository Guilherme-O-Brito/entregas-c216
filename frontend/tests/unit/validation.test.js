import { describe, expect, it } from "vitest";
import { validateUser } from "../../src/validation";

describe("validateUser", () => {
  const user = {
    name: " Alice ",
    email: " ALICE@EXAMPLE.COM ",
    password: "password123",
    admin: false,
  };
  it("valida os campos exigidos", () => {
    expect(
      validateUser({ ...user, name: "", email: "invalid", password: "short" })
        .errors,
    ).toEqual({
      name: "O nome é obrigatório.",
      email: "Informe um e-mail válido.",
      password: "A senha deve ter entre 8 e 32 caracteres.",
    });
    expect(
      validateUser({ ...user, name: "a".repeat(101) }).errors.name,
    ).toBeDefined();
  });
  it("normaliza nome e e-mail", () => {
    expect(validateUser(user)).toEqual({
      errors: {},
      values: { ...user, name: "Alice", email: "alice@example.com" },
    });
  });
});
