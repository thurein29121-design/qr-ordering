const express = require("express");
const router = express.Router();
const db = require("../db/connection");



// ============================================================
// GET TABLE ITEMS (CHECK POPUP)
// ============================================================
router.get("/table-items/:tableNo", async (req, res) => {
    const { tableNo } = req.params;
    try {
        const [[t]] = await db.query(
            "SELECT session_id FROM tables WHERE table_no = ?",
            [tableNo]
        );
        if (!t) return res.json({ success: true, items: [] });

        const sessionId = t.session_id;

        const [orders] = await db.query(
            "SELECT id FROM orders WHERE table_no = ? AND session_id = ?",
            [tableNo, sessionId]
        );
        if (!orders.length)
            return res.json({ success: true, items: [], total_items: 0, total_price: 0 });

        const ids = orders.map(o => o.id);
        const placeholders = ids.map(() => "?").join(",");

        const [rows] = await db.query(
            `SELECT * FROM order_items WHERE order_id IN (${placeholders})`,
            ids
        );

        let totalItems = 0, totalPrice = 0;

        const items = rows.map(r => {
            let addons = [];
            try { addons = r.addons ? JSON.parse(r.addons) : []; } catch {}
            totalItems += r.qty;
            totalPrice += Number(r.subtotal);
            return { ...r, addons };
        });

        res.json({
            success: true,
            items,
            total_items: totalItems,
            total_price: totalPrice
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// ============================================================
// UPDATE QTY
// ============================================================
router.put("/item/:id", async (req, res) => {
    const { id } = req.params;
    const { qty } = req.body;

    try {
        const [[item]] = await db.query(
            "SELECT order_id, qty, subtotal FROM order_items WHERE id = ?",
            [id]
        );
        if (!item) return res.status(404).json({ success: false });

        const unit = item.subtotal / item.qty;
        const newSubtotal = unit * qty;

        await db.query(
            "UPDATE order_items SET qty = ?, subtotal = ? WHERE id = ?",
            [qty, newSubtotal, id]
        );

        const [[sum]] = await db.query(
            "SELECT SUM(subtotal) AS total FROM order_items WHERE order_id = ?",
            [item.order_id]
        );

        await db.query(
            "UPDATE orders SET total = ? WHERE id = ?",
            [sum.total, item.order_id]
        );

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// ============================================================
// DELETE ITEM
// ============================================================
router.delete("/item/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const [[item]] = await db.query(
            "SELECT order_id FROM order_items WHERE id = ?",
            [id]
        );
        if (!item) return res.status(404).json({ success: false });

        await db.query("DELETE FROM order_items WHERE id = ?", [id]);

        const [[sum]] = await db.query(
            "SELECT SUM(subtotal) AS total, COUNT(*) AS cnt FROM order_items WHERE order_id = ?",
            [item.order_id]
        );

        if (!sum.cnt) {
            await db.query("DELETE FROM orders WHERE id = ?", [item.order_id]);
        } else {
            await db.query(
                "UPDATE orders SET total = ? WHERE id = ?",
                [sum.total, item.order_id]
            );
        }

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});


// GET ALL TABLES
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM tables");
    res.json(rows); // ✅ ARRAY
  } catch (err) {
    console.error("❌ Failed to load tables:", err);
    res.status(500).json({ error: "Failed to load tables" });
  }
});

// CHECK TABLE STATUS
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
      is_active: rows[0].is_active,
      session_id: rows[0].session_id
    });
  } catch (err) {
    console.error("❌ Failed to fetch table status:", err);
    res.status(500).json({ active: false });
  }
});

// CHANGE TABLE STATE
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
    console.error("❌ Failed to set table state:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
