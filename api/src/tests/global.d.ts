import { TestDatabase } from "./helpers/test-database";

declare global {
  var testDb: TestDatabase | undefined;
}

export {};
