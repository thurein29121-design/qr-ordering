const express = require("express");
const router = express.Router();
const db = require("../db/connection");

// ============================================================
// 1️⃣ STAFF CHECK — GET ALL ITEMS FOR A TABLE (current session)
// ============================================================
router.get("/table-items/:tableNo", async (req, res) => {
    const { tableNo } = req.params;

    try {
        const [[t]] = await db.query(
            "SELECT session_id FROM tables WHERE table_no = ?",
            [tableNo]
        );
        if (!t) {
            return res.json({ success: true, items: [], total_items: 0, total_price: 0 });
        }

        const sessionId = t.session_id;

        const [orders] = await db.query(
            "SELECT id FROM orders WHERE table_no = ? AND session_id = ?",
            [tableNo, sessionId]
        );

        if (!orders.length) {
            return res.json({ success: true, items: [], total_items: 0, total_price: 0 });
        }

        const orderIds = orders.map(o => o.id);
        const placeholders = orderIds.map(() => "?").join(",");

        const [rows] = await db.query(
            `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id ASC`,
            orderIds
        );

        let totalItems = 0;
        let totalPrice = 0;

        const items = rows.map(r => {
            let addons = [];
            try { addons = r.addons ? JSON.parse(r.addons) : []; } catch {}

            totalItems += Number(r.qty);
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
        console.error("❌ table-items ERROR:", err);
        res.status(500).json({ success: false });
    }
});

// ============================================================
// 2️⃣ UPDATE ITEM QTY
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

        await db.query("UPDATE orders SET total = ? WHERE id = ?", [
            sum.total,
            item.order_id
        ]);

        res.json({ success: true });

    } catch (err) {
        console.error("❌ update qty ERROR:", err);
        res.status(500).json({ success: false });
    }
});

// ============================================================
// 3️⃣ DELETE ITEM
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
            "SELECT SUM(subtotal) AS total, COUNT(*) AS cnt 
             FROM order_items WHERE order_id = ?",
            [item.order_id]
        );

        if (!sum.cnt) {
            await db.query("DELETE FROM orders WHERE id = ?", [item.order_id]);
        } else {
            await db.query("UPDATE orders SET total = ? WHERE id = ?", [
                sum.total,
                item.order_id
            ]);
        }

        res.json({ success: true });

    } catch (err) {
        console.error("❌ delete item ERROR:", err);
        res.status(500).json({ success: false });
    }
});

// ============================================================
// 4️⃣ CREATE NEW ORDER (Customer Checkout)
// ============================================================
router.post("/new", async (req, res) => {
  try {
    const tableNo = String(req.body.tableNo || req.body.table_no || "").trim();
    const items = req.body.items || [];
    const total = Number(req.body.total || 0);

    if (!tableNo) {
      return res.status(400).json({ success: false, error: "Missing table_no" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "No items provided" });
    }

    const [rows] = await db.query(
      "SELECT session_id FROM tables WHERE table_no = ?",
      [tableNo]
    );

    const sessionId = rows.length ? rows[0].session_id : 1;

    const [result] = await db.query(
      "INSERT INTO orders (table_no, total, status, session_id, created_at) 
       VALUES (?, ?, 'received', ?, NOW())",
      [tableNo, total, sessionId]
    );

    const orderId = result.insertId;

    for (const it of items) {
      await db.query(
        `INSERT INTO order_items 
        (order_id, name, price, qty, subtotal, size, spice, addons, juice)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          it.name,
          it.price,
          it.qty,
          it.subtotal,
          it.size || null,
          it.spice || null,
          JSON.stringify(it.addons || []),
          it.juice ? it.juice.name : null
        ]
      );
    }

    return res.json({ success: true, orderId });

  } catch (error) {
    console.error("❌ /api/order/new ERROR:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 5️⃣ VIEW ORDER
// ============================================================
router.get("/view/:orderId", async (req, res) => {
    const { orderId } = req.params;

    try {
        const [[order]] = await db.query("SELECT * FROM orders WHERE id = ?", [orderId]);
        const [items] = await db.query("SELECT * FROM order_items WHERE order_id = ?", [orderId]);

        res.json({ order, items });

    } catch (err) {
        console.error("❌ view ERROR:", err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
