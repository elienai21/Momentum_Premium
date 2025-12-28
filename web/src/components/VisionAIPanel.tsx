import React, { useState, useRef } from "react";
import api from "@/services/api"; // ✅ usa cliente centralizado com token automático

type VisionResponse = {
  ok: boolean;
  extracted?: string;
  summary?: string;
  error?: string;
};

export const VisionAIPanel: React.FC = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<VisionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return alert("Selecione uma imagem primeiro.");

    try {
      setLoading(true);
      setResult(null);

      // converte o arquivo para base64 (sem o prefixo data:image/...)
      const toBase64 = (f: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(",")[1] ?? result;
            resolve(base64);
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(f);
        });

      const imageBase64 = await toBase64(file);

      // 🔥 Envia para /api/ai/vision em JSON, como o backend espera
      const { data } = await api.post<VisionResponse>("/ai/vision", {
        imageBase64,
      });

      setResult(data);
    } catch (err: any) {
      console.error("Erro no VisionAI:", err);
      setResult({
        ok: false,
        error: err.message || "Erro ao processar imagem.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="glass border border-white/10 rounded-2xl p-4 flex flex-col gap-3 md:max-w-[420px] transition-all duration-300">
      <div className="text-lg font-semibold text-gradient">
        📸 Vision AI — OCR Inteligente
      </div>

      <div className="flex flex-col gap-3">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="glass border border-white/10 rounded-xl px-3 py-2 text-sm font-medium hover:-translate-y-px transition-all"
        >
          Selecionar Imagem
        </button>

        {preview && (
          <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-sm">
            <img
              src={preview}
              alt="Preview"
              className="w-full object-contain max-h-[200px]"
            />
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={loading}
          className={`glass border border-white/10 rounded-xl px-3 py-2 font-medium text-sm transition-all ${
            loading
              ? "opacity-60 cursor-not-allowed"
              : "hover:-translate-y-px hover:shadow-md"
          }`}
        >
          {loading ? "🔍 Analisando..." : "🚀 Enviar para Análise"}
        </button>
      </div>

      {result && (
        <div className="flex-1 overflow-auto text-sm mt-2 space-y-3">
          {result.error && (
            <p className="text-red-400 bg-red-500/10 p-2 rounded-lg">
              {result.error}
            </p>
          )}

          {result.extracted && (
            <div className="glass border border-white/10 rounded-xl p-3">
              <h4 className="font-semibold mb-1">🧾 Texto Detectado:</h4>
              <p className="whitespace-pre-wrap text-xs leading-relaxed max-h-[140px] overflow-y-auto">
                {result.extracted}
              </p>
            </div>
          )}

          {result.summary && (
            <div className="glass border border-white/10 rounded-xl p-3">
              <h4 className="font-semibold mb-1">💡 Resumo Financeiro:</h4>
              <p className="whitespace-pre-wrap leading-relaxed">
                {result.summary}
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
