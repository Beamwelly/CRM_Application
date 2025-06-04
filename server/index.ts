import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import customerRoutes from './routes/customerRoutes';
import remarksRouter from './routes/remarks';
// import whatsappRoutes from './routes/whatsappRoutes'; // Temporarily commented out - ensure this file exists if needed
import emailRepliesRouter from './routes/emailReplies';
import communicationsRouter from './routes/communications';
import { emailFetchService } from './services/emailFetchService';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Database connection
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection error:', err);
  } else {
    logger.info('Database connected successfully');
  }
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
app.use('/api/remarks', remarksRouter);
// app.use('/api/whatsapp', whatsappRoutes); // Temporarily commented out
app.use('/api/email-replies', emailRepliesRouter);
app.use('/api/communications', communicationsRouter);

// Initialize email fetching service
const startEmailFetching = async () => {
  try {
    await emailFetchService.fetchNewEmails();
    setInterval(async () => {
      await emailFetchService.fetchNewEmails();
    }, 5 * 60 * 1000);
    logger.info('Email fetching service started');
  } catch (error) {
    logger.error('Failed to start email fetching service:', error);
  }
};

// Start the email fetching service
startEmailFetching();

// Start server if not in production (AWS Lambda)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

export { app };
