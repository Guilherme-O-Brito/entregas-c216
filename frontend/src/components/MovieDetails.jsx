import { BackButton } from "./BackButton";
import { MovieCover } from "./MovieCover";

export function MovieDetails({
  movie,
  owner,
  error,
  onBack,
  onRetry,
  onEdit,
  onDelete,
  children,
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <BackButton onBack={onBack} />
          {movie && (
            <div className="flex gap-3">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Editar
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
                >
                  Excluir filme
                </button>
              )}
            </div>
          )}
        </header>
        {error ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
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
              {owner && (
                <p className="text-sm text-slate-600">Filme de {owner}</p>
              )}
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
        {children}
      </section>
    </main>
  );
}
