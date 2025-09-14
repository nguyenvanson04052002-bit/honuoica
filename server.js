const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Route gốc (dùng để kiểm tra nếu proxy đang hoạt động)
app.get('/', (req, res) => {
  res.send('Proxy Server is running!');
});

// Route để lấy thông tin cấu hình từ server PHP
app.get('/get-config', async (req, res) => {
  try {
    // Thực hiện yêu cầu tới server PHP của bạn
    const response = await axios.get('http://nuoicatudong.gt.tc/dashboard.php?mode=get');
    
    // Trả lại dữ liệu từ server PHP
    res.send(response.data); 
  } catch (error) {
    console.error('Error fetching data from PHP server:', error);
    res.status(500).send('Error fetching data from PHP server');
  }
});

// Route để nhận dữ liệu từ ESP8266 và cập nhật vào server PHP
app.get('/update', async (req, res) => {
  const { temp, status } = req.query;

  // Kiểm tra nếu có các giá trị cần thiết
  if (temp && status) {
    try {
      // Gửi dữ liệu cập nhật đến server PHP của bạn
      const response = await axios.get(`http://nuoicatudong.gt.tc/dashboard.php?mode=update&temp=${temp}&status=${status}`);
      res.send('Data updated successfully');
    } catch (error) {
      console.error('Error updating data on PHP server:', error);
      res.status(500).send('Error updating data');
    }
  } else {
    res.status(400).send('Invalid parameters: temp and status are required');
  }
});

// Route để lấy lịch cho ăn từ server PHP
app.get('/get-feed-schedule', async (req, res) => {
  try {
    const response = await axios.get('http://nuoicatudong.gt.tc/dashboard.php?mode=feedcheck');
    res.send(response.data);
  } catch (error) {
    res.status(500).send('Error fetching feed schedule');
  }
});

// Lắng nghe trên cổng
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
