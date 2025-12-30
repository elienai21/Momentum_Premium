
import React, { useState } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { api } from "@/services/api";
import { X, Mail, Shield, User, Loader2 } from "lucide-react";
import { useToast } from "../Toast";

interface InviteMemberModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function InviteMemberModal({ onClose, onSuccess }: InviteMemberModalProps) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("member");
    const [loading, setLoading] = useState(false);
    const { notify } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post("/tenants/invite", { email, role });
            notify({ type: "success", message: `Convite enviado para ${email}!` });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            notify({ type: "error", message: err.response?.data?.message || "Erro ao enviar convite." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="fixed inset-0"
                onClick={onClose}
            />
            <GlassPanel className="w-full max-w-md p-6 relative z-10 animate-in zoom-in-95 duration-300 border-slate-200/50 dark:border-white/10 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-primary/20 text-primary shadow-glow">
                        <Mail size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 font-display">Convidar Membro</h2>
                        <p className="text-xs text-slate-500 font-display">Envie um convite por e-mail para colaborar.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest font-display flex items-center gap-2">
                            <Mail size={12} /> E-mail
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="colega@empresa.com"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-display placeholder:text-slate-400 text-slate-800 dark:text-slate-200"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest font-display flex items-center gap-2">
                            <Shield size={12} /> Função
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole("admin")}
                                className={`p-3 rounded-xl border text-left transition-all ${role === "admin"
                                        ? "bg-primary/10 border-primary text-primary shadow-glow"
                                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                                    }`}
                            >
                                <div className="font-bold text-sm mb-0.5 font-display flex items-center gap-2">
                                    <Shield size={14} /> Admin
                                </div>
                                <div className="text-[10px] opacity-70 leading-tight">Acesso total às configurações.</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRole("member")}
                                className={`p-3 rounded-xl border text-left transition-all ${role === "member"
                                        ? "bg-primary/10 border-primary text-primary shadow-glow"
                                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                                    }`}
                            >
                                <div className="font-bold text-sm mb-0.5 font-display flex items-center gap-2">
                                    <User size={14} /> Membro
                                </div>
                                <div className="text-[10px] opacity-70 leading-tight">Visualiza dashboards e relatórios.</div>
                            </button>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm shadow-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-display"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : "Enviar Convite"}
                        </button>
                    </div>
                </form>
            </GlassPanel>
        </div>
    );
}
