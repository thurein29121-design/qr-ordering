const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");
const tableRoutes = require("./routes/tableRoutes");
const adminMenuRoutes = require("./routes/adminMenuRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const { testConnection } = require("./db/connection");
const { generateAdminToken, requireAdmin } = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Server running" });
});
app.use("/api/order", orderRoutes);
// ---- SERVE PUBLIC FRONTEND FILES ----
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// ---- API ROUTES ----
app.use("/api/menu", menuRoutes);
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

// ---- FRONTEND CATCH-ALL (must be last) ----
/*app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});*/
// Serve HTML files only
const htmlFiles = ["main.html", "admin.html", "sales.html", "tables.html", "history.html", "cart.html", "payment.html"];

app.get("/:page", (req, res, next) => {
  if (htmlFiles.includes(req.params.page)) {
    return res.sendFile(path.join(publicDir, req.params.page));
  }
  next();
});


// ---- START SERVER ----
const PORT = process.env.PORT || 8080;
testConnection();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
