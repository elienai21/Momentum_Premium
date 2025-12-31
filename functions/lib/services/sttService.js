"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeAudio = transcribeAudio;
const openai_1 = __importDefault(require("openai"));
const fs = __importStar(require("fs/promises"));
const fs_1 = require("fs");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
// Lazy-init do OpenAI para evitar quebras no deploy se a chave nĂŁo estiver no env
let openaiClient = null;
function getOpenAIClient() {
    if (!openaiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY nĂŁo encontrada no ambiente.");
        }
        openaiClient = new openai_1.default({ apiKey });
    }
    return openaiClient;
}
async function transcribeAudio(audioBuffer, mimeType) {
    // Cria arquivo temporário preservando uma extensão compatível
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.${ext}`);
    try {
        await fs.writeFile(tempFilePath, audioBuffer);
        const openai = getOpenAIClient();
        const response = await openai.audio.transcriptions.create({
            file: (0, fs_1.createReadStream)(tempFilePath),
            model: "whisper-1",
            language: "pt",
            temperature: 0.2,
        });
        return response.text || "";
    }
    catch (error) {
        logger_1.logger.error("❌ Erro no Whisper STT:", error);
        throw new Error("Não foi possível transcrever o áudio.");
    }
    finally {
        try {
            if ((0, fs_1.existsSync)(tempFilePath)) {
                await fs.unlink(tempFilePath);
            }
        }
        catch (unlinkError) {
            logger_1.logger.warn("⚠️ Falha ao remover arquivo temporário de áudio:", { error: unlinkError });
        }
    }
}
