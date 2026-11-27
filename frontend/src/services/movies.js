import { authenticatedFetch } from "./session";

const PAGE_SIZE = 10;

async function readMoviesResponse(response, fallback) {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    throw new Error(typeof body?.detail === "string" ? body.detail : fallback);
  }
  return body;
}

export async function getMovie(movieId, signal) {
  const response = await authenticatedFetch(`/movies/${movieId}`, { signal });
  return readMoviesResponse(response, "Não foi possível carregar o filme.");
}

async function saveMovie(path, method, values) {
  const fallback = "Não foi possível salvar o filme.";
  let response;
  try {
    response = await authenticatedFetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
  } catch {
    throw new Error(fallback);
  }
  return readMoviesResponse(response, fallback);
}

export function createMovie(values) {
  return saveMovie("/movies/", "POST", values);
}

export function updateMovie(movieId, changes) {
  return saveMovie(`/movies/${movieId}`, "PATCH", changes);
}

async function withStatus(movie, signal) {
  const response = await authenticatedFetch(`/movies/${movie.id}`, { signal });
  if (response.status === 404) return null;

  const { status } = await readMoviesResponse(
    response,
    "Não foi possível carregar o filme.",
  );
  return { ...movie, status };
}

export async function listMovies(signal) {
  const movies = [];
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const response = await authenticatedFetch(
      `/movies/?skip=${skip}&limit=${PAGE_SIZE}`,
      { signal },
    );
    const { movies: page } = await readMoviesResponse(
      response,
      "Não foi possível carregar seus filmes.",
    );
    const items = await Promise.all(
      page.map((movie) => withStatus(movie, signal)),
    );
    movies.push(...items.filter(Boolean));

    if (page.length < PAGE_SIZE) return movies;
  }
}
