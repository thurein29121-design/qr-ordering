const express = require("express");
const router = express.Router();
const db = require("../db/connection");

// ✅ Get all menu items
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM menu_items ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("❌ Fetch menu failed:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ Add new menu item
router.post("/", async (req, res) => {
  try {
    const { name, price, image, category } = req.body;
    if (!name || !price) return res.status(400).json({ error: "Missing fields" });

    const [result] = await db.query(
      "INSERT INTO menu_items (name, price, image, category) VALUES (?, ?, ?, ?)",
      [name, price, image || null, category || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("❌ Insert failed:", err);
    res.status(500).json({ error: "Insert failed" });
  }
});

// ✅ Update existing menu item
router.put("/:id", async (req, res) => {
  try {
    const { name, price, image, category } = req.body;
    const [result] = await db.query(
      "UPDATE menu_items SET name=?, price=?, image=?, category=? WHERE id=?",
      [name, price, image, category, req.params.id]
    );
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    console.error("❌ Update failed:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// ✅ Delete menu item
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM menu_items WHERE id=?", [req.params.id]);
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    console.error("❌ Delete failed:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
