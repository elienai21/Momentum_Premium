"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAnomalies = detectAnomalies;
const aiClient_1 = require("../utils/aiClient");
async function detectAnomalies(_tenantId) {
    const result = await (0, aiClient_1.runGemini)('detect anomalies', { tenantId: _tenantId, model: 'gemini', promptKind: 'anomaly' });
    const text = result.text || '';
    return text.split('\n').filter((line) => line.trim() !== '');
}
