import { describe, expect, it } from "vitest";
import { validateItem } from "../../src/validation";

describe("validateItem", () => {
  it("valida nome obrigatório e tamanho máximo", () => {
    expect(
      validateItem({ name: "   ", description: "" }).errors.name,
    ).toBeDefined();
    expect(
      validateItem({ name: "a".repeat(101), description: "" }).errors.name,
    ).toBeDefined();
    expect(
      validateItem({ name: "a".repeat(100), description: "" }).errors,
    ).toEqual({});
  });

  it("remove espaços dos valores", () => {
    expect(
      validateItem({ name: " Item ", description: " Descrição " }).values,
    ).toEqual({ name: "Item", description: "Descrição" });
  });
});
