// src/types/momentum.d.ts
// Global augmentation (alternative to express-serve-static-core) — kept for safety with different setups.
import "express";
declare global {
  namespace Express {
    interface Request {
      user?: any | null;
      traceId?: string;
      tenant?: {
        id: string;
        role?: string;
        info?: {
          id: string;
          name?: string;
          plan?: string;
          locale?: string;
          features?: Record<string, any>;
        };
        flags?: Record<string, any>;
      };
    }
  }
}
export {};
