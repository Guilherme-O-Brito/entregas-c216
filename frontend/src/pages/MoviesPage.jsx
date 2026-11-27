import { useEffect, useState } from "react";
import { MovieCard } from "../components/MovieCard";
import { listMovies } from "../services/movies";

const filters = [
  { value: "quero_assistir", label: "Quero assistir" },
  { value: "assistido", label: "Já assistidos" },
];

export function MoviesPage({ onLogout }) {
  const [status, setStatus] = useState("quero_assistir");
  const [movies, setMovies] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (loadError || movies !== null) return;

    const controller = new AbortController();

    listMovies(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setMovies(items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      });

    return () => controller.abort();
  }, [loadError, movies]);

  const visible = movies?.filter((movie) => movie.status === status);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Meus filmes</h1>
          <button
            type="button"
            onClick={onLogout}
            className="rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-slate-100"
          >
            Sair
          </button>
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

        {loadError ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-red-700">
              Não foi possível carregar seus filmes.
            </p>
            <button
              type="button"
              onClick={() => setLoadError(false)}
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
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
