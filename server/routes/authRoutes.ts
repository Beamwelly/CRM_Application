import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { pool } from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { login, verifyGoogleTokenAndLogin } from '../services/authService';
import { protect } from '../middleware/authMiddleware';

dotenv.config();

const router = express.Router();

// REMOVE JSON PARSER FOR THIS ROUTER (it's handled globally now)
// router.use(express.json());

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'; 
// JWT_SECRET is not needed directly in this file anymore
// const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Local User interface is not needed here anymore
/*
type Role = 'developer' | 'admin' | 'employee';
interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: Record<string, unknown>;
  password_hash: string;
}
*/

// Refactored Login handler - Calls authService.login
const loginHandler: express.RequestHandler = async (req, res, next) => {
  console.log('[AuthRoutes] Received POST /login request');
  console.log('[AuthRoutes] Request body:', req.body);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.error('[AuthRoutes] Missing email or password in request body.');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('[AuthRoutes] Attempting login via authService for email:', email);

    // Call the centralized login service
    const authResponse = await login({ email, password }); 
    
    // Send the response from the service (contains token and user with logoUrl)
    res.json(authResponse);

  } catch (error) {
    console.error('[AuthRoutes] Login error caught:', error);
    // Handle specific errors like invalid credentials from the service
    if (error instanceof Error && error.message === 'Invalid credentials') {
        return res.status(401).json({ message: 'Invalid email or password' });
    }
    // Pass other errors to the global error handler
    next(error);
  }
};

// Use express.RequestHandler for logoutHandler
const logoutHandler: express.RequestHandler = (req, res, next) => {
  // Use req directly. Types should now be augmented.
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    
    req.session.destroy((sessionErr) => {
        if (sessionErr) {
            console.error("Failed to destroy session during logout:", sessionErr);
            return next(sessionErr);
        }
        res.clearCookie('connect.sid'); 
        res.redirect(`${FRONTEND_URL}/login?message=logged_out`);
    });
  });
};

// statusHandler - Type hint remains express.RequestHandler
const statusHandler: express.RequestHandler = (req, res) => {
  // Use req directly. Types should now be augmented.
  if (req.isAuthenticated()) {
    res.json({ loggedIn: true, user: req.user });
  } else {
    res.json({ loggedIn: false });
  }
};

// Use handlers directly, no need for 'as express.RequestHandler' casting now
router.post('/login', loginHandler);
router.get('/logout', logoutHandler);
router.get('/status', statusHandler);

// --- Google Login Route --- 
router.post('/google', async (req, res, next) => {
    try {
        const { token } = req.body; // Expecting { token: "GOOGLE_ID_TOKEN" }
        if (!token) {
            return res.status(400).json({ message: 'Google ID token is required' });
        }
        const result = await verifyGoogleTokenAndLogin(token);
        res.json(result); // Send back user object and app token
    } catch (error) {
        console.error("Google login route error:", error);
        res.status(401).json({ message: 'Google Sign-In failed' });
    }
});

// --- Example Protected Route (e.g., to get current user) ---
// router.get('/me', protect, (req, res) => {
//     // req.user should be populated by the protect middleware
//     res.json(req.user);
// });

export default router;
