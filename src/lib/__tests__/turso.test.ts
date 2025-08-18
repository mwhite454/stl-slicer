import { jest } from '@jest/globals';

describe('turso.ts', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.clearAllMocks();
  });

  test('throws when TURSO_DATABASE_URL missing', async () => {
    process.env = { ...ORIGINAL_ENV, TURSO_DATABASE_URL: undefined, TURSO_AUTH_TOKEN: 'x' } as any;
    jest.doMock('@libsql/client', () => ({ createClient: jest.fn() }));
    await expect(import('@/lib/turso')).rejects.toThrow('TURSO_DATABASE_URL is not set');
  });

  test('throws when TURSO_AUTH_TOKEN missing', async () => {
    process.env = { ...ORIGINAL_ENV, TURSO_DATABASE_URL: 'libsql://db', TURSO_AUTH_TOKEN: undefined } as any;
    jest.doMock('@libsql/client', () => ({ createClient: jest.fn() }));
    await expect(import('@/lib/turso')).rejects.toThrow('TURSO_AUTH_TOKEN is not set');
  });

  test('creates client when envs present', async () => {
    process.env = { ...ORIGINAL_ENV, TURSO_DATABASE_URL: 'libsql://db', TURSO_AUTH_TOKEN: 'tok' } as any;
    const createClient = jest.fn(() => ({ client: true }));
    jest.doMock('@libsql/client', () => ({ createClient }));

    const mod = await import('@/lib/turso');
    expect(createClient).toHaveBeenCalledWith({ url: 'libsql://db', authToken: 'tok' });
    expect((mod as any).turso).toBeDefined();
  });
});
