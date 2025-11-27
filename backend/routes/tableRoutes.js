// 📦 backend/routes/tableRoutes.js
const express = require("express");
const pool = require("../db/connection");
const router = express.Router();

/**
 * ✅ Get all tables
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM tables");
    res.json(rows);
  } catch (err) {
    console.error("❌ Failed to load tables:", err);
    res.status(500).json({ error: "Failed to load tables" });
  }
});

/**
 * ✅ Set table state (only 0 or 1 now)
 * PUT /api/tables/:tableNo/state
 * Body: { state: 0 | 1 }
 *
 * 0 = RED (closed / old customer finished, next session prepared)
 *      → is_active = 0, session_id++ 
 *
 * 1 = GREEN (open / customer can order)
 *      → is_active = 1
 */
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

/**
 * 🆕 NEW: toggle endpoint so your index.html continues to work
 * PUT /api/tables/:tableNo/toggle
 * Body: { is_active: 0 | 1 }
 *
 * is_active = 0 → same as state 0
 * is_active = 1 → same as state 1
 */
router.put("/:tableNo/toggle", async (req, res) => {
  const { tableNo } = req.params;
  const { is_active } = req.body;
  const s = Number(is_active);

  if (![0, 1].includes(s)) {
    return res.status(400).json({ success: false, error: "Invalid is_active" });
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
    console.error("❌ Failed to toggle table state:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ✅ Check if table is active for customer side
 * GET /api/tables/:tableNo/status
 *
 * active = true  → customer can order (GREEN)
 * active = false → customer cannot order (RED)
 */
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

module.exports = router;
