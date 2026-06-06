const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    "^@tests/(.*)$": "<rootDir>/src/tests/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
  testPathIgnorePatterns: [
    "/node_modules/",
    ".*\\.real\\.test\\.ts$",
    ".*\\.e2e\\.test\\.ts$",
  ],
};