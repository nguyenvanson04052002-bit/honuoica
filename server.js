// Import các thư viện
const express = require('express');
const axios = require('axios');
const CryptoJS = require('crypto-js'); // Thư viện giải mã AES
const app = express();
const port = process.env.PORT || 3000; // Cổng mà server sẽ chạy

// Biến để theo dõi trạng thái
let requestCount = 0;  // Tổng số yêu cầu đã nhận
let errorCount = 0;    // Tổng số lỗi đã xảy ra
let totalResponseTime = 0;  // Tổng thời gian phản hồi (ms)
let averageResponseTime = 0;  // Thời gian phản hồi trung bình

// Middleware để parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Route gốc "/" để tránh lỗi "Cannot GET /"
app.get('/', (req, res) => {
  res.send('Server đang chạy. Vui lòng sử dụng các API khác như /proxy hoặc /status');
});

// Hàm giải mã AES
function decryptAES(ciphertext, key, iv) {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Hex.parse(key), {
            iv: CryptoJS.enc.Hex.parse(iv)
        });
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('Lỗi khi giải mã AES:', error);
        return '';
    }
}

// API Proxy
app.get('/proxy', async (req, res) => {
  const startTime = Date.now(); // Lưu thời gian bắt đầu

  try {
    // Lấy URL từ tham số "url" trong query string
    const targetUrl = req.query.url;

    // Kiểm tra nếu không có URL, trả lỗi
    if (!targetUrl) {
      return res.status(400).json({ error: 'Thiếu tham số URL' });
    }

    // Đảm bảo rằng URL cần proxy là URL của server chính
    const serverUrl = 'https://nuoicatudong.gt.tc/dashboard.php'; 

    // Kiểm tra nếu URL không phải từ server chính, trả lỗi
    if (!targetUrl.startsWith(serverUrl)) {
      return res.status(400).json({ error: 'URL không hợp lệ' });
    }

    // Thực hiện yêu cầu HTTP đến server chính
    const response = await axios.get(targetUrl);

    // Lọc và xử lý dữ liệu trả về (giả sử trả về HTML có chứa mã JavaScript)
    const html = response.data;

    // Kiểm tra và giải mã dữ liệu AES trong HTML
    const match = html.match(/toHex\(slowAES\.decrypt\(([^)]+)\)\)/);

    let decryptedData = '';
    if (match) {
        const encryptedData = match[1]; // Dữ liệu mã hóa AES
        const key = "f655ba9d09a112d4968c63579db590b4"; // Khóa giải mã
        const iv = "98344c2eee86c3994890592585b49f80"; // IV giải mã

        // Giải mã dữ liệu
        decryptedData = decryptAES(encryptedData, key, iv);

        // Nếu giải mã thành công mà không có lỗi, trả lại dữ liệu đã giải mã
        if (!decryptedData) {
            return res.status(500).json({ error: 'Giải mã dữ liệu không thành công' });
        }
    } else {
        // Nếu không có dữ liệu mã hóa, trả về HTML gốc
        decryptedData = html;
    }

    // Cập nhật trạng thái theo dõi
    const responseTime = Date.now() - startTime;
    requestCount++;
    totalResponseTime += responseTime;
    averageResponseTime = totalResponseTime / requestCount;

    // Trả dữ liệu về dưới dạng JSON (có thể chứa thông tin đã giải mã)
    res.json({ 
        success: true, 
        data: decryptedData || html, 
        responseTime: responseTime 
    });

  } catch (error) {
    // Cập nhật số lỗi nếu có
    errorCount++;
    console.error(error);
    res.status(500).json({ error: 'Không thể lấy dữ liệu từ server chính' });
  }
});

// Endpoint hiển thị trạng thái proxy
app.get('/status', (req, res) => {
  res.json({
    status: 'OK',
    requestCount,              // Tổng số yêu cầu
    errorCount,                // Tổng số lỗi
    averageResponseTime,       // Thời gian phản hồi trung bình
    lastRequestTimestamp: new Date(),
    uptime: process.uptime()   // Thời gian server đã hoạt động
  });
});

// Khởi chạy server
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
