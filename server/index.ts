import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import customerRoutes from './routes/customerRoutes';
// import whatsappRoutes from './routes/whatsappRoutes'; // Temporarily commented out - ensure this file exists if needed

// Load environment variables
dotenv.config();

const app = express(); // Keep this
// const PORT = process.env.PORT || 5000; // PORT is not needed for Lambda

// Middleware
app.use(cors()); // Consider more specific CORS options for production
app.use(express.json());

// Database connection - this will be used by your services/routes
export const pool = new Pool({
  host: process.env.DB_HOST, // Corrected from DATABASE_HOST to match serverless.yml convention
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME, // Corrected from DATABASE_NAME
  user: process.env.DB_USER,     // Corrected from DATABASE_USER
  password: process.env.DB_PASSWORD // Corrected from DATABASE_PASSWORD
});

// Basic route to test connection
app.get('/', (req, res) => {
  res.send('API is running');
});

// User routes
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Routes
app.use('/api/customers', customerRoutes);
// app.use('/api/whatsapp', whatsappRoutes); // Temporarily commented out

// Start server - REMOVE for Lambda deployment
/*
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
*/

export default app; // Export the app instance for serverless-http
