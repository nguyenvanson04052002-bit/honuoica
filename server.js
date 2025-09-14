const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

// Khởi tạo ứng dụng Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware để xử lý JSON và URL encoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Địa chỉ URL của website PHP
const phpUrl = 'https://nuoicatudong.gt.tc/dashboard.php'; // Thay thế với URL thật của bạn

// ===== 1. Lấy cấu hình nhiệt độ =====
app.get('/get-config', async (req, res) => {
    try {
        const response = await axios.get(`${phpUrl}?mode=get`);
        const data = response.data;

        // Phân tích và trả về dữ liệu cho ESP8266
        const config = {
            target: data.match(/TARGET:(\S+)/)[1],
            min: data.match(/MIN:(\S+)/)[1],
            max: data.match(/MAX:(\S+)/)[1],
            time: data.match(/TIME:(\S+)/)[1],
        };

        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data from PHP server' });
    }
});

// ===== 2. Cập nhật dữ liệu nhiệt độ =====
app.get('/update-temperature', async (req, res) => {
    const { temp, status } = req.query;

    if (temp && !isNaN(temp) && status) {
        try {
            // Gửi yêu cầu đến PHP server để cập nhật dữ liệu
            const response = await axios.get(`${phpUrl}?mode=update&temp=${temp}&status=${status}`);
            if (response.data === 'OK') {
                res.json({ success: true });
            } else {
                res.status(400).json({ error: 'Failed to update data on PHP server' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Failed to update data on PHP server' });
        }
    } else {
        res.status(400).json({ error: 'Invalid parameters' });
    }
});

// ===== 3. Lấy lịch cho ăn =====
app.get('/get-feed-schedule', async (req, res) => {
    try {
        const response = await axios.get(`${phpUrl}?mode=feedcheck`);
        const feedSchedule = response.data;

        res.json({ feedSchedule });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch feed schedule from PHP server' });
    }
});

// ===== 4. Lưu cấu hình (dành cho yêu cầu POST từ ESP8266) =====
app.post('/save-config', async (req, res) => {
    const { targetTemp, minTemp, maxTemp, feedTime } = req.body;

    try {
        // Lưu cấu hình nhiệt độ vào PHP server
        const configResponse = await axios.post(`${phpUrl}`, {
            targetTemp,
            minTemp,
            maxTemp
        });

        // Lưu lịch cho ăn nếu có
        const feedResponse = await axios.post(`${phpUrl}`, { feedTime });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save configuration to PHP server' });
    }
});

// Khởi chạy server trên cổng 3000
app.listen(port, () => {
    console.log(`Proxy server đang chạy tại http://localhost:${port}`);
});
