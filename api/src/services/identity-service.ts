import { MongoClient, Db, Collection } from "mongodb";
import {
  SigilIdentity,
  IdentityVersion,
  IdentityCreateRequest,
  IdentityUpdateRequest,
} from "../types/identity";

/**
 * Generates a deterministic sigil hash from identity fields.
 * Uses a simple hash for demonstration; in production, use a cryptographic hash.
 */
function generateSigilHash(name: string, developerId: string): string {
  const canonical = `${name.trim().toLowerCase()}|${developerId.trim().toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    const char = canonical.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `sig_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

/**
 * IdentityService manages identity CRUD operations in MongoDB.
 * 
 * Responsibilities:
 * - Create, retrieve, update, and list identities
 * - Maintain immutable version history on updates
 * - Generate deterministic sigil hashes
 */
export class IdentityService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<SigilIdentity> | null = null;

  async connect(
    mongoUri: string = process.env.MONGODB_URI || "mongodb://localhost:27017/aetherium"
  ): Promise<void> {
    this.client = new MongoClient(mongoUri);
    await this.client.connect();
    this.db = this.client.db();
    this.collection = this.db.collection("identities");

    // Create indexes
    await this.collection.createIndex({ id: 1 }, { unique: true });
    await this.collection.createIndex({ developerId: 1 }, { unique: true });
    await this.collection.createIndex({ sigilHash: 1 }, { unique: true });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.collection = null;
    }
  }

  /**
   * Create a new identity.
   */
  async createIdentity(request: IdentityCreateRequest): Promise<SigilIdentity> {
    if (!this.collection) {
      throw new Error("Identity service not connected");
    }

    const now = new Date().toISOString();
    const id = `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sigilHash = generateSigilHash(request.name, request.developerId);

    const identity: SigilIdentity = {
      id,
      name: request.name,
      developerId: request.developerId,
      sigilHash,
      version: 1,
      config: request.config || {},
      versions: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.collection.insertOne(identity);
    return identity;
  }

  /**
   * Retrieve an identity by ID.
   */
  async getIdentityById(id: string): Promise<SigilIdentity | null> {
    if (!this.collection) {
      throw new Error("Identity service not connected");
    }

    return await this.collection.findOne({ id });
  }

  /**
   * Retrieve an identity by developerId.
   */
  async getIdentityByDeveloperId(developerId: string): Promise<SigilIdentity | null> {
    if (!this.collection) {
      throw new Error("Identity service not connected");
    }

    return await this.collection.findOne({ developerId });
  }

  /**
   * List all identities.
   */
  async listIdentities(): Promise<SigilIdentity[]> {
    if (!this.collection) {
      throw new Error("Identity service not connected");
    }

    return await this.collection.find().toArray();
  }

  /**
   * Update an identity and preserve the previous state in version history.
   */
  async updateIdentity(
    id: string,
    request: IdentityUpdateRequest
  ): Promise<SigilIdentity | null> {
    if (!this.collection) {
      throw new Error("Identity service not connected");
    }

    const existing = await this.collection.findOne({ id });
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    const newVersion = existing.version + 1;

    // Create version snapshot
    const versionSnapshot: IdentityVersion = {
      version: existing.version,
      timestamp: existing.updatedAt,
      state: { ...existing },
    };

    // Build update
    const update: Partial<SigilIdentity> = {
      version: newVersion,
      updatedAt: now,
    };

    if (request.name !== undefined) {
      update.name = request.name;
      // Recalculate sigil hash if name changed
      update.sigilHash = generateSigilHash(request.name, existing.developerId);
    }

    if (request.config !== undefined) {
      update.config = { ...existing.config, ...request.config };
    }

    // Update document and push version
    const result = await this.collection.findOneAndUpdate(
      { id },
      {
        $set: update,
        $push: { versions: versionSnapshot },
      },
      { returnDocument: "after" }
    );

    return result;
  }

  /**
   * Retrieve version history for an identity.
   */
  async getVersionHistory(id: string): Promise<IdentityVersion[] | null> {
    if (!this.collection) {
      throw new Error("Identity service not connected");
    }

    const identity = await this.collection.findOne({ id });
    if (!identity) {
      return null;
    }

    return identity.versions || [];
  }

  /**
   * Delete an identity by ID.
   */
  async deleteIdentity(id: string): Promise<boolean> {
    if (!this.collection) {
      throw new Error("Identity service not connected");
    }

    const result = await this.collection.deleteOne({ id });
    return result.deletedCount > 0;
  }
}
