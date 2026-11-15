export function ItemList({ users }) {
  if (users.length === 0)
    return <p className="text-slate-600">Nenhum usuário cadastrado.</p>;

  return (
    <ul className="space-y-2">
      {users.map((user) => (
        <li
          key={user.id}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-slate-600">{user.email}</p>
          {user.admin && (
            <p className="text-sm text-slate-600">Administrador</p>
          )}
        </li>
      ))}
    </ul>
  );
}
