import { query, QueryParamValue } from '../db';
import bcrypt from 'bcryptjs'; // Import bcrypt
// import userRoutes from './routes/userRoutes'; 
// We need to define or import the User type here for the backend
// For now, using a basic definition. Consider sharing types later.

// Define types locally (or import from shared types)
type Role = 'developer' | 'admin' | 'employee';
interface UserPermissions { 
  [key: string]: unknown; // Basic structure, align with shared types if possible
}

interface User {
  id: string; 
  name: string;
  email: string;
  role: Role; // Updated Role
  passwordHash?: string;
  createdAt: Date;
  // RBAC fields
  permissions: UserPermissions;
  createdByAdminId?: string | null;
  employeeCreationLimit?: number | null;
  // Optional old field (might be deprecated by permissions)
  serviceTypeAccess?: string[];
  logoUrl?: string;
}

// User type for creation - requires password, omits generated fields
type CreateUserData = Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string };

// User making the request
interface AuthUserInfo {
  id: string;
  role: Role;
  permissions: UserPermissions; 
  // Add employeeCreationLimit if needed for checks within service
  employeeCreationLimit?: number | null;
}

// Fetch all users along with their service type access (excluding password hash)
export const getAllUsers = async (requestor: AuthUserInfo): Promise<Omit<User, 'passwordHash'>[]> => {
  let sqlQuery = `
    SELECT 
      id, name, email, role, permissions, 
      created_by_admin_id as "createdByAdminId", 
      employee_creation_limit as "employeeCreationLimit", 
      created_at as "createdAt", 
      logo_url as "logoUrl", 
      created_by as "createdBy"
    FROM users
  `;
  const params: QueryParamValue[] = [];
  let paramIndex = 1;

  // Ensure requestor has proper permissions
  if (!requestor || !requestor.id || !requestor.role) {
    console.error('Invalid requestor:', requestor);
    throw new Error('Invalid user session');
  }

  console.log('Getting users for requestor:', {
    id: requestor.id,
    role: requestor.role,
    permissions: requestor.permissions
  });

  if (requestor.role === 'developer') {
    // Developer sees everyone - No WHERE clause needed
  } else if (requestor.role === 'admin') {
    // Admin should see themselves and their employees
    sqlQuery += ` WHERE (
      id = $${paramIndex} OR 
      created_by_admin_id = $${paramIndex} OR 
      created_by = $${paramIndex}
    )`;
    params.push(requestor.id);
    paramIndex++;
  } else {
    // Other roles only see themselves
    sqlQuery += ` WHERE id = $${paramIndex}`;
    params.push(requestor.id);
    paramIndex++;
  }
  
  sqlQuery += ' ORDER BY name ASC';

  try {
    console.log('Executing query:', {
      sqlQuery,
      params,
      requestorId: requestor.id,
      requestorRole: requestor.role
    });
    
    const result = await query(sqlQuery, params);
    
    console.log('Query result:', {
      rowCount: result.rows.length,
      rows: result.rows.map(r => ({
        id: r.id,
        name: r.name,
        role: r.role,
        createdByAdminId: r.createdByAdminId,
        createdBy: r.createdBy
      }))
    });
    
    // Parse permissions if they're stored as JSON strings
    const users = result.rows.map(user => ({
      ...user,
      permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions,
      logoUrl: user.logoUrl || null
    }));
    
    return users as Omit<User, 'passwordHash'>[];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
};

// Fetch a single user by email, including password hash AND RBAC fields
export const getUserByEmailWithPassword = async (email: string): Promise<User | null> => {
  try {
    const result = await query(`
      SELECT 
        id, name, email, role, password_hash as "passwordHash", created_at as "createdAt",
        permissions, created_by_admin_id as "createdByAdminId", employee_creation_limit as "employeeCreationLimit"
      FROM users
      WHERE email = $1
    `, [email]);

    if (result.rows.length === 0) {
      return null; // User not found
    }

    const user = result.rows[0];

    // Permissions might be stored as JSON string; parse if necessary
    let parsedPermissions: UserPermissions = {};
    if (user.permissions) {
      try {
        // Assuming permissions are stored as a JSON string in the DB (like JSONB)
        parsedPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
      } catch (parseError) {
        console.error(`Error parsing permissions JSON for user ${user.id}:`, parseError);
        // Handle error: return default permissions or re-throw
        parsedPermissions = {}; // Default to empty on parse error
      }
    }

    // Deprecated? Fetch service type access (keep if still used alongside permissions)
    const accessResult = await query(`
      SELECT service_type FROM user_service_access
      WHERE user_id = $1
    `, [user.id]);
    const serviceTypeAccess = accessResult.rows.map(row => row.service_type);

    return {
      ...user,
      permissions: parsedPermissions, // Assign potentially parsed permissions
      serviceTypeAccess: serviceTypeAccess // Include service access if still needed
    } as User;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw new Error('Failed to fetch user by email');
  }
};

/**
 * Fetches a single user by ID, excluding password hash.
 * Includes RBAC fields and parses permissions.
 */
export const getUserById = async (userId: string): Promise<Omit<User, 'passwordHash'> | null> => {
  try {
    // Fetch user data including permissions and RBAC fields
    const result = await query(`
      SELECT 
        id, name, email, role, permissions, 
        created_by_admin_id as "createdByAdminId", 
        employee_creation_limit as "employeeCreationLimit", 
        created_at as "createdAt",
        logo_url as "logoUrl"
      FROM users
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return null; // User not found
    }

    const user = result.rows[0];

    // Parse permissions if they're stored as JSON strings
    const parsedPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;

    return {
      ...user,
      permissions: parsedPermissions,
      logoUrl: user.logoUrl || null // Ensure logoUrl is always included, defaulting to null if not present
    } as Omit<User, 'passwordHash'>;

  } catch (error) {
    console.error(`Error fetching user by ID ${userId}:`, error);
    throw new Error('Failed to fetch user by ID');
  }
};

/**
 * Counts the number of employees created by a specific admin.
 */
export const countEmployeesCreatedByAdmin = async (adminId: string): Promise<number> => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM users WHERE created_by_admin_id = $1',
      [adminId]
    );
    return parseInt(result.rows[0]?.count || '0', 10);
  } catch (error) {
    console.error(`Error counting employees for admin ${adminId}:`, error);
    throw new Error('Failed to count employees for admin.');
  }
};

// --- Default Permission Constants (Local definitions for backend) ---
// These should mirror the definitions in src/types/index.ts
const DEFAULT_DEVELOPER_PERMISSIONS: Required<UserPermissions> = {
  viewLeads: 'all', createLeads: true, editLeads: 'all', deleteLeads: 'all', assignLeads: true,
  viewCustomers: 'all', createCustomers: true, editCustomers: 'all', deleteCustomers: 'all', assignCustomers: true, manageRenewals: true,
  viewCommunications: 'all', addCommunications: true, playRecordings: true, downloadRecordings: true,
  viewUsers: 'all', createAdmin: true, createEmployee: true, editUserPermissions: true, deleteUser: true,
};

const DEFAULT_ADMIN_PERMISSIONS: Required<UserPermissions> = {
  viewLeads: 'created', createLeads: true, editLeads: 'created', deleteLeads: 'created', assignLeads: true, 
  viewCustomers: 'subordinates', createCustomers: true, editCustomers: 'created', deleteCustomers: 'created', manageRenewals: true,
  viewCommunications: 'created', addCommunications: true, playRecordings: true, downloadRecordings: true,
  viewUsers: 'subordinates', createAdmin: false, createEmployee: true, editUserPermissions: true, deleteUser: true, 
};

const DEFAULT_EMPLOYEE_PERMISSIONS: UserPermissions = {
  viewLeads: 'assigned', createLeads: true, editLeads: 'assigned', deleteLeads: 'none', assignLeads: false,
  viewCustomers: 'assigned', createCustomers: true, editCustomers: 'assigned', deleteCustomers: 'none', manageRenewals: false,
  viewCommunications: 'assignedContacts', addCommunications: true, playRecordings: true, downloadRecordings: false,
  viewUsers: 'none', createAdmin: false, createEmployee: false, editUserPermissions: false, deleteUser: false,
};
// --- End Default Permission Constants ---

/**
 * Creates a new user (Admin or Employee).
 * Handles permissions, limits, and password hashing.
 */
export const createUser = async (userData: CreateUserData, creator: AuthUserInfo): Promise<Omit<User, 'passwordHash'>> => {
  const { name, email, password, role, permissions, createdByAdminId, employeeCreationLimit } = userData;

  // 1. Permission Check
  if (role === 'admin' && !creator.permissions?.createAdmin) {
    throw new Error('Permission denied: Cannot create admin users.');
  }
  if (role === 'employee' && !creator.permissions?.createEmployee) {
     throw new Error('Permission denied: Cannot create employee users.');
  }

  // 2. Admin-specific logic
  let finalCreatedByAdminId = createdByAdminId; 
  if (role === 'employee') {
    if (creator.role === 'admin') {
      // Check creation limit for admin creating employee
      const adminData = await getUserById(creator.id); // Fetch admin data to get the limit
      if (!adminData) throw new Error('Creating admin user not found.'); // Check if admin exists
      
      // Now safe to access adminData properties
      // Explicit check to satisfy linter, even if logically redundant after above check
      if (adminData && adminData.employeeCreationLimit !== null) { 
          const currentEmployeeCount = await countEmployeesCreatedByAdmin(creator.id);
          // Use optional chaining here for extra safety, although adminData should exist
          if (currentEmployeeCount >= (adminData?.employeeCreationLimit ?? Infinity)) { 
              throw new Error(`Employee creation limit (${adminData.employeeCreationLimit}) reached for this admin.`);
          }
      }
      finalCreatedByAdminId = creator.id; // Assign employee to the creating admin
    } else if (creator.role === 'developer') {
        if (!createdByAdminId) {
            // Developer creating employee without assigning an admin is allowed, set to null.
            console.warn('Developer created employee without assigning to an admin.');
            finalCreatedByAdminId = null;
        } else {
            // Validate that the provided createdByAdminId exists and is an Admin
            const assignedAdmin = await getUserById(createdByAdminId);
            if (!assignedAdmin || assignedAdmin.role !== 'admin') {
                throw new Error(`Invalid assigned admin ID: ${createdByAdminId}. User not found or is not an admin.`);
            }
            finalCreatedByAdminId = createdByAdminId; // Use the ID provided by the developer
        }
    }
  }

  // 3. Hash Password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // 4. Determine Permissions
  // Use provided permissions or set defaults based on role
  const finalPermissions = permissions || 
    (role === 'admin' ? DEFAULT_ADMIN_PERMISSIONS : 
     role === 'employee' ? DEFAULT_EMPLOYEE_PERMISSIONS : {}); // Default to empty if role is unexpected

  // Ensure developer retains full permissions if creating self (edge case, unlikely)
  if (role === 'developer') {
      Object.assign(finalPermissions, DEFAULT_DEVELOPER_PERMISSIONS);
  }

  // 5. Set Admin Limit (Only applicable when creating an Admin by a Developer)
  const finalEmployeeCreationLimit = (role === 'admin' && creator.role === 'developer') ? employeeCreationLimit : null;

  // 6. Database Insert
  const sqlQuery = `
    INSERT INTO users (name, email, password_hash, role, permissions, created_by_admin_id, employee_creation_limit)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, name, email, role, permissions, created_by_admin_id as "createdByAdminId", employee_creation_limit as "employeeCreationLimit", created_at as "createdAt"
  `;
  const params = [
    name, email, passwordHash, role, JSON.stringify(finalPermissions), // Store permissions as JSON string
    finalCreatedByAdminId, finalEmployeeCreationLimit
  ];

  try {
    const result = await query(sqlQuery, params);
    if (result.rows.length === 0) {
      throw new Error('User creation failed.');
    }
    // Parse permissions back if needed, or assume client handles JSON string
    const newUser = result.rows[0];
    // Assuming permissions are automatically parsed if JSONB
    // if (typeof newUser.permissions === 'string') {
    //    try { newUser.permissions = JSON.parse(newUser.permissions); } catch (e) { console.error('Failed to parse new user permissions'); newUser.permissions = {}; }
    // }
    return newUser as Omit<User, 'passwordHash'>;
  } catch (error) {
    console.error('Error creating user:', error);
    // Handle specific DB errors like unique email constraint
    if (error instanceof Error && error.message.includes('users_email_key')) {
      throw new Error('Email already exists.');
    }
    throw new Error('Failed to create user in database.');
  }
};

/**
 * Updates the permissions for a specific user.
 */
export const updateUserPermissions = async (
  userIdToUpdate: string, 
  newPermissions: UserPermissions, 
  requestor: AuthUserInfo
): Promise<Omit<User, 'passwordHash'>> => {
  
  // Permission Check: Can requestor update permissions?
  if (!requestor.permissions?.editUserPermissions) {
    throw new Error('Permission denied: Cannot edit user permissions.');
  }
  
  // Additional Check: Admins might only be allowed to edit their own employees
  let userToUpdate: Omit<User, 'passwordHash'> | null = null;
  if (requestor.role === 'admin') {
    userToUpdate = await getUserById(userIdToUpdate);
    if (!userToUpdate || userToUpdate.createdByAdminId !== requestor.id) {
      throw new Error('Permission denied: Admins can only edit permissions for employees they created.');
    }
  }

  // Ensure allowedServiceTypes is properly set
  if (!newPermissions.allowedServiceTypes) {
    newPermissions.allowedServiceTypes = [];
  }

  const sqlQuery = `
    UPDATE users 
    SET 
      permissions = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING 
      id, 
      name, 
      email, 
      role, 
      permissions,
      created_by_admin_id as "createdByAdminId", 
      employee_creation_limit as "employeeCreationLimit", 
      created_at as "createdAt"
  `;
  
  const params = [
    JSON.stringify(newPermissions),
    userIdToUpdate
  ];

  try {
    const result = await query(sqlQuery, params);
    if (result.rows.length === 0) {
      throw new Error('User not found or update failed.');
    }
    
    const updatedUser = result.rows[0];
    return updatedUser as Omit<User, 'passwordHash'>;
  } catch (error) {
    console.error(`Error updating permissions for user ${userIdToUpdate}:`, error);
    throw new Error('Failed to update user permissions.');
  }
};

/**
 * Deletes a user.
 */
export const deleteUser = async (userIdToDelete: string, requestor: AuthUserInfo): Promise<void> => {
  // Permission Check: Can requestor delete users?
  if (!requestor.permissions?.deleteUser) {
    throw new Error('Permission denied: Cannot delete users.');
  }

  // Additional Check: Prevent self-deletion? Admins only delete own employees?
  if (userIdToDelete === requestor.id) {
    throw new Error('Cannot delete yourself.');
  }

  // Scope check: Fetch user to ensure Admin only deletes their own employees
  if (requestor.role === 'admin') {
    const userToDelete = await getUserById(userIdToDelete); 
    if (!userToDelete || userToDelete.createdByAdminId !== requestor.id) {
      throw new Error('Permission denied: Admins can only delete employees they created.');
    }
  }
  // Developers can delete anyone (except maybe themselves, handled above)

  const sqlQuery = 'DELETE FROM users WHERE id = $1';
  const params = [userIdToDelete];

  try {
    const result = await query(sqlQuery, params);
    if (result.rowCount === 0) {
      // Consider if throwing an error is desired if user not found
      console.warn(`Attempted to delete non-existent user: ${userIdToDelete}`);
      // throw new Error('User not found.'); 
    }
    // Deletion successful, return void
  } catch (dbError) { // Renamed error to dbError for clarity
    console.error(`Database error while deleting user ${userIdToDelete}:`, dbError); // Log the detailed error
    // Handle potential foreign key constraint errors if user deletion isn't cascaded properly
    // Check for common foreign key violation error codes/messages if possible
    if (dbError instanceof Error && dbError.message.includes('foreign key constraint')) { // Example check
        throw new Error('Failed to delete user: This user is referenced by other records in the system (e.g., leads, customers, or other users they created). Please reassign or remove these references before deleting.');
    }
    throw new Error('Failed to delete user due to a database issue.'); // More specific generic error
  }
};

/**
 * Creates a new Admin user.
 * This is a specific function likely called by a developer.
 */
export const createAdmin = async (
  adminData: { 
    name: string; 
    email: string; 
    password: string; 
    employeeCreationLimit?: number | null; // Make limit explicitly nullable
    logoUrl?: string; // Add optional logoUrl
  }
  // We might need creator info here eventually for permissions
) => {
  const { name, email, password, employeeCreationLimit, logoUrl } = adminData;
  const role = 'admin'; // Explicitly set role

  // Check if user already exists
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    throw new Error('User with this email already exists');
  }

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Assign default admin permissions (should be Required<UserPermissions>)
  const permissions = DEFAULT_ADMIN_PERMISSIONS;

  // Insert the new admin user
  const sqlQuery = `
    INSERT INTO users (name, email, password_hash, role, permissions, employee_creation_limit, logo_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, name, email, role, permissions, employee_creation_limit as "employeeCreationLimit", logo_url as "logoUrl"
  `;
  const params = [
    name,
    email,
    passwordHash,
    role,
    JSON.stringify(permissions), // Store permissions as JSON
    employeeCreationLimit, // Can be null or number
    logoUrl // Add logoUrl to params
  ];

  try {
    const result = await query(sqlQuery, params);
    return result.rows[0] as Omit<User, 'passwordHash'>; // Return the created admin user data
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw new Error('Failed to create admin user in database');
  }
};

export const storeGoogleTokens = async (
  userId: string,
  accessToken: string,
  refreshToken: string
) => {
  try {
    // First, store the tokens
    await query(
      'INSERT INTO google_tokens (user_id, access_token, refresh_token) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET access_token = $2, refresh_token = $3',
      [userId, accessToken, refreshToken]
    );

    // Then update the user's gmail_connected status
    await query(
      'UPDATE users SET gmail_connected = true WHERE id = $1',
      [userId]
    );

    return true;
  } catch (error) {
    console.error('Error storing Google tokens:', error);
    throw error;
  }
};

export const getGoogleTokens = async (userId: string) => {
  try {
    const result = await query(
      'SELECT access_token, refresh_token FROM google_tokens WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error getting Google tokens:', error);
    throw error;
  }
};

export const disconnectGmail = async (userId: string) => {
  try {
    // Remove tokens
    await query(
      'DELETE FROM google_tokens WHERE user_id = $1',
      [userId]
    );

    // Update user status
    await query(
      'UPDATE users SET gmail_connected = false WHERE id = $1',
      [userId]
    );

    return true;
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    throw error;
  }
};

export const createEmployee = async (
  employeeData: Omit<User, 'id' | 'createdAt' | 'createdBy' | 'createdByAdminId' | 'permissions' | 'logoUrl'>,
  creator: AuthUserInfo
): Promise<Omit<User, 'passwordHash'>> => {
  // Permission check
  if (!creator.permissions?.createEmployee) {
    throw new Error('Permission denied: Cannot create employees.');
  }

  // Role check - only admins can create employees
  if (creator.role !== 'admin') {
    throw new Error('Permission denied: Only admins can create employees.');
  }

  // Get the admin's logo URL and permissions
  const adminResult = await query(
    'SELECT logo_url, permissions FROM users WHERE id = $1',
    [creator.id]
  );
  
  if (adminResult.rows.length === 0) {
    throw new Error('Admin not found');
  }

  const adminLogoUrl = adminResult.rows[0].logo_url;
  const adminPermissions = adminResult.rows[0].permissions;

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(employeeData.passwordHash, salt);

  // Create the employee with the admin's logo and default employee permissions
  const sqlQuery = `
    INSERT INTO users (
      name, email, password_hash, role, position, 
      service_type_access, created_by_admin_id, logo_url,
      permissions, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING 
      id, name, email, role, position, 
      service_type_access as "serviceTypeAccess",
      created_by_admin_id as "createdByAdminId",
      created_at as "createdAt",
      logo_url as "logoUrl",
      permissions,
      created_by as "createdBy"
  `;

  const params = [
    employeeData.name,
    employeeData.email,
    passwordHash,
    'employee',
    employeeData.position,
    JSON.stringify(employeeData.serviceTypeAccess || ['training']),
    creator.id, // Set created_by_admin_id to the creator's ID
    adminLogoUrl || null,
    JSON.stringify(DEFAULT_EMPLOYEE_PERMISSIONS),
    creator.id // Set created_by to the creator's ID
  ];

  try {
    console.log('Creating employee with params:', {
      name: employeeData.name,
      email: employeeData.email,
      creatorId: creator.id,
      adminLogoUrl
    });
    
    const result = await query(sqlQuery, params);
    const newEmployee = result.rows[0];
    
    console.log('Created employee:', newEmployee);
    
    return {
      ...newEmployee,
      logoUrl: newEmployee.logoUrl || adminLogoUrl || null
    } as Omit<User, 'passwordHash'>;
  } catch (error) {
    console.error('Error creating employee:', error);
    throw new Error('Failed to create employee in database');
  }
};

// Add other user service functions (getAllUsers, etc.) as needed later 