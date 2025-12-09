/**
 * Migration script to update Elasticsearch index
 * Run this script to:
 * 1. Create the new optimized index (products_v2)
 * 2. Sync all products from MongoDB to the new index
 * 3. Optionally delete the old index
 * 
 * Usage: node scripts/migrateSearchIndex.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import esClient from '../config/elasticsearch.js';
import { 
  PRODUCT_INDEX, 
  createProductIndex, 
  bulkSyncProducts, 
  getIndexStats,
  recreateIndex
} from '../utils/elasticsearchSyncV2.js';

dotenv.config();

const OLD_INDEX = 'products'; // Old index name
const NEW_INDEX = PRODUCT_INDEX; // products_v2

async function migrate() {
  console.log('🚀 Starting search index migration...\n');
  
  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected\n');

    // Check old index
    const oldExists = await esClient.indices.exists({ index: OLD_INDEX });
    if (oldExists) {
      const oldStats = await esClient.count({ index: OLD_INDEX });
      console.log(`📊 Old index "${OLD_INDEX}" has ${oldStats.count} documents`);
    } else {
      console.log(`ℹ️  Old index "${OLD_INDEX}" does not exist`);
    }

    // Check new index
    const newExists = await esClient.indices.exists({ index: NEW_INDEX });
    if (newExists) {
      const newStats = await esClient.count({ index: NEW_INDEX });
      console.log(`📊 New index "${NEW_INDEX}" already exists with ${newStats.count} documents`);
      
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question('\n⚠️  Do you want to recreate the new index? (yes/no): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'yes') {
        console.log('Migration cancelled.');
        process.exit(0);
      }

      console.log('\n🗑️  Deleting existing new index...');
      await esClient.indices.delete({ index: NEW_INDEX });
    }

    // Create new index with optimized settings
    console.log('\n📝 Creating new optimized index...');
    await createProductIndex();
    
    // Get index mapping for verification
    const mapping = await esClient.indices.getMapping({ index: NEW_INDEX });
    console.log('✅ New index created with optimized mapping');
    console.log('   - Analyzers: product_standard, autocomplete_analyzer, exact_analyzer');
    console.log('   - NO aggressive n-gram tokenization');
    console.log('   - NO fuzzy matching by default');
    console.log('');

    // Sync products
    console.log('🔄 Syncing products to new index...');
    const syncResult = await bulkSyncProducts(500);
    console.log(`✅ Synced ${syncResult.synced} products\n`);

    // Get final stats
    const finalStats = await getIndexStats();
    console.log('📊 Final index stats:');
    console.log(`   - Total documents: ${finalStats.totalDocuments}`);
    console.log(`   - Index size: ${(finalStats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('');

    // Test search
    console.log('🧪 Testing search with "fridge"...');
    const testResponse = await esClient.search({
      index: NEW_INDEX,
      body: {
        size: 5,
        query: {
          match: {
            name: {
              query: 'fridge',
              operator: 'and'
            }
          }
        },
        min_score: 10
      }
    });

    console.log(`   Found ${testResponse.hits.total.value} results`);
    testResponse.hits.hits.slice(0, 3).forEach((hit, i) => {
      console.log(`   ${i + 1}. ${hit._source.name} (score: ${hit._score.toFixed(2)})`);
    });

    // Check for false positives
    const falsePositives = testResponse.hits.hits.filter(hit => {
      const name = hit._source.name.toLowerCase();
      return !name.includes('fridge') && !name.includes('refrigerator') && !name.includes('freezer');
    });

    if (falsePositives.length > 0) {
      console.log('\n⚠️  Warning: Found potential false positives:');
      falsePositives.forEach(hit => {
        console.log(`   - ${hit._source.name}`);
      });
    } else {
      console.log('\n✅ No false positives detected!');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📌 Next steps:');
    console.log('   1. Update your routes to use the new controller:');
    console.log('      import { searchProducts } from "../controllers/productSearchController.js"');
    console.log('   2. The new index name is: products_v2');
    console.log('   3. Test the search thoroughly before deleting the old index');
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 MongoDB disconnected');
    process.exit(0);
  }
}

migrate();
