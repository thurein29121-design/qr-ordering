import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,      // tramway.proxy.rlwy.net
  user: process.env.DB_USER,      // root
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,  // railway
  port: process.env.DB_PORT,      // 16246
  ssl: false                      // IMPORTANT for Railway proxy
});

export default pool.promise();
