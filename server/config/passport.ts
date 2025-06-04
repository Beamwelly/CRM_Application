import passport from 'passport';
import { Strategy as GoogleStrategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { googleOAuthConfig } from './googleOAuth';
import { storeGoogleTokens } from '../services/userService';
import { query } from '../db';

interface GoogleProfile extends Profile {
  id: string;
}

if (!googleOAuthConfig.clientID || !googleOAuthConfig.clientSecret) {
  throw new Error('Google OAuth client ID and secret must be defined in environment variables.');
}

passport.use(
  new GoogleStrategy(
    {
      ...googleOAuthConfig,
      passReqToCallback: true
    },
    async (req, accessToken: string, refreshToken: string, profile: GoogleProfile, done: VerifyCallback) => {
      try {
        console.log('[Passport] Google strategy callback started');
        console.log('[Passport] Google profile:', profile);
        console.log('[Passport] State parameter:', req.query.state);

        // Get the user ID from the state parameter
        const userId = req.query.state as string;
        if (!userId) {
          console.error('[Passport] No user ID in state parameter');
          return done(new Error('No user ID in state parameter'));
        }

        // Get the user from the database
        const result = await query(
          'SELECT * FROM users WHERE id = $1',
          [userId]
        );

        if (result.rows.length === 0) {
          console.error('[Passport] No user found with ID:', userId);
          return done(new Error('No user found with this ID'));
        }

        const user = result.rows[0];
        console.log('[Passport] Found user:', user);

        // Store the tokens
        await storeGoogleTokens(user.id, accessToken, refreshToken);
        
        // Update user's gmail_connected status
        await query(
          'UPDATE users SET gmail_connected = true WHERE id = $1',
          [user.id]
        );

        console.log('[Passport] Google strategy completed successfully');
        return done(null, user);
      } catch (error) {
        console.error('[Passport] Error in Google strategy:', error);
        console.error('[Passport] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return done(error as Error);
      }
    }
  ) as unknown as passport.Strategy
);

// Serialize user to the session
passport.serializeUser((user: Express.User, done) => {
  console.log('[Passport] Serializing user:', user);
  done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user: Express.User, done) => {
  console.log('[Passport] Deserializing user:', user);
  done(null, user);
}); 