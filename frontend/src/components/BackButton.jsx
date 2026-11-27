export function BackButton({ onBack }) {
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label="Voltar"
      className="rounded border border-slate-200 bg-white px-4 py-2 text-blue-700 hover:bg-slate-100"
    >
      ←
    </button>
  );
}
