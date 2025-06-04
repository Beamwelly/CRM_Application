import express from 'express';
import passport from 'passport';
import { storeGoogleTokens, disconnectGmail } from '../services/userService';

const router = express.Router();

// Google OAuth route
router.get('/', (req, res, next) => {
  console.log('[Google Auth] Starting OAuth flow');
  console.log('[Google Auth] Request headers:', req.headers);
  console.log('[Google Auth] Session:', req.session);
  console.log('[Google Auth] User:', req.user);

  // Check if user is authenticated
  if (!req.user) {
    console.log('[Google Auth] User not authenticated, redirecting to login');
    return res.redirect('/login');
  }

  passport.authenticate('google', {
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'select_account',
    accessType: 'offline',
    state: req.user.id // Pass user ID in state parameter
  })(req, res, next);
});

// Google OAuth callback route
router.get('/callback',
  (req, res, next) => {
    console.log('[Google Auth] Callback received');
    console.log('[Google Auth] Session:', req.session);
    console.log('[Google Auth] User:', req.user);
    console.log('[Google Auth] State:', req.query.state);

    passport.authenticate('google', {
      failureRedirect: '/auth/google/failure',
      session: true
    })(req, res, next);
  },
  async (req, res) => {
    try {
      console.log('[Google Auth] Authentication successful');
      console.log('[Google Auth] Session:', req.session);
      console.log('[Google Auth] User:', req.user);

      if (!req.user) {
        throw new Error('No user data received from Google');
      }

      // Send HTML response that will communicate with the parent window
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('[Google Auth] Error in callback:', error);
      res.status(500).send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ 
                type: 'GOOGLE_AUTH_ERROR', 
                error: 'Authentication failed' 
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    }
  }
);

// Route to disconnect Gmail
router.post('/disconnect',
  async (req, res) => {
    try {
      console.log('[Google OAuth] Attempting to disconnect Gmail');
      if (!req.user) {
        console.log('[Google OAuth] No user found in request');
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      await disconnectGmail(req.user.id);
      console.log('[Google OAuth] Successfully disconnected Gmail');
      res.json({ success: true });
    } catch (error) {
      console.error('[Google OAuth] Error disconnecting Gmail:', error);
      res.status(500).json({ error: 'Failed to disconnect Gmail' });
    }
  }
);

export default router; 