import { db } from "src/services/firebase";
import { runGemini } from '../utils/aiClient';

export async function detectAnomalies(_tenantId: string) {
  const result = await runGemini('detect anomalies', { tenantId: _tenantId, model: 'gemini', promptKind: 'anomaly' });
  const text = (result as any).text || '';
  return text.split('\n').filter((line: string) => line.trim() !== '');
}



