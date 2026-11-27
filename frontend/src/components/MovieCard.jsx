import { useState } from "react";

export function MovieCard({ movie }) {
  const [failedCover, setFailedCover] = useState(null);
  const cover = movie.movie_cover;

  return (
    <li className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {cover && cover !== failedCover ? (
        <img
          src={cover}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedCover(cover)}
          className="aspect-2/3 w-full bg-slate-100 object-cover"
        />
      ) : (
        <div className="flex aspect-2/3 items-center justify-center bg-slate-100 text-sm text-slate-500">
          Sem capa
        </div>
      )}
      <p className="break-words p-3 font-medium">{movie.title}</p>
    </li>
  );
}
