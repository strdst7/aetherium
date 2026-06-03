#!/usr/bin/env node
/**
 * Seed memory documents into MongoDB from JSON fixtures.
 * Node.js version (for use when Python dependencies are unavailable)
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

async function seedMemory() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    options[key] = value;
  }

  if (!options.file) {
    console.error('❌ Error: --file is required');
    process.exit(1);
  }

  // Load fixture
  let documents;
  try {
    const content = fs.readFileSync(options.file, 'utf-8');
    documents = JSON.parse(content);
    if (!Array.isArray(documents)) {
      documents = [documents];
    }
  } catch (e) {
    console.error(`❌ Error reading fixture: ${e.message}`);
    process.exit(1);
  }

  // Connect to MongoDB
  const mongoUri = options['mongo-uri'] || process.env.MONGODB_URI || 'mongodb://localhost:27017/aetherium';
  const dbName = options.db || 'aetherium';
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('memory');

    // Create indexes
    await collection.createIndex({ id: 1 });
    await collection.createIndex({ sigil: 1 });

    // Insert documents
    let insertedCount = 0;
    for (const doc of documents) {
      const docId = doc.id || options.id || `mem_${Date.now()}`;
      
      // Generate simple embedding if not present
      if (!doc.embedding && doc.content) {
        const hash = doc.content.split('').reduce((h, c) => h + c.charCodeAt(0), 0) % 1000;
        doc.embedding = Array.from({ length: 128 }, (_, i) => (hash + i) / 1000);
      }

      // Add metadata
      doc._id = docId;
      doc.sigil = options.sigil || undefined;
      doc.createdAt = doc.createdAt || new Date();
      doc.updatedAt = new Date();

      // Upsert
      const result = await collection.updateOne({ _id: docId }, { $set: doc }, { upsert: true });
      if (result.upsertedId || result.modifiedCount > 0) {
        insertedCount++;
      }
      console.log(`✅ Upserted memory doc id=${docId}`);
    }

    console.log(`\n✅ Seeded ${insertedCount} document(s) into ${dbName}.memory`);
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedMemory();
