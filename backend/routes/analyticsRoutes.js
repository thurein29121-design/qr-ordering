// backend/routes/analyticsRoutes.js
const express = require("express");
const router = express.Router();
const pool = require("../db/connection");
const { ensureOrderTables } = require("../models/orderModel");

// GET /api/analytics/summary
router.get("/summary", async (req, res) => {
  try {
    await ensureOrderTables();
    const [[row]] = await pool.query(`
      SELECT
        COALESCE(SUM(total), 0) AS total_revenue,
        COUNT(*) AS total_orders,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total ELSE 0 END), 0) AS today_revenue,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS today_orders
      FROM orders
    `);
    res.json(row);
  } catch (err) {
    console.error("Analytics summary error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/analytics/top-items
router.get("/top-items", async (req, res) => {
  try {
    await ensureOrderTables();
    const [rows] = await pool.query(`
      SELECT 
        oi.menu_item_id,
        oi.name,
        SUM(oi.qty) AS total_qty,
        SUM(oi.subtotal) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      GROUP BY oi.menu_item_id, oi.name
      ORDER BY total_qty DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error("Analytics top items error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
