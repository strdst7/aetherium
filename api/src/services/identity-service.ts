import crypto from "crypto";
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

    if (!request.name?.trim() || !request.developerId?.trim()) {
      throw new Error("name and developerId are required and must be non-empty");
    }

    const now = new Date().toISOString();
    const id = `id_${crypto.randomUUID()}`;
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

    try {
      await this.collection.insertOne(identity);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new Error(`Developer '${request.developerId}' is already registered`);
      }
      throw error;
    }
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
  async listIdentities(limit: number = 100, skip: number = 0): Promise<{ identities: SigilIdentity[]; total: number }> {
    if (!this.collection) {
      throw new Error("Identity service not connected");
    }

    const [identities, total] = await Promise.all([
      this.collection.find().skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(),
    ]);
    return { identities, total };
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

    // Create version snapshot (exclude versions array to prevent recursive growth)
    const { versions, ...stateWithoutVersions } = existing;
    const versionSnapshot: IdentityVersion = {
      version: existing.version,
      timestamp: existing.updatedAt,
      state: stateWithoutVersions as unknown as SigilIdentity,
    };

    // Build update
    const update: Partial<SigilIdentity> = {
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

    // Update document and push version (with optimistic locking)
    const result = await this.collection.findOneAndUpdate(
      { id, version: existing.version },
      {
        $set: update,
        $inc: { version: 1 },
        $push: { versions: versionSnapshot },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      throw new Error(`Identity '${id}' was modified concurrently. Please retry.`);
    }

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
