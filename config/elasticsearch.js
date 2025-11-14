import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
dotenv.config();

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL,
  auth: {
    apiKey: process.env.ELASTICSEARCH_API_KEY
  }
});
// Test connection
esClient.ping()
  .then(() => console.log('✅ Elasticsearch connected'))
  .catch(err => console.error('❌ Elasticsearch connection failed:', err.message));

export default esClient;