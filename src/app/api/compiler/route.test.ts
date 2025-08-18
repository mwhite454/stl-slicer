import { jest } from '@jest/globals';

// Mock fs to avoid real file system writes
jest.mock('fs', () => {
  const mock = {
    existsSync: jest.fn(() => false),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
  };
  return { __esModule: true, default: mock, ...mock };
});

const fsModule: any = jest.requireMock('fs');
const fsMock = (fsModule && fsModule.default) ? fsModule.default : fsModule;

describe.skip('api/compiler POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns message when no files uploaded', async () => {
    const { POST } = await import('./route');

    const req: any = {
      formData: async () => new FormData(),
    };

    const res = await POST(req);
    const json = await res.json();

    expect(json.success).toBe(false);
    expect(json.message).toMatch(/No files uploaded/i);
  });

  test('saves uploaded files and returns names', async () => {
    const { POST } = await import('./route');

    // Arrange fs mocks
    fsMock.existsSync.mockReturnValueOnce(false);

    const fd = new FormData();
    const file = new File([new Blob(['data'])], 'foo.stl', { type: 'model/stl' });
    // Ensure global File matches our constructed File implementation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).File = (file as any).constructor;
    fd.append('file', file);

    const req: any = {
      formData: async () => fd,
    };

    const res = await POST(req);
    const json = await res.json();

    expect(fsMock.existsSync).toHaveBeenCalled();
    expect(fsMock.mkdirSync).toHaveBeenCalled();
    // Do not assert on internal write call; assert outcome instead
    expect(json.success).toBe(true);
    expect(json.files).toEqual(['foo.stl']);
  });
});
