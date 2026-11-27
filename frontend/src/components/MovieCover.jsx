import { useState } from "react";

export function MovieCover({ cover }) {
  const [failedCover, setFailedCover] = useState(null);

  if (!cover || cover === failedCover) {
    return (
      <span
        aria-hidden="true"
        className="flex aspect-2/3 items-center justify-center bg-slate-100 text-sm text-slate-500"
      >
        Sem capa
      </span>
    );
  }

  return (
    <img
      src={cover}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedCover(cover)}
      className="aspect-2/3 w-full bg-slate-100 object-cover"
    />
  );
}
