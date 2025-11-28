import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import menuRoutes from './routes/menuRoutes.js'; 
import orderRoutes from './routes/orderRoutes.js';
import tableRoutes from './routes/tableRoutes.js';
import pool from './database/connection.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/menu', menuRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/tables', tableRoutes);

// Test DB route (must be BEFORE app.listen)
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({ success: true, db: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// IMPORTANT for Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
