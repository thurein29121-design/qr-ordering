// backend/routes/analyticsRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../db/connection");

/************************************************
 * 1) TODAY'S SALES
 ************************************************/
router.get("/sales/today", async (req, res) => {
  try {
    const [[row]] = await db.query(`
      SELECT
        COALESCE(SUM(total), 0) AS total_sales,
        COUNT(*) AS sessions,
        (SELECT COALESCE(SUM(qty),0)
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE DATE(o.created_at) = CURDATE()) AS total_items
      FROM orders
      WHERE DATE(created_at) = CURDATE()
    `);

    res.json(row);
  } catch (err) {
    console.error("today error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

/************************************************
 * 2) WEEKDAY vs WEEKEND SALES
 ************************************************/
router.get("/sales/weekday-weekend", async (req, res) => {
  try {
    const [weekday] = await db.query(`
      SELECT 
        AVG(total) AS avg_receipt,
        SUM(total) AS total_sales
      FROM orders
      WHERE WEEKDAY(created_at) < 5
    `);

    const [weekend] = await db.query(`
      SELECT 
        AVG(total) AS avg_receipt,
        SUM(total) AS total_sales
      FROM orders
      WHERE WEEKDAY(created_at) >= 5
    `);

    res.json({
      weekday: weekday[0] || {},
      weekend: weekend[0] || {}
    });

  } catch (err) {
    console.error("weekday-weekend error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

/************************************************
 * 3) TOP ITEMS TODAY
 ************************************************/
router.get("/items/top-today", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        oi.name,
        SUM(oi.qty) AS total_qty,
        SUM(oi.subtotal) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE DATE(o.created_at) = CURDATE()
      GROUP BY oi.name
      ORDER BY total_qty DESC
      LIMIT 10
    `);

    res.json(rows);
  } catch (err) {
    console.error("top today error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
