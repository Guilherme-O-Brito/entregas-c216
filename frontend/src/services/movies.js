import { authenticatedFetch } from "./session";

const PAGE_SIZE = 10;

async function readMoviesResponse(response) {
  if (!response.ok) throw new Error("Não foi possível carregar seus filmes.");
  return response.json();
}

async function withStatus(movie, signal) {
  const response = await authenticatedFetch(`/movies/${movie.id}`, { signal });
  if (response.status === 404) return null;

  const { status } = await readMoviesResponse(response);
  return { ...movie, status };
}

export async function listMovies(signal) {
  const movies = [];
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const response = await authenticatedFetch(
      `/movies/?skip=${skip}&limit=${PAGE_SIZE}`,
      { signal },
    );
    const { movies: page } = await readMoviesResponse(response);
    const items = await Promise.all(
      page.map((movie) => withStatus(movie, signal)),
    );
    movies.push(...items.filter(Boolean));

    if (page.length < PAGE_SIZE) return movies;
  }
}
