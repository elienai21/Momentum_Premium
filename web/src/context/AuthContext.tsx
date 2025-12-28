// web/src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  getIdToken,
} from "firebase/auth";
import { auth } from "../services/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  getToken: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  async function getToken() {
    if (!auth.currentUser) return null;
    return await getIdToken(auth.currentUser, true);
  }

  async function logout() {
    await auth.signOut();
  }

  const value: AuthContextValue = {
    user,
    loading,
    getToken,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  // ✅ Fallback seguro: se por algum motivo não houver AuthProvider,
  // não vamos derrubar a aplicação com erro.
  if (!ctx) {
    const currentUser = auth.currentUser;

    return {
      user: currentUser,
      loading: false,
      getToken: async () => {
        if (!currentUser) return null;
        return await getIdToken(currentUser, true);
      },
      logout: async () => {
        await auth.signOut();
      },
    };
  }

  return ctx;
}
