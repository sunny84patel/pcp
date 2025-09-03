import fs from "fs";

// Load stores.json
const stores = JSON.parse(fs.readFileSync("stores.json", "utf8"));

// Function to fetch lat/lng from postal code
async function geocodeByZip(store) {
  const url = `https://api.zippopotam.us/us/${store.zipcode}`; // Free API for US ZIP codes

  try {
    const res = await fetch(url); // ✅ native fetch in Node 18+
    if (!res.ok) throw new Error(`Failed for ZIP: ${store.zipcode}`);
    const data = await res.json();

    const place = data.places[0];
    return {
      ...store,
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude)
    };
  } catch (err) {
    console.error("❌ Error fetching ZIP:", store.zipcode, err.message);
    return store;
  }
}

async function enrichStores() {
  const results = [];
  for (const store of stores) {
    console.log(`📍 Geocoding store ${store.store_no} (ZIP: ${store.zipcode})...`);
    const enriched = await geocodeByZip(store);
    console.log("✅ Enriched:", enriched);
    results.push(enriched);
  }

  fs.writeFileSync("stores_with_coords.json", JSON.stringify(results, null, 2));
  console.log("🎉 Saved enriched data to stores_with_coords.json");
}

enrichStores();


// import fs from "fs";
// import csv from "csv-parser"; // 👉 run: npm install csv-parser

// const INPUT_FILE = "lowes_stores.csv";        // your CSV file
// const OUTPUT_FILE = "stores.json";      // output JSON file

// const results = [];

// fs.createReadStream(INPUT_FILE)
//   .pipe(csv())
//   .on("data", (row) => {
//     results.push(row);
//   })
//   .on("end", () => {
//     fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
//     console.log(`✅ Converted ${results.length} rows to ${OUTPUT_FILE}`);
//   });
