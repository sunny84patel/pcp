import Typesense from 'typesense';
import dotenv from 'dotenv';
dotenv.config();
const typesense = new Typesense.Client({
  nodes: [
    {
      host: 'eqr4ghz6ypbvf2w7p-1.a1.typesense.net', // ✅ Cloud host
      port: 443,                                     // ✅ Port for HTTPS
      protocol: 'https'                              // ✅ Use HTTPS for Typesense Cloud
    }
  ],
  apiKey: 'HAmMKM3aYl8UIv7ufFbtIZQ930Wr6wrd', // ⛳ Replace this with the key from "Generate API Keys"
  connectionTimeoutSeconds: 5
});

export default typesense;
