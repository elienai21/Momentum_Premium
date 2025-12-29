"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const advisor_1 = require("../ai/advisor");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const router = express_1.default.Router();
// POST /api/advisor
router.post("/", requireAuth_1.requireAuth, withTenant_1.withTenant, advisor_1.runAdvisor);
exports.default = router;
