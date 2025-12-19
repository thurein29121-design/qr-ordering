const express = require("express");
const router = express.Router();
const db = require("../db/connection");

// GET ALL TABLES
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM tables ORDER BY table_no ASC");
    res.json(rows);
  } catch (err) {
    console.error("❌ Failed to load tables:", err);
    res.status(500).json({ error: "Failed to load tables" });
  }
});

// ============================================================
// GET TABLE STATUS
// ============================================================
router.get("/:tableNo/status", async (req, res) => {
    const { tableNo } = req.params;

    try {
        const [rows] = await db.query(
            "SELECT is_active, session_id FROM tables WHERE table_no = ?",
            [tableNo]
        );

        if (!rows.length) return res.status(404).json({ active: false });

        res.json({
            active: rows[0].is_active === 1,
            session_id: rows[0].session_id
        });

    } catch (err) {
        console.error("❌ status ERROR:", err);
        res.status(500).json({ active: false });
    }
});
// ============================================================
// CLOSE TABLE / RECEIPT → MARK ORDER AS PAID
// ============================================================
router.post("/close/:tableNo", async (req, res) => {
  const { tableNo } = req.params;
  console.log("🔴 CLOSE TABLE CALLED FOR:", tableNo);

  try {
    const [[order]] = await db.query(
      `SELECT id, status FROM orders
       WHERE table_no = ?
       ORDER BY id DESC LIMIT 1`,
      [tableNo]
    );

    console.log("🔍 FOUND ORDER:", order);

    if (!order) {
      console.log("⚠️ NO ORDER FOUND");
      return res.json({ success: true, message: "No order" });
    }

    const [result] = await db.query(
      "UPDATE orders SET status = 'PAID' WHERE id = ?",
      [order.id]
    );

    console.log("✅ UPDATE RESULT:", result);

    res.json({ success: true });

  } catch (err) {
    console.error("❌ CLOSE TABLE ERROR:", err);
    res.status(500).json({ success: false });
  }
});



// ============================================================
// UPDATE TABLE STATE (open / close)
// ============================================================
router.put("/:tableNo/state", async (req, res) => {
    const { tableNo } = req.params;
    const { state } = req.body;

    const s = Number(state);

    if (![0, 1].includes(s)) {
        return res.status(400).json({ success: false });
    }

    try {
        if (s === 0) {
            await db.query(
                "UPDATE tables SET is_active = 0, session_id = session_id + 1 WHERE table_no = ?",
                [tableNo]
            );
        } else {
            await db.query(
                "UPDATE tables SET is_active = 1 WHERE table_no = ?",
                [tableNo]
            );
        }

        res.json({ success: true });

    } catch (err) {
        console.error("❌ state ERROR:", err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
