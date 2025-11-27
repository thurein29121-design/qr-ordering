// backend/routes/orderRoutes.js
const express = require("express");
const pool = require("../db/connection");
const router = express.Router();

/**
 * 1️⃣ Create new order (Customer checkout)
 * POST /api/order/new
 */
router.post("/new", async (req, res) => {
  const { tableNo, items, total } = req.body;

  if (!tableNo || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: "Invalid order data" });
  }

  try {
    console.log("🟢 Received new order:", req.body);

    const [[table]] = await pool.query(
      "SELECT session_id FROM tables WHERE table_no = ?",
      [tableNo]
    );
    const sessionId = table ? table.session_id : 1;

    const [orderRes] = await pool.query(
      "INSERT INTO orders (table_no, total, status, session_id, created_at) VALUES (?, ?, 'received', ?, NOW())",
      [tableNo, total, sessionId]
    );

    const orderId = orderRes.insertId;

    // ✅ Insert items (use passed subtotal if available)
    for (const item of items) {
      const basePrice = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      const lineSubtotal =
        item.subtotal != null
          ? Number(item.subtotal)
          : basePrice * qty;

      await pool.query(
        `INSERT INTO order_items 
        (order_id, name, price, qty, subtotal, size, spice, addons, juice)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.name,
          basePrice,
          qty,
          lineSubtotal,
          item.size || null,
          item.spice || null,
          JSON.stringify(item.addons || []),
          item.juice?.name || null // ✅ juice stored as string
        ]
      );
    }

    res.json({ success: true, orderId });
  } catch (err) {
    console.error("❌ Insert failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2️⃣ Admin order list
 */
router.get("/list", async (req, res) => {
  try {
    const [orders] = await pool.query(
      "SELECT * FROM orders ORDER BY created_at DESC"
    );

    for (const order of orders) {
      const [items] = await pool.query(
        "SELECT name, qty, price, subtotal, size, spice, addons, juice FROM order_items WHERE order_id = ?",
        [order.id]
      );

      items.forEach(i => {
        try { i.addons = JSON.parse(i.addons || "[]"); } catch {}
        // ✅ juice stays string
      });

      order.items = items;
    }

    res.json(orders);
  } catch (err) {
    console.error("❌ Failed to load orders:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

/**
 * 3️⃣ View order by ID
 */
router.get("/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const [[order]] = await pool.query(
      "SELECT * FROM orders WHERE id = ?",
      [orderId]
    );

    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });

    const [items] = await pool.query(
      "SELECT name, qty, price, subtotal, size, spice, addons, juice FROM order_items WHERE order_id = ?",
      [orderId]
    );

    items.forEach(i => {
      try {
        i.addons = i.addons ? JSON.parse(i.addons) : [];
      } catch {
        i.addons = [];
      }
    });

    res.json({ success: true, order, items });
  } catch (err) {
    console.error("❌ Failed to fetch order:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4️⃣ Order history for customer
 */
router.get("/history/:tableNo", async (req, res) => {
  const { tableNo } = req.params;

  try {
    const [[table]] = await pool.query(
      "SELECT session_id FROM tables WHERE table_no = ?",
      [tableNo]
    );
    if (!table)
      return res.status(404).json({ error: "Table not found" });

    const sessionId = table.session_id;

    const [orders] = await pool.query(
      "SELECT * FROM orders WHERE table_no = ? AND session_id = ? ORDER BY created_at DESC",
      [tableNo, sessionId]
    );

    for (const order of orders) {
      const [items] = await pool.query(
        "SELECT name, qty, price, subtotal, size, spice, addons, juice FROM order_items WHERE order_id = ?",
        [order.id]
      );

      items.forEach(i => {
        try { i.addons = JSON.parse(i.addons || "[]"); } catch {}
      });

      order.items = items;
    }

    res.json(orders);
  } catch (err) {
    console.error("❌ Failed to load history:", err);
    res.status(500).json({ error: "Failed to load history" });
  }
});

/**
 * 5️⃣ Status update
 */
router.put("/:orderId/status", async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    await pool.query("UPDATE orders SET status = ? WHERE id = ?", [
      status,
      orderId,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to update status:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ✅ FINAL CHECKOUT
 */
router.post("/checkout/:tableNo", async (req, res) => {
  const { tableNo } = req.params;

  try {
    const [[table]] = await pool.query(
      "SELECT session_id FROM tables WHERE table_no = ?",
      [tableNo]
    );

    if (!table) {
      return res.json({ success: false, message: "Table not found" });
    }

    const sessionId = table.session_id;

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

    for (const order of orders) {
      const [orderItems] = await pool.query(
        "SELECT * FROM order_items WHERE order_id = ?",
        [order.id]
      );

      for (const i of orderItems) {
        let addons = [];
        try { addons = JSON.parse(i.addons || "[]"); } catch {}

        items.push({
          name: i.name,
          qty: i.qty,
          subtotal: i.subtotal,
          size: i.size,
          spice: i.spice,
          juice: i.juice || null,   // ✅ juice string only
          addons
        });

        totalItems += i.qty;
        totalPrice += i.subtotal;
      }
    }

    await pool.query(
      "INSERT INTO receipts (table_no, session_id, total_price, total_items, items) VALUES (?, ?, ?, ?, ?)",
      [tableNo, sessionId, totalPrice, totalItems, JSON.stringify(items)]
    );

    await pool.query(
      "UPDATE orders SET status = 'completed' WHERE table_no = ? AND session_id = ?",
      [tableNo, sessionId]
    );

    res.json({
      success: true,
      table_no: tableNo,
      session_id: sessionId,
      items,
      total_items: totalItems,
      total_price: totalPrice
    });

  } catch (err) {
    console.error("❌ Checkout failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
