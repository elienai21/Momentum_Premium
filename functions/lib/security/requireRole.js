"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const firebase_1 = require("src/services/firebase");
const errors_1 = require("../utils/errors");
require("../types");
const requireRole = (role) => async (req, _res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.ApiError(401, 'Authentication required.');
        }
        const uid = req.user.uid;
        // The `withTenant` middleware should run before this to attach tenant info.
        const tenantId = req.tenant?.info.id;
        if (!tenantId) {
            throw new errors_1.ApiError(400, 'Tenant context is missing for role check.');
        }
        const snap = await firebase_1.db
            .collection('tenants')
            .doc(tenantId)
            .collection('members')
            .doc(uid)
            .get();
        if (!snap.exists) {
            throw new errors_1.ApiError(403, 'Forbidden: You are not a member of this tenant.');
        }
        const memberRole = (snap.data()?.role || 'user');
        if (role === 'admin' && memberRole !== 'admin') {
            throw new errors_1.ApiError(403, 'Forbidden: Administrator role required for this action.');
        }
        next();
    }
    catch (e) {
        next(e);
    }
};
exports.requireRole = requireRole;
