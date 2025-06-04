import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

type Role = 'developer' | 'admin' | 'employee';
interface UserPermissions { 
  [key: string]: unknown;
}

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: UserPermissions;
}

interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Xs5UYdjX3m6aSjb7Yj6l') as AuthenticatedUser;
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}; 