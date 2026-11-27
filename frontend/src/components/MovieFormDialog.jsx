import { useState } from "react";
import { Modal } from "./Modal";

const inputClass = "w-full rounded border border-slate-300 px-3 py-2";

export function MovieFormDialog({ movie, initialStatus, onClose, onSave }) {
  const [status, setStatus] = useState(
    movie?.status ?? initialStatus ?? "quero_assistir",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const watched = status === "assistido";

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setError("");

    const data = new FormData(event.currentTarget);
    const title = data.get("title").trim();
    const cover = data.get("movie_cover").trim();
    const rating = data.get("rating");
    const review = data.get("review");

    if (!title) {
      setError("Informe o título do filme.");
      return;
    }
    if (
      cover &&
      (!URL.canParse(cover) ||
        !["http:", "https:"].includes(new URL(cover).protocol))
    ) {
      setError("Informe um link HTTP ou HTTPS para a capa.");
      return;
    }

    const values = {
      title,
      status,
      movie_cover: cover || null,
      rating: watched && rating ? Number(rating) : null,
      review: watched ? review || null : null,
    };
    const initialValues = movie && {
      ...movie,
      movie_cover: movie.movie_cover?.trim() || null,
      review: watched
        ? movie.review?.replace(/\r\n?/g, "\n") || null
        : movie.review,
    };
    const changes = initialValues
      ? Object.fromEntries(
          Object.entries(values).filter(
            ([field, value]) => initialValues[field] !== value,
          ),
        )
      : values;

    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await onSave(changes);
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={movie ? "Editar filme" : "Novo filme"}
      onClose={onClose}
      canClose={!saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="movie-title" className="block text-sm font-medium">
            Título
          </label>
          <input
            id="movie-title"
            name="title"
            defaultValue={movie?.title}
            required
            maxLength={255}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="movie-status" className="block text-sm font-medium">
            Status
          </label>
          <select
            id="movie-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={inputClass}
          >
            <option value="quero_assistir">Quero assistir</option>
            <option value="assistido">Já assistido</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="movie-cover" className="block text-sm font-medium">
            Link da capa
          </label>
          <input
            id="movie-cover"
            name="movie_cover"
            type="url"
            defaultValue={movie?.movie_cover ?? ""}
            className={inputClass}
          />
        </div>
        <fieldset hidden={!watched} disabled={!watched} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="movie-rating" className="block text-sm font-medium">
              Nota (0 a 10)
            </label>
            <input
              id="movie-rating"
              name="rating"
              type="number"
              min={0}
              max={10}
              step={1}
              defaultValue={movie?.rating ?? ""}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="movie-review" className="block text-sm font-medium">
              Resenha
            </label>
            <textarea
              id="movie-review"
              name="review"
              rows={3}
              defaultValue={movie?.review ?? ""}
              className={inputClass}
            />
          </div>
        </fieldset>
        {!watched && (movie?.rating != null || movie?.review != null) && (
          <p className="text-sm text-slate-600">
            A nota e a resenha serão removidas ao salvar.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving
              ? "Salvando..."
              : movie
                ? "Salvar alterações"
                : "Cadastrar filme"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
