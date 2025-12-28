

import { describe, it, expect, vi } from 'vitest';
import { SheetsAdapter } from '../src/core/adapters/sheets';
import { google } from 'googleapis';

// Mock the entire googleapis library
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: class {
        setCredentials() {}
      },
      GoogleAuth: class {
        async getClient() {}
      }
    },
    sheets: vi.fn(() => ({
      spreadsheets: {
        values: {
          get: vi.fn().mockResolvedValue({
            data: {
              values: [
                ['Data', 'Descrição', 'Valor', 'Categoria', 'Tipo'],
                ['01/07/2024', 'Salário', '5000', 'Salário', 'Income'],
              ],
            },
          }),
          clear: vi.fn().mockResolvedValue({}),
          update: vi.fn().mockResolvedValue({}),
        },
      },
    })),
    drive: vi.fn(), // Mock drive as well
  },
}));

// Mock Firestore
vi.mock('firebase-admin', async (importOriginal) => {
    const actualAdmin = await importOriginal() as object;
    return {
        ...actualAdmin,
        firestore: vi.fn(() => ({
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn().mockResolvedValue({ exists: false }),
                })),
            })),
            batch: vi.fn(() => ({
                set: vi.fn(),
                commit: vi.fn().mockResolvedValue(true),
            })),
        })),
    };
});

describe('SheetsAdapter (Import/Export Mode)', () => {
  it('should correctly read rows for import', async () => {
    const adapter = await SheetsAdapter.fromUserToken('fake-access-token');
    const sheetsGetSpy = (google.sheets as any)('v4').spreadsheets.values.get;
    
    // This is a proxy test, as importSheetToFirestore does not return the rows.
    // We just check that the API is called correctly.
    await adapter.importSheetToFirestore('test-sheet-id', 'test-tenant-id');
    
    // FIX: Corrected range to match implementation
    expect(sheetsGetSpy).toHaveBeenCalledWith({
      spreadsheetId: 'test-sheet-id',
      range: 'Items!A:E',
    });
  });

  // Other tests for export logic can be added here.
});