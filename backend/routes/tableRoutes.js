const express = require("express");
const pool = require("../db/connection");
const router = express.Router();

/**
 * GET all tables
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
 * Internal function to update table state
 */
async function updateTable(tableNo, state) {
  if (state === 0) {
    // close table → next customer session
    return pool.query(
      "UPDATE tables SET is_active = 0, session_id = session_id + 1 WHERE table_no = ?",
      [tableNo]
    );
  }
  if (state === 1) {
    // open table
    return pool.query(
      "UPDATE tables SET is_active = 1 WHERE table_no = ?",
      [tableNo]
    );
  }
}

/**
 * PUT /api/tables/:tableNo/state
 */
router.put("/:tableNo/state", async (req, res) => {
  const { tableNo } = req.params;
  const state = Number(req.body.state);

  if (![0, 1].includes(state)) {
    return res.status(400).json({ success: false, error: "Invalid state" });
  }

  try {
    await updateTable(tableNo, state);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to set table state:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Duplicate toggle route (keep for compatibility)
 * PUT /api/tables/:tableNo/toggle
 */
router.put("/:tableNo/toggle", async (req, res) => {
  const { tableNo } = req.params;
  const state = Number(req.body.is_active);

  if (![0, 1].includes(state)) {
    return res.status(400).json({ success: false, error: "Invalid is_active" });
  }

  try {
    await updateTable(tableNo, state);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to toggle table state:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/tables/:tableNo/status
 */
router.get("/:tableNo/status", async (req, res) => {
  const { tableNo } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT is_active, session_id FROM tables WHERE table_no = ?",
      [tableNo]
    );

    if (!rows.length)
      return res.status(404).json({ active: false });

    res.json({
      active: rows[0].is_active === 1,
      is_active: rows[0].is_active,
      session_id: rows[0].session_id,
    });
  } catch (err) {
    console.error("❌ Failed to fetch table status:", err);
    res.status(500).json({ active: false });
  }
});

module.exports = router;
