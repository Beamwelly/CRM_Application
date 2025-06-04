import { ImapFlow, MessageContent } from 'imapflow';
import { simpleParser } from 'mailparser';
import { query } from '../db';
import { logger } from '../utils/logger';

interface EmailConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  secure: boolean;
}

interface ParsedEmail {
  messageId: string;
  inReplyTo: string | null;
  references: string[];
  subject: string;
  text: string;
  html: string;
  from: string;
  to: string;
  date: Date;
}

class EmailFetchService {
  private client: ImapFlow | null = null;
  private config: EmailConfig;
  private isFetching: boolean = false;

  constructor(config: EmailConfig) {
    this.config = config;
    logger.info('EmailFetchService initialized with config:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user
    });
  }

  async connect() {
    try {
      logger.info('Attempting to connect to email server...');
      this.client = new ImapFlow({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.password,
        },
        logger: false
      });

      await this.client.connect();
      logger.info('Successfully connected to email server');
    } catch (error) {
      logger.error('Failed to connect to email server:', error);
      throw error;
    }
  }

  private async parseEmail(rawEmail: MessageContent): Promise<ParsedEmail> {
    const parsed = await simpleParser(rawEmail.content);
    return {
      messageId: parsed.messageId || '',
      inReplyTo: parsed.inReplyTo || null,
      references: parsed.references || [],
      subject: parsed.subject || '',
      text: parsed.text || '',
      html: parsed.html || '',
      from: parsed.from?.text || '',
      to: parsed.to?.text || '',
      date: parsed.date || new Date()
    };
  }

  private async findParentEmail(messageId: string, references: string[]): Promise<string | null> {
    logger.info('Finding parent email:', { messageId, references });

    // First try to find by message ID
    const result = await query(
      'SELECT id FROM communication_records WHERE email_message_id = $1',
      [messageId]
    );

    if (result.rows.length > 0) {
      logger.info('Found parent email by message ID:', result.rows[0].id);
      return result.rows[0].id;
    }

    // Then try to find by references
    for (const ref of references) {
      const refResult = await query(
        'SELECT id FROM communication_records WHERE email_message_id = $1',
        [ref]
      );
      if (refResult.rows.length > 0) {
        logger.info('Found parent email by reference:', refResult.rows[0].id);
        return refResult.rows[0].id;
      }
    }

    logger.warn('No parent email found for:', { messageId, references });
    return null;
  }

  private async storeEmailReply(parsedEmail: ParsedEmail): Promise<void> {
    try {
      // Find the parent email
      const parentEmailId = await this.findParentEmail(
        parsedEmail.inReplyTo || '',
        parsedEmail.references
      );

      if (!parentEmailId) {
        logger.warn('Could not find parent email for reply:', {
          messageId: parsedEmail.messageId,
          inReplyTo: parsedEmail.inReplyTo,
          references: parsedEmail.references
        });
        return;
      }

      // Get the lead/customer ID from the parent email
      const parentResult = await query(
        'SELECT lead_id, customer_id, email_subject FROM communication_records WHERE id = $1',
        [parentEmailId]
      );

      if (parentResult.rows.length === 0) {
        logger.warn('Parent email not found:', parentEmailId);
        return;
      }

      const { lead_id, customer_id, email_subject } = parentResult.rows[0];

      // Store the reply
      await query(
        `INSERT INTO communication_records (
          type, email_subject, email_body, email_message_id,
          email_in_reply_to, email_references, parent_email_id,
          lead_id, customer_id, is_reply, date, email_sent
        ) VALUES (
          'email', $1, $2, $3, $4, $5, $6, $7, $8, true, $9, true
        )`,
        [
          email_subject ? `Re: ${email_subject}` : parsedEmail.subject,
          parsedEmail.html || parsedEmail.text,
          parsedEmail.messageId,
          parsedEmail.inReplyTo,
          parsedEmail.references,
          parentEmailId,
          lead_id,
          customer_id,
          parsedEmail.date
        ]
      );

      logger.info('Stored email reply:', {
        messageId: parsedEmail.messageId,
        parentEmailId,
        subject: parsedEmail.subject
      });
    } catch (error) {
      logger.error('Failed to store email reply:', error);
    }
  }

  async fetchNewEmails() {
    if (this.isFetching) {
      logger.info('Email fetch already in progress');
      return;
    }

    try {
      this.isFetching = true;
      logger.info('Starting email fetch process...');
      
      if (!this.config.user || !this.config.password) {
        throw new Error('Email configuration is missing. Please check your .env file.');
      }

      await this.connect();

      if (!this.client) {
        throw new Error('IMAP client not initialized');
      }

      // Select the inbox
      const mailbox = await this.client.mailboxOpen('INBOX');
      logger.info(`Opened mailbox: ${mailbox.name}`);

      // Search for unread emails
      const messages = await this.client.search({ unseen: true });
      logger.info(`Found ${messages.length} unread messages`);

      for (const message of messages) {
        try {
          const rawEmail = await this.client.download(message.uid);
          if (!rawEmail) {
            logger.warn(`Could not download message ${message.uid}`);
            continue;
          }

          const parsedEmail = await this.parseEmail(rawEmail);
          logger.info('Parsed email:', {
            messageId: parsedEmail.messageId,
            inReplyTo: parsedEmail.inReplyTo,
            references: parsedEmail.references,
            subject: parsedEmail.subject,
            from: parsedEmail.from,
            to: parsedEmail.to
          });
          
          // Check if this is a reply
          if (parsedEmail.inReplyTo || parsedEmail.references.length > 0) {
            logger.info('Processing reply email:', {
              messageId: parsedEmail.messageId,
              inReplyTo: parsedEmail.inReplyTo,
              references: parsedEmail.references
            });
            await this.storeEmailReply(parsedEmail);
          } else {
            logger.info('Not a reply email, skipping:', {
              messageId: parsedEmail.messageId
            });
          }

          // Mark as read
          await this.client.messageFlagsAdd(message.uid, ['\\Seen']);
        } catch (error) {
          logger.error(`Error processing message ${message.uid}:`, error);
        }
      }

      await this.client.logout();
    } catch (error) {
      logger.error('Error in fetchNewEmails:', error);
    } finally {
      this.isFetching = false;
    }
  }
}

// Create and export a singleton instance
const emailFetchService = new EmailFetchService({
  user: process.env.EMAIL_USER || '',
  password: process.env.EMAIL_APP_PASSWORD || '',
  host: 'imap.gmail.com',
  port: 993,
  secure: true
});

export { emailFetchService }; 