import { useEffect, useState } from "react";
import { BackButton } from "../components/BackButton";
import { MovieList } from "../components/MovieList";
import { listFriendMovies } from "../services/friends";

export function FriendMoviesPage({ friend, onBack }) {
  const [status, setStatus] = useState("quero_assistir");
  const [list, setList] = useState({ movies: null, error: "" });

  useEffect(() => {
    if (list.movies !== null || list.error) return;

    const controller = new AbortController();
    listFriendMovies(friend.id, status, controller.signal)
      .then((movies) => {
        if (!controller.signal.aborted) setList({ movies, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setList({ movies: null, error: error.message });
      });
    return () => controller.abort();
  }, [friend.id, status, list]);

  function reloadMovies() {
    setList({ movies: null, error: "" });
  }

  function changeStatus(next) {
    if (next === status) return;
    setStatus(next);
    reloadMovies();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center gap-4">
          <BackButton onBack={onBack} />
          <h1 className="text-3xl font-bold">Filmes de {friend.name}</h1>
        </header>
        <MovieList
          status={status}
          onStatusChange={changeStatus}
          movies={list.movies}
          error={list.error}
          onRetry={reloadMovies}
        />
      </section>
    </main>
  );
}
