// backend/routes/menuRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../db/connection");

// GET /api/menu  -> all items
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM menu_items ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Menu error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/menu/:category -> items by category (e.g. Drink, Set, Fruit)
router.get("/:category", async (req, res) => {
  const category = req.params.category;
  try {
    const [rows] = await db.query(
      "SELECT * FROM menu_items WHERE category = ? ORDER BY id DESC",
      [category]
    );
    res.json(rows);
  } catch (err) {
    console.error("Menu error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
