import React, { useEffect, useState, useMemo } from "react";
import { Users, UserPlus, UserX, Search, MoreHorizontal } from "lucide-react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../services/firebase";
import { GlassPanel } from "../components/ui/GlassPanel";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatsCard } from "../components/ui/StatsCard";
import { Badge } from "../components/ui/Badge";
import { cn } from "../lib/utils";
import { useTenant } from "../context/TenantContext";

interface Client {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: any; // Timestamp or string
  phone?: string;
}

const Clients: React.FC = () => {
  const { tenantId } = useTenant();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!tenantId) {
      setClients([]);
      setLoading(false);
      return;
    }
    async function loadClients(): Promise<void> {
      setLoading(true);
      try {
        // "coleção tenants/tenantId/clients"
        const ref = collection(db, "tenants", tenantId!, "clients");
        const q = query(ref);
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
        setClients(list);
      } catch (error) {
        console.error("Error loading clients", error);
      } finally {
        setLoading(false);
      }
    }
    loadClients();
  }, [tenantId]);

  // Derived Stats
  const total = clients.length;
  const active = clients.filter(c => c.status === 'active').length;
  const inactive = clients.filter(c => c.status === 'inactive').length;

  const newClients = clients.filter(c => {
    if (!c.createdAt) return false;
    const d = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return d > thirtyDaysAgo;
  }).length;

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20 fade-in" aria-live="polite">
      <SectionHeader
        title="Clientes"
        subtitle="Gerencie sua base de clientes e acompanhe métricas de engajamento."
        actions={
          <button className="bg-momentum-accent hover:bg-momentum-accent/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-momentum-glow flex items-center gap-2">
            <UserPlus size={16} /> <span className="hidden sm:inline">Novo Cliente</span>
          </button>
        }
      />

      {/* Stats Grid */}
      {!tenantId ? (
        <div className="p-12 text-center text-momentum-muted">
          Selecione um tenant para visualizar os clientes.
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <GlassPanel key={i} className="h-32 animate-pulse bg-current/5"><div /></GlassPanel>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard label="Total de Clientes" value={String(total)} icon={Users} variant="default" />
          <StatsCard label="Novos (30 dias)" value={`+${newClients}`} icon={UserPlus} variant="success" />
          <StatsCard label="Inativos" value={String(inactive)} icon={UserX} variant="danger" />
        </div>
      )}

      {/* List */}
      <GlassPanel className="p-0 overflow-hidden">
        <div className="p-6 border-b border-momentum-border flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Search Bar */}
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 text-momentum-muted" size={16} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-momentum-bg/50 border border-momentum-border rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-momentum-accent outline-none transition-all text-momentum-text placeholder:text-momentum-muted/70"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{filteredClients.length} cadastrados</Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center flex flex-col items-center gap-2 text-momentum-muted animate-pulse">
              <Users size={32} className="opacity-20" />
              <p>Carregando lista de clientes...</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-momentum-muted/5 text-momentum-muted font-semibold uppercase text-xs tracking-wider border-b border-momentum-border">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Data Cadastro</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-momentum-border">
                {filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-momentum-accent/5 transition-colors group">
                    <td className="px-6 py-4 font-medium text-momentum-text flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-momentum-accent/10 flex items-center justify-center text-momentum-accent font-bold text-xs shrink-0">
                        {(client.name || "?").charAt(0).toUpperCase()}
                      </div>
                      {client.name || "Sem Nome"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={client.status === 'active' ? 'success' : 'neutral'} className="capitalize">
                        {client.status === 'active' ? 'Ativo' : client.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-momentum-muted">{client.email}</td>
                    <td className="px-6 py-4 text-momentum-muted">
                      {client.createdAt ? (client.createdAt.toDate ? client.createdAt.toDate() : new Date(client.createdAt)).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-momentum-muted/10 rounded-lg text-momentum-muted transition-colors">
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-momentum-muted">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </GlassPanel>
    </div>
  )
}

export default Clients;
