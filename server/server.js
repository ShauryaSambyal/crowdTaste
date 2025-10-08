import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load env from both server/.env and project root .env (in that order)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
const app = express();
const PORT = 5000;


app.use(cors());
app.use(express.json());

app.get("/api/restaurants", async (req, res) => {
  try {
    const { query, ll, limit } = req.query;
    console.log("QUERY: ", query);
    const rawKey = process.env.VITE_API_KEY;

    // Sanitize and validate key (strip quotes and optional 'Bearer ' prefix if present)
    const apiKey = (rawKey || "")
      .replace(/^['"]|['"]$/g, "")
      .replace(/^Bearer\s+/i, "");

    if (!apiKey) {
      console.error("Missing Foursquare API key. Set FSQ_API_KEY or VITE_API_KEY in your environment.");
      return res.status(500).json({ error: "Server misconfiguration: Missing Foursquare API key" });
    }
    
    const response = await axios.get("https://api.foursquare.com/v3/places/search", {
      headers: {
        Authorization: apiKey, // fsq3... key from env (no 'Bearer' prefix)
        Accept: "application/json",
      },
      params: {
        query: query || "restaurant",
        ll: ll || "12.9716,77.5946",
        limit: limit || 10,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Foursquare API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch data from Foursquare" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
