import fs from "fs";

// Load stores.json
const stores = JSON.parse(fs.readFileSync("Homedepot_store.json", "utf8"));

// Function to fetch lat/lng from postal code
async function geocodeByZip(store) {
  const url = `https://api.zippopotam.us/us/${store.postal_code}`; // Free API for US ZIP codes

  try {
    const res = await fetch(url); // ✅ native fetch in Node 18+
    if (!res.ok) throw new Error(`Failed for ZIP: ${store.postal_code}`);
    const data = await res.json();

    const place = data.places[0];
    return {
      ...store,
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude)
    };
  } catch (err) {
    console.error("❌ Error fetching ZIP:", store.postal_code, err.message);
    return store;
  }
}

async function enrichStores() {
  const results = [];
  for (const store of stores) {
    console.log(`📍 Geocoding store ${store.store_id} (ZIP: ${store.postal_code})...`);
    const enriched = await geocodeByZip(store);
    console.log("✅ Enriched:", enriched);
    results.push(enriched);
  }

  fs.writeFileSync("stores_with_coords.json", JSON.stringify(results, null, 2));
  console.log("🎉 Saved enriched data to stores_with_coords.json");
}

enrichStores();
