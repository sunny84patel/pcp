import typesense from '../utils/typesenseClient.js';

const schema = {
  name: 'products',
  fields: [
    { name: 'productId', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'modelNo', type: 'string', optional: true },
    { name: 'brand', type: 'string', optional: true },
    { name: 'category', type: 'string', optional: true },
    { name: 'stores', type: 'string[]' }, // storeId list
    { name: 'price', type: 'float' },
    { name: 'rating', type: 'float', optional: true },
    { name: 'inventoryQuantity', type: 'int32', optional: true },
    { name: 'imageUrls', type: 'string[]', optional: true }
  ],
  default_sorting_field: 'price'
};

async function setup() {
  try {
    await typesense.collections('products').delete();
  } catch (_) {}

  const result = await typesense.collections().create(schema);
  console.log('✅ Created Typesense schema:', result.name);
}

setup();
