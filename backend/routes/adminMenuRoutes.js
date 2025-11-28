// backend/routes/adminMenuRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../db/connection");

// GET /api/admin/menu -> all menu items
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM menu_items ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Admin menu list error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /api/admin/menu -> create menu item
router.post("/", async (req, res) => {
  const { name, price, category, description, image_url } = req.body;
  if (!name || price == null || !category) {
    return res.status(400).json({ error: "name, price, category required" });
  }
  try {
    const [result] = await db.query(
      `
      INSERT INTO menu_items (name, price, category, description, image_url)
      VALUES (?, ?, ?, ?, ?)
      `,
      [name, price, category, description || "", image_url || ""]
    );
    const [rows] = await db.query(
      "SELECT * FROM menu_items WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Admin menu create error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// PUT /api/admin/menu/:id -> update
router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const { name, price, category, description, image_url } = req.body;
  try {
    const [result] = await db.query(
      `
      UPDATE menu_items
      SET name = ?, price = ?, category = ?, description = ?, image_url = ?
      WHERE id = ?
      `,
      [name, price, category, description || "", image_url || "", id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Not found" });

    const [rows] = await db.query(
      "SELECT * FROM menu_items WHERE id = ?",
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("Admin menu update error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /api/admin/menu/:id
router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const [result] = await db.query(
      "DELETE FROM menu_items WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Admin menu delete error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
