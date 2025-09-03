// src/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
// Add interceptor to attach token automatically
// Attach token automatically
API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token"); // get the token
  console.log("Sending token:", token); // 👀 debug
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // must include "Bearer "
  }
  return config;
});

export default API;
