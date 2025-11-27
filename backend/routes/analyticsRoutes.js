// 📦 backend/routes/analyticsRoutes.js
const express = require("express");
const router = express.Router();
const pool = require("../db/connection"); // 👈 same as orderRoutes.js

// 1) Today's sales summary
router.get("/sales/today", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        COALESCE(SUM(total_price), 0) AS total_sales,
        COALESCE(SUM(total_items), 0) AS total_items,
        COUNT(*) AS sessions
      FROM receipts
      WHERE DATE(created_at) = CURDATE()
    `);

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ today sales error:", err);
    res.status(500).json({ error: "today sales error" });
  }
});

// 2) Weekday vs weekend average & totals
router.get("/sales/weekday-weekend", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        CASE 
          WHEN DAYOFWEEK(created_at) IN (1,7) THEN 'weekend'
          ELSE 'weekday'
        END AS type,
        AVG(total_price) AS avg_receipt,
        SUM(total_price) AS total_sales,
        COUNT(*) AS receipts
      FROM receipts
      GROUP BY type
    `);

    const out = { weekday: null, weekend: null };
    rows.forEach(r => {
      if (r.type === "weekday") out.weekday = r;
      else if (r.type === "weekend") out.weekend = r;
    });

    res.json(out);
  } catch (err) {
    console.error("❌ weekday/weekend error:", err);
    res.status(500).json({ error: "weekday/weekend error" });
  }
});

// 3) Top items today (by qty)
router.get("/items/top-today", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        oi.name,
        SUM(oi.qty) AS total_qty,
        SUM(oi.subtotal) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN receipts r 
        ON r.table_no = o.table_no 
       AND r.session_id = o.session_id
      WHERE DATE(r.created_at) = CURDATE()
      GROUP BY oi.name
      ORDER BY total_qty DESC
      LIMIT 10
    `);

    res.json(rows);
  } catch (err) {
    console.error("❌ top items today error:", err);
    res.status(500).json({ error: "top items today error" });
  }
});

module.exports = router;
