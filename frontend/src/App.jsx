import { useEffect, useState } from "react";
import { ItemForm } from "./components/ItemForm";
import { ItemList } from "./components/ItemList";
import { createUser, listUsers } from "./services/users";

export default function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);

  async function addUser(values) {
    const created = await createUser(values);
    setUsers((current) => [...current, created]);
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-6 p-4 sm:p-6">
      <h1 className="text-3xl font-bold">Gerenciador de Usuários</h1>
      <ItemForm onAdd={addUser} />
      <section aria-labelledby="users-heading" className="space-y-3">
        <h2 id="users-heading" className="text-xl font-semibold">
          Usuários cadastrados
        </h2>
        {loading ? (
          <p>Carregando usuários...</p>
        ) : loadError ? (
          <p role="alert">{loadError}</p>
        ) : (
          <ItemList users={users} />
        )}
      </section>
    </main>
  );
}
