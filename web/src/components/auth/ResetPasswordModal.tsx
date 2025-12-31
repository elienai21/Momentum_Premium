import React, { useState, useEffect, useRef } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../services/firebase";
import { useToast } from "../Toast";
import { X, Mail, Loader2, ArrowRight } from "lucide-react";

interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Modal for password reset flow.
 * Uses Firebase's sendPasswordResetEmail to trigger the process.
 */
export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose }) => {
    const { notify } = useToast();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    async function handleReset(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) {
            notify({
                type: "error",
                message: "Por favor, digite seu e-mail para continuarmos.",
            });
            return;
        }

        try {
            setIsLoading(true);
            await sendPasswordResetEmail(auth, email.trim());
            notify({
                type: "success",
                message: "E-mail de redefinição enviado! Verifique sua caixa de entrada.",
            });
            onClose();
        } catch (err: any) {
            console.error("Erro ao resetar senha:", err);
            notify({
                type: "error",
                message: "Não foi possível enviar o e-mail. Verifique se o endereço está correto.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-800 animate-in zoom-in-95 duration-300"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="relative bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent p-8 border-b border-slate-800/50">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                        aria-label="Fechar"
                    >
                        <X size={18} />
                    </button>

                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
                        <Mail size={28} />
                    </div>

                    <h2 className="text-2xl font-semibold text-slate-50 font-display">Redefinir Senha</h2>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                        Digite seu e-mail abaixo para receber o link de redefinição e recuperar seu acesso.
                    </p>
                </div>

                {/* Form Body */}
                <form onSubmit={handleReset} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="reset-email" className="block text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">
                            E-mail de Cadastro
                        </label>
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                                <Mail size={18} />
                            </span>
                            <input
                                id="reset-email"
                                ref={inputRef}
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu-email@dominio.com"
                                className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 px-12 py-3.5 text-sm text-slate-50 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 py-3.5 rounded-2xl bg-slate-800 text-slate-300 font-medium text-sm hover:bg-slate-750 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-[1.5] py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-semibold text-sm hover:bg-emerald-400 shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    Enviar Link
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="px-8 py-5 bg-slate-950/40 border-t border-slate-800/50 text-center">
                    <p className="text-[11px] text-slate-500">
                        Não recebeu? Verifique sua pasta de spam ou tente novamente.
                    </p>
                </div>
            </div>
        </div>
    );
};
