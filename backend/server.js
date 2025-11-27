const path = require("path");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const https = require("https");

// Routes
const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminMenuRoutes = require("./routes/adminMenuRoutes");
const tableRoutes = require("./routes/tableRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");


// SSL (self-signed)
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, "..", "ssl", "server.key")),
  cert: fs.readFileSync(path.join(__dirname, "..", "ssl", "server.cert"))
};

const app = express();
app.use(cors());
app.use(express.json());

// Public folder
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// API routes
app.use("/api/menu", menuRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/admin/menu", adminMenuRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/analytics", analyticsRoutes);


// 404 fallback
app.use((req, res) => res.status(404).send("404 Not Found"));

// Start HTTPS server (smartphone-friendly)
const PORT = 3000;
https.createServer(sslOptions, app).listen(PORT, "0.0.0.0", () => {
  console.log("🔒 HTTPS server running!");
  console.log(`📱 PC:     https://localhost:${PORT}`);
  console.log(`📱 Mobile: https://172.20.10.7:${PORT}`);
});
