const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing URL');

  try {
    const response = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'ESP8266' }
    });
    res.send(response.data);
  } catch (err) {
    res.status(500).send('Error fetching target');
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
