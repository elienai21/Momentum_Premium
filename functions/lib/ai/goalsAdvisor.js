"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.goalsFromText = goalsFromText;
const aiClient_1 = require("../utils/aiClient");
async function goalsFromText(_userId, note) {
    const result = await (0, aiClient_1.runGemini)('goals: ' + note, { tenantId: 'default', model: 'gemini', promptKind: 'goals' });
    const text = result.text || '';
    return text.split('\n').filter((line) => line.trim() !== '');
}
