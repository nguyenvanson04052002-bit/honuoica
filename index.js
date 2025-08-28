const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Route kiểm tra hoạt động
app.get('/', (req, res) => {
  res.send('✅ ESP Proxy đang hoạt động');
});

// Route chính để chuyển tiếp request
app.get('/proxy', async (req, res) => {
  const rawUrl = req.query.url;

  if (!rawUrl) {
    return res.status(400).send('❌ Thiếu tham số URL');
  }

  const targetUrl = decodeURIComponent(rawUrl);

  if (!/^https?:\/\//.test(targetUrl)) {
    return res.status(400).send('❌ URL không hợp lệ');
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'ESP8266'
      },
      timeout: 10000
    });

    res.setHeader('Content-Type', 'text/plain');
    res.status(response.status).send(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data || err.message || 'Lỗi không xác định';
    res.status(status).send(`⚠️ Proxy lỗi: ${message}`);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 ESP Proxy đang chạy tại cổng ${PORT}`);
});


