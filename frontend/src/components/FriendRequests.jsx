import { useEffect, useState } from "react";
import {
  acceptFriendRequest,
  declineFriendRequest,
  listFriendRequests,
} from "../services/friends";

export function FriendRequests({ onAccepted }) {
  const [list, setList] = useState({ requests: null, error: "" });
  const [action, setAction] = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (list.requests !== null || list.error) return;

    const controller = new AbortController();
    listFriendRequests(controller.signal)
      .then((requests) => {
        if (!controller.signal.aborted) setList({ requests, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setList({ requests: null, error: error.message });
      });
    return () => controller.abort();
  }, [list]);

  async function respond(id, accept) {
    setAction({ id, accept });
    setActionError("");
    try {
      if (accept) {
        await acceptFriendRequest(id);
        onAccepted();
      } else {
        await declineFriendRequest(id);
      }
      setList((current) => ({
        requests: current.requests.filter((request) => request.id !== id),
        error: "",
      }));
    } catch (error) {
      setActionError(error.message);
    } finally {
      setAction(null);
    }
  }

  return (
    <section
      aria-labelledby="friend-requests-heading"
      className="space-y-3 border-t border-slate-200 pt-6"
    >
      <h2 id="friend-requests-heading" className="text-xl font-bold">
        Solicitações de amizade
      </h2>
      {actionError && (
        <p role="alert" className="text-sm text-red-700">
          {actionError}
        </p>
      )}
      {list.error ? (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-red-700">
            {list.error}
          </p>
          <button
            type="button"
            onClick={() => setList({ requests: null, error: "" })}
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : !list.requests ? (
        <p role="status" className="text-sm text-slate-600">
          Carregando solicitações...
        </p>
      ) : list.requests.length === 0 ? (
        <p className="text-sm text-slate-600">
          Nenhuma solicitação de amizade recebida.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.requests.map(({ id, requested_by_name: name }) => (
            <li
              key={id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <span className="min-w-0 break-words text-sm font-medium">
                {name}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label={`Aceitar pedido de ${name}`}
                  onClick={() => respond(id, true)}
                  disabled={action !== null}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white enabled:hover:bg-blue-700 disabled:opacity-50"
                >
                  {action?.id === id && action.accept
                    ? "Aceitando..."
                    : "Aceitar"}
                </button>
                <button
                  type="button"
                  aria-label={`Recusar pedido de ${name}`}
                  onClick={() => respond(id, false)}
                  disabled={action !== null}
                  className="rounded border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 enabled:hover:bg-slate-100 disabled:opacity-50"
                >
                  {action?.id === id && !action.accept
                    ? "Recusando..."
                    : "Recusar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
