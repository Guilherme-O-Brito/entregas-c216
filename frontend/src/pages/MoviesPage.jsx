import { useEffect, useState } from "react";
import { MovieFormDialog } from "../components/MovieFormDialog";
import { MovieList } from "../components/MovieList";
import {
  FRIENDS_PATH,
  friendMoviePath,
  friendMoviesPath,
  friendRouteFromPath,
  MOVIES_PATH,
  movieIdFromPath,
  moviePath,
} from "../moviePaths";
import { createMovie, listMovies } from "../services/movies";
import { FriendsPage } from "./FriendsPage";
import { MovieDetailsPage } from "./MovieDetailsPage";

export function MoviesPage({ onLogout }) {
  const [status, setStatus] = useState("quero_assistir");
  const [list, setList] = useState({ movies: null, loadError: false });
  const [creating, setCreating] = useState(false);
  const [path, setPath] = useState(() => window.location.pathname);
  const movieId = movieIdFromPath(path);
  const friendRoute = friendRouteFromPath(path);
  const isFriendsView = path === FRIENDS_PATH || friendRoute !== null;

  useEffect(() => {
    function syncPath() {
      setPath(window.location.pathname);
      setCreating(false);
    }

    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    if (movieId || isFriendsView || list.loadError || list.movies !== null)
      return;

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
  }, [list, movieId, isFriendsView]);

  function reloadMovies() {
    setList({ movies: null, loadError: false });
  }

  async function addMovie(values) {
    const created = await createMovie(values);
    setStatus(created.status);
    reloadMovies();
  }

  function navigate(next, returnTo) {
    window.history.pushState({ returnTo }, "", next);
    setPath(next);
  }

  function goBack(fallback) {
    if (window.history.state?.returnTo === fallback) {
      window.history.back();
    } else {
      window.history.replaceState(null, "", fallback);
      setPath(fallback);
    }
  }

  if (isFriendsView) {
    return (
      <FriendsPage
        friendRoute={friendRoute}
        onOpenFriend={(id) => navigate(friendMoviesPath(id), FRIENDS_PATH)}
        onOpenFriendMovie={(friendId, movieId, status) =>
          navigate(
            friendMoviePath(friendId, movieId, status),
            friendMoviesPath(friendId),
          )
        }
        onBack={() => goBack(MOVIES_PATH)}
        onBackToFriends={() => goBack(FRIENDS_PATH)}
        onBackToFriendMovies={(id) => goBack(friendMoviesPath(id))}
      />
    );
  }

  if (movieId) {
    return (
      <MovieDetailsPage
        key={movieId}
        movieId={movieId}
        onBack={() => goBack(MOVIES_PATH)}
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
              onClick={() => navigate(FRIENDS_PATH, MOVIES_PATH)}
              className="rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-slate-100"
            >
              Amigos
            </button>
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
        <MovieList
          status={status}
          onStatusChange={setStatus}
          movies={visible}
          error={list.loadError ? "Não foi possível carregar seus filmes." : ""}
          onRetry={reloadMovies}
          onOpen={(id) => navigate(moviePath(id), MOVIES_PATH)}
        />
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
