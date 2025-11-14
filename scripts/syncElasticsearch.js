import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createProductIndex, bulkSyncProducts } from '../utils/elasticsearchSync.js';
import esClient from '../config/elasticsearch.js';

dotenv.config();

const syncData = async () => {
  console.log('🚀 Starting Elasticsearch sync...\n');

  try {
    // 1. Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected\n');

    // 2. Check Elasticsearch connection
    console.log('🔍 Checking Elasticsearch connection...');
    const health = await esClient.cluster.health();
    console.log(`✅ Elasticsearch cluster status: ${health.status}\n`);

    // 3. Create or update index
    console.log('📋 Creating/updating Elasticsearch index...');
    await createProductIndex();
    console.log('✅ Index ready\n');

    // 4. Sync all products
    console.log('🔄 Starting bulk product sync...');
    await bulkSyncProducts();
    console.log('✅ Bulk sync completed\n');

    // 5. Verify data
    console.log('🔍 Verifying synced data...');
    const count = await esClient.count({ index: 'products' });
    console.log(`✅ Total products in Elasticsearch: ${count.count}\n`);

    // 6. Test search
    console.log('🧪 Testing search functionality...');
    const testSearch = await esClient.search({
      index: 'products',
      body: {
        query: { match_all: {} },
        size: 1
      }
    });
    console.log('✅ Search is working correctly\n');

    console.log('🎉 Sync completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ Products indexed: ${count.count}`);
    console.log(`✓ Cluster health: ${health.status}`);
    console.log('✓ Ready for production use');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check if Elasticsearch is running: curl http://localhost:9200');
    console.error('2. Verify MongoDB connection string in .env');
    console.error('3. Ensure network connectivity');
    console.error('4. Check logs above for specific errors\n');
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('📪 MongoDB connection closed');
    process.exit(0);
  }
};

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run sync
syncData();