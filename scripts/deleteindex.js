import esClient from "../config/elasticsearch.js";

const deleteIndex = async () => {
  try {
    const exists = await esClient.indices.exists({ index: "products" });

    if (exists) {
      await esClient.indices.delete({ index: "products" });
      console.log("✅ Index 'products' deleted successfully");
    } else {
      console.log("⚠️ Index 'products' does not exist");
    }
  } catch (error) {
    console.error("❌ Error deleting index:", error.message);
  }
};

// Call this once before createProductIndex()
deleteIndex();
