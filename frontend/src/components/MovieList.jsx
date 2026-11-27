import { MovieCard } from "./MovieCard";

const filters = [
  { value: "quero_assistir", label: "Quero assistir" },
  { value: "assistido", label: "Já assistidos" },
];

export function MovieList({
  status,
  onStatusChange,
  movies,
  error,
  onRetry,
  onOpen,
}) {
  return (
    <>
      <fieldset className="inline-flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
        <legend className="sr-only">Status dos filmes</legend>
        {filters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => onStatusChange(value)}
            className="rounded px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 aria-pressed:bg-blue-600 aria-pressed:text-white"
          >
            {label}
          </button>
        ))}
      </fieldset>

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
      ) : !movies ? (
        <p role="status" className="text-slate-600">
          Carregando filmes...
        </p>
      ) : movies.length === 0 ? (
        <p className="text-slate-600">Nenhum filme nesta lista.</p>
      ) : (
        <ul className="grid grid-cols-5 gap-5">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </>
  );
}
