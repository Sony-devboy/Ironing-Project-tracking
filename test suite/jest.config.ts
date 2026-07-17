import type { Config } from "jest";
import nextJest from "../frontend/node_modules/next/dist/build/jest/jest.js";

const createJestConfig = nextJest({
  // Since tests run from the frontend folder, Next.js app root is current directory
  dir: "./",
});

const config: Config = {
  // Set rootDir to project root so Jest scans both frontend and test suite directories
  rootDir: "../",
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  // Include frontend/node_modules in the resolution path for files outside the frontend folder
  moduleDirectories: ["node_modules", "<rootDir>/frontend/node_modules"],
  // Path to setup file relative to rootDir
  setupFilesAfterEnv: ["<rootDir>/test suite/jest.setup.ts"],
  moduleNameMapper: {
    // Map TypeScript path aliases to the frontend/src folder
    "^@/(.*)$": "<rootDir>/frontend/src/$1",
  },
};

export default createJestConfig(config);
