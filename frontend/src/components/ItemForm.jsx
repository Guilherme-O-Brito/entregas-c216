import { useState } from "react";
import { validateUser } from "../validation";

export function ItemForm({ onAdd }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [admin, setAdmin] = useState(false);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const result = validateUser({ name, email, password, admin });
    setErrors(result.errors);
    setSaveError("");
    if (Object.keys(result.errors).length > 0) return;

    setSaving(true);
    try {
      await onAdd(result.values);
      setName("");
      setEmail("");
      setPassword("");
      setAdmin(false);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="space-y-1">
        <label htmlFor="user-name" className="block text-sm font-medium">
          Nome
        </label>
        <input
          id="user-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "user-name-error" : undefined}
          className="w-full rounded border border-slate-300 p-2"
        />
        {errors.name && (
          <p id="user-name-error" role="alert" className="text-sm text-red-700">
            {errors.name}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="user-email" className="block text-sm font-medium">
          E-mail
        </label>
        <input
          id="user-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "user-email-error" : undefined}
          className="w-full rounded border border-slate-300 p-2"
        />
        {errors.email && (
          <p
            id="user-email-error"
            role="alert"
            className="text-sm text-red-700"
          >
            {errors.email}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="user-password" className="block text-sm font-medium">
          Senha
        </label>
        <input
          id="user-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "user-password-error" : undefined}
          className="w-full rounded border border-slate-300 p-2"
        />
        {errors.password && (
          <p
            id="user-password-error"
            role="alert"
            className="text-sm text-red-700"
          >
            {errors.password}
          </p>
        )}
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={admin}
          onChange={(event) => setAdmin(event.target.checked)}
        />
        Administrador
      </label>
      {saveError && (
        <p role="alert" className="text-sm text-red-700">
          {saveError}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
      >
        {saving ? "Salvando..." : "Adicionar"}
      </button>
    </form>
  );
}
