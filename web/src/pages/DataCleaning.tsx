// web/src/pages/DataCleaning.tsx
import React, { useEffect, useState } from "react";
import {
  previewDuplicateTransactions,
  cleanupDuplicateTransactions,
  DuplicateTxnGroup,
} from "../services/DedupApi";
import { useToast } from "../components/Toast";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Trash2,
  ListChecks,
} from "lucide-react";

const DataCleaning: React.FC = () => {
  const { notify } = useToast();

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [groups, setGroups] = useState<DuplicateTxnGroup[]>([]);
  const [totalScanned, setTotalScanned] = useState<number>(0);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cleanupLoading, setCleanupLoading] = useState(false);

  async function loadPreview() {
    setLoadingPreview(true);
    setPreviewError(null);

    try {
      const resp = await previewDuplicateTransactions();
      setGroups(resp.groups || []);
      setTotalScanned(resp.totalScanned || 0);
      setSelectedIds(new Set());
    } catch (err: any) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error("[Dedup] Erro ao carregar preview:", err);
      }
      setPreviewError(
        err?.message ||
          "Não foi possível analisar duplicidades agora. Tente novamente.",
      );
    } finally {
      setLoadingPreview(false);
    }
  }

  useEffect(() => {
    void loadPreview();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectGroup = (group: DuplicateTxnGroup, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      group.ids.forEach((id) => {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  };

  const isGroupFullySelected = (group: DuplicateTxnGroup) =>
    group.ids.every((id) => selectedIds.has(id));

  const handleCleanupSelected = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      notify({
        type: "warning",
        message: "Selecione pelo menos uma transação duplicada para remover.",
      });
      return;
    }

    const confirmed = window.confirm(
      `Você está prestes a remover ${ids.length} transação(ões) marcada(s) como duplicadas.\n\nEssa ação não pode ser desfeita. Deseja continuar?`,
    );

    if (!confirmed) return;

    try {
      setCleanupLoading(true);
      const result = await cleanupDuplicateTransactions(ids);

      notify({
        type: "success",
        message: `Remoção concluída: ${result.deleted} transação(ões) excluída(s).`,
      });

      await loadPreview();
    } catch (err: any) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error("[Dedup] Erro ao limpar duplicadas:", err);
      }
      notify({
        type: "error",
        message:
          err?.message ||
          "Não foi possível remover as duplicadas. Tente novamente.",
      });
    } finally {
      setCleanupLoading(false);
    }
  };

  const totalGroups = groups.length;
  const totalDuplicateDocs = groups.reduce(
    (acc, g) => acc + (g.docs?.length || 0),
    0,
  );

  return (
    <main className="p-6 space-y-6" aria-live="polite">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Auditoria & Limpeza de Transações
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Visualize e limpe transações potencialmente duplicadas. Agrupamos lançamentos com mesma data,
            valor e descrição para facilitar sua conferência.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
          <button
            type="button"
            onClick={() => void loadPreview()}
            disabled={loadingPreview}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800/80"
          >
            {loadingPreview ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recalculando…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Reanalisar duplicadas
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCleanupSelected}
            disabled={cleanupLoading || selectedIds.size === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-500/90 px-3 py-2 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-40 dark:border-rose-500/60"
          >
            {cleanupLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Removendo…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Remover selecionadas ({selectedIds.size})
              </>
            )}
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Lançamentos analisados
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
            {totalScanned.toLocaleString("pt-BR")}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Considerando os últimos lançamentos importados.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Grupos de duplicidade
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
            {totalGroups}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Cada grupo representa lançamentos com mesma impressão digital.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Transações duplicadas
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
            {totalDuplicateDocs}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Selecione o que deseja remover, mantendo um registro por grupo.
          </p>
        </div>
      </section>

      {previewError && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/60 dark:bg-amber-900/30 dark:text-amber-100 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{previewError}</span>
        </div>
      )}

      {loadingPreview ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analisando transações em busca de duplicadas…
        </div>
      ) : groups.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 flex items-start gap-3">
          <ListChecks className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              Nenhuma duplicidade relevante encontrada.
            </p>
            <p className="mt-1 text-xs">
              No momento não encontramos grupos com lançamentos repetidos. Sempre que você importar novos extratos, volte
              aqui para rodar uma nova análise.
            </p>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          {groups.map((group, idx) => (
            <div
              key={group.fingerprint}
              className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Grupo #{idx + 1}
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {group.sample.description || "Sem descrição"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {group.sample.date ? `Data: ${group.sample.date} · ` : ""}
                    Valor:{" "}
                    {group.sample.amount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}{" "}
                    · Tipo: {group.sample.type || "—"}
                  </p>
                </div>

                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {group.count} lançamentos com a mesma impressão digital
                  </p>
                  <label className="inline-flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-500"
                      checked={isGroupFullySelected(group)}
                      onChange={(e) => toggleSelectGroup(group, e.target.checked)}
                    />
                    Selecionar todo o grupo
                  </label>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/70 text-slate-500 dark:text-slate-300">
                    <tr>
                      <th className="px-3 py-2 text-left w-8"></th>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Descrição</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                      <th className="px-3 py-2 text-left">ID interno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.docs.map((tx) => {
                      const checked = selectedIds.has(tx.id);
                      return (
                        <tr
                          key={tx.id}
                          className={`border-t border-slate-100 dark:border-slate-800 ${
                            checked
                              ? "bg-emerald-50/60 dark:bg-emerald-900/20"
                              : "bg-white dark:bg-slate-900/60"
                          }`}
                        >
                          <td className="px-3 py-2 align-middle">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-500"
                              checked={checked}
                              onChange={() => toggleSelect(tx.id)}
                            />
                          </td>
                          <td className="px-3 py-2 align-middle text-slate-700 dark:text-slate-200">
                            {tx.date || "—"}
                          </td>
                          <td className="px-3 py-2 align-middle text-slate-700 dark:text-slate-200">
                            {tx.description || "—"}
                          </td>
                          <td className="px-3 py-2 align-middle text-slate-700 dark:text-slate-200">
                            {tx.type || "—"}
                          </td>
                          <td
                            className={`px-3 py-2 align-middle text-right font-medium ${
                              tx.amount >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {tx.amount.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </td>
                          <td className="px-3 py-2 align-middle text-[10px] text-slate-400 dark:text-slate-500">
                            {tx.id}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Sugestão: normalmente você mantém apenas 1 lançamento por grupo (o registro original) e apaga os demais.
                Use a seleção por grupo ou marque manualmente o que deseja remover.
              </p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
};

export default DataCleaning;
