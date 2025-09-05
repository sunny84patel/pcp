import fs from "fs";

const stores = JSON.parse(fs.readFileSync("home-depot-stores-ca.json", "utf8"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Try OpenStreetMap (Nominatim)
async function queryNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?${query}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "home-depot-geocoder/1.0 (your_email@example.com)" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function geocodeByPostal(store) {
  try {
    // 1️⃣ First try postal code only
    let data = await queryNominatim(`postalcode=${encodeURIComponent(store.postal_code)}&country=Canada`);
    if (data.length === 0) {
      // 2️⃣ Fallback: try address + postal code
      data = await queryNominatim(`q=${encodeURIComponent(store.address + ", " + store.postal_code + ", Canada")}`);
    }

    if (data.length === 0) throw new Error("No results");

    return {
      ...store,
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  } catch (err) {
    console.error("❌ Error fetching postal:", store.postal_code, err.message);
    return store;
  }
}

async function enrichStores() {
  const results = [];
  for (const store of stores) {
    console.log(`📍 Geocoding store ${store.store} (Postal: ${store.postal_code})...`);
    const enriched = await geocodeByPostal(store);
    console.log("✅ Enriched:", enriched);
    results.push(enriched);

    // Respect Nominatim’s rate limit
    await sleep(1000);
  }

  fs.writeFileSync("stores_with_coords.json", JSON.stringify(results, null, 2));
  console.log("🎉 Saved enriched data to stores_with_coords.json");
}

enrichStores();
