// web/src/components/BuyCreditsModal.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, Zap, ArrowRight } from "lucide-react";

interface BuyCreditsModalProps {
    open: boolean;
    onClose: () => void;
}

/**
 * Modal displayed when user runs out of credits (402 NO_CREDITS).
 * Offers upgrade options and navigation to billing.
 */
export const BuyCreditsModal: React.FC<BuyCreditsModalProps> = ({ open, onClose }) => {
    const navigate = useNavigate();

    if (!open) return null;

    const handleUpgrade = () => {
        onClose();
        navigate("/settings?tab=billing");
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="relative bg-gradient-to-br from-primary via-primary/90 to-secondary p-6 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                        <X size={16} />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shadow-glow">
                            <Sparkles size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold font-display">Créditos Esgotados</h2>
                            <p className="text-white/80 text-sm font-display">Seus créditos de IA acabaram</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-display">
                        Você utilizou todos os seus créditos de IA deste ciclo. Para continuar usando
                        recursos como análises, relatórios e assistente virtual, escolha uma opção abaixo:
                    </p>

                    {/* Options */}
                    <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-colors cursor-pointer group"
                            onClick={handleUpgrade}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        <Zap size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-200 font-display">Pacote Extra</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-display">+1.000 créditos avulsos</p>
                                    </div>
                                </div>
                                <span className="text-primary font-bold font-display">R$ 29</span>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/30 hover:border-primary transition-colors cursor-pointer group"
                            onClick={handleUpgrade}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-glow">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-200 font-display">Upgrade Pro</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-display">2.000 créditos/mês + recursos premium</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-primary font-bold font-display">R$ 97/mês</span>
                                    <p className="text-[10px] text-success font-bold uppercase">Recomendado</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-display"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={handleUpgrade}
                        className="flex-[2] py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-glow transition-all flex items-center justify-center gap-2 font-display"
                    >
                        Ver Opções
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BuyCreditsModal;
