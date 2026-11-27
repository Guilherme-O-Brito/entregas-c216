import { useEffect, useState } from "react";
import { MovieDetails } from "../components/MovieDetails";
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
    <MovieDetails
      movie={movie}
      error={error}
      onBack={onBack}
      onRetry={() => setError("")}
      onEdit={() => setEditing(true)}
    >
      {editing && (
        <MovieFormDialog
          movie={movie}
          onClose={() => setEditing(false)}
          onSave={saveChanges}
        />
      )}
    </MovieDetails>
  );
}
