import { db } from "src/services/firebase";





import { Request, Response, NextFunction } from "express";

import { ApiError } from '../utils/errors';
import '../types';
export const requireRole = (role: 'admin' | 'user') =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required.');
      }
      const uid = req.user.uid;
      // The `withTenant` middleware should run before this to attach tenant info.
      const tenantId = req.tenant?.info.id;
      
      if (!tenantId) {
        throw new ApiError(400, 'Tenant context is missing for role check.');
      }

      const snap = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('members')
        .doc(uid)
        .get();

      if (!snap.exists) {
        throw new ApiError(403, 'Forbidden: You are not a member of this tenant.');
      }

      const memberRole = (snap.data()?.role || 'user') as 'admin' | 'user';

      if (role === 'admin' && memberRole !== 'admin') {
        throw new ApiError(403, 'Forbidden: Administrator role required for this action.');
      }
      
      next();
    } catch (e) { 
      next(e); 
    }
  };


