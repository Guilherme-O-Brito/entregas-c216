import { useEffect, useSyncExternalStore } from "react";
import {
  accessTokenExpiresAt,
  getSession,
  refreshSession,
  subscribeToSession,
} from "../services/session";

const RETRY_DELAY = 30_000;

export function useSession() {
  const session = useSyncExternalStore(subscribeToSession, getSession);

  useEffect(() => {
    if (!session) return;

    let active = true;
    const delay = Math.max(
      0,
      accessTokenExpiresAt(session.access_token) - Date.now(),
    );
    let timer = window.setTimeout(renew, delay);

    async function renew() {
      try {
        await refreshSession(session);
      } catch {
        if (active && getSession() === session) {
          timer = window.setTimeout(renew, RETRY_DELAY);
        }
      }
    }

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [session]);

  return session;
}
