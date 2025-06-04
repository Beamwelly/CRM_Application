import dotenv from 'dotenv';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import session from 'express-session';
import { pool, query } from './db'; // Import pool and query function
import pgSession from 'connect-pg-simple'; // Import connect-pg-simple
import authRoutes from './routes/authRoutes'; // Import auth routes
import userRoutes from './routes/userRoutes'; // Import user routes
import leadRoutes from './routes/leadRoutes'; // Import lead routes
import customerRoutes from './routes/customerRoutes'; // Import customer routes
import communicationRoutes from './routes/communicationRoutes'; // Import communication routes
import adminRoutes from './routes/adminRoutes'; // Import admin routes
import followUpRoutes from './routes/followUpRoutes'; // Import follow-up routes
import bulkRoutes from './routes/bulkRoutes'; // Import bulk routes
import dashboardRoutes from './routes/dashboardRoutes'; // Import dashboard routes
import remarksRouter from './routes/remarks'; // Import remarks routes
import path from 'path';
import fs from 'fs/promises'; // Need fs promises for manual serving
import passport from 'passport';
import './config/passport'; // Import Passport config
import googleAuthRoutes from './routes/googleAuthRoutes'; // Import Google OAuth routes

const PgSession = pgSession(session);

const app: Express = express();
const PORT: number = parseInt(process.env.BACKEND_PORT || '5000', 10);

// --- Middleware ---
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

// Log incoming Content-Type BEFORE body parsers
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' || req.method === 'PUT') { // Only log for relevant methods
    console.log(`[Server] Received ${req.method} ${req.path} with Content-Type:`, req.headers['content-type']);
  }
  next();
});

// Body parsers
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// --- Session Middleware ---
if (!process.env.SESSION_SECRET) {
  throw new Error('Missing SESSION_SECRET environment variable');
}

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'user_sessions'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false for development
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
    path: '/',
    domain: 'localhost' // Set domain to localhost to work across ports
  }
}));

// --- Passport Middleware ---
app.use(passport.initialize());
app.use(passport.session());

// Add request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  console.log('Session:', req.session);
  console.log('User:', req.user);
  next();
});

// --- Static File Serving ---

// Serve static files from the uploads directory FIRST
// Revert to __dirname, assuming compiled file is in dist/server/
const uploadsPath = path.join(__dirname, '../../uploads'); // Go up two levels from dist/server
// OLD: const uploadsPath = path.resolve(process.cwd(), uploadsRelativePath);
console.log(`Serving uploads from (__dirname based): ${uploadsPath}`);
// Comment out the express.static middleware for /uploads
app.use('/uploads', express.static(uploadsPath, { index: false, dotfiles: 'ignore' }));

// Serve logos statically (add this before manual recording route)
const logosPath = path.join(uploadsPath, 'logos');
console.log(`Serving logos from: ${logosPath}`);
app.use('/uploads/logos', express.static(logosPath));

// --- Manual Route for Recordings ---
app.get('/uploads/recordings/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params;
  if (!filename) {
    return res.status(400).send('Filename is required');
  }

  // Construct the full path to the file using the corrected uploadsPath
  const safeFilename = path.basename(filename);
  // Make sure this filePath calculation uses the *correct* uploadsPath
  const filePath = path.join(uploadsPath, 'recordings', safeFilename);

  // Log the variables right before the access check
  console.log(`[Manual Route] Checking access for filename: ${safeFilename}`);
  console.log(`[Manual Route] Using base uploadsPath: ${uploadsPath}`);
  console.log(`[Manual Route] Resolved file path for access check: ${filePath}`);

  try {
    // Check if file exists
    await fs.access(filePath, fs.constants.R_OK); // Check for read access

    // Send the file, explicitly setting Content-Type
    res.sendFile(filePath, { headers: { 'Content-Type': 'audio/wav' } }, (err) => {
      if (err) {
        console.error(`[Manual Route] Error sending file ${filePath}:`, err);
        // Avoid sending detailed error back to client
        if (!res.headersSent) {
          res.status(500).send('Error serving recording file.');
        }
      }
    });
  } catch (error) {
    // Handle errors, checking type before accessing properties
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.error(`[Manual Route] File not found: ${filePath}`);
      res.status(404).send('Recording not found');
    } else {
      // Handle other potential errors (e.g., permission denied)
      console.error(`[Manual Route] Error accessing file ${filePath}:`, error);
      res.status(500).send('Error accessing recording file');
    }
  }
});

// --- TEST API ROUTE --- (Add this BEFORE other API routes)
app.get('/api/ping', (req: Request, res: Response) => {
  console.log('[Server] Test route /api/ping hit');
  console.log('[Server] Request headers:', req.headers);
  console.log('[Server] Request origin:', req.headers.origin);
  res.status(200).send('pong');
});

// Add a test route for Google OAuth
app.get('/auth/test', (req: Request, res: Response) => {
  console.log('[Server] Test route /auth/test hit');
  console.log('[Server] Request headers:', req.headers);
  console.log('[Server] Request origin:', req.headers.origin);
  res.status(200).send('Google OAuth test route working');
});

// --- API Routes ---
// Mount admin routes FIRST to avoid potential conflicts with other body parsing
app.use('/api/admin', adminRoutes);

// Mount Google OAuth routes BEFORE other auth routes
console.log('[Server] Mounting Google OAuth routes at /auth/google');
app.use('/auth/google', googleAuthRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/remarks', remarksRouter);

// --- React App Static Serving ---
const reactAppBuildPath = path.resolve(process.cwd(), '../dist'); 
console.log(`[Server] Serving React app from: ${reactAppBuildPath}`);
app.use(express.static(reactAppBuildPath));

// --- Catch-all for React Router --- (Place after static serving)
app.get('*', (req, res) => {
  console.log('[Server] Catch-all route hit:', req.method, req.path);
  res.sendFile(path.join(reactAppBuildPath, 'index.html'));
});

app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'API is running and healthy' });
});

// --- Error Handling Middleware ---
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ 
    message: 'Internal Server Error', 
    // Provide error details in development only
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
  // Verify DB connection on startup using the imported query function
  query('SELECT NOW()')
    .then(res => console.log('Database connected successfully at:', res.rows[0].now))
    .catch(err => {
        console.error('DATABASE CONNECTION FAILED:', err);
        // Consider exiting if DB connection is crucial for startup
        // process.exit(1);
    });
});
