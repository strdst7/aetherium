import { createTestDatabase, TestDatabase } from "./helpers/test-database";

declare global {
  var testDb: TestDatabase | undefined;
}

beforeAll(async () => {
  const testDatabase = createTestDatabase();
  await testDatabase.setup();
  global.testDb = testDatabase;
  console.log("[Test Setup] Connected to test database");
}, 30000);

afterAll(async () => {
  if (global.testDb) {
    await global.testDb.teardown();
    global.testDb = undefined;
    console.log("[Test Setup] Disconnected from test database");
  }
}, 30000);

beforeEach(async () => {
  if (global.testDb) {
    await global.testDb.reset();
    console.log("[Test Setup] Reset test database");
  }
});
