const express = require("express");
const router = express.Router();
const db = require("../db/connection");

// ============================================================
// 1️⃣ STAFF CHECK — GET ALL ITEMS FOR A TABLE (current session)
// ============================================================
router.get("/table-items/:tableNo", async (req, res) => {
  const { tableNo } = req.params;

  try {
    const [[table]] = await db.query(
      "SELECT session_id FROM tables WHERE table_no = ?",
      [tableNo]
    );

    if (!table)
      return res.json({ success: true, items: [], total_items: 0, total_price: 0 });

    const sessionId = table.session_id;

    const [orders] = await db.query(
      "SELECT id FROM orders WHERE table_no = ? AND session_id = ?",
      [tableNo, sessionId]
    );

    if (!orders.length)
      return res.json({ success: true, items: [], total_items: 0, total_price: 0 });

    const ids = orders.map(o => o.id);
    const placeholders = ids.map(() => "?").join(",");

    const [itemsRaw] = await db.query(
      `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id ASC`,
      ids
    );

    let totalItems = 0;
    let totalPrice = 0;

    const items = itemsRaw.map(i => {
      let addons = [];
      try {
        addons = i.addons ? JSON.parse(i.addons) : [];
      } catch {}

      totalItems += i.qty;
      totalPrice += Number(i.subtotal);

      return { ...i, addons };
    });

    res.json({
      success: true,
      items,
      total_items: totalItems,
      total_price: totalPrice
    });

  } catch (err) {
    console.error("❌ CHECK ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// ============================================================
// 2️⃣ STAFF — UPDATE ITEM QTY
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

    const unitPrice = item.subtotal / item.qty;
    const newSubtotal = qty * unitPrice;

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
    console.error("❌ UPDATE ITEM ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// ============================================================
// 3️⃣ STAFF — DELETE ITEM
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
  "SELECT SUM(subtotal) AS total, COUNT(*) AS count FROM order_items WHERE order_id = ?",
  [item.order_id]
);


    if (!sum.count) {
      await db.query("DELETE FROM orders WHERE id = ?", [item.order_id]);
    } else {
      await db.query(
        "UPDATE orders SET total = ? WHERE id = ?",
        [sum.total, item.order_id]
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error("❌ DELETE ITEM ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// ============================================================
// 4️⃣ CUSTOMER — CREATE ORDER (CHECKOUT)
// ============================================================
router.post("/new", async (req, res) => {
  try {
    const tableNo = req.body.tableNo || req.body.table_no;
    const items = req.body.items || [];
    const total = Number(req.body.total || 0);

    if (!tableNo)
      return res.status(400).json({ success: false, error: "Missing table_no" });

    if (!items.length)
      return res.status(400).json({ success: false, error: "Empty cart" });

    const [[t]] = await db.query(
      "SELECT session_id FROM tables WHERE table_no = ?",
      [tableNo]
    );

    const sessionId = t ? t.session_id : 1;

    const [orderRes] = await db.query(
      "INSERT INTO orders (table_no, total, status, session_id, created_at) VALUES (?, ?, 'received', ?, NOW())",
      [tableNo, total, sessionId]
    );

    const orderId = orderRes.insertId;

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

    res.json({ success: true, orderId });

  } catch (err) {
    console.error("❌ NEW ORDER ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// ============================================================
// 5️⃣ VIEW ORDER BY ID (ADMIN / STAFF / CUSTOMER)
// ============================================================
router.get("/view/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const [[order]] = await db.query(
      "SELECT * FROM orders WHERE id = ?",
      [orderId]
    );

    const [items] = await db.query(
      "SELECT * FROM order_items WHERE order_id = ?",
      [orderId]
    );

    items.forEach(i => {
      try { i.addons = JSON.parse(i.addons || "[]"); }
      catch { i.addons = []; }
    });

    res.json({ order, items });

  } catch (err) {
    console.error("❌ VIEW ORDER ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// EXPORT ROUTER
module.exports = router;
