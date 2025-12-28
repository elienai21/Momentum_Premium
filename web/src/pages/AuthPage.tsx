// web/src/pages/AuthPage.tsx
import React, { useState, FormEvent } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { Loader2, Lock, Mail } from "lucide-react";

const AuthPage: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { from?: string };
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from || "/";

  // Se já estiver logado, manda direto pro app
  if (user) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      notify({
        type: "error",
        title: "Dados incompletos",
        message: "Preencha e-mail e senha para continuar.",
      });
      return;
    }

    try {
      setSubmitting(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      notify({
        type: "success",
        title: "Bem-vindo(a)!",
        message: "Login realizado com sucesso.",
      });
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error("Erro de login:", err);
      let message = "Não foi possível entrar. Verifique os dados.";
      if (err?.code === "auth/invalid-credential") {
        message = "E-mail ou senha inválidos.";
      } else if (err?.code === "auth/user-disabled") {
        message = "Usuário desativado. Fale com o suporte.";
      }
      notify({
        type: "error",
        title: "Falha no login",
        message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleForgotPassword() {
    notify({
      type: "info",
      title: "Esqueceu a senha?",
      message: "Fale com o suporte para redefinir seu acesso.",
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-900/70 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Lado esquerdo – brand / mensagem */}
        <div className="hidden md:flex flex-col justify-between p-8 lg:p-10 bg-gradient-to-b from-emerald-500/10 via-slate-900 to-slate-950 border-r border-slate-800/60">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Momentum Premium • CFO as a Service
            </div>

            <h1 className="text-3xl lg:text-4xl font-semibold text-slate-50 mb-4 leading-tight">
              Entre no seu <span className="text-emerald-400">Painel Financeiro</span>
            </h1>

            <p className="text-sm text-slate-300/80 leading-relaxed max-w-md">
              Acompanhe a saúde financeira, simule cenários e deixe o CFO de IA
              trabalhar por você – em um só lugar.
            </p>
          </div>

          <div className="mt-10 text-xs text-slate-400 space-y-1">
            <p>• Dados protegidos por autenticação segura do Firebase</p>
            <p>• Acesso exclusivo para clientes e times autorizados</p>
          </div>
        </div>

        {/* Lado direito – formulário */}
        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
          <div className="mb-8 md:mb-10">
            <div className="flex items-center gap-2 mb-3 md:hidden">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/40">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">
                Momentum Premium
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-slate-50">
              Fazer login
            </h2>
            <p className="text-sm text-slate-400 mt-1.5">
              Use o e-mail e senha configurados para acessar o Momentum.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* E-mail */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-300"
              >
                E-mail
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-500" />
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 px-10 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/80 focus:border-emerald-500/80 transition-shadow"
                  placeholder="voce@empresa.com"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-300"
              >
                Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-500" />
                </span>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 px-10 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/80 focus:border-emerald-500/80 transition-shadow"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Lembrar / Esqueceu senha */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Ambiente restrito a usuários autorizados.
              </span>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/60 disabled:cursor-not-allowed text-slate-950 text-sm font-medium px-4 py-2.5 mt-1 transition-colors shadow-lg shadow-emerald-500/20"
            >
              {submitting && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {submitting ? "Entrando..." : "Entrar no Momentum"}
            </button>
          </form>

          <p className="mt-6 text-[11px] text-slate-500 leading-relaxed">
            Ao acessar, você concorda com os termos de uso e política de
            privacidade definidos para a sua conta Momentum.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
