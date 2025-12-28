import { logger } from 'src/utils/logger';

describe('logger', () => {
  it('prints structured info json', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Teste OK', 'trace-123', { foo: 'bar' });
    expect(spy).toHaveBeenCalled();
    const payload = JSON.parse((spy.mock.calls[0][0] as string));
    expect(payload.level).toBe('info');
    expect(payload.traceId).toBe('trace-123');
    expect(payload.message).toBe('Teste OK');
    expect(payload.foo).toBe('bar');
    spy.mockRestore();
  });
});
