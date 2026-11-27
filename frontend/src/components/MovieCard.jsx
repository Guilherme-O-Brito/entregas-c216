import { MovieCover } from "./MovieCover";

export function MovieCard({ movie, onOpen }) {
  const content = (
    <>
      <MovieCover cover={movie.movie_cover} />
      <span className="block break-words p-3 font-medium">{movie.title}</span>
    </>
  );

  return (
    <li className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {onOpen ? (
        <button
          type="button"
          onClick={() => onOpen(movie.id)}
          className="block h-full w-full text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
        >
          {content}
        </button>
      ) : (
        content
      )}
    </li>
  );
}
