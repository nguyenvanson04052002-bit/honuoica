import express from "express";
import fetch from "node-fetch";

const app = express();

// Proxy endpoint
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send("Missing url param");
  }

  console.log("[Proxy] Forwarding to:", targetUrl);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (ESP8266 Proxy)",
        "Accept": "text/plain"
      }
    });

    const body = await response.text();
    res.set("Content-Type", "text/plain");
    res.send(body);
  } catch (err) {
    console.error("[Proxy] Error:", err);
    res.status(500).send("Proxy error");
  }
});

// Render sẽ tự inject PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Proxy server running on port ${PORT}`);
});
