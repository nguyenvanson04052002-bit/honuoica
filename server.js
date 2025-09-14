const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios'); // Để lấy dữ liệu từ server gốc

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Proxy endpoint để nhận yêu cầu từ ESP8266
app.get('/api/proxy', async (req, res) => {
  try {
    // Lấy dữ liệu từ server gốc
    const response = await axios.get('http://nuoicatudong.gt.tc/dashboard.php?mode=get');
    
    // Kiểm tra dữ liệu trả về từ server gốc
    if (!response.data) {
      return res.status(500).json({ error: 'Không nhận được dữ liệu từ server gốc' });
    }

    // Dữ liệu trả về từ server gốc là dạng văn bản
    const serverData = response.data;

    // Gửi lại dữ liệu từ server gốc
    res.send(serverData); // Trả về nguyên văn dữ liệu từ server gốc

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi khi xử lý yêu cầu.' });
  }
});

app.listen(port, () => {
  console.log(`Proxy server đang chạy trên cổng ${port}`);
});
