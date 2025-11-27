-- Ensure you're using the correct DB
USE menu_data;

-- Fix or create orders table correctly
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  table_no VARCHAR(32),
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('received','preparing','served','completed','cancelled') DEFAULT 'received',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fix or create order_items table
DROP TABLE IF EXISTS order_items;
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(5,2) NOT NULL DEFAULT 0,
  qty INT NOT NULL DEFAULT 1,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
