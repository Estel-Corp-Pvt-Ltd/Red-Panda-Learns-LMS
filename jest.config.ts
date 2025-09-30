import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.ts"],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1"
    },
    transform: {
        "^.+\\.(ts|tsx)$": "ts-jest"
    },
    collectCoverage: true,
    collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"]
};

export default config;
