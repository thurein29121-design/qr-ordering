// backend/server.js
const express = require("express");
const cors = require("cors");
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

// ✅ health check
app.get("/", (req, res) => {
  res.json({ ok: true, message: "QR Ordering API running" });
});

// ✅ DB test
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({ success: true, db: rows });
  } catch (error) {
    console.error("DB test error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Public APIs
app.use("/api/menu", menuRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/tables", tableRoutes);

// ✅ Admin login (env-based creds)
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  const envUser = process.env.ADMIN_USER || "admin";
  const envPass = process.env.ADMIN_PASSWORD || "admin";

  if (username !== envUser || password !== envPass) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = generateAdminToken(username);
  res.json({ token });
});

// ✅ Admin-protected routes
app.use("/api/admin/menu", requireAdmin, adminMenuRoutes);
app.use("/api/analytics", requireAdmin, analyticsRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
