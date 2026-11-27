import { useEffect, useState } from "react";
import { BackButton } from "../components/BackButton";
import { MovieDetails } from "../components/MovieDetails";
import { MovieList } from "../components/MovieList";
import { listFriendMovies } from "../services/friends";

export function FriendMoviesPage({
  friend,
  movieId,
  movieStatus,
  onOpenMovie,
  onBack,
  onBackToMovies,
}) {
  const [selectedStatus, setSelectedStatus] = useState(
    movieStatus ?? "quero_assistir",
  );
  const [list, setList] = useState(null);
  const status = movieStatus ?? selectedStatus;
  const current = list?.status === status ? list : null;

  useEffect(() => {
    if (current) return;

    const controller = new AbortController();
    listFriendMovies(friend.id, status, controller.signal)
      .then((movies) => {
        if (!controller.signal.aborted) setList({ status, movies, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setList({ status, movies: null, error: error.message });
      });
    return () => controller.abort();
  }, [friend.id, status, current]);

  function reloadMovies() {
    setList(null);
  }

  if (movieId) {
    const movie = current?.movies?.find(({ id }) => String(id) === movieId);
    const error =
      current?.error ||
      (current?.movies && !movie ? "Filme não encontrado." : "");
    return (
      <MovieDetails
        movie={movie}
        owner={friend.name}
        error={error}
        onBack={onBackToMovies}
        onRetry={reloadMovies}
      />
    );
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
          onStatusChange={setSelectedStatus}
          movies={current?.movies}
          error={current?.error}
          onOpen={(id) => onOpenMovie(id, status)}
          onRetry={reloadMovies}
        />
      </section>
    </main>
  );
}
