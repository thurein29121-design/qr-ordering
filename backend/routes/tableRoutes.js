const express = require("express");
const router = express.Router();
const pool = require("../db/connection");

// GET ALL TABLES
router.get("/", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM tables");
  res.json(rows);
});

// CHECK TABLE STATUS
router.get("/:table/status", async (req, res) => {
  const table = req.params.table;

  const [[row]] = await pool.query(
    "SELECT is_active FROM tables WHERE table_no = ?",
    [table]
  );

  res.json({ active: row?.is_active === 1 });
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
