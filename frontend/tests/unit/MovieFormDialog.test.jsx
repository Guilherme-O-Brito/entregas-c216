import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { MovieFormDialog } from "../../src/components/MovieFormDialog";

const watched = {
  id: 1,
  title: "Arrival",
  status: "assistido",
  movie_cover: "https://images.example.com/arrival.jpg",
  rating: 9,
  review: "Ótimo filme",
};

it("rejeita título em branco e links de capa fora de HTTP e HTTPS", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(<MovieFormDialog onSave={onSave} />);
  const title = screen.getByLabelText("Título");
  const submit = screen.getByRole("button", { name: "Cadastrar filme" });

  await user.type(title, "   ");
  await user.click(submit);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Informe o título do filme.",
  );

  await user.clear(title);
  await user.type(title, "Arrival");
  await user.type(
    screen.getByLabelText("Link da capa"),
    "ftp://example.com/cover",
  );
  await user.click(submit);

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Informe um link HTTP ou HTTPS",
  );
  expect(onSave).not.toHaveBeenCalled();
});

it("envia o cadastro assistido com nota zero e resenha", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <MovieFormDialog
      initialStatus="assistido"
      onSave={onSave}
      onClose={onClose}
    />,
  );

  await user.type(screen.getByLabelText("Título"), " Arrival ");
  await user.type(screen.getByLabelText("Nota (0 a 10)"), "0");
  await user.type(screen.getByLabelText("Resenha"), "Minha resenha");
  await user.click(screen.getByRole("button", { name: "Cadastrar filme" }));

  expect(onSave).toHaveBeenCalledExactlyOnceWith({
    title: "Arrival",
    status: "assistido",
    movie_cover: null,
    rating: 0,
    review: "Minha resenha",
  });
  expect(onClose).toHaveBeenCalledOnce();
});

it("envia apenas o campo editado e usa null quando a capa é removida", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(<MovieFormDialog movie={watched} onSave={onSave} onClose={vi.fn()} />);

  expect(screen.getByLabelText("Título")).toHaveValue(watched.title);
  expect(screen.getByLabelText("Nota (0 a 10)")).toHaveValue(watched.rating);
  expect(screen.getByLabelText("Resenha")).toHaveValue(watched.review);
  await user.clear(screen.getByLabelText("Link da capa"));
  await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

  expect(onSave).toHaveBeenCalledExactlyOnceWith({ movie_cover: null });
});

it("limpa nota e resenha quando o filme volta para quero assistir", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(<MovieFormDialog movie={watched} onSave={onSave} onClose={vi.fn()} />);

  await user.selectOptions(screen.getByLabelText("Status"), "quero_assistir");
  expect(screen.getByLabelText("Nota (0 a 10)")).not.toBeVisible();
  expect(screen.getByLabelText("Resenha")).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

  expect(onSave).toHaveBeenCalledExactlyOnceWith({
    status: "quero_assistir",
    rating: null,
    review: null,
  });
});

it("fecha o modal sem salvar quando nada mudou", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<MovieFormDialog movie={watched} onSave={onSave} onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

  expect(onSave).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledOnce();
});
