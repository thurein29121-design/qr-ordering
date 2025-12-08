const express = require("express");
const router = express.Router();
const pool = require("../db/connection");
const { requireAdmin } = require("../middleware/auth");

// ============================================================
// 1️⃣ CREATE NEW ORDER (Customer Checkout)
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

    // 🔹 Get ACTIVE session_id from tables
    const [rows] = await pool.query(
      "SELECT session_id FROM tables WHERE table_no = ?",
      [tableNo]
    );

    const sessionId = rows.length ? rows[0].session_id : 1;

    // 🔹 Insert MAIN order
    const [result] = await pool.query(
      "INSERT INTO orders (table_no, total, status, session_id, created_at) VALUES (?, ?, 'received', ?, NOW())",
      [tableNo, total, sessionId]
    );

    const orderId = result.insertId;

    // 🔹 Insert ITEMS with correct field order (same as working local version)
    for (const it of items) {
      await pool.query(
        `INSERT INTO order_items 
        (order_id, name, price, qty, subtotal, size, spice, addons, juice)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          it.name,
          it.price,
          it.qty,
          it.subtotal,                         // <== correct subtotal position
          it.size || null,
          it.spice || null,
          JSON.stringify(it.addons || []),     // always JSON
          it.juice ? it.juice.name : null      // DB accepts NULL ✔
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
// 2️⃣ GET ORDER BY ID (Payment page + Admin)
// ============================================================
router.get("/view/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const [[order]] = await pool.query(
      "SELECT * FROM orders WHERE id = ?",
      [orderId]
    );

    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    const [items] = await pool.query(
      "SELECT * FROM order_items WHERE order_id = ?",
      [orderId]
    );

    // parse addons
    items.forEach(i => {
      try {
        if (typeof i.addons === "string") i.addons = JSON.parse(i.addons);
      } catch {
        i.addons = [];
      }
    });

    res.json({ success: true, order, items });

  } catch (err) {
    console.error("❌ GET /view/:orderId ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// ============================================================
// 3️⃣ CUSTOMER HISTORY (matches localhost version)
// ============================================================
router.get("/history/:tableNo", async (req, res) => {
  const { tableNo } = req.params;

  try {
    const [sessionRows] = await pool.query(
      "SELECT session_id FROM tables WHERE table_no = ?",
      [tableNo]
    );

    if (!sessionRows.length) {
      return res.status(404).json({ error: "Table not found" });
    }

    const sessionId = sessionRows[0].session_id;

    const [orders] = await pool.query(
      "SELECT * FROM orders WHERE table_no = ? AND session_id = ? ORDER BY created_at DESC",
      [tableNo, sessionId]
    );

    for (const order of orders) {
      const [items] = await pool.query(
        "SELECT * FROM order_items WHERE order_id = ?",
        [order.id]
      );

      items.forEach(i => {
        try {
          if (typeof i.addons === "string") i.addons = JSON.parse(i.addons);
        } catch {
          i.addons = [];
        }
      });

      order.items = items;
    }

    res.json(orders);

  } catch (err) {
    console.error("❌ HISTORY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// ============================================================
// 4️⃣ ADMIN LIST ORDERS
// ============================================================
router.get("/list", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("❌ ADMIN LIST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// ============================================================
// 5️⃣ CHECKOUT (matches localhost version EXACTLY)
// ============================================================
router.post("/checkout/:tableNo", async (req, res) => {
  try {
    const tableNo = req.params.tableNo;

    // 1. Get session_id
    const [tableRows] = await pool.query(
      "SELECT session_id FROM tables WHERE table_no = ?",
      [tableNo]
    );

    if (!tableRows.length) {
      return res.status(404).json({ success: false, error: "Table not found" });
    }

    const sessionId = tableRows[0].session_id;

    // 2. Get orders in this session
    const [orders] = await pool.query(
      "SELECT id FROM orders WHERE table_no = ? AND session_id = ?",
      [tableNo, sessionId]
    );

    if (!orders.length) {
      return res.json({ success: false, message: "No orders found" });
    }

    let items = [];
    let totalItems = 0;
    let totalPrice = 0;

    // 3. Expand items
    for (const order of orders) {
      const [orderItems] = await pool.query(
        "SELECT * FROM order_items WHERE order_id = ?",
        [order.id]
      );

      orderItems.forEach(it => {
        let addons = [];
        try {
          addons = it.addons ? JSON.parse(it.addons) : [];
        } catch {}

        items.push({
          name: it.name,
          qty: it.qty,
          subtotal: it.subtotal,
          size: it.size,
          spice: it.spice,
          juice: it.juice,
          addons
        });

        totalItems += it.qty;
        totalPrice += it.subtotal;
      });
    }

    // 4. Return to tables.js (receipt popup)
    return res.json({
      success: true,
      table_no: tableNo,
      session_id: sessionId,
      items,
      total_items: totalItems,
      total_price: totalPrice
    });

  } catch (err) {
    console.error("❌ CHECKOUT ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
