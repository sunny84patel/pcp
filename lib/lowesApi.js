// lib/lowesApi.js
export async function searchLowes(searchTerm, apiKey,page = 1) {
  try {
    const url = `https://data.unwrangle.com/api/getter/?platform=lowes_search&search=${encodeURIComponent(searchTerm)}&page=${page}&api_key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Error fetching Lowe's data:", err.message);
    throw err;
  }
}
