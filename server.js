const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

// Cấu hình proxy với đường link web server cần truy cập
const originalHost = "http://nuoicatudong.gt.tc/dashboard.php";

// Định nghĩa endpoint proxy
app.get('/proxy', async (req, res) => {
  const { url } = req.query; // Lấy URL gốc từ query parameter

  if (!url) {
    return res.status(400).send("Missing 'url' parameter");
  }

  try {
    // Gửi yêu cầu HTTP tới server gốc
    const response = await axios.get(url);

    // Sử dụng cheerio để xử lý dữ liệu HTML nếu cần
    const $ = cheerio.load(response.data);

    // Xử lý dữ liệu hoặc chỉ gửi dữ liệu thô về cho ESP8266
    res.setHeader('Content-Type', 'application/json');
    res.send({ data: response.data }); // Trả về dữ liệu thô dưới dạng JSON
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data');
  }
});

// Đặt server lắng nghe cổng
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
