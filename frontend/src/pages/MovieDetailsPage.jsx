import { useEffect, useState } from "react";
import { MovieCover } from "../components/MovieCover";
import { MovieFormDialog } from "../components/MovieFormDialog";
import { getMovie, updateMovie } from "../services/movies";

export function MovieDetailsPage({ movieId, onBack, onSaved }) {
  const [movie, setMovie] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (error) return;

    const controller = new AbortController();
    getMovie(movieId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setMovie(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [movieId, error]);

  async function saveChanges(changes) {
    setMovie(await updateMovie(movieId, changes));
    onSaved();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="rounded border border-slate-200 bg-white px-4 py-2 text-blue-700 hover:bg-slate-100"
          >
            ←
          </button>
          {movie && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Editar
            </button>
          )}
        </header>
        {error ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : movie ? (
          <article className="flex gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="w-48 shrink-0 overflow-hidden rounded">
              <MovieCover cover={movie.movie_cover} />
            </div>
            <div className="min-w-0 space-y-4">
              <h1 className="break-words text-3xl font-bold">{movie.title}</h1>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-semibold">Status</dt>
                  <dd>
                    {movie.status === "assistido"
                      ? "Já assistido"
                      : "Quero assistir"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Nota</dt>
                  <dd>
                    {movie.rating === null ? "Sem nota" : `${movie.rating}/10`}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Resenha</dt>
                  <dd className="whitespace-pre-wrap break-words">
                    {movie.review ?? "Sem resenha"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Link da capa</dt>
                  <dd>
                    {movie.movie_cover ? (
                      <a
                        href={movie.movie_cover}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-blue-700 hover:underline"
                      >
                        {movie.movie_cover}
                      </a>
                    ) : (
                      "Nenhum link cadastrado"
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </article>
        ) : (
          <p role="status" className="text-slate-600">
            Carregando filme...
          </p>
        )}
        {editing && (
          <MovieFormDialog
            movie={movie}
            onClose={() => setEditing(false)}
            onSave={saveChanges}
          />
        )}
      </section>
    </main>
  );
}
