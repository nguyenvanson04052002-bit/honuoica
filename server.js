const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");

const app = express();

// ====== MIDDLEWARE ======
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // cho CSS/JS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
  session({
    secret: "supersecret", // đổi khi deploy
    resave: false,
    saveUninitialized: true,
  })
);

// ====== FILES ======
const USERS_FILE = "users.txt";
const DATA_FILE = "data.csv";
const CONFIG_HISTORY = "config_history.csv";
const LAST_STATUS = "last_status.txt";
const TARGET_FILE = "target.txt";
const MIN_FILE = "min_temp.txt";
const MAX_FILE = "max_temp.txt";
const FEED_FILE = "feed_schedule.txt";

const validStatuses = ["COOL_ON", "HEAT_ON", "STABLE"];

// ===== HÀM LẤY GIỜ VIỆT NAM =====
function getVietnamTime() {
  const now = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });
  const [date, time] = now.split(", ");
  const [d, m, y] = date.split("/");
  return `${y}-${m}-${d} ${time}`;
}

// ===== LOGIN =====
app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard.php");
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!fs.existsSync(USERS_FILE)) {
    return res.render("login", { error: "⚠️ Chưa có tài khoản nào!" });
  }

  const users = fs
    .readFileSync(USERS_FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("|"));

  const found = users.find(
    ([u, p]) => u === username.trim() && p === password.trim()
  );

  if (found) {
    req.session.user = username;
    res.redirect("/dashboard.php");
  } else {
    res.render("login", { error: "⚠️ Sai tài khoản hoặc mật khẩu" });
  }
});

// ===== REGISTER =====
app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render("register", { error: "⚠️ Vui lòng nhập đủ thông tin!" });
  }

  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    users = fs
      .readFileSync(USERS_FILE, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split("|")[0]);
  }

  if (users.includes(username.trim())) {
    return res.render("register", { error: "⚠️ Tên đăng nhập đã tồn tại!" });
  }

  const line = `${username.trim()}|${password.trim()}\n`;
  fs.appendFileSync(USERS_FILE, line);

  res.send(
    "<script>alert('✅ Đăng ký thành công!'); window.location.href='/'</script>"
  );
});

// ===== LOGOUT =====
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ====== ESP API ======
// ESP gửi dữ liệu cập nhật
app.get("/api/esp/update", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  const temp = parseFloat(req.query.temp);
  const status = req.query.status ? req.query.status.trim() : "UNKNOWN";
  const time = getVietnamTime();

  if (!validStatuses.includes(status)) {
    return res.status(400).send("ERROR: Invalid status");
  }

  if (!isNaN(temp)) {
    fs.appendFileSync(DATA_FILE, `${time},${temp},${status}\n`);
    fs.appendFileSync(LAST_STATUS, `${status}|${time}\n`);
    return res.send("OK\n");
  } else {
    return res.status(400).send("ERROR: Invalid temperature\n");
  }
});

// ESP lấy config
app.get("/api/esp/get", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  const target = fs.existsSync(TARGET_FILE)
    ? fs.readFileSync(TARGET_FILE, "utf8").trim()
    : "25.0";
  const min = fs.existsSync(MIN_FILE)
    ? fs.readFileSync(MIN_FILE, "utf8").trim()
    : "23.0";
  const max = fs.existsSync(MAX_FILE)
    ? fs.readFileSync(MAX_FILE, "utf8").trim()
    : "27.0";
  res.send(`TARGET:${target}\nMIN:${min}\nMAX:${max}`);
});

// ESP kiểm tra feed
app.get("/api/esp/feedcheck", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  const feed = fs.existsSync(FEED_FILE)
    ? fs.readFileSync(FEED_FILE, "utf8").trim()
    : "";
  res.send(feed);
});

// ===== API cho dashboard realtime =====
// Trả về dữ liệu mới nhất (20 dòng cuối) để vẽ biểu đồ
app.get("/api/data/latest", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (!fs.existsSync(DATA_FILE)) return res.json([]);

  const rows = fs
    .readFileSync(DATA_FILE, "utf8")
    .split("\n")
    .filter(Boolean);

  const last20 = rows.slice(-20).map((r) => {
    const [time, temp, status] = r.split(",");
    return { time, temp: parseFloat(temp), status };
  });

  res.json(last20);
});

