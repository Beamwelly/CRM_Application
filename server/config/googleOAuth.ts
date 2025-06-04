import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Google OAuth client ID and secret must be defined in environment variables.');
}

const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

export const googleOAuthConfig = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${baseUrl}/auth/google/callback`,
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send']
}; 