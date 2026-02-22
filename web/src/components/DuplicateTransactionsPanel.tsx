// web/src/components/DuplicateTransactionsPanel.tsx
import { useMemo, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { useDedupPreview, useDedupCleanup } from "../hooks/useDedup";
import type { DuplicateTxnGroup } from "../services/DedupApi";
import { useToast } from "./Toast";

interface DuplicateTransactionsPanelProps {
  onClose: () => void;
}

type SelectionState = Record<string, boolean>; // id -> selecionado

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("pt-BR");
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export function DuplicateTransactionsPanel({
  onClose,
}: DuplicateTransactionsPanelProps) {
  const { notify } = useToast();
  const { groups, isLoading, error, totalScanned, totalExtraDuplicates } =
    useDedupPreview();
  const cleanup = useDedupCleanup();

  // Seleção de transações a excluir
  const [selected, setSelected] = useState<SelectionState>({});

  // Inicializa seleção: por padrão marca todas as duplicadas "extra" (mantendo 1 por grupo)
  useMemo(() => {
    if (!groups.length) return;
    const next: SelectionState = {};
    groups.forEach((group: DuplicateTxnGroup) => {
      // Mantém a primeira, marca as demais para exclusão
      group.docs.forEach((tx, index) => {
        if (index === 0) {
          next[tx.id] = false;
        } else {
          next[tx.id] = true;
        }
      });
    });
    setSelected(next);
  }, [groups.length]); // dispara apenas quando a quantidade de grupos mudar

  const allIds = useMemo(
    () => groups.flatMap((g) => g.docs.map((tx) => tx.id)),
    [groups],
  );

  const selectedIds = useMemo(
    () => allIds.filter((id) => selected[id]),
    [allIds, selected],
  );

  const anySelected = selectedIds.length > 0;

  const handleToggleTx = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAll = () => {
    const next: SelectionState = {};
    allIds.forEach((id) => {
      next[id] = true;
    });
    setSelected(next);
  };

  const handleClearSelection = () => {
    const next: SelectionState = {};
    allIds.forEach((id) => {
      next[id] = false;
    });
    setSelected(next);
  };

  const handleCleanup = async () => {
    if (!anySelected || cleanup.isPending) return;

    try {
      const { deleted } = await cleanup.mutateAsync(selectedIds);
      notify({
        type: "success",
        message: `Remoção concluída. ${deleted} transações duplicadas foram apagadas.`,
      });
      setSelected({});
      onClose();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) {
        console.error("[Dedup] Erro ao limpar duplicadas:", err);
      }
      notify({
        type: "error",
        message:
          "Não foi possível remover as duplicadas agora. Tente novamente em alguns instantes.",
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Transações duplicadas"
    >
      <div className="mt-14 h-[calc(100vh-3.5rem)] w-full max-w-xl overflow-hidden rounded-l-3xl bg-white shadow-2xl dark:bg-slate-950">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Deduplicação de transações
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Revise transações muito parecidas e escolha quais deseja remover.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fechar"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Resumo + ações globais */}
        <div className="border-b border-slate-200 px-4 py-2 text-[11px] text-slate-600 dark:border-slate-800 dark:text-slate-300">
          {isLoading ? (
            <p>Carregando possíveis duplicadas...</p>
          ) : error ? (
            <p className="text-rose-500">
              Não foi possível carregar as duplicadas. Tente novamente mais
              tarde.
            </p>
          ) : groups.length === 0 ? (
            <p>
              Nenhuma duplicata relevante encontrada nas últimas{" "}
              {totalScanned || 0} transações analisadas.
            </p>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div>
                <p>
                  Analisamos{" "}
                  <span className="font-semibold">{totalScanned}</span>{" "}
                  transações e encontramos{" "}
                  <span className="font-semibold">
                    {groups.length} grupos
                  </span>{" "}
                  com possíveis duplicadas (
                  <span className="font-semibold">
                    {totalExtraDuplicates}
                  </span>{" "}
                  lançamentos extras).
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  A primeira transação de cada grupo é mantida por padrão; as
                  demais vêm selecionadas para remoção.
                </p>
              </div>

              {groups.length > 0 && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Selecionar todas
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Limpar seleção
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {selectedIds.length} selecionadas para apagar
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lista de grupos */}
        <div className="flex h-[calc(100%-132px)] flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {groups.map((group) => (
              <div
                key={group.fingerprint}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-100">
                      {group.sample.description}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatMoney(group.sample.amount)} ·{" "}
                      {formatDate(group.sample.date)} · {group.count} lançamentos
                      parecidos
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {group.docs.map((tx, index) => {
                    const checked = !!selected[tx.id];
                    const isPrimary = index === 0;

                    return (
                      <label
                        key={tx.id}
                        className={[
                          "flex cursor-pointer items-center justify-between rounded-xl border px-2 py-1.5",
                          checked
                            ? "border-rose-200 bg-rose-50/70 dark:border-rose-500/40 dark:bg-rose-900/20"
                            : "border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/70",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                            checked={checked}
                            onChange={() => handleToggleTx(tx.id)}
                          />
                          <div className="flex flex-col">
                            <span className="text-[11px] text-slate-700 dark:text-slate-100">
                              {formatDate(tx.date)} ·{" "}
                              {formatMoney(tx.amount)}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {tx.description}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          {isPrimary && (
                            <span className="rounded-full bg-emerald-100 px-2 py-px text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              Mantida
                            </span>
                          )}
                          {tx.createdAt && (
                            <span className="text-[9px] text-slate-400">
                              Criada em{" "}
                              {new Date(tx.createdAt).toLocaleString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {!isLoading && !error && groups.length === 0 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nada para deduplicar por enquanto.
              </p>
            )}
          </div>

          {/* Rodapé com botão de limpeza */}
          <div className="border-t border-slate-200 px-4 py-3 text-xs dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Revise as duplicatas com calma. Remover lançamentos não pode ser
                desfeito.
              </p>
              <button
                type="button"
                onClick={handleCleanup}
                disabled={!anySelected || cleanup.isPending}
                className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {cleanup.isPending
                  ? "Removendo..."
                  : `Remover ${selectedIds.length} duplicada(s)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
