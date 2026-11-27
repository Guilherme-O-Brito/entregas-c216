import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { jsonResponse, SESSION_KEY, tokens } from "../helpers/auth";

const session = tokens();
const watched = {
  id: 1,
  user_id: 1,
  title: "Arrival",
  status: "assistido",
  movie_cover: "https://images.example.com/arrival.jpg",
  rating: 9,
  review: "Ótimo filme",
};

beforeEach(() => {
  vi.resetModules();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.history.replaceState(null, "", "/inicio");
});

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

async function renderApp() {
  const { default: App } = await import("../../src/App");
  return render(<App />);
}

function mockMovies(initialMovies = []) {
  const movies = new Map(initialMovies.map((movie) => [movie.id, movie]));
  const create = vi.fn((values) => {
    const id = movies.size + 1;
    const movie = { ...values, id, user_id: 1 };
    movies.set(id, movie);
    return jsonResponse(movie, 201);
  });
  const update = vi.fn((id, changes) => {
    const movie = { ...movies.get(id), ...changes };
    movies.set(id, movie);
    return jsonResponse(movie);
  });
  const get = vi.fn((id) => {
    const movie = movies.get(id);
    return movie
      ? jsonResponse(movie)
      : jsonResponse({ detail: "Filme não encontrado." }, 404);
  });
  vi.stubGlobal("fetch", async (url, { method = "GET", body, headers }) => {
    expect(headers.get("Authorization")).toBe(`Bearer ${session.access_token}`);
    const { pathname } = new URL(url);
    if (pathname === "/movies/") {
      if (method === "POST") return create(JSON.parse(body));
      return jsonResponse({
        movies: Array.from(movies.values(), ({ id, title, movie_cover }) => ({
          id,
          title,
          movie_cover,
        })),
      });
    }
    const id = Number(pathname.split("/").at(-1));
    return method === "PATCH" ? update(id, JSON.parse(body)) : get(id);
  });
  return { create, update, get };
}

it("abre o novo filme nas duas abas e mostra o cadastro na aba escolhida no modal", async () => {
  const user = userEvent.setup();
  const { create } = mockMovies();
  await renderApp();
  const open = screen.getByRole("button", { name: "Novo filme" });

  await user.click(open);
  let dialog = within(screen.getByRole("dialog", { name: "Novo filme" }));
  expect(dialog.getByLabelText("Status")).toHaveValue("quero_assistir");
  expect(dialog.getByLabelText("Nota (0 a 10)")).not.toBeVisible();
  await user.click(dialog.getByRole("button", { name: "Cancelar" }));
  expect(create).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Já assistidos" }));
  await user.click(open);
  dialog = within(screen.getByRole("dialog", { name: "Novo filme" }));
  expect(dialog.getByLabelText("Status")).toHaveValue("assistido");
  await user.type(dialog.getByLabelText("Título"), "Alien");
  await user.selectOptions(dialog.getByLabelText("Status"), "quero_assistir");
  await user.click(dialog.getByRole("button", { name: "Cadastrar filme" }));

  expect(await screen.findByRole("button", { name: "Alien" })).toBeVisible();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Quero assistir" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(create).toHaveBeenCalledExactlyOnceWith({
    title: "Alien",
    status: "quero_assistir",
    movie_cover: null,
    rating: null,
    review: null,
  });
});

it("lê o detalhe pela API, salva apenas a alteração e volta à aba anterior", async () => {
  const user = userEvent.setup();
  const { get, update } = mockMovies([watched]);
  await renderApp();
  await user.click(screen.getByRole("button", { name: "Já assistidos" }));
  await user.click(await screen.findByRole("button", { name: "Arrival" }));

  expect(await screen.findByRole("heading", { name: "Arrival" })).toBeVisible();
  expect(window.location.pathname).toBe("/inicio/filmes/1");
  expect(get).toHaveBeenCalledTimes(2);
  expect(screen.getByText("Já assistido")).toBeVisible();
  expect(screen.getByText("9/10")).toBeVisible();
  expect(screen.getByText("Ótimo filme")).toBeVisible();
  expect(
    screen.getByRole("link", { name: watched.movie_cover }),
  ).toHaveAttribute("href", watched.movie_cover);

  await user.click(screen.getByRole("button", { name: "Editar" }));
  const dialog = within(screen.getByRole("dialog", { name: "Editar filme" }));
  expect(dialog.getByLabelText("Título")).toHaveValue("Arrival");
  expect(dialog.getByLabelText("Nota (0 a 10)")).toHaveValue(9);
  await user.clear(dialog.getByLabelText("Título"));
  await user.type(dialog.getByLabelText("Título"), "A Chegada");
  await user.click(dialog.getByRole("button", { name: "Salvar alterações" }));

  expect(
    await screen.findByRole("heading", { name: "A Chegada" }),
  ).toBeVisible();
  expect(update).toHaveBeenCalledExactlyOnceWith(1, { title: "A Chegada" });
  expect(screen.getByText("9/10")).toBeVisible();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Voltar" }));
  expect(
    await screen.findByRole("button", { name: "A Chegada" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Já assistidos" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(window.location.pathname).toBe("/inicio");
});

it("mantém o modal e os dados preenchidos quando o cadastro falha", async () => {
  const user = userEvent.setup();
  const { create } = mockMovies();
  create.mockImplementationOnce(() =>
    jsonResponse({ detail: "Não foi possível cadastrar o filme." }, 503),
  );
  await renderApp();
  await user.click(screen.getByRole("button", { name: "Novo filme" }));
  const dialog = within(screen.getByRole("dialog", { name: "Novo filme" }));
  await user.type(dialog.getByLabelText("Título"), "Alien");
  await user.click(dialog.getByRole("button", { name: "Cadastrar filme" }));

  expect(await dialog.findByRole("alert")).toHaveTextContent(
    "Não foi possível cadastrar o filme.",
  );
  expect(dialog.getByLabelText("Título")).toHaveValue("Alien");
});

it("abre um detalhe direto, exibe o erro da API e permite voltar à lista", async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, "", "/inicio/filmes/99");
  const { get } = mockMovies();
  await renderApp();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Filme não encontrado.",
  );
  expect(get).toHaveBeenCalledExactlyOnceWith(99);
  expect(
    screen.queryByRole("button", { name: "Editar" }),
  ).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Voltar" }));
  await waitFor(() => expect(window.location.pathname).toBe("/inicio"));
  expect(screen.getByRole("heading", { name: "Meus filmes" })).toBeVisible();
});
