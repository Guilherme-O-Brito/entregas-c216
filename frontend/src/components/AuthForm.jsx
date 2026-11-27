import { useState } from "react";

const inputClass = "w-full rounded border border-slate-300 px-3 py-2";

export function AuthForm({
  registering,
  initialEmail,
  onSubmit,
  onChangeMode,
}) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLabel = registering ? "Cadastrar" : "Entrar";

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const formData = new FormData(event.currentTarget);
    const values = {
      email: formData.get("email").trim(),
      password: formData.get("password"),
    };

    setError("");
    if (registering) {
      values.name = formData.get("name").trim();
      if (!values.name) {
        setError("Informe seu nome.");
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {registering && (
          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm font-medium">
              Nome
            </label>
            <input
              id="name"
              name="name"
              autoComplete="name"
              maxLength={100}
              required
              className={inputClass}
            />
          </div>
        )}
        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete={registering ? "email" : "username"}
            defaultValue={initialEmail}
            maxLength={254}
            required
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={registering ? "new-password" : "current-password"}
            aria-describedby={registering ? "password-help" : undefined}
            minLength={registering ? 8 : undefined}
            maxLength={128}
            required
            className={inputClass}
          />
          {registering && (
            <p id="password-help" className="text-sm text-slate-600">
              Use pelo menos 8 caracteres.
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Aguarde..." : submitLabel}
        </button>
      </form>
      <button
        type="button"
        onClick={onChangeMode}
        disabled={submitting}
        className="text-sm font-medium text-blue-700 hover:underline disabled:opacity-50"
      >
        {registering ? "Voltar para o login" : "Criar uma conta"}
      </button>
    </>
  );
}
