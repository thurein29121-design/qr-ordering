const express = require("express");
const router = express.Router();
const db = require("../db/connection");

// ============================================================
// 6️⃣ TABLE LIVE ITEMS (for staff check / edit)
// ============================================================
router.get("/table-items/:tableNo", async (req, res) => {
  const { tableNo } = req.params;

  try {
    // 1. Active session for this table
    const [tableRows] = await db.query(
      "SELECT session_id FROM tables WHERE table_no = ?",
      [tableNo]
    );

    if (!tableRows.length) {
      return res.status(404).json({ success: false, error: "Table not found" });
    }

    const sessionId = tableRows[0].session_id;

    // 2. All orders for this table + session
    const [orders] = await db.query(
      "SELECT id FROM orders WHERE table_no = ? AND session_id = ?",
      [tableNo, sessionId]
    );

    if (!orders.length) {
      return res.json({
        success: true,
        table_no: tableNo,
        session_id: sessionId,
        items: [],
        total_items: 0,
        total_price: 0
      });
    }

    const orderIds = orders.map(o => o.id);
    const placeholders = orderIds.map(() => "?").join(",");

    const [rawItems] = await db.query(
      `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id ASC`,
      orderIds
    );

    let totalItems = 0;
    let totalPrice = 0;

    const items = rawItems.map(it => {
      let addons = [];
      try {
        addons = it.addons ? JSON.parse(it.addons) : [];
      } catch {
        addons = [];
      }

      totalItems += Number(it.qty);
      totalPrice += Number(it.subtotal);

      return {
        id: it.id,
        order_id: it.order_id,
        name: it.name,
        price: Number(it.price),
        qty: it.qty,
        subtotal: Number(it.subtotal),
        size: it.size,
        spice: it.spice,
        juice: it.juice,
        addons
      };
    });

    res.json({
      success: true,
      table_no: tableNo,
      session_id: sessionId,
      items,
      total_items: totalItems,
      total_price: totalPrice
    });
  } catch (err) {
    console.error("❌ TABLE ITEMS ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ============================================================
// 7️⃣ UPDATE ONE ITEM QTY
// ============================================================
router.put("/item/:itemId", async (req, res) => {
  const { itemId } = req.params;
  let { qty } = req.body;
  qty = Number(qty);

  if (!Number.isInteger(qty) || qty < 1) {
    return res
      .status(400)
      .json({ success: false, error: "qty must be integer >= 1" });
  }

  try {
    const [[item]] = await db.query(
      "SELECT order_id, qty, subtotal FROM order_items WHERE id = ?",
      [itemId]
    );

    if (!item) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const oldQty = Number(item.qty) || 1;
    const unit = Number(item.subtotal) / oldQty;
    const newSubtotal = unit * qty;

    await db.query(
      "UPDATE order_items SET qty = ?, subtotal = ? WHERE id = ?",
      [qty, newSubtotal, itemId]
    );

    // Recalc order total
    const [[rowTotal]] = await db.query(
      "SELECT COALESCE(SUM(subtotal),0) AS total FROM order_items WHERE order_id = ?",
      [item.order_id]
    );

    await db.query("UPDATE orders SET total = ? WHERE id = ?", [
      rowTotal.total,
      item.order_id
    ]);

    res.json({
      success: true,
      qty,
      subtotal: newSubtotal,
      order_total: rowTotal.total
    });
  } catch (err) {
    console.error("❌ UPDATE ITEM ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ============================================================
// 8️⃣ DELETE ONE ITEM
// ============================================================
router.delete("/item/:itemId", async (req, res) => {
  const { itemId } = req.params;

  try {
    const [[item]] = await db.query(
      "SELECT order_id FROM order_items WHERE id = ?",
      [itemId]
    );

    if (!item) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const orderId = item.order_id;

    await db.query("DELETE FROM order_items WHERE id = ?", [itemId]);

    const [[rowTotal]] = await db.query(
      "SELECT COALESCE(SUM(subtotal),0) AS total, COUNT(*) AS cnt FROM order_items WHERE order_id = ?",
      [orderId]
    );

    if (rowTotal.cnt === 0) {
      await db.query("DELETE FROM orders WHERE id = ?", [orderId]);
      return res.json({
        success: true,
        deleted: true,
        order_deleted: true
      });
    } else {
      await db.query("UPDATE orders SET total = ? WHERE id = ?", [
        rowTotal.total,
        orderId
      ]);
      return res.json({
        success: true,
        deleted: true,
        order_deleted: false,
        order_total: rowTotal.total
      });
    }
  } catch (err) {
    console.error("❌ DELETE ITEM ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
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
