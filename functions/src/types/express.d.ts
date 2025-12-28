import { db } from "src/services/firebase";
import "express";

declare global {
  namespace Express {
    /**
     * Representa o usuário autenticado extraído do token Firebase.
     */
    interface UserInfo {
      uid: string;
      email?: string;
      tenantId?: string;
      isAdmin?: boolean; // padronizado em vez de "admin"
      [k: string]: any;
    }

    /**
     * Metadados do tenant atual (empresa/organização).
     */
    interface TenantInfo {
      id: string;
      name?: string;
      domain?: string;
      locale?: string;      // pt-BR, en-US
      vertical?: string;    // finance, condos, etc.
      features?: Record<string, boolean>;
      flags?: Record<string, boolean>;
      [k: string]: any;
    }

    /**
     * Contexto técnico da requisição — útil para logs, tracing e AI calls.
     */
    interface RequestContext {
      traceId: string;
      startedAt: number;
      model?: string;        // modelo de IA usado (ex: "gpt-5" ou "gemini-2.5-pro")
      locale?: string;       // idioma resolvido
      source?: string;       // origem (mobile, web, etc.)
      [k: string]: any;
    }

    /**
     * Tipagem extendida do objeto Request.
     */
    interface Request {
      traceId?: string;
      user?: UserInfo;
      tenant?: { info: TenantInfo; flags: Record<string, boolean> };
      context?: RequestContext;
      googleAccessToken?: string; // usado para integrações com APIs do Google
    }
  }
}

export {};



