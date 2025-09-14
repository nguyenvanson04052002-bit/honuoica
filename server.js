const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const DATA_FILE = "data.csv";
const CONFIG_HISTORY = "config_history.csv";
const LAST_STATUS = "last_status.txt";
const TARGET_FILE = "target.txt";
const MIN_FILE = "min_temp.txt";
const MAX_FILE = "max_temp.txt";
const FEED_FILE = "feed_schedule.txt";

const validStatuses = ["COOL_ON", "HEAT_ON", "OFF"];

// ===== 1. ESP gửi dữ liệu cập nhật =====
app.get("/dashboard.php", (req, res) => {
  const mode = req.query.mode;

  if (mode === "update") {
    res.setHeader("Content-Type", "text/plain");

    const temp = parseFloat(req.query.temp);
    const status = req.query.status ? req.query.status.trim() : "UNKNOWN";
    const time = new Date().toISOString().replace("T", " ").split(".")[0];

    if (!validStatuses.includes(status)) {
      res.status(400).send("ERROR: Invalid status");
      return;
    }

    if (!isNaN(temp)) {
      fs.appendFileSync(DATA_FILE, `${time},${temp},${status}\n`);
      fs.appendFileSync(LAST_STATUS, `${status}|${time}\n`);
      res.send("OK\n");
    } else {
      res.status(400).send("ERROR: Invalid temperature\n");
    }
  }

  // ===== 2. ESP lấy cấu hình nhiệt độ =====
  else if (mode === "get") {
    res.setHeader("Content-Type", "text/plain");

    const target = fs.existsSync(TARGET_FILE) ? fs.readFileSync(TARGET_FILE, "utf8").trim() : "25.0";
    const min = fs.existsSync(MIN_FILE) ? fs.readFileSync(MIN_FILE, "utf8").trim() : "23.0";
    const max = fs.existsSync(MAX_FILE) ? fs.readFileSync(MAX_FILE, "utf8").trim() : "27.0";

    res.send(`TARGET:${target}\nMIN:${min}\nMAX:${max}`);
  }

  // ===== 3. ESP lấy lịch cho ăn =====
  else if (mode === "feedcheck") {
    res.setHeader("Content-Type", "text/plain");
    const feed = fs.existsSync(FEED_FILE) ? fs.readFileSync(FEED_FILE, "utf8").trim() : "";
    res.send(feed);
  }

  // ===== 4. Dashboard web =====
  else {
    // Đọc dữ liệu lịch sử
    let data = [];
    if (fs.existsSync(DATA_FILE)) {
      const rows = fs.readFileSync(DATA_FILE, "utf8").split("\n").filter(Boolean);
      data = rows.map(r => {
        const [time, temp, status] = r.split(",");
        return { time, temp: parseFloat(temp), status };
      });
    }

    // Popup trạng thái
    let popup = "";
    if (fs.existsSync(LAST_STATUS)) {
      const lines = fs.readFileSync(LAST_STATUS, "utf8").split("\n").filter(Boolean);
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        const [popupStatus, popupTime] = lastLine.split("|");
        popup = `${popupStatus} lúc ${popupTime}`;
      }
    }

    const targetNow = fs.existsSync(TARGET_FILE) ? fs.readFileSync(TARGET_FILE, "utf8").trim() : "25.0";
    const minNow = fs.existsSync(MIN_FILE) ? fs.readFileSync(MIN_FILE, "utf8").trim() : "23.0";
    const maxNow = fs.existsSync(MAX_FILE) ? fs.readFileSync(MAX_FILE, "utf8").trim() : "27.0";
    const feedNow = fs.existsSync(FEED_FILE) ? fs.readFileSync(FEED_FILE, "utf8").trim() : "";

    let history = [];
    if (fs.existsSync(CONFIG_HISTORY)) {
      const lines = fs.readFileSync(CONFIG_HISTORY, "utf8").split("\n").filter(Boolean).reverse();
      history = lines.map(l => {
        const [time, target, min, max] = l.split(",");
        return { time, target, min, max };
      });
    }

    res.render("dashboard", { data, popup, targetNow, minNow, maxNow, feedNow, history });
  }
});

// ===== 5. POST: cập nhật config =====
app.post("/dashboard.php", (req, res) => {
  const { targetTemp, minTemp, maxTemp, feedTime } = req.body;

  if (targetTemp && minTemp && maxTemp) {
    const t = parseFloat(targetTemp);
    const min = parseFloat(minTemp);
    const max = parseFloat(maxTemp);

    if (t < min || t > max) {
      return res.send("<p style='color:red'>⚠️ Mục tiêu phải nằm trong khoảng Min và Max.</p>");
    }

    const time = new Date().toISOString().replace("T", " ").split(".")[0];
    fs.writeFileSync(TARGET_FILE, t.toString());
    fs.writeFileSync(MIN_FILE, min.toString());
    fs.writeFileSync(MAX_FILE, max.toString());
    fs.appendFileSync(CONFIG_HISTORY, `${time},${t},${min},${max}\n`);
  }

  if (feedTime) {
    if (/^(\d{2}:\d{2})(,\d{2}:\d{2})*$/.test(feedTime)) {
      fs.writeFileSync(FEED_FILE, feedTime);
    } else {
      return res.send("<p style='color:red'>⚠️ Định dạng giờ không hợp lệ. VD: 09:00,21:00</p>");
    }
  }

  res.redirect("/dashboard.php");
});

// ====== PORT ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server chạy ở cổng ${PORT}`));
