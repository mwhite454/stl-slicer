import { jest } from '@jest/globals';

describe('prisma.ts', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, TURSO_DATABASE_URL: 'libsql://db', TURSO_AUTH_TOKEN: 'token' } as any;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.clearAllMocks();
  });

  test('loads .env.local when present and constructs Prisma with LibSQL adapter', async () => {
    jest.doMock('fs', () => ({ existsSync: jest.fn(() => true) }));

    const dotenvConfig = jest.fn();
    jest.doMock('dotenv', () => ({ __esModule: true, default: { config: dotenvConfig } }));

    const AdapterCtor = jest.fn(function (this: any, args: any) { Object.assign(this, { args }); });
    jest.doMock('@prisma/adapter-libsql', () => ({ PrismaLibSQL: AdapterCtor }));

    const PrismaCtor = jest.fn().mockImplementation((_opts: any) => ({ prisma: true }));
    jest.doMock('@prisma/client', () => ({ PrismaClient: PrismaCtor }));

    const mod = await import('@/lib/prisma');
    expect(dotenvConfig).toHaveBeenCalledWith({ path: '.env.local' });
    expect(AdapterCtor).toHaveBeenCalledWith({ url: 'libsql://db', authToken: 'token' });
    expect(PrismaCtor).toHaveBeenCalledTimes(1);
    expect((mod as any).default).toBeDefined();
  });

  test('falls back to default .env load when .env.local not present', async () => {
    jest.doMock('fs', () => ({ existsSync: jest.fn(() => false) }));

    const dotenvConfig = jest.fn();
    jest.doMock('dotenv', () => ({ __esModule: true, default: { config: dotenvConfig } }));

    const AdapterCtor = jest.fn(function (this: any, args: any) { Object.assign(this, { args }); });
    jest.doMock('@prisma/adapter-libsql', () => ({ PrismaLibSQL: AdapterCtor }));

    const PrismaCtor = jest.fn().mockImplementation((_opts: any) => ({ prisma: true }));
    jest.doMock('@prisma/client', () => ({ PrismaClient: PrismaCtor }));

    const mod = await import('@/lib/prisma');
    expect(dotenvConfig).toHaveBeenCalledWith();
    expect((mod as any).default).toBeDefined();
  });
});
