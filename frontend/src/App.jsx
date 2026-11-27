import { useEffect, useState } from "react";
import { AuthForm } from "./components/AuthForm";
import { useSession } from "./hooks/useSession";
import { isSignedInPath, MOVIES_PATH } from "./moviePaths";
import { MoviesPage } from "./pages/MoviesPage";
import { login, register } from "./services/auth";
import { endSession, startSession } from "./services/session";

export default function App() {
  const [mode, setMode] = useState("login");
  const session = useSession();
  const [registeredEmail, setRegisteredEmail] = useState("");

  useEffect(() => {
    function syncPath() {
      const current = window.location.pathname;
      const path = session ? MOVIES_PATH : "/";
      if (current !== path && (!session || !isSignedInPath(current))) {
        window.history.replaceState(null, "", path);
      }
    }

    syncPath();
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, [session]);

  async function handleLogin(values) {
    startSession(await login(values));
  }

  async function handleRegister(values) {
    const user = await register(values);
    setRegisteredEmail(user.email);
    setMode("login");
  }

  function changeMode() {
    setRegisteredEmail("");
    setMode(mode === "login" ? "register" : "login");
  }

  function handleLogout() {
    setMode("login");
    setRegisteredEmail("");
    endSession();
  }

  if (session) {
    return <MoviesPage onLogout={handleLogout} />;
  }

  const registering = mode === "register";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
      <section className="w-full max-w-sm space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">
          {registering ? "Criar conta" : "Entrar"}
        </h1>
        {registeredEmail && (
          <p role="status" className="text-sm text-slate-600">
            Conta criada. Entre com seu e-mail e senha.
          </p>
        )}
        <AuthForm
          key={mode}
          registering={registering}
          initialEmail={registeredEmail}
          onSubmit={registering ? handleRegister : handleLogin}
          onChangeMode={changeMode}
        />
      </section>
    </main>
  );
}
