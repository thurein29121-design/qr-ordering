const express = require("express");
const router = express.Router();
const pool = require("../db/connection");

// GET ALL TABLES
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM tables");
    res.json(rows);
  } catch (err) {
    console.error("❌ Failed to load tables:", err);
    res.status(500).json({ error: "Failed to load tables" });
  }
});

// CHECK TABLE STATUS
router.get("/:tableNo/status", async (req, res) => {
  const { tableNo } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT is_active, session_id FROM tables WHERE table_no = ?",
      [tableNo]
    );
    if (!rows.length) return res.status(404).json({ active: false });

    const isActive = rows[0].is_active === 1; // 1 = GREEN/open

    res.json({
      active: isActive,
      is_active: rows[0].is_active,
      session_id: rows[0].session_id,
    });
  } catch (err) {
    console.error("❌ Failed to fetch table status:", err);
    res.status(500).json({ active: false });
  }
});

// CHANGE TABLE STATE (0=closed, 1=open)
router.put("/:table/state", async (req, res) => {
  const table = req.params.table;
  const { state } = req.body;

  await pool.query(
    "UPDATE tables SET is_active = ? WHERE table_no = ?",
    [state, table]
  );

  res.json({ success: true });
});

module.exports = router;
