module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  modulePaths: ["<rootDir>"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.test.json",
    },
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setupTests.ts"],
  moduleNameMapper: {
    "^src/services/firebase$": "<rootDir>/tests/mocks/firebase.ts",
    "^src/(.*)$": "<rootDir>/src/$1",
    "^firebase-functions/params$": "<rootDir>/tests/mocks/paramsMock.ts",
  },
  testPathIgnorePatterns: ["/node_modules/", "/tests/e2e/"],
};
