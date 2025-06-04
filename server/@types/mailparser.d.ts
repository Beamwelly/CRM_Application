declare module 'mailparser' {
  interface ParsedMail {
    messageId?: string;
    inReplyTo?: string;
    references?: string[];
    subject?: string;
    text?: string;
    html?: string;
    from?: { text: string };
    to?: { text: string };
    date?: Date;
  }

  export function simpleParser(raw: Buffer): Promise<ParsedMail>;
} 