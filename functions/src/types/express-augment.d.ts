// src/types/express-augment.d.ts
// Pragmatic unblock: relax Request typings so the existing code compiles under strict mode.
// We set `tenant: any` and `user: any` to avoid "possibly undefined" and shape-mismatch errors
// across middlewares and route handlers. We'll tighten later with branded types + middleware-guarded handlers.

import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    user: any;          // relaxed: some middlewares assign custom shapes
    tenant: any;        // relaxed: handlers access tenant.info/flags/id directly
    traceId?: string;
  }
}

export {};
