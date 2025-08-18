import { jest } from '@jest/globals';

const prismaMock: any = {
  userConfig: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ __esModule: true, default: prismaMock }));
jest.mock('nanoid', () => ({ nanoid: () => 'cfg_123' }));

import { GET, POST, PUT, DELETE } from './route';

describe('api/user-config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET requires userId', async () => {
    const req: any = { url: 'http://x/api/user-config' };
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  test('GET 404 when not found', async () => {
    prismaMock.userConfig.findUnique.mockResolvedValueOnce(null);
    const req: any = { url: 'http://x/api/user-config?userId=u1' };
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  test('GET returns config', async () => {
    const fake = { id: 'cfg_123', userId: 'u1', configName: 'default' };
    prismaMock.userConfig.findUnique.mockResolvedValueOnce(fake);
    const req: any = { url: 'http://x/api/user-config?userId=u1&configName=default' };
    const res = await GET(req);
    const json = await res.json();
    expect(json).toEqual({ config: fake });
  });

  test('POST creates config with defaults', async () => {
    prismaMock.userConfig.create.mockResolvedValueOnce({ id: 'cfg_123' });

    const req: any = { json: async () => ({ userId: 'u1' }) };
    const res = await POST(req);
    const json = await res.json();

    expect(prismaMock.userConfig.create).toHaveBeenCalled();
    expect(json.success).toBe(true);
    expect(json.configId).toBe('cfg_123');
  });

  test('PUT updates existing config, 404 when none', async () => {
    // success
    prismaMock.userConfig.update.mockResolvedValueOnce({ id: 'cfg_123' });
    let req: any = { json: async () => ({ userId: 'u1', configName: 'default', kerf: 0.2 }) };
    let res = await PUT(req);
    expect(res.status).toBe(200);

    // not found path
    prismaMock.userConfig.update.mockResolvedValueOnce(null);
    req = { json: async () => ({ userId: 'u1' }) };
    res = await PUT(req);
    expect(res.status).toBe(404);
  });

  test('DELETE deletes existing config, 404 when none', async () => {
    // success
    prismaMock.userConfig.delete.mockResolvedValueOnce({ id: 'cfg_123' });
    let req: any = { url: 'http://x/api/user-config?userId=u1&configName=default' };
    let res = await DELETE(req);
    expect(res.status).toBe(200);

    // not found
    prismaMock.userConfig.delete.mockResolvedValueOnce(null);
    req = { url: 'http://x/api/user-config?userId=u1' };
    res = await DELETE(req);
    expect(res.status).toBe(404);
  });
});
