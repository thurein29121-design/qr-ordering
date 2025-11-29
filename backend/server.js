const express = require("express");
const cors = require("cors");
const path = require("path");   // ✅ REQUIRED
require("dotenv").config();

const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");
const tableRoutes = require("./routes/tableRoutes");
const adminMenuRoutes = require("./routes/adminMenuRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const pool = require("./db/connection");
const { generateAdminToken, requireAdmin } = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ ok: true, message: "QR Ordering API running" });
});

// DB test
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({ success: true, db: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Static files
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// API routes
app.use("/api/menu", menuRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/admin/menu", requireAdmin, adminMenuRoutes);
app.use("/api/analytics", requireAdmin, analyticsRoutes);

// Admin login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username !== (process.env.ADMIN_USER || "admin") ||
    password !== (process.env.ADMIN_PASSWORD || "admin")
  ) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = generateAdminToken(username);
  res.json({ token });
});

// React catch-all
app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// PORT
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Running on ${PORT}`));
