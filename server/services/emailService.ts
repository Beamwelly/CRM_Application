import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getGoogleTokens } from './userService';

export class EmailServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailServiceError';
  }
}

export async function sendEmail(userId: string, to: string, subject: string, text: string) {
  try {
    // Get user's Google tokens
    const tokens = await getGoogleTokens(userId);
    if (!tokens) {
      throw new EmailServiceError('Gmail account not connected. Please connect your Gmail account in settings.');
    }

    // Create OAuth2 client
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      '/api/auth/google/google/callback'
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken
    });

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create email message
    const message = [
      'Content-Type: text/plain; charset="UTF-8"\n',
      'MIME-Version: 1.0\n',
      `To: ${to}\n`,
      `Subject: ${subject}\n\n`,
      text
    ].join('');

    // Encode message
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    if (error instanceof EmailServiceError) {
      throw error;
    }
    throw new EmailServiceError('Failed to send email. Please try again later.');
  }
} 