// Trả về status mới nhất (cho popup)
app.get("/api/status/latest", (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (!fs.existsSync(LAST_STATUS))
    return res.json({ status: "N/A", time: "" });

  const lines = fs
    .readFileSync(LAST_STATUS, "utf8")
    .split("\n")
    .filter(Boolean);

  if (lines.length === 0) return res.json({ status: "N/A", time: "" });

  const lastLine = lines[lines.length - 1];
  const [status, time] = lastLine.split("|");

  res.json({ status, time });
});

// ===== DASHBOARD =====
app.get("/dashboard.php", (req, res) => {
  if (!req.session.user) return res.redirect("/");

  let data = [];
  if (fs.existsSync(DATA_FILE)) {
    const rows = fs
      .readFileSync(DATA_FILE, "utf8")
      .split("\n")
      .filter(Boolean);
    data = rows.map((r) => {
      const [time, temp, status] = r.split(",");
      return { time, temp: parseFloat(temp), status };
    });
  }

  let popup = "";
  if (fs.existsSync(LAST_STATUS)) {
    const lines = fs
      .readFileSync(LAST_STATUS, "utf8")
      .split("\n")
      .filter(Boolean);
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      const [popupStatus, popupTime] = lastLine.split("|");
      popup = `${popupStatus} lúc ${popupTime}`;
    }
  }

  const targetNow = fs.existsSync(TARGET_FILE)
    ? fs.readFileSync(TARGET_FILE, "utf8").trim()
    : "25.0";
  const minNow = fs.existsSync(MIN_FILE)
    ? fs.readFileSync(MIN_FILE, "utf8").trim()
    : "23.0";
  const maxNow = fs.existsSync(MAX_FILE)
    ? fs.readFileSync(MAX_FILE, "utf8").trim()
    : "27.0";
  const feedNow = fs.existsSync(FEED_FILE)
    ? fs.readFileSync(FEED_FILE, "utf8").trim()
    : "";

  let history = [];
  if (fs.existsSync(CONFIG_HISTORY)) {
    const lines = fs
      .readFileSync(CONFIG_HISTORY, "utf8")
      .split("\n")
      .filter(Boolean)
      .reverse();
    history = lines.map((l) => {
      const [time, target, min, max] = l.split(",");
      return { time, target, min, max };
    });
  }

  res.render("dashboard", {
    data,
    popup,
    targetNow,
    minNow,
    maxNow,
    feedNow,
    history,
  });
});

// POST update config
app.post("/dashboard.php", (req, res) => {
  if (!req.session.user) return res.redirect("/");

  const { targetTemp, minTemp, maxTemp, feedTime } = req.body;

  if (targetTemp && minTemp && maxTemp) {
    const t = parseFloat(targetTemp);
    const min = parseFloat(minTemp);
    const max = parseFloat(maxTemp);

    if (t < min || t > max) {
      return res.send(
        "<p style='color:red'>⚠️ Mục tiêu phải nằm trong khoảng Min và Max.</p>"
      );
    }

    const time = getVietnamTime();
    fs.writeFileSync(TARGET_FILE, t.toString());
    fs.writeFileSync(MIN_FILE, min.toString());
    fs.writeFileSync(MAX_FILE, max.toString());
    fs.appendFileSync(CONFIG_HISTORY, `${time},${t},${min},${max}\n`);
  }

  if (feedTime) {
    if (/^(\d{2}:\d{2})(,\d{2}:\d{2})*$/.test(feedTime)) {
      fs.writeFileSync(FEED_FILE, feedTime);
    } else {
      return res.send(
        "<p style='color:red'>⚠️ Định dạng giờ không hợp lệ. VD: 09:00,21:00</p>"
      );
    }
  }

  res.redirect("/dashboard.php");
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server chạy ở cổng ${PORT}`));
