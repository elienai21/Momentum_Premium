import { db } from "src/services/firebase";
import { runGemini } from '../utils/aiClient';

export async function goalsFromText(_userId: string, note: string) {
  const result = await runGemini('goals: ' + note, { tenantId: 'default', model: 'gemini', promptKind: 'goals' });
  const text = (result as any).text || '';
  return text.split('\n').filter((line: string) => line.trim() !== '');
}



