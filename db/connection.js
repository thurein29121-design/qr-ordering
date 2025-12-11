// db/connection.js
const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: Number(process.env.MYSQLPORT) || 3306,
  ssl: false,
  connectionLimit: 10,
});

async function testConnection() {
  try {
    const conn = await db.getConnection();
    console.log("🟢 Connected to MySQL");
    conn.release();
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
  }
}

module.exports = db;               // <-- export pool directly
module.exports.testConnection = testConnection;
