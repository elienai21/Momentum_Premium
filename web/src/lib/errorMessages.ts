// web/src/lib/errorMessages.ts
export type KnownStatus = 401 | 403 | 404 | 500;

export interface FriendlyError {
  title: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}

function getStatusFromError(error: unknown): number | undefined {
  if (!error) return undefined;

  // Axios-like
  // @ts-ignore
  const maybeStatus = error?.response?.status ?? error?.status;

  if (typeof maybeStatus === "number") return maybeStatus;

  return undefined;
}

export function getFriendlyError(error: unknown): FriendlyError {
  const status = getStatusFromError(error) as KnownStatus | undefined;

  switch (status) {
    case 401:
      return {
        title: "Sua sessão expirou",
        message: "Entre novamente para continuar vendo seus dados financeiros.",
        ctaLabel: "Fazer login",
        ctaHref: "/login",
      };
    case 403:
      return {
        title: "Recurso não disponível no seu plano",
        message:
          "Este recurso faz parte de um plano superior do Momentum. Veja os planos disponíveis.",
        ctaLabel: "Ver planos",
        ctaHref: "/planos",
      };
    case 404:
      return {
        title: "Nenhum dado encontrado",
        message:
          "Não encontramos dados para este período. Tente outro filtro ou importe seus dados financeiros.",
      };
    case 500:
      return {
        title: "Erro inesperado",
        message:
          "Ocorreu um erro interno. Já registramos isso. Tente novamente em alguns instantes.",
      };
    default:
      return {
        title: "Algo não saiu como esperado",
        message:
          "Tivemos um problema para carregar essas informações. Tente novamente. Se persistir, fale com o suporte.",
      };
  }
}
