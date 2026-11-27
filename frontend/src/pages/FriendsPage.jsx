import { useEffect, useState } from "react";
import { BackButton } from "../components/BackButton";
import { listFriends } from "../services/friends";
import { FriendMoviesPage } from "./FriendMoviesPage";

export function FriendsPage({
  friendId,
  onOpenFriend,
  onBack,
  onBackToFriends,
}) {
  const [list, setList] = useState({ friends: null, error: "" });

  useEffect(() => {
    if (list.friends !== null || list.error) return;

    const controller = new AbortController();
    listFriends(controller.signal)
      .then((friends) => {
        if (!controller.signal.aborted) setList({ friends, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setList({ friends: null, error: error.message });
      });
    return () => controller.abort();
  }, [list]);

  const friend = list.friends?.find(({ id }) => String(id) === friendId);
  if (friend) {
    return (
      <FriendMoviesPage
        key={friend.id}
        friend={friend}
        onBack={onBackToFriends}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton onBack={friendId ? onBackToFriends : onBack} />
            <h1 className="text-3xl font-bold">Amigos</h1>
          </div>
          {!friendId && (
            <button
              type="button"
              disabled
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Adicionar amigo
            </button>
          )}
        </header>

        {list.error ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-red-700">
              {list.error}
            </p>
            <button
              type="button"
              onClick={() => setList({ friends: null, error: "" })}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : !list.friends ? (
          <p role="status" className="text-slate-600">
            Carregando amigos...
          </p>
        ) : friendId ? (
          <p role="alert" className="text-sm text-red-700">
            Amigo não encontrado.
          </p>
        ) : list.friends.length === 0 ? (
          <p className="text-slate-600">
            Você ainda não tem amigos cadastrados.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-4">
            {list.friends.map(({ id, name }) => (
              <li
                key={id}
                className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => onOpenFriend(id)}
                  className="grow break-words p-4 text-left font-semibold text-blue-700 hover:bg-slate-50"
                >
                  {name}
                </button>
                <div className="border-t border-slate-100 px-4 py-2">
                  <button
                    type="button"
                    disabled
                    className="text-sm font-medium text-slate-700 disabled:opacity-50"
                  >
                    Remover amigo
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
