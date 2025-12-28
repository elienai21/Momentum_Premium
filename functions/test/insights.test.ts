import { describe, it, expect, vi } from 'vitest';
import { getAiInsights } from '../src/ai/insights';
import { DashboardData } from '../src/types';

// Mock dependencies to isolate the test
vi.mock('../src/ai/vertexClient', () => ({
  getGeminiModel: vi.fn(() => ({
    generateContent: vi.fn().mockResolvedValue({
      response: {
        candidates: [{
          content: {
            parts: [{ text: "- Insight 1\n- Insight 2" }]
          }
        }]
      }
    })
  }))
}));

vi.mock('firebase-admin', () => ({
  firestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ exists: false }),
        set: vi.fn().mockResolvedValue(true),
      })),
    })),
  })),
}));


describe('AI Insights Service', () => {
  it('should generate new insights when cache is empty', async () => {
    const mockDashboardData: DashboardData = {
      currentBalance: 1000,
      monthlyIncome: 5000,
      monthlyExpense: 4000,
      monthlyTotals: [],
      categoryTotals: [],
      recentTransactions: [],
    };

    const insights = await getAiInsights('test-user', 'test-sheet', mockDashboardData);

    expect(Array.isArray(insights)).toBe(true);
    expect(insights.length).toBe(2);
    expect(insights[0]).toBe('Insight 1');
  });
  
   it('should return an empty array if no dashboard data is provided and cache is empty', async () => {
    const insights = await getAiInsights('test-user', 'test-sheet', null);
    expect(insights).toEqual([]);
  });

});
