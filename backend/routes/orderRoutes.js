// backend/routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus
} = require("../models/orderModel");

// POST /api/order  -> create new order
// body: { tableNo, items: [{ menu_item_id, name, price, qty }] }
router.post("/", async (req, res) => {
  try {
    const orderId = await createOrder(req.body);
    const order = await getOrder(orderId);
    res.status(201).json(order);
  } catch (err) {
    console.error("Create order error:", err.message);
    res.status(400).json({ error: err.message || "Failed to create order" });
  }
});

// GET /api/order -> list orders
router.get("/", async (req, res) => {
  try {
    const orders = await listOrders();
    res.json(orders);
  } catch (err) {
    console.error("List orders error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/order/:id -> order + items
router.get("/:id", async (req, res) => {
  try {
    const order = await getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Not found" });
    res.json(order);
  } catch (err) {
    console.error("Get order error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// PATCH /api/order/:id/status -> update status
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  try {
    const ok = await updateOrderStatus(req.params.id, status);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Update status error:", err.message);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
