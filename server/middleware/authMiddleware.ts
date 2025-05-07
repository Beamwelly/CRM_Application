import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define types locally to avoid cross-directory imports & 'any'
type Role = 'developer' | 'admin' | 'employee';
// Define a basic structure for permissions - can be expanded later or imported from shared types
interface UserPermissions { 
  [key: string]: unknown; // Replace any with unknown
}

// Define a structure for the user payload stored in the JWT & attached to req
interface AuthenticatedUser {
    id: string;
    email: string;
    name: string;
    role: Role; // Use locally defined Role
    permissions: UserPermissions; // Use locally defined UserPermissions
    // Add other non-sensitive fields from token if needed
}

// Use module augmentation to add 'user' to Express Request
declare module 'express-serve-static-core' {
    interface Request {
        user?: AuthenticatedUser; // Use updated AuthenticatedUser type
    }
}

export const protect = (req: Request, res: Response, next: NextFunction) => {
    let token;

    // Check for token in Authorization header (Bearer token)
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header (Bearer TOKEN_STRING)
            token = req.headers.authorization.split(' ')[1];

            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                console.error('JWT_SECRET is not defined!');
                return res.status(500).json({ message: 'Server configuration error' });
            }

            // Verify token and explicitly type the decoded payload
            const decoded = jwt.verify(token, jwtSecret) as AuthenticatedUser;

            // Basic validation of expected fields after decoding
            if (!decoded.id || !decoded.role || !decoded.permissions) {
                console.warn('Token verification failed: Missing essential fields in payload');
                return res.status(401).json({ message: 'Not authorized, token invalid' });
            }

            // Attach user payload to the request object
            req.user = {
                id: decoded.id,
                email: decoded.email,
                name: decoded.name,
                role: decoded.role,
                permissions: decoded.permissions
            };

            next(); // Token is valid, proceed
        } catch (error) {
            console.error('Token verification failed:', error);
            // Handle specific JWT errors like TokenExpiredError if needed
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        // No token found in the header
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Optional: Middleware to restrict access based on role
export const restrictTo = (...roles: Role[]) => { // Use locally defined Role
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'You do not have permission to perform this action based on your role' });
        }
        next();
    };
};

// Optional: Middleware to check specific permissions
export const checkPermission = (permissionCheck: (permissions: UserPermissions) => boolean) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !req.user.permissions || !permissionCheck(req.user.permissions)) {
            return res.status(403).json({ message: 'You do not have the required permission for this action' });
        }
        next();
    };
}; 