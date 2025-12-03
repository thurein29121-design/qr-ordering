const express = require("express");
const router = express.Router();
const pool = require("../db/connection");

// ------------------------
// CREATE NEW ORDER (FIXED)
// ------------------------
router.post("/new", async (req, res) => {
  try {
    // Accept both tableNo (frontend) and table_no (fallback)
    const table_no = req.body.tableNo || req.body.table_no;
    const items = req.body.items || [];
    const total = Number(req.body.total || 0);

    // Validate
    if (!table_no) {
      return res.status(400).json({ success: false, error: "Missing table_no" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "No items provided" });
    }

    // Insert new order
    const [result] = await pool.query(
      "INSERT INTO orders (table_no, total, status) VALUES (?, ?, ?)",
      [table_no, total, "received"]
    );

    const orderId = result.insertId;

    // Insert all items
    for (const it of items) {
      await pool.query(
        `INSERT INTO order_items 
          (order_id, name, price, qty, size, spice, juice, addons, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          it.name,
          it.price,
          it.qty,
          it.size || null,
          it.spice || null,
          it.juice ? it.juice.name : null,
          JSON.stringify(it.addons || []),
          it.subtotal,
        ]
      );
    }

    return res.json({ success: true, orderId });

  } catch (error) {
    console.error("❌ /api/order/new ERROR:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


// ------------------------
// GET ORDER BY ID
// ------------------------
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [[order]] = await pool.query(
      "SELECT * FROM orders WHERE id = ?",
      [id]
    );

    if (!order) return res.json({});

    const [items] = await pool.query(
      "SELECT * FROM order_items WHERE order_id = ?",
      [id]
    );

    res.json({ order, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ------------------------
// ORDER HISTORY BY TABLE
// ------------------------
router.get("/history/:table", async (req, res) => {
  try {
    const tableNo = req.params.table;

    const [orders] = await pool.query(
      "SELECT * FROM orders WHERE table_no = ? ORDER BY created_at DESC",
      [tableNo]
    );

    for (const order of orders) {
      const [items] = await pool.query(
        "SELECT * FROM order_items WHERE order_id = ?",
        [order.id]
      );
      order.items = items;
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ------------------------
// ADMIN GET ALL ORDERS
// ------------------------
router.get("/list", async (req, res) => {
  try {
    const [data] = await pool.query(
      "SELECT * FROM orders ORDER BY created_at DESC"
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ------------------------
// CHECKOUT TABLE (receipt)
// ------------------------
// ------------------------
// CHECKOUT TABLE (receipt)
// ------------------------
router.post("/checkout/:table", async (req, res) => {
  try {
    const tableNo = String(req.params.table).trim();

    // 1. Fetch all RECEIVED orders for this table
    const [orders] = await pool.query(
      "SELECT * FROM orders WHERE TRIM(table_no) = ? AND status = 'received'",
      [tableNo]
    );

    if (!orders.length) {
      return res.json({ success: false, message: "No orders found" });
    }

    const sessionId = Date.now();
    let allItems = [];

    for (const order of orders) {
      // 2. Fetch items
      const [items] = await pool.query(
        "SELECT * FROM order_items WHERE order_id = ?",
        [order.id]
      );

      // Parse JSON addons if needed
      items.forEach(it => {
        try {
          if (typeof it.addons === "string") {
            it.addons = JSON.parse(it.addons);
          }
        } catch { it.addons = []; }
      });

      allItems.push(...items);

      // 3. Update orders to completed
      await pool.query(
        "UPDATE orders SET status = 'completed', session_id = ? WHERE id = ?",
        [sessionId, order.id]
      );
    }

    return res.json({
      success: true,
      table_no: tableNo,
      session_id: sessionId,
      items: allItems,
    });

  } catch (e) {
    console.error("CHECKOUT ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});


module.exports = router;
