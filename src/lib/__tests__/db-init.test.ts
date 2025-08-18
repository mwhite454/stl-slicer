jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
  },
}));

const prisma = require('@/lib/prisma').default as { $queryRaw: jest.Mock };

describe('db-init', () => {
  let initializeDatabase: typeof import('@/lib/db-init').initializeDatabase;
  let testConnection: typeof import('@/lib/db-init').testConnection;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    const mod = await import('@/lib/db-init');
    initializeDatabase = mod.initializeDatabase;
    testConnection = mod.testConnection;
  });

  test('initializeDatabase returns success true', async () => {
    const res = await initializeDatabase();
    expect(res).toEqual({ success: true });
  });

  test('testConnection success returns success true with result', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ test: 1 }]);
    const res = await testConnection();
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(res.success).toBe(true);
    expect(res.result).toBeDefined();
  });

  test('testConnection failure returns success false with error', async () => {
    const err = new Error('db down');
    prisma.$queryRaw.mockRejectedValueOnce(err);
    const res = await testConnection();
    expect(res.success).toBe(false);
    expect(res.error).toBe(err);
  });
});
