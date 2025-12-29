// web/src/components/realEstate/NewPropertyModal.tsx
import React, { useState, useEffect } from "react";
import { X, Building2, Home, User, Save, Loader2 } from "lucide-react";
import {
    listBuildings,
    listOwners,
    createUnit,
    Building,
    Owner
} from "../../services/realEstateApi";
import { Badge } from "../ui/Badge";

interface NewPropertyModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function NewPropertyModal({ onClose, onSuccess }: NewPropertyModalProps) {
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [owners, setOwners] = useState<Owner[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        code: "",
        name: "",
        buildingId: "",
        ownerId: "",
    });

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [b, o] = await Promise.all([listBuildings(), listOwners()]);
                setBuildings(b);
                setOwners(o);
            } catch (err) {
                console.error("Erro ao carregar selects:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.ownerId) return;

        setSaving(true);
        try {
            await createUnit({
                code: formData.code,
                name: formData.name,
                buildingId: formData.buildingId || undefined,
                ownerId: formData.ownerId,
                active: true,
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Erro ao salvar unidade:", err);
            alert("Erro ao salvar unidade. Verifique os dados.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                            <PlusIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Nova Propriedade</h2>
                            <p className="text-xs text-slate-500 font-medium">Cadastre uma nova unidade ao seu portfólio.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">

                    {/* Unidade & Nome */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
                                <Home size={12} /> Código da Unidade
                            </label>
                            <input
                                required
                                type="text"
                                placeholder="Ex: 1204-A"
                                value={formData.code}
                                onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                                Nome Amigável
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: Brera Moema"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">

                        {/* Edifício Select */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
                                <Building2 size={12} /> Edifício (Opcional)
                            </label>
                            {loading ? (
                                <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
                            ) : (
                                <select
                                    value={formData.buildingId}
                                    onChange={e => setFormData(prev => ({ ...prev, buildingId: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Nenhum (Propriedade Avulsa)</option>
                                    {buildings.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Proprietário Select */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
                                <User size={12} /> Proprietário
                            </label>
                            {loading ? (
                                <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
                            ) : (
                                <select
                                    required
                                    value={formData.ownerId}
                                    onChange={e => setFormData(prev => ({ ...prev, ownerId: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>Selecione um proprietário...</option>
                                    {owners.map(o => (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                    </div>

                    {/* Footer / Action */}
                    <div className="pt-4 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !formData.code || !formData.ownerId}
                            className="flex-[2] py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Salvar Propriedade
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function PlusIcon({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    );
}
