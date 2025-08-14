// scripts/searchAndSave.js
import dotenv from 'dotenv';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { searchHomeDepot } from '../lib/homeDepotApi.js';
import { searchLowes } from '../lib/lowesApi.js';

dotenv.config();
const apiKey = process.env.UNWRANGLE_API_KEY;

const searchTerms = ['Electrical', 'Plumbing','Hardware'];

const fetchAllPages = async (searchFn, term, apiKey) => {
  const firstPage = await searchFn(term, apiKey, 1);
  const totalPages = 100; // Assume 1000 pages for simplicity; adjust based on actual API response
  const allResults = [...(firstPage.results || [])];

  for (let page = 1; page <= totalPages; page++) {
    const pageData = await searchFn(term, apiKey, page);
    allResults.push(...(pageData.results || []));
    console.log(`🔁 Fetched page ${page} of ${totalPages}`);
  }

  return {
    ...firstPage,
    results: allResults,
  };
};

const run = async () => {
  try {
    await mkdir('./output', { recursive: true });

    for (const term of searchTerms) {
      console.log(`🔍 Searching for: ${term}`);

      // Pass page=1 initially; then paginate
      const hdData = await fetchAllPages(searchHomeDepot, term, apiKey);
      const lowesData = await fetchAllPages(searchLowes, term, apiKey);

      const safeTerm = term.replace(/\s+/g, '_').toLowerCase();
      const hdFilePath = path.join('./output', `${safeTerm}_homedepot_raw.json`);
      const lowesFilePath = path.join('./output', `${safeTerm}_lowes_raw.json`);

      await writeFile(hdFilePath, JSON.stringify(hdData, null, 2));
      console.log(`📁 Saved ALL Home Depot data (${hdData.results.length} items)`);

      await writeFile(lowesFilePath, JSON.stringify(lowesData, null, 2));
      console.log(`📁 Saved ALL Lowe's data (${lowesData.results.length} items)`);
    }

    console.log('✅ All full-page raw data saved.');
  } catch (err) {
    console.error('❌ Error during search & save:', err.message);
  }
};

run();
