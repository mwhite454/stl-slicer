// Jest mock for '@/lib/prisma' used by API route tests
// Provides only the minimal surface used in routes

const prisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userConfig: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

export default prisma as any;
