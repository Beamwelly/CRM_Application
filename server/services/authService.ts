import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, getPool } from '../db'; 
import { OAuth2Client } from 'google-auth-library'; // Import Google library
import { User, Role, LoginCredentials, AuthResponse, UserPermissions } from '../@types'; // Use relative path for types

// Ensure JWT_SECRET is loaded (typically via dotenv in server.ts)
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set.");
}
const JWT_SECRET = process.env.JWT_SECRET;

// --- Google Client ID --- 
// IMPORTANT: Replace with your actual Google Client ID
const GOOGLE_CLIENT_ID = "823042096678-6lggef057ploajcoll5c9k6gnknmali5.apps.googleusercontent.com"; 
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- Existing comparePassword --- 
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    // ... keep existing comparePassword logic ... 
    if (!password || !hash) return false;
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('Error comparing password:', error);
        return false;
    }
};

// Helper to generate JWT
const generateToken = (user: User): string => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
    logoUrl: user.logoUrl // Include logoUrl in the token payload
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' }); // Or your preferred expiry
};

// --- Default Permissions for New Google Users ---
const defaultEmployeePermissions: UserPermissions = {
    viewLeads: 'none',       
    editLeads: 'none',
    deleteLeads: 'none',
    assignLeads: false,
    createLeads: false,

    viewCustomers: 'none',
    editCustomers: 'none',
    deleteCustomers: 'none',
    createCustomers: false,
    manageRenewals: false,
    
    viewUsers: 'none',       
    editUserPermissions: false,
    deleteUser: false,
    createEmployee: false,
    createAdmin: false,

    addCommunications: false,
    viewCommunications: 'none',
    playRecordings: false,
    downloadRecordings: false,
    clearSystemData: false,
};

// --- Existing Login Service --- 
export const login = async (credentials: Omit<LoginCredentials, 'role'>): Promise<AuthResponse> => {
    // Fetch the existing password_hash and logo_url
    const userResult = await query('SELECT *, password_hash, logo_url FROM users WHERE email = $1', [credentials.email]);
    if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
    }
    const userData = userResult.rows[0];
    
    const isMatch = await comparePassword(credentials.password ?? '', userData.password_hash || '');
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    const user: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        position: userData.position,
        serviceTypeAccess: userData.serviceTypeAccess, 
        permissions: userData.permissions || {},
        createdAt: userData.created_at,
        createdBy: userData.created_by,
        employeeCreationLimit: userData.employee_creation_limit,
        createdByAdminId: userData.created_by_admin_id,
        google_id: userData.google_id,
        logoUrl: userData.logo_url // Add logoUrl
    };
    
    // Add specific logging here too
    console.log(`[AuthService - login] DB userData.logo_url for user ${user.id}:`, userData.logo_url);
    console.log("[AuthService - login] Final user object being returned:", user);

    const token = generateToken(user);
    return { user, token };
};

// --- New Google Login Service ---
export const verifyGoogleTokenAndLogin = async (idToken: string): Promise<AuthResponse> => {
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: idToken,
            audience: GOOGLE_CLIENT_ID, 
        });
        const payload = ticket.getPayload();

        if (!payload) {
            throw new Error('Invalid Google token payload.');
        }

        const { email, name, sub: googleId } = payload;

        if (!email) {
            throw new Error('Email not found in Google token payload.');
        }

        // Check if user exists by email
        const userResult = await query('SELECT *, logo_url FROM users WHERE email = $1', [email]);
        const userRecord = userResult.rows.length > 0 ? userResult.rows[0] : null;
        let user: User | null = null;

        if (userRecord) {
            console.log(`[AuthService] Google Sign-In: User found with email ${email}`);
             // Construct user object from record
             user = {
                 id: userRecord.id,
                 name: userRecord.name,
                 email: userRecord.email,
                 role: userRecord.role,
                 position: userRecord.position,
                 serviceTypeAccess: userRecord.serviceTypeAccess,
                 permissions: userRecord.permissions || defaultEmployeePermissions, // Ensure permissions exist
                 createdAt: userRecord.created_at,
                 createdBy: userRecord.created_by,
                 employeeCreationLimit: userRecord.employee_creation_limit,
                 createdByAdminId: userRecord.created_by_admin_id,
                 google_id: userRecord.google_id,
                 logoUrl: userRecord.logo_url // Add logoUrl
             };
        } else {
            // User does not exist - Create new employee user
            console.log(`[AuthService] Google Sign-In: Creating new user for email ${email}`);
            const newUserQuery = `
                INSERT INTO users (name, email, role, permissions, google_id, logo_url)
                VALUES ($1, $2, $3, $4, $5, null) -- logoUrl is null initially
                RETURNING *, logo_url
            `;
            const newUserParams = [
                name || 'Google User', // Use Google name or a default
                email,
                'employee' as Role, // Default role
                JSON.stringify(defaultEmployeePermissions), // Default minimal permissions
                googleId
            ];
            const newUserResult = await query(newUserQuery, newUserParams);
            const newUserRecord = newUserResult.rows[0];

            // --- Add null check for newUserRecord ---
            if (!newUserRecord) {
                throw new Error('Failed to create new user record in database.');
            }
            // --- End null check ---

            // Construct user object from the new record
            user = {
                id: newUserRecord.id,
                name: newUserRecord.name,
                email: newUserRecord.email,
                role: newUserRecord.role,
                permissions: defaultEmployeePermissions, // Use default permissions object
                createdAt: newUserRecord.created_at,
                google_id: newUserRecord.google_id,
                logoUrl: newUserRecord.logo_url // Will be null
            };
            console.log("[AuthService] New user created:", user);
        }

        if (!user) {
             throw new Error('Failed to find or create user after Google Sign-In.');
        }

        // Generate app token for the found/created user
        const token = generateToken(user);
        return { user, token };

    } catch (error) {
        console.error('Error verifying Google token or logging in user:', error);
        // Don't expose detailed error messages potentially
        throw new Error('Google Sign-In failed.'); 
    }
};

// --- Existing Verify Token Service --- 
export const verifyToken = async (token: string): Promise<User> => {
   try {
       const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
       // Fetch logo_url
       const userResult = await query('SELECT *, logo_url FROM users WHERE id = $1', [decoded.id]);
       if (userResult.rows.length === 0) throw new Error('User not found for token');
       
       const userData = userResult.rows[0];
       const user: User = {
           id: userData.id,
           name: userData.name,
           email: userData.email,
           role: userData.role,
           position: userData.position,
           serviceTypeAccess: userData.serviceTypeAccess, 
           permissions: userData.permissions || decoded.permissions || {}, // Ensure permissions are loaded
           createdAt: userData.created_at, 
           createdBy: userData.created_by,
           employeeCreationLimit: userData.employee_creation_limit,
           createdByAdminId: userData.created_by_admin_id,
           google_id: userData.google_id,
           logoUrl: userData.logo_url // Add logoUrl
       };
       // Add specific logging here
       console.log(`[AuthService - verifyToken] DB userData.logo_url for user ${user.id}:`, userData.logo_url);
       console.log("[AuthService - verifyToken] Final user object being returned:", user);
       return user;
   } catch (error) {
        console.error('Token verification error:', error);
        throw new Error('Invalid or expired token');
   }
};

// Add hashPassword function if you implement user registration later
/*
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
};
*/ 