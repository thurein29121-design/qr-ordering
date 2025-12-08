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
router.put("/:tableNo/state", async (req, res) => {
  const { tableNo } = req.params;
  const { state } = req.body;
  const s = Number(state);

  if (![0, 1].includes(s)) {
    return res.status(400).json({ success: false, error: "Invalid state" });
  }

  try {
    if (s === 0) {
      // 🔴 Close table & prepare NEW session for next customers
      await pool.query(
        "UPDATE tables SET is_active = 0, session_id = session_id + 1 WHERE table_no = ?",
        [tableNo]
      );
    } else if (s === 1) {
      // 🟢 Open table (customers can order, use current session_id)
      await pool.query(
        "UPDATE tables SET is_active = 1 WHERE table_no = ?",
        [tableNo]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to set table state:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
