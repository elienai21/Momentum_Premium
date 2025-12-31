import { useState } from "react";
import { realEstateApi, RealEstateDocument } from "../../services/realEstateApi";
import { GlassPanel } from "../ui/GlassPanel";
import { Badge } from "../ui/Badge";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityType: string;
  onSuccess: (doc: RealEstateDocument) => void;
};

const docTypeOptions = [
  { value: "contract", label: "Contrato" },
  { value: "inspection", label: "Vistoria" },
  { value: "iptu", label: "IPTU" },
  { value: "other", label: "Outros" },
];

export function UploadDocumentModal({
  isOpen,
  onClose,
  entityId,
  entityType,
  onSuccess,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("contract");
  const [validUntil, setValidUntil] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setFile(null);
    setTitle("");
    setDocType("contract");
    setValidUntil("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Selecione um arquivo.");
      return;
    }
    if (!title.trim()) {
      setError("Informe um título.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const init = await realEstateApi.documents.initUpload({
        linkedEntityType: entityType,
        linkedEntityId: entityId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        title,
        docType,
        validUntil: validUntil || undefined,
      });

      const uploadResp = await fetch(init.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadResp.ok) {
        throw new Error(`Falha no upload (${uploadResp.status})`);
      }

      const commit = await realEstateApi.documents.commit({
        uploadSessionId: init.uploadSessionId,
        storagePath: init.storagePath,
        linkedEntityType: entityType,
        linkedEntityId: entityId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        title,
        docType,
        validUntil: validUntil || undefined,
      });

      onSuccess(commit.document);
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erro ao enviar documento");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <GlassPanel className="w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold tracking-widest">
              GED • Upload
            </p>
            <h3 className="text-xl font-bold text-slate-900">Novo Documento</h3>
          </div>
          <Badge variant="neutral" className="uppercase text-[10px]">
            {entityType}
          </Badge>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500">Arquivo (PDF/Imagem)</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              disabled={submitting}
              required
            />
            {file && (
              <p className="text-[11px] text-slate-500">
                {file.name} • {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-500 flex flex-col gap-1">
              Título
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                disabled={submitting}
                required
              />
            </label>

            <label className="text-xs font-semibold text-slate-500 flex flex-col gap-1">
              Tipo de Documento
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                disabled={submitting}
              >
                {docTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="text-xs font-semibold text-slate-500 flex flex-col gap-1">
            Validade (opcional)
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              disabled={submitting}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Enviando..." : "Salvar"}
            </button>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
}
