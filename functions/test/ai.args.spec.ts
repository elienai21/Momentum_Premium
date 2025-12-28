import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const AddTransactionArgsSchema = z.object({
    description: z.string().min(1),
    amount: z.number().or(z.string().transform(v => parseFloat(String(v).replace(/[^0-9.,-]/g, '').replace(',', '.')))),
    category: z.string().default('Outros'),
    type: z.enum(['Income', 'Expense']),
});

describe('AI argument validation with Zod', () => {
  it('should accept a valid transaction object', () => {
    const validArgs = {
      description: 'Monthly Salary',
      amount: 5000,
      category: 'Salário',
      type: 'Income'
    };
    const result = AddTransactionArgsSchema.safeParse(validArgs);
    expect(result.success).toBe(true);
  });

  it('should correctly parse a string amount with currency symbol and comma', () => {
    const argsWithStringAmount = {
      description: 'Coffee',
      amount: 'R$ 12,50',
      category: 'Alimentação',
      type: 'Expense'
    };
    const result = AddTransactionArgsSchema.safeParse(argsWithStringAmount);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(12.50);
    }
  });

  it('should fail if description is missing', () => {
    const invalidArgs = {
      amount: 100,
      category: 'Test',
      type: 'Expense'
    };
    const result = AddTransactionArgsSchema.safeParse(invalidArgs);
    expect(result.success).toBe(false);
  });

  it('should fail if type is invalid', () => {
    const invalidArgs = {
      description: 'Invalid type',
      amount: 100,
      category: 'Test',
      type: 'Invalid'
    };
    const result = AddTransactionArgsSchema.safeParse(invalidArgs);
    expect(result.success).toBe(false);
  });
});
