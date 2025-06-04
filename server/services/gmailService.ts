import { google } from 'googleapis';

export const sendEmail = async (accessToken: string, to: string, subject: string, body: string) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    '/api/auth/google/google/callback'
  );

  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const message = [
    'Content-Type: text/plain; charset="UTF-8"\n',
    'MIME-Version: 1.0\n',
    `To: ${to}\n`,
    `Subject: ${subject}\n\n`,
    body,
  ].join('');

  const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });
    return { success: true, message: 'Email sent!' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}; 