import { MongoClient, Db, Collection } from "mongodb";
import { ProviderRegistryInstance } from "./provider-registry";

export interface MemoryDocument {
  _id?: string;
  id?: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  sigil?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VectorSearchResult {
  doc: MemoryDocument;
  score: number;
}

export class MemoryService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<MemoryDocument> | null = null;

  async connect(mongoUri: string = process.env.MONGODB_URI || "mongodb://localhost:27017/aetherium"): Promise<void> {
    this.client = new MongoClient(mongoUri);
    await this.client.connect();
    this.db = this.client.db();
    this.collection = this.db.collection("memory");

    // Create indexes
    await this.collection.createIndex({ id: 1 }, { unique: false });
    await this.collection.createIndex({ sigil: 1 });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.collection = null;
    }
  }

  async upsertMemory(doc: MemoryDocument): Promise<MemoryDocument> {
    if (!this.collection) {
      throw new Error("Memory service not connected");
    }

    const id = doc.id || doc._id || `mem_${Date.now()}`;
    const now = new Date();

    const upsertDoc = {
      ...doc,
      _id: id,
      id,
      updatedAt: now,
      createdAt: doc.createdAt || now,
    };

    await this.collection.updateOne({ _id: id }, { $set: upsertDoc }, { upsert: true });
    return upsertDoc;
  }

  async getById(id: string): Promise<MemoryDocument | null> {
    if (!this.collection) {
      throw new Error("Memory service not connected");
    }
    return this.collection.findOne({ _id: id });
  }

  async vectorSearch(queryEmbedding: number[], alpha: number = 0.7, k: number = 5): Promise<VectorSearchResult[]> {
    if (!this.collection) {
      throw new Error("Memory service not connected");
    }

    // Fetch all documents with embeddings
    const docs = await this.collection
      .find({ embedding: { $exists: true, $type: "array" } })
      .toArray();

    if (docs.length === 0) {
      return [];
    }

    // Calculate cosine similarity
    const results = docs
      .map((doc) => ({
        doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding || []),
      }))
      .filter((r) => r.score >= alpha)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    return results;
  }

  async searchByMetadata(filter: Record<string, any>, limit: number = 10): Promise<MemoryDocument[]> {
    if (!this.collection) {
      throw new Error("Memory service not connected");
    }
    return this.collection.find(filter).limit(limit).toArray();
  }

  async deleteById(id: string): Promise<boolean> {
    if (!this.collection) {
      throw new Error("Memory service not connected");
    }
    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async clear(): Promise<void> {
    if (!this.collection) {
      throw new Error("Memory service not connected");
    }
    await this.collection.deleteMany({});
  }

  async getAll(): Promise<MemoryDocument[]> {
    if (!this.collection) {
      throw new Error("Memory service not connected");
    }
    return this.collection.find({}).toArray();
  }

  async embedQuery(text: string): Promise<number[]> {
    const provider = ProviderRegistryInstance.defaultProvider;
    if (!provider.embed) {
      throw new Error("Default provider does not support embeddings");
    }
    const result = await provider.embed(text);
    return Array.isArray(result.embeddings[0]) 
      ? (result.embeddings[0] as number[]) 
      : (result.embeddings as number[]);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const minLen = Math.min(a.length, b.length);
  if (minLen === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < minLen; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}
