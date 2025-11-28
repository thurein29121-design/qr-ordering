// backend/routes/menuRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../db/connection");

// GET all menu items
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM menu_items ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("❌ Menu DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Get menu items by category (string like "Drink", "Set", "Fruit")
router.get("/:category", async (req, res) => {
  const category = req.params.category; // e.g. "Drink"
  try {
    console.log("📥 Fetching menu for category:", category);

    // ✅ Use category text match
    const [rows] = await db.query(
      "SELECT * FROM menu_items WHERE category= ? ORDER BY id DESC",
      [category]
    );

    if (rows.length === 0) {
      console.log(`⚠️ No items found for category: ${category}`);
      return res.json([]);
    }

    console.log(`✅ Found ${rows.length} items in ${category}`);
    res.json(rows);
  } catch (error) {
    console.error("❌ Menu DB Error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
