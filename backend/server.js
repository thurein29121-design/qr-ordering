const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ROUTES
const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const tableRoutes = require("./routes/tableRoutes");
const adminMenuRoutes = require("./routes/adminMenuRoutes");

app.use("/api/menu", menuRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/admin/menu", adminMenuRoutes);
app.use("/api/analytics", analyticsRoutes);

// DB TEST ROUTE
const pool = require("./db/connection");

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 3+1 AS result");
    res.send(rows);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// START SERVER
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
