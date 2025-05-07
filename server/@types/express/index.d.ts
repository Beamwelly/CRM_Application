import 'express-session';
import { User as AppUser } from '../index'; // Adjust path if needed

declare global {
  namespace Express {
    // Augment the Request interface
    export interface Request {
      // Add properties added by passport/express-session
      logout(callback: (err?: Error) => void): void;
      isAuthenticated(): this is AuthenticatedRequest;
      user?: AppUser; // Use the imported User type
    }

    // Define AuthenticatedRequest if needed for the type predicate
    export interface AuthenticatedRequest extends Request {
      user: AppUser;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    passport?: { user: any };
  }
}

// Export {} is needed to treat this file as a module
export {};
