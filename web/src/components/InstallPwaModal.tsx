import { useEffect, useState } from "react";
import { GlassPanel } from "./ui/GlassPanel";
import { Badge } from "./ui/Badge";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallPwaModal() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    setVisible(false);
    setPromptEvent(null);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full">
      <GlassPanel className="p-4 shadow-lg shadow-blue-500/10 border border-slate-200/70">
        <div className="flex items-start gap-3">
          <Badge variant="success" className="mt-0.5">PWA</Badge>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">Instale o Momentum</p>
            <p className="text-xs text-slate-500">
              Adicione o app à tela inicial para um acesso mais rápido no celular.
            </p>
            <div className="flex gap-2 mt-2">
              <button
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                onClick={handleInstall}
              >
                Instalar App
              </button>
              <button
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700"
                onClick={() => setVisible(false)}
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
