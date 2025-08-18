import { jest } from '@jest/globals';

const prismaMock: any = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userConfig: {
    create: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ __esModule: true, default: prismaMock }));
jest.mock('nanoid', () => ({ nanoid: () => 'id_123' }));

// Import after mocks
import { GET, POST, PUT } from './route';

describe('api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET by email returns user', async () => {
    const fakeUser = { id: 'u1', email: 'a@example.com' };
    prismaMock.user.findUnique.mockResolvedValueOnce(fakeUser);

    const req: any = { url: 'http://x/api/users?email=a%40example.com' };
    const res = await GET(req);
    const json = await res.json();

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@example.com' } });
    expect(json).toEqual({ user: fakeUser });
  });

  test('GET not found returns 404', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const req: any = { url: 'http://x/api/users?email=none%40example.com' };
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  test('POST creates user and default config when not existing', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce({ id: 'id_123' });
    prismaMock.userConfig.create.mockResolvedValueOnce({ id: 'cfg_1' });

    const req: any = { json: async () => ({ email: 'b@example.com', name: 'Bee' }) };
    const res = await POST(req);
    const json = await res.json();

    expect(prismaMock.user.create).toHaveBeenCalled();
    expect(prismaMock.userConfig.create).toHaveBeenCalled();
    expect(json.success).toBe(true);
    expect(json.userId).toBe('id_123');
  });

  test('POST conflict when user exists', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'u2' });

    const req: any = { json: async () => ({ email: 'c@example.com' }) };
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  test('PUT updates user', async () => {
    prismaMock.user.update.mockResolvedValueOnce({ id: 'u3' });

    const req: any = { json: async () => ({ userId: 'u3', email: 'd@example.com', name: 'Dee' }) };
    const res = await PUT(req);
    const json = await res.json();

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u3' },
      data: expect.any(Object),
    });
    expect(json.success).toBe(true);
  });

  test('PUT returns 404 when prisma returns null', async () => {
    prismaMock.user.update.mockResolvedValueOnce(null);

    const req: any = { json: async () => ({ userId: 'nope' }) };
    const res = await PUT(req);
    expect(res.status).toBe(404);
  });
});
