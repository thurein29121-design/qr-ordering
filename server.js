const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
require("dotenv").config({ path: "./backend/.env" }); // adjust if needed

const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");
const tableRoutes = require("./routes/tableRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const { testConnection } = require("./db/connection");
const { generateAdminToken, requireAdmin } = require("./middleware/auth");

const app = express();

/* ======================
   GLOBAL MIDDLEWARE
====================== */
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

/* ======================
   HEALTH CHECK
====================== */
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Server running" });
});

/* ======================
   API ROUTES (PUBLIC)
====================== */
app.use("/api/menu", menuRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/tables", tableRoutes);

/* ======================
   ADMIN LOGIN (SETS COOKIE)
====================== */
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username !== process.env.ADMIN_USER ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = generateAdminToken(username);

  res.cookie("adminToken", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 12 * 60 * 60 * 1000 // 12 hours
  });

  res.json({ success: true });
});

/* ======================
   PROTECTED ADMIN APIs
====================== */
app.use("/api/analytics", requireAdmin, analyticsRoutes);

/* ======================
   PROTECTED ADMIN HTML
====================== */
const publicDir = path.join(__dirname, "public");

app.get("/admin.html", requireAdmin, (req, res) => {
  res.sendFile(path.join(publicDir, "admin.html"));
});

app.get("/sales.html", requireAdmin, (req, res) => {
  res.sendFile(path.join(publicDir, "sales.html"));
});

/* ======================
   PUBLIC HTML PAGES
====================== */
const publicPages = [
  "main.html",
  "tables.html",
  "history.html",
  "cart.html",
  "payment.html"
];

app.get("/:page", (req, res, next) => {
  if (publicPages.includes(req.params.page)) {
    return res.sendFile(path.join(publicDir, req.params.page));
  }
  next();
});

/* ======================
   STATIC FILES (LAST)
====================== */
app.use(express.static(publicDir));

/* ======================
   START SERVER
====================== */
const PORT = process.env.PORT || 8080;
testConnection();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
