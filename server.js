const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // cho css/js
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// session để giữ trạng thái đăng nhập
app.use(
  session({
    secret: "supersecret", // đổi khi deploy
    resave: false,
    saveUninitialized: true,
  })
);

const USERS_FILE = "users.txt";

// ===== LOGIN PAGE =====
app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard.php");
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!fs.existsSync(USERS_FILE)) {
    return res.render("login", { error: "Chưa có tài khoản nào!" });
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
    res.render("login", { error: "Sai tài khoản hoặc mật khẩu" });
  }
});

// ===== REGISTER PAGE =====
app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render("register", { error: "Vui lòng nhập đủ thông tin!" });
  }

  const line = `${username.trim()}|${password.trim()}\n`;
  fs.appendFileSync(USERS_FILE, line);
  res.send(
    "<script>alert('Đăng ký thành công!'); window.location.href='/'</script>"
  );
});

// ===== LOGOUT =====
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

/* ==== ĐOẠN DASHBOARD CŨ ==== 
   Toàn bộ code xử lý /dashboard.php 
   mà mình đã viết ở trên bạn giữ nguyên
   (chỉ cần thêm kiểm tra đăng nhập).
*/

app.get("/dashboard.php", (req, res, next) => {
  if (!req.session.user) return res.redirect("/");
  next();
});

// >>> sau dòng trên bạn đặt nguyên code dashboard cũ <<<


// ====== PORT ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server chạy ở cổng ${PORT}`));
