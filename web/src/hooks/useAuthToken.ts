// src/hooks/useAuthToken.ts
import { useEffect, useState } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "../services/firebase";

/**
 * Hook simples para expor o Firebase ID Token atual.
 *
 * - Ouve onIdTokenChanged (inclui login, logout e refresh automático)
 * - Retorna string | null
 * - Em DEV, loga eventos úteis no console
 */
export function useAuthToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      if (import.meta.env.DEV) {
        console.warn("[useAuthToken] auth não inicializado.");
      }
      return;
    }

    const unsub = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        if (import.meta.env.DEV) {
          console.warn("[useAuthToken] nenhum usuário autenticado.");
        }
        setToken(null);
        return;
      }

      try {
        const t = await user.getIdToken();
        setToken(t);

        if (import.meta.env.DEV) {
          console.log("[useAuthToken] token atualizado.");
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("[useAuthToken] falha ao obter token:", err);
        }
        setToken(null);
      }
    });

    return () => {
      unsub();
    };
  }, []);

  return token;
}
