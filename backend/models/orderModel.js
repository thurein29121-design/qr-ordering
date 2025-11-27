// backend/models/orderModel.js
const pool = require("../db/connection");

// Create orders tables if not exists (for dev convenience)
async function ensureOrderTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      table_no VARCHAR(32),
      total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      status ENUM('received','preparing','served','completed','cancelled') DEFAULT 'received',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      qty INT NOT NULL DEFAULT 1,
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);
}

async function createOrder({ tableNo = null, items = [], total = 0 }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No items");
  }
  await ensureOrderTables();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 🟢 Insert order with total included
    const [orderRes] = await conn.query(
      "INSERT INTO orders (table_no, total, status) VALUES (?, ?, 'received')",
      [tableNo, Number(total) || 0]
    );
    const orderId = orderRes.insertId;

    const values = items.map(it => [
      orderId,
      String(it.name),
      Number(it.price) || 0,
      Number(it.qty) || 1,
      (Number(it.price) || 0) * (Number(it.qty) || 1)
    ]);
    await conn.query(
      "INSERT INTO order_items (order_id, name, price, qty, subtotal) VALUES ?",
      [values]
    );

    await conn.commit();
    return orderId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function listOrders() {
  await ensureOrderTables();
  const [rows] = await pool.query(
    "SELECT * FROM orders ORDER BY created_at DESC"
  );
  return rows;
}

// 🧾 Fix: recalculate total dynamically if zero
async function getOrder(orderId) {
  await ensureOrderTables();
  const [[order]] = await pool.query("SELECT * FROM orders WHERE id = ?", [orderId]);
  if (!order) return null;

  const [items] = await pool.query("SELECT * FROM order_items WHERE order_id = ?", [orderId]);

  // 🟢 Auto fix total if it was 0 or missing
  const calcTotal = items.reduce((sum, i) => sum + Number(i.subtotal || 0), 0);
  if (Number(order.total) <= 0 && calcTotal > 0) {
    await pool.query("UPDATE orders SET total = ? WHERE id = ?", [calcTotal, orderId]);
    order.total = calcTotal;
  }

  return { order, items };
}

async function updateOrderStatus(orderId, status) {
  const allowed = ["received","preparing","served","completed","cancelled"];
  if (!allowed.includes(status)) throw new Error("Invalid status");
  await ensureOrderTables();
  const [res] = await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
  return res.affectedRows > 0;
}

module.exports = {
  ensureOrderTables,
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus
};
