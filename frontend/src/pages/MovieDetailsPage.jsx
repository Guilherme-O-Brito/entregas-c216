import { useEffect, useState } from "react";
import { Modal } from "../components/Modal";
import { MovieDetails } from "../components/MovieDetails";
import { MovieFormDialog } from "../components/MovieFormDialog";
import { deleteMovie, getMovie, updateMovie } from "../services/movies";

export function MovieDetailsPage({ movieId, onBack, onSaved, onDeleted }) {
  const [movie, setMovie] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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

  function closeDelete() {
    setConfirmingDelete(false);
    setDeleteError("");
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteMovie(movieId);
      onDeleted();
    } catch (error) {
      setDeleteError(error.message);
      setDeleting(false);
    }
  }

  return (
    <MovieDetails
      movie={movie}
      error={error}
      onBack={onBack}
      onRetry={() => setError("")}
      onEdit={() => setEditing(true)}
      onDelete={() => setConfirmingDelete(true)}
    >
      {editing && (
        <MovieFormDialog
          movie={movie}
          onClose={() => setEditing(false)}
          onSave={saveChanges}
        />
      )}
      {confirmingDelete && (
        <Modal title="Excluir filme" onClose={closeDelete} canClose={!deleting}>
          <p className="break-words text-sm text-slate-600">
            Deseja excluir “{movie.title}” da sua lista?
          </p>
          {deleteError && (
            <p role="alert" className="text-sm text-red-700">
              {deleteError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeDelete}
              disabled={deleting}
              className="rounded border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-red-800 disabled:opacity-50"
            >
              {deleting ? "Excluindo..." : "Confirmar exclusão"}
            </button>
          </div>
        </Modal>
      )}
    </MovieDetails>
  );
}
