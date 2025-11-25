import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",

  roots: ["<rootDir>/src"],

  testMatch: ["**/__tests__/**/*.test.ts"],

  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.ts",
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  moduleNameMapper: {
    "^handlers$": "<rootDir>/src/handlers",
    "^utils$": "<rootDir>/src/utils",
    "^container$": "<rootDir>/src/container",
    "^authenticator$": "<rootDir>/src/authenticator",
  },
};

export default config;
