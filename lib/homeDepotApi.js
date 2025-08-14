// lib/homeDepotApi.js
export async function searchHomeDepot(searchTerm, apiKey,page = 1) {
  try {
    //we can add number of pages we want to scrape by default set to 10 just add page = 20
    const url = `https://data.unwrangle.com/api/getter/?platform=homedepot_search&search=${encodeURIComponent(searchTerm)}&page=${page}&api_key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error fetching Home Depot data:', err.message);
    throw err;
  }
}
