import { useEffect, useState } from "react";
import { realEstateApi, RealEstateDocument } from "../../services/realEstateApi";
import { GlassPanel } from "../ui/GlassPanel";
import { Badge } from "../ui/Badge";
import { UploadDocumentModal } from "./UploadDocumentModal";
import { FileText, Loader2, Upload } from "lucide-react";
import { usePermission } from "../../hooks/usePermission";

type Props = {
  entityId: string;
  entityType: string;
};

export function DocumentsPanel({ entityId, entityType }: Props) {
  const [documents, setDocuments] = useState<RealEstateDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { canEdit } = usePermission();

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await realEstateApi.documents.list({
        linkedEntityId: entityId,
        linkedEntityType: entityType,
      });
      setDocuments(docs);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      loadDocuments();
    }
  }, [entityId]);

  const handleSuccess = (doc: RealEstateDocument) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  return (
    <GlassPanel className="p-4 border border-slate-200/70 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase text-slate-400 font-semibold tracking-widest">
            GED
          </p>
          <h4 className="text-lg font-bold text-slate-800">Documentos da Unidade</h4>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700"
          >
            <Upload size={16} />
            Novo Documento
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          Carregando documentos...
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && documents.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum documento cadastrado para esta entidade.</p>
      )}

      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{doc.title}</p>
                  <Badge variant={doc.status === "active" ? "success" : "neutral"}>
                    {doc.status === "active" ? "Ativo" : "Arquivado"}
                  </Badge>
                  <Badge variant="neutral">v{doc.version}</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {doc.docType} • {doc.fileName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {doc.validUntil && (
                <Badge variant="warn" className="text-[10px]">
                  Validade {doc.validUntil}
                </Badge>
              )}
              <a
                href={doc.downloadUrl || undefined}
                target="_blank"
                rel="noreferrer"
                className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${
                  doc.downloadUrl
                    ? "border-blue-200 text-blue-700 hover:bg-blue-50"
                    : "border-slate-200 text-slate-400 cursor-not-allowed"
                }`}
                onClick={(e) => {
                  if (!doc.downloadUrl) {
                    e.preventDefault();
                  }
                }}
              >
                {doc.downloadUrl ? "Download" : "Sem URL"}
              </a>
            </div>
          </div>
        ))}
      </div>

      <UploadDocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entityId={entityId}
        entityType={entityType}
        onSuccess={handleSuccess}
      />
    </GlassPanel>
  );
}
