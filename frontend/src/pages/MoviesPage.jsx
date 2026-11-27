import { useEffect, useState } from "react";
import { MovieCard } from "../components/MovieCard";
import { MovieFormDialog } from "../components/MovieFormDialog";
import { MOVIES_PATH, movieIdFromPath, moviePath } from "../moviePaths";
import { createMovie, listMovies } from "../services/movies";
import { MovieDetailsPage } from "./MovieDetailsPage";

const filters = [
  { value: "quero_assistir", label: "Quero assistir" },
  { value: "assistido", label: "Já assistidos" },
];

export function MoviesPage({ onLogout }) {
  const [status, setStatus] = useState("quero_assistir");
  const [list, setList] = useState({ movies: null, loadError: false });
  const [creating, setCreating] = useState(false);
  const [movieId, setMovieId] = useState(() =>
    movieIdFromPath(window.location.pathname),
  );

  useEffect(() => {
    function syncMovie() {
      setMovieId(movieIdFromPath(window.location.pathname));
      setCreating(false);
    }

    window.addEventListener("popstate", syncMovie);
    return () => window.removeEventListener("popstate", syncMovie);
  }, []);

  useEffect(() => {
    if (movieId || list.loadError || list.movies !== null) return;

    const controller = new AbortController();

    listMovies(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted)
          setList({ movies: items, loadError: false });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setList({ movies: null, loadError: true });
      });

    return () => controller.abort();
  }, [list, movieId]);

  function reloadMovies() {
    setList({ movies: null, loadError: false });
  }

  async function addMovie(values) {
    const created = await createMovie(values);
    setStatus(created.status);
    reloadMovies();
  }

  function openMovie(id) {
    window.history.pushState({ fromMovies: true }, "", moviePath(id));
    setMovieId(String(id));
  }

  function backToMovies() {
    if (window.history.state?.fromMovies) {
      window.history.back();
    } else {
      window.history.replaceState(null, "", MOVIES_PATH);
      setMovieId(null);
    }
  }

  if (movieId) {
    return (
      <MovieDetailsPage
        key={movieId}
        movieId={movieId}
        onBack={backToMovies}
        onSaved={reloadMovies}
      />
    );
  }

  const visible = list.movies?.filter((movie) => movie.status === status);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Meus filmes</h1>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Novo filme
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-slate-100"
            >
              Sair
            </button>
          </div>
        </header>
        <fieldset className="inline-flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <legend className="sr-only">Status dos filmes</legend>
          {filters.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
              className="rounded px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 aria-pressed:bg-blue-600 aria-pressed:text-white"
            >
              {label}
            </button>
          ))}
        </fieldset>

        {list.loadError ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-red-700">
              Não foi possível carregar seus filmes.
            </p>
            <button
              type="button"
              onClick={reloadMovies}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : !visible ? (
          <p role="status" className="text-slate-600">
            Carregando filmes...
          </p>
        ) : visible.length === 0 ? (
          <p className="text-slate-600">Nenhum filme nesta lista.</p>
        ) : (
          <ul className="grid grid-cols-5 gap-5">
            {visible.map((movie) => (
              <MovieCard key={movie.id} movie={movie} onOpen={openMovie} />
            ))}
          </ul>
        )}
        {creating && (
          <MovieFormDialog
            initialStatus={status}
            onClose={() => setCreating(false)}
            onSave={addMovie}
          />
        )}
      </section>
    </main>
  );
}
