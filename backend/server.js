require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const db = require("./db/connection");

const app = express();
app.use(cors());
app.use(express.json());

// Public folder
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// Routes
app.use("/api/menu", require("./routes/menuRoutes"));
app.use("/api/order", require("./routes/orderRoutes"));
app.use("/api/admin/menu", require("./routes/adminMenuRoutes"));
app.use("/api/tables", require("./routes/tableRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));

// 404 fallback
app.use((req, res) => res.status(404).send("404 Not Found"));

// Railway-required PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});
