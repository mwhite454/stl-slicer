import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^next/server$': '<rootDir>/test/__mocks__/next-server.ts',
    '^next/dynamic$': '<rootDir>/test/__mocks__/next-dynamic.ts',
    '^@/components/workspace/workspaceDataHelpers$': '<rootDir>/test/__mocks__/workspaceDataHelpers.ts',
    '^three/examples/jsm/controls/OrbitControls.js$': '<rootDir>/test/__mocks__/orbitcontrols.ts',
    '^three/examples/jsm/loaders/STLLoader.js$': '<rootDir>/test/__mocks__/stlloader.ts',
    '^three$': '<rootDir>/test/__mocks__/three.ts',
    '^makerjs$': '<rootDir>/test/__mocks__/makerjs.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json', isolatedModules: true }],
  },
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx)$',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/index.{ts,tsx}',
    '!src/**/types.{ts,tsx}',
  ],
  coverageDirectory: '<rootDir>/coverage',
};

export default config;
