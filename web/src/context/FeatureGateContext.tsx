// src/context/FeatureGateContext.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

export type FeatureFlags = {
  voiceTTS?: boolean;   // habilita "Ouvir resposta" (TTS)
  voiceSTT?: boolean;   // habilita "Falar pergunta" (STT / microfone)
  supportDock?: boolean; // habilita o dock de suporte
  advisorDock?: boolean; // habilita o dock do Advisor/CFO virtual
};

type FeatureGateContextValue = {
  flags: Required<FeatureFlags>;
};

const defaultFlags: Required<FeatureFlags> = {
  voiceTTS: true,
  voiceSTT: true,
  supportDock: true,
  advisorDock: true,
};

const FeatureGateContext = createContext<FeatureGateContextValue>({
  flags: defaultFlags,
});

type FeatureGateProviderProps = {
  children: ReactNode;
  /**
   * Flags que vêm do back-end/admin.
   * Tudo que não for enviado aqui cai no defaultFlags.
   */
  flags?: FeatureFlags;
};

export function FeatureGateProvider({
  children,
  flags,
}: FeatureGateProviderProps) {
  const merged = useMemo(
    () => ({
      ...defaultFlags,
      ...(flags ?? {}),
    }),
    [flags]
  );

  if (import.meta.env.DEV) {
    // Log simples em dev para ajudar a depurar feature flags
    // eslint-disable-next-line no-console
    console.debug("[FeatureGate] flags ativas:", merged);
  }

  return (
    <FeatureGateContext.Provider value={{ flags: merged }}>
      {children}
    </FeatureGateContext.Provider>
  );
}

/**
 * Hook para ler as feature flags normalizadas (sempre com boolean).
 *
 * Exemplo:
 *   const { voiceTTS, supportDock } = useFeatures();
 */
export function useFeatures(): Required<FeatureFlags> {
  const ctx = useContext(FeatureGateContext);
  return ctx.flags;
}
