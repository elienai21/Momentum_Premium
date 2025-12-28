
import { describe, it, expect, vi } from 'vitest';
// FIX: Corrected the import path for requireAuth middleware.
import { requireAuth } from '../src/middleware/requireAuth';
import { ApiError } from '../src/utils/errors';

describe('Security Middleware: requireAuth', () => {
  it('should call next with an ApiError if Authorization header is missing', async () => {
    const req: any = { headers: {} };
    const res: any = {};
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain("Missing or invalid Authorization header");
  });

  it('should call next with an ApiError if Google Access Token is missing', async () => {
    const req: any = { headers: { authorization: 'Bearer test-token' } };
    const res: any = {};
    const next = vi.fn();
    
    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain("Missing Google Access Token");
  });
});
