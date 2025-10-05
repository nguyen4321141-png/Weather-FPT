// server.js
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Simple in-memory cache to avoid repeated requests (optional)
const cache = new Map();

// Allow CORS for localhost (dev only)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/nasa-power', async (req, res) => {
  try {
    const { lat, lon, start, end, params } = req.query;

    // Validate required query parameters
    if (!lat || !lon || !start || !end) {
      return res.status(400).json({ error: 'Missing required query params: lat, lon, start, end' });
    }

    // Default parameters if none provided
    const parameters = params || 'T2M,T2M_MIN,T2M_MAX,PRECTOTCORR,WS10M,RH2M,ALLSKY_KT';

    // Check cache
    const cacheKey = `${lat}|${lon}|${start}|${end}|${parameters}`;
    if (cache.has(cacheKey)) {
      return res.json(cache.get(cacheKey));
    }

    const nasaUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${encodeURIComponent(parameters)}&community=RE&longitude=${encodeURIComponent(lon)}&latitude=${encodeURIComponent(lat)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&format=JSON`;

    const response = await fetch(nasaUrl);

    if (!response.ok) {
      const text = await response.text();
      console.error('NASA POWER fetch error:', response.status, text);
      return res.status(502).json({ error: 'Failed to fetch NASA POWER', status: response.status, detail: text });
    }

    const json = await response.json();

    // Optional: basic sanity check for expected structure
    if (!json.properties || !json.properties.parameter) {
      return res.status(500).json({ error: 'NASA POWER returned invalid data structure', data: json });
    }

    // Cache result
    cache.set(cacheKey, json);

    return res.json(json);

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Proxy server error', detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`NASA POWER proxy running on http://localhost:${PORT}`);
  console.log(`Example: http://localhost:${PORT}/nasa-power?lat=47.4979&lon=19.0402&start=20241116&end=20241116`);
});
