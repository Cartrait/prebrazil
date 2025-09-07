
const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const endpoint = 'https://uk.api.vehicledataglobal.com/r2/lookup';
const apiKey = '0A304908-B2A0-4D8F-B900-E09B0311C66F';
const packageName = 'VehicleDetailsWithImage';

app.get('/api/vehicle', async (req, res) => {
    const vrm = req.query.vrm;
    console.log("Received VRM:", vrm);

    if (!vrm) {
        return res.status(400).json({ error: 'Missing registration (vrm)' });
    }

    const url = `${endpoint}?packagename=${packageName}&apikey=${apiKey}&vrm=${vrm}`;
    console.log("Fetching from VDG API:", url);

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log("Response from VDG:", JSON.stringify(data, null, 2)); // 👈 ADD THIS LINE

        res.json(data);
    } catch (err) {
        console.error('Error fetching data from VDG:', err);
        res.status(500).json({ error: 'Failed to fetch vehicle data' });
    }
});

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});