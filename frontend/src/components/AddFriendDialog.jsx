import { useEffect, useState } from "react";
import { sendFriendRequest } from "../services/friends";
import { getCurrentUser, listUsers } from "../services/users";
import { Modal } from "./Modal";

const SEARCH_DELAY = 250;

export function AddFriendDialog({ friends, onClose }) {
  const [name, setName] = useState("");
  const [page, setPage] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [result, setResult] = useState(null);
  const [sentIds, setSentIds] = useState(new Set());
  const [sendingId, setSendingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const sending = sendingId !== null;

  useEffect(() => {
    if (result) return;

    const controller = new AbortController();
    const { signal } = controller;

    async function load() {
      try {
        const [userId, data] = await Promise.all([
          currentUserId ?? getCurrentUser(signal).then((user) => user.id),
          listUsers({ name, page, signal }),
        ]);
        if (!signal.aborted) {
          setCurrentUserId(userId);
          setResult(data);
        }
      } catch (error) {
        if (!signal.aborted) setResult({ error: error.message });
      }
    }

    const timer = window.setTimeout(load, SEARCH_DELAY);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [name, page, currentUserId, result]);

  function goToPage(next) {
    setPage(next);
    setResult(null);
  }

  async function addFriend(user) {
    setSendingId(user.id);
    setFeedback(null);
    try {
      await sendFriendRequest(user.id);
      setSentIds((current) => new Set([...current, user.id]));
      setFeedback({ text: `Pedido enviado para ${user.name}.` });
    } catch (error) {
      setFeedback({ error: error.message });
    } finally {
      setSendingId(null);
    }
  }

  const friendIds = new Set(friends.map(({ id }) => id));
  const users = result?.users?.filter(
    ({ id }) => id !== currentUserId && !friendIds.has(id) && !sentIds.has(id),
  );

  return (
    <Modal title="Adicionar amigos" onClose={onClose} canClose={!sending}>
      <div className="space-y-1">
        <label htmlFor="friend-search" className="block text-sm font-medium">
          Buscar por nome
        </label>
        <input
          id="friend-search"
          type="search"
          value={name}
          maxLength={100}
          disabled={sending}
          onChange={(event) => {
            setName(event.target.value);
            goToPage(0);
          }}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
      </div>

      {feedback?.error && (
        <p role="alert" className="text-sm text-red-700">
          {feedback.error}
        </p>
      )}
      {feedback?.text && (
        <p role="status" className="text-sm text-slate-600">
          {feedback.text}
        </p>
      )}
      {result?.error ? (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-red-700">
            {result.error}
          </p>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : !users ? (
        <p role="status" className="text-sm text-slate-600">
          Carregando usuários...
        </p>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-600">
          Nenhum usuário disponível nesta página.
        </p>
      ) : (
        <ul className="space-y-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-3 rounded border border-slate-200 px-3 py-2"
            >
              <span className="min-w-0 break-words text-sm font-medium">
                {user.name}
              </span>
              <button
                type="button"
                aria-label={`Adicionar ${user.name}`}
                disabled={sending}
                onClick={() => addFriend(user)}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {sendingId === user.id ? "Enviando..." : "Adicionar"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={page === 0 || !result || sending}
          onClick={() => goToPage(page - 1)}
          className="rounded border border-slate-200 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-50"
        >
          Anterior
        </button>
        <p className="text-sm text-slate-600">Página {page + 1}</p>
        <button
          type="button"
          disabled={!result?.hasNext || sending}
          onClick={() => goToPage(page + 1)}
          className="rounded border border-slate-200 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={sending}
        className="rounded border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
      >
        Fechar
      </button>
    </Modal>
  );
}
