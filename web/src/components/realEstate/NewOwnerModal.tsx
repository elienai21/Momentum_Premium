// web/src/components/realEstate/NewOwnerModal.tsx
import React, { useState } from "react";
import { X, User, Mail, Phone, Save, Loader2 } from "lucide-react";
import { createOwner } from "../../services/realEstateApi";

interface NewOwnerModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function NewOwnerModal({ onClose, onSuccess }: NewOwnerModalProps) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setSaving(true);
        try {
            await createOwner({
                name: formData.name.trim(),
                email: formData.email.trim() || undefined,
                phone: formData.phone.trim() || undefined,
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Erro ao salvar proprietário:", err);
            alert("Erro ao salvar proprietário. Verifique os dados.");
        } finally {
            setSaving(false);
        }
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
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shadow-glow">
                            <User size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold font-display">Novo Proprietário</h2>
                            <p className="text-white/80 text-sm font-display">Cadastre um novo proprietário de imóveis</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Nome */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5 font-display">
                            <User size={12} /> Nome Completo *
                        </label>
                        <input
                            required
                            type="text"
                            placeholder="Ex: João da Silva"
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-display"
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5 font-display">
                            <Mail size={12} /> Email
                        </label>
                        <input
                            type="email"
                            placeholder="Ex: joao@email.com"
                            value={formData.email}
                            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-display"
                        />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5 font-display">
                            <Phone size={12} /> Telefone
                        </label>
                        <input
                            type="tel"
                            placeholder="Ex: (11) 99999-9999"
                            value={formData.phone}
                            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-display"
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-display"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !formData.name.trim()}
                            className="flex-[2] py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-display"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Salvar Proprietário
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default NewOwnerModal;
