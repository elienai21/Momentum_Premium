"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
const errors_1 = require("../utils/errors");
/**
 * Garante que o usuário autenticado é administrador.
 */
function requireAdmin(req, _res, next) {
    const user = req?.user;
    if (!user || !user.isAdmin) {
        return next(new errors_1.ApiError(403, "Forbidden: Administrator access required."));
    }
    next();
}
