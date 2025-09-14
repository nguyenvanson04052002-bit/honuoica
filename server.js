const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

// Để giải mã AES, bạn cần một thư viện như CryptoJS hoặc Node's built-in crypto module.
// Giải mã AES (giả sử bạn đã có khóa và dữ liệu cần giải mã).
const CryptoJS = require("crypto-js");

// Hàm giải mã AES (Cần xác định khóa và IV chính xác)
function decryptAES(ciphertext, key, iv) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Hex.parse(key), {
        iv: CryptoJS.enc.Hex.parse(iv)
    });
    return bytes.toString(CryptoJS.enc.Utf8);
}

// API Proxy: Cách lấy dữ liệu từ nguồn gốc
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        // Gửi yêu cầu đến URL gốc
        const response = await axios.get(targetUrl);
        
        // Lọc dữ liệu và xử lý JavaScript nếu có
        const html = response.data;

        // Tìm phần dữ liệu AES mã hóa trong HTML
        const match = html.match(/toHex\(slowAES\.decrypt\(([^)]+)\)\)/);
        
        if (match) {
            const encryptedData = match[1]; // Dữ liệu mã hóa AES
            const key = "f655ba9d09a112d4968c63579db590b4"; // Khóa giải mã
            const iv = "98344c2eee86c3994890592585b49f80"; // IV giải mã

            // Giải mã dữ liệu
            const decryptedData = decryptAES(encryptedData, key, iv);

            // Trả về dữ liệu giải mã dưới dạng JSON cho ESP8266
            res.json({ data: decryptedData });
        } else {
            // Nếu không tìm thấy AES mã hóa trong HTML
            res.status(400).json({ error: 'Could not find encrypted data' });
        }
    } catch (error) {
        console.error('Error during proxy request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Khởi động server
app.listen(port, () => {
    console.log(`Proxy server is running on http://localhost:${port}`);
});

