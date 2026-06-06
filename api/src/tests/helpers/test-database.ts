import { MongoClient, Db } from "mongodb";

/**
 * TestDatabase manages an isolated MongoDB test instance.
 *
 * Safety guards prevent accidental connection to production databases.
 * Always drops known test collections on teardown/reset.
 */
export class TestDatabase {
  private uri: string;
  private client?: MongoClient;
  private db?: Db;

  constructor() {
    this.uri = process.env.MONGODB_URI || "mongodb://localhost:27017/aetherium_test";

    // Mitigation for T-10-01: refuse non-test / non-local URIs
    const isTestDb =
      this.uri.includes("_test") || /localhost|127\.0\.0\.1/.test(this.uri);
    if (!isTestDb) {
      throw new Error(
        `TestDatabase refuses to connect to non-test database: ${this.uri}. ` +
          `URI must include '_test' or point to localhost/127.0.0.1.`
      );
    }
  }

  async setup(): Promise<void> {
    this.client = new MongoClient(this.uri);
    await this.client.connect();
    this.db = this.client.db();

    await this.dropCollections();
    await this.createIndexes();
  }

  async teardown(): Promise<void> {
    await this.dropCollections();
    if (this.client) {
      await this.client.close();
      this.client = undefined;
      this.db = undefined;
    }
  }

  async reset(): Promise<void> {
    await this.dropCollections();
    await this.createIndexes();
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error("TestDatabase not set up. Call setup() first.");
    }
    return this.db;
  }

  private async dropCollections(): Promise<void> {
    if (!this.db) return;
    const collections = ["audit_records", "identities", "memory_shards"];
    for (const name of collections) {
      try {
        await this.db.collection(name).drop();
      } catch (err: any) {
        if (err.codeName !== "NamespaceNotFound") {
          throw err;
        }
      }
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) return;

    const identities = this.db.collection("identities");
    await identities.createIndex({ id: 1 }, { unique: true });
    await identities.createIndex({ developerId: 1 }, { unique: true });
    await identities.createIndex({ sigilHash: 1 }, { unique: true });

    const auditRecords = this.db.collection("audit_records");
    await auditRecords.createIndex({ identityId: 1 });
    await auditRecords.createIndex({ timestamp: -1 });
    await auditRecords.createIndex({ identityId: 1, timestamp: -1 });

    const memoryShards = this.db.collection("memory_shards");
    await memoryShards.createIndex({ sigil: 1 });
    await memoryShards.createIndex({ createdAt: -1 });
  }
}

export function createTestDatabase(): TestDatabase {
  return new TestDatabase();
}
