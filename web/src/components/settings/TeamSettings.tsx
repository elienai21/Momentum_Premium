
import React, { useEffect, useState } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { AsyncPanel } from "../ui/AsyncPanel";
import { api } from "@/services/api";
import { User, Trash2, Mail, Shield, Plus, Clock } from "lucide-react";
import { useToast } from "../Toast";
import { InviteMemberModal } from "./InviteMemberModal";
import { useTenant } from "@/context/TenantContext";

interface Member {
    id: string; // uid
    email?: string;
    name?: string;
    role?: string;
    photoURL?: string;
}

interface Invite {
    id: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
}

interface TeamData {
    members: Member[];
    invites: Invite[];
}

export function TeamSettings() {
    const { notify } = useToast();
    const { tenant } = useTenant();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<TeamData>({ members: [], invites: [] });
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get<{ status: string; data: TeamData }>("/tenants/members");
            setData(res.data.data);
        } catch (err) {
            console.error(err);
            notify({ type: "error", message: "Erro ao carregar equipe." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRemoveMember = async (uid: string) => {
        if (!window.confirm("Tem certeza que deseja remover este membro?")) return;

        try {
            setDeletingId(uid);
            await api.delete(`/tenants/members/${uid}`);
            notify({ type: "success", message: "Membro removido com sucesso." });
            setData(prev => ({ ...prev, members: prev.members.filter(m => m.id !== uid) }));
        } catch (err: any) {
            notify({ type: "error", message: err.response?.data?.message || "Erro ao remover membro." });
        } finally {
            setDeletingId(null);
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        if (!window.confirm("Cancelar este convite?")) return;

        try {
            setDeletingId(inviteId);
            await api.delete(`/tenants/invites/${inviteId}`);
            notify({ type: "success", message: "Convite cancelado." });
            setData(prev => ({ ...prev, invites: prev.invites.filter(i => i.id !== inviteId) }));
        } catch (err: any) {
            notify({ type: "error", message: "Erro ao cancelar convite." });
        } finally {
            setDeletingId(null);
        }
    };

    const isOwner = (uid: string) => uid === tenant?.ownerUid;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 font-display flex items-center gap-2">
                        <User size={20} className="text-primary" />
                        Gestão de Equipe
                    </h3>
                    <p className="text-sm text-slate-500 font-display">Gerencie quem tem acesso ao workspace da empresa.</p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-glow transition-all flex items-center gap-2 font-display"
                >
                    <Plus size={16} />
                    Convidar Membro
                </button>
            </div>

            <AsyncPanel isLoading={loading} isEmpty={data.members.length === 0 && data.invites.length === 0} error={null}>

                {/* Invites Section */}
                {data.invites.length > 0 && (
                    <div className="space-y-3 mb-6">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display flex items-center gap-2">
                            <Clock size={12} /> Convites Pendentes
                        </h4>
                        <div className="grid gap-3">
                            {data.invites.map(invite => (
                                <GlassPanel key={invite.id} className="p-4 flex items-center justify-between border-slate-200/50 dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                            <Mail size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-display">{invite.email}</p>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                <span className="capitalize">{invite.role}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                <span>Enviado em {new Date(invite.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleCancelInvite(invite.id)}
                                        disabled={deletingId === invite.id}
                                        className="p-2 text-slate-400 hover:text-error hover:bg-error/10 rounded-lg transition-all"
                                        title="Cancelar convite"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </GlassPanel>
                            ))}
                        </div>
                    </div>
                )}

                {/* Members Section */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display flex items-center gap-2">
                        <Shield size={12} /> Membros Ativos
                    </h4>
                    <div className="grid gap-3">
                        {data.members.map(member => (
                            <GlassPanel key={member.id} className="p-4 flex items-center justify-between border-slate-200/50 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                        {member.name ? member.name.charAt(0).toUpperCase() : (member.email?.charAt(0).toUpperCase() || "U")}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-display flex items-center gap-2">
                                            {member.name || member.email?.split('@')[0]}
                                            {isOwner(member.id) && <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] uppercase">Dono</span>}
                                            {member.id === data.members.find(m => m.email === tenant?.ownerEmail)?.id && <span className="text-xs text-slate-400">(Você)</span>}
                                        </p>
                                        <p className="text-[11px] text-slate-400 font-display">{member.email}</p>
                                    </div>
                                </div>
                                {!isOwner(member.id) && (
                                    <button
                                        onClick={() => handleRemoveMember(member.id)}
                                        disabled={deletingId === member.id}
                                        className="p-2 text-slate-400 hover:text-error hover:bg-error/10 rounded-lg transition-all"
                                        title="Remover membro"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </GlassPanel>
                        ))}
                    </div>
                </div>

            </AsyncPanel>

            {showInviteModal && (
                <InviteMemberModal
                    onClose={() => setShowInviteModal(false)}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
}
