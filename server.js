const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

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
app.use(cors());
app.use(express.json());

/* ======================
   HEALTH CHECK
====================== */
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Server running" });
});

/* ======================
   API ROUTES
====================== */
app.use("/api/menu", menuRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/analytics", analyticsRoutes);

/* ======================
   ADMIN LOGIN (JWT ONLY)
====================== */
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


/* ======================
   STATIC FRONTEND
====================== */
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

/* ======================
   ALLOWED HTML FILES
====================== */
const htmlFiles = [
  "main.html",
  "tables.html",
  "history.html",
  "cart.html",
  "payment.html",
  "admin.html",
  "sales.html"
];

app.get("/:page", (req, res, next) => {
  if (htmlFiles.includes(req.params.page)) {
    return res.sendFile(path.join(publicDir, req.params.page));
  }
  next();
});

/* ======================
   START SERVER
====================== */
const PORT = process.env.PORT || 8080;
testConnection();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
