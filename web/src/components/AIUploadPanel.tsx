// ============================================================
// Momentum Vision AI — Upload Inteligente
// ============================================================

import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import "../services/firebase";
import { API_URL } from "@/config/api";
import authorizedFetch from "@/services/authorizedFetch";

export const AIUploadPanel: React.FC = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];
      setPreview(reader.result as string);
      setLoading(true);
      await processImage(base64);
    };
    reader.readAsDataURL(file);
  }

  async function processImage(imageBase64: string) {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado.");

      const url = `${API_URL}/ai/vision`;
      const res = await authorizedFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await res.json();
      if (data.ok) {
        setResult(data.summary || "Texto processado com sucesso.");
      } else {
        setResult(`Erro: ${data.error || "Falha ao processar imagem."}`);
      }
    } catch (e: any) {
      setResult(`Falha: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-gradient">Momentum Vision AI</h3>
      <p className="text-sm opacity-70">
        Envie uma nota fiscal, recibo ou fatura para extração automática de dados.
      </p>

      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="text-sm mt-2"
      />

      {preview && (
        <div className="mt-3">
          <img
            src={preview}
            alt="Pré-visualização"
            className="rounded-xl border border-white/10 max-h-[240px] object-contain"
          />
        </div>
      )}

      {loading ? (
        <div className="text-sm text-[var(--brand-2)] mt-2">
          Processando imagem...
        </div>
      ) : (
        result && (
          <pre className="text-xs mt-3 p-2 bg-black/20 rounded-lg">{result}</pre>
        )
      )}
    </div>
  );
};
