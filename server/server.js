import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = 5000;


app.use(cors());
app.use(express.json());

app.get("/api/restaurants", async (req, res) => {
  try {
    const { query, ll, limit } = req.query;
    console.log("QUERY: ", query);
    const apiKey = process.env.FSQ_API_KEY
    
    const response = await axios.get("https://api.foursquare.com/v3/places/search", {
      headers: {
        Authorization: apiKey, // <-- put fsq3... key in .env
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
