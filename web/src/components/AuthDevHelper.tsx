// ============================================================
// 🧩 AuthDevHelper — Momentum Local Authenticator (v1.1 Stable)
// ============================================================
// 🔹 Login automático apenas em ambiente de desenvolvimento
// 🔹 Usa o mesmo app Firebase já inicializado em services/firebase
// ============================================================

import { useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase"; // ✅ usa a instância já inicializada

export const AuthDevHelper = () => {
  useEffect(() => {
    if (import.meta.env.MODE !== "development") return; // Ignora em produção

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("✅ Usuário autenticado (dev):", user.email);
      } else {
        try {
          // ⚙️ Login automático para ambiente local
          await signInWithEmailAndPassword(auth, "dev@momentum.com", "senha123");
          console.log("✅ Login automático (modo dev) realizado");
        } catch (err: any) {
          console.error("❌ Erro no login automático:", err.message);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return null; // invisível
};
