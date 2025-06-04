declare module 'imapflow' {
  interface MailboxInfo {
    name: string;
    path: string;
    flags: string[];
    exists: number;
    uidValidity: number;
    uidNext: number;
  }

  interface MessageContent {
    content: Buffer;
    size: number;
  }

  export class ImapFlow {
    constructor(config: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
      logger?: boolean;
    });
    connect(): Promise<void>;
    logout(): Promise<void>;
    mailboxOpen(mailbox: string): Promise<MailboxInfo>;
    search(criteria: { unseen: boolean }): Promise<Array<{ uid: number }>>;
    download(uid: number): Promise<MessageContent>;
    messageFlagsAdd(uid: number, flags: string[]): Promise<void>;
  }
} 