// Import các thư viện
const express = require('express');
const axios = require('axios');
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

// API Proxy
app.get('/proxy', async (req, res) => {
  const startTime = Date.now(); // Lưu thời gian bắt đầu

  try {
    // Lấy URL từ tham số "url" trong query string
    const targetUrl = req.query.url;

    // Kiểm tra nếu không có URL, trả lỗi
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }

    // Đảm bảo rằng URL cần proxy là URL của server chính
    const serverUrl = 'https://nuoicatudong.gt.tc/dashboard.php'; 

    // Kiểm tra nếu URL không phải từ server chính, trả lỗi
    if (!targetUrl.startsWith(serverUrl)) {
      return res.status(400).json({ error: 'Invalid target URL' });
    }

    // Thực hiện yêu cầu HTTP đến server chính
    const response = await axios.get(targetUrl);

    // Xử lý dữ liệu server trả về (giả sử trả về HTML)
    const html = response.data;

    // Cập nhật trạng thái theo dõi
    const responseTime = Date.now() - startTime;
    requestCount++;
    totalResponseTime += responseTime;
    averageResponseTime = totalResponseTime / requestCount;

    // Trả dữ liệu về dưới dạng JSON
    res.json({ data: html });

  } catch (error) {
    // Cập nhật số lỗi nếu có
    errorCount++;
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data from the main server' });
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

// Khởi chạy server
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});

