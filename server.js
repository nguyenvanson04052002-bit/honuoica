const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios'); // Để lấy dữ liệu từ server gốc

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Khóa và IV (thay đổi thành khóa thực tế của bạn)
const key = Buffer.from("f655ba9d09a112d4968c63579db590b4", "hex");
const iv = Buffer.from("98344c2eee86c3994890592585b49f80", "hex");

// Hàm giải mã AES
function decryptAES(encrypted) {
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Proxy endpoint để nhận yêu cầu từ ESP8266
app.get('/api/proxy', async (req, res) => {
  try {
    // Lấy dữ liệu từ server gốc
    const response = await axios.get('http://nuoicatudong.gt.tc/dashboard.php?mode=feedcheck');
    const encryptedData = response.data; // Dữ liệu mã hóa nhận từ server

    // Giải mã dữ liệu
    const decryptedData = decryptAES(encryptedData);

    // Gửi lại dữ liệu đã giải mã
    res.json({ data: decryptedData });
  } catch (error) {
    console.error(error);
    res.status(500).send('Lỗi khi xử lý yêu cầu.');
  }
});

app.listen(port, () => {
  console.log(`Proxy server đang chạy trên cổng ${port}`);
});
