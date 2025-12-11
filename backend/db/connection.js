const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: Number(process.env.MYSQLPORT) || 3306,
  ssl: false,               // ✅ FIX HERE
  connectionLimit: 10
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log("🟢 Connected to MySQL");
    conn.release();
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
  }
}

module.exports = {
  pool,
  testConnection
};
