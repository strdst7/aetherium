import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aetherium';

export async function seedDemoData(): Promise<void> {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Clear existing demo data
    await usersCollection.deleteMany({ isDemo: true });
    console.log('🧹 Cleared existing demo data');
    
    // Insert demo users
    const demoUsers = [
      { id: 'user-001', name: 'Alice Chen', email: 'alice@example.com', status: 'active', role: 'admin', lastLogin: new Date('2024-01-15'), isDemo: true },
      { id: 'user-002', name: 'Bob Smith', email: 'bob@example.com', status: 'inactive', role: 'user', lastLogin: new Date('2023-11-20'), isDemo: true },
      { id: 'user-003', name: 'Carol Davis', email: 'carol@example.com', status: 'active', role: 'user', lastLogin: new Date('2024-02-01'), isDemo: true },
      { id: 'user-004', name: 'David Wilson', email: 'david@example.com', status: 'inactive', role: 'user', lastLogin: new Date('2023-10-10'), isDemo: true },
      { id: 'user-005', name: 'Eve Brown', email: 'eve@example.com', status: 'active', role: 'moderator', lastLogin: new Date('2024-01-25'), isDemo: true },
      { id: 'user-006', name: 'Frank Miller', email: 'frank@example.com', status: 'inactive', role: 'user', lastLogin: new Date('2023-12-05'), isDemo: true },
      { id: 'user-007', name: 'Grace Lee', email: 'grace@example.com', status: 'active', role: 'user', lastLogin: new Date('2024-02-10'), isDemo: true },
      { id: 'user-008', name: 'Henry Taylor', email: 'henry@example.com', status: 'inactive', role: 'user', lastLogin: new Date('2023-09-15'), isDemo: true },
      { id: 'user-009', name: 'Iris Martinez', email: 'iris@example.com', status: 'active', role: 'admin', lastLogin: new Date('2024-01-30'), isDemo: true },
      { id: 'user-010', name: 'Jack Anderson', email: 'jack@example.com', status: 'inactive', role: 'user', lastLogin: new Date('2023-11-01'), isDemo: true },
    ];
    
    const result = await usersCollection.insertMany(demoUsers);
    console.log(`✅ Seeded ${result.insertedCount} demo users`);
    
    // Log summary
    const activeCount = await usersCollection.countDocuments({ status: 'active', isDemo: true });
    const inactiveCount = await usersCollection.countDocuments({ status: 'inactive', isDemo: true });
    
    console.log(`📊 Demo data summary:`);
    console.log(`   - Active users: ${activeCount}`);
    console.log(`   - Inactive users: ${inactiveCount}`);
    console.log(`   - Total users: ${activeCount + inactiveCount}`);
    
  } catch (error) {
    console.error('❌ Failed to seed demo data:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run if executed directly
if (require.main === module) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
