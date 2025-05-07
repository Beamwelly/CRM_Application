import express, { Router, Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { protect } from '../middleware/authMiddleware';
import { getAllUsers, createUser, getUserById, updateUserPermissions, deleteUser, createAdmin } from '../services/userService';
import { UserPermissions } from '../@types';

const router: Router = express.Router();

// ADD JSON PARSER FOR THIS ROUTER
router.use(express.json());

// --- Zod Schemas --- 
const createUserSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  role: z.enum(['developer', 'admin', 'employee']),
  position: z.enum(['relationship_manager', 'operations_executive', 'accountant', 'senior_sales_manager', 'junior_sales_manager']).optional(),
  permissions: z.object({}).passthrough().optional(),
  createdByAdminId: z.string().uuid({ message: "Invalid Admin ID format." }).optional().nullable(),
});

const updateUserPermissionsSchema = z.object({
    permissions: z.object({}).passthrough(), // Require permissions object (refine later if needed)
});

// --- Validation Middleware --- 
const validateRequest = (schema: z.ZodTypeAny) => 
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validatedData = schema.parse(req.body);
      req.body = validatedData; // Replace body with validated data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors for client response
        const errors = error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
        return res.status(400).json({ message: 'Input validation failed', errors });
      } 
      // Handle unexpected errors
      console.error("Unexpected validation error:", error);
      res.status(500).json({ message: 'Internal validation error' });
    }
  };

// Apply protect middleware to all user routes
router.use(protect);

// GET /api/users - List users (filtered by role)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    // Service function needs to handle filtering based on req.user
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        const users = await getAllUsers(req.user);
        res.json(users);
    } catch (error) {
        next(error);
    }
});

// POST /api/users - Create a new user
router.post('/', validateRequest(createUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    // req.body now contains validated data from the middleware
    const validatedUserData = req.body; 

    // Service layer checks permissions (createAdmin/createEmployee) 
    // and handles role-specific logic (limits, createdByAdminId)
    const newUser = await createUser(validatedUserData, req.user);
    res.status(201).json(newUser);
  } catch (error) {
    // Handle specific service errors
    if (error instanceof Error && (error.message.startsWith('Permission denied') || error.message.includes('limit reached') || error.message.includes('Invalid assigned admin') || error.message.includes('Email already exists'))) {
      return res.status(error.message.includes('Email already exists') ? 409 : 403).json({ message: error.message });
    }
    next(error); // Forward other errors to global handler
  }
});

// GET /api/users/:id (Protected)
// Fetches a single user by ID
router.get('/:id', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    
    const userId = req.params.id;
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Scope check - can requestor view this user?
    let canView = false;
    const viewScope = req.user.permissions?.viewUsers || 'none';
    if (req.user.role === 'developer' || viewScope === 'all') {
        canView = true;
    } else if (req.user.role === 'admin' && viewScope === 'subordinates') {
        if (user.id === req.user.id || user.createdByAdminId === req.user.id) {
            canView = true;
        }
    } else if (viewScope === 'none' && user.id === req.user.id) {
        canView = true;
    }

    if (!canView) {
        return res.status(403).json({ message: 'Permission denied: Cannot view this user.' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id/permissions (Protected)
// Updates a user's permissions
router.put('/:id/permissions', validateRequest(updateUserPermissionsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    const userIdToUpdate = req.params.id;
    // Use validated permissions from req.body
    const { permissions: validatedPermissions } = req.body; 

    // Service layer handles permission checks (editUserPermissions, scope)
    const updatedUser = await updateUserPermissions(userIdToUpdate, validatedPermissions, req.user);
    res.json(updatedUser);
  } catch (error) {
    // Handle specific errors like permission denied or not found
    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return res.status(403).json({ message: error.message });
    }
    if (error instanceof Error && error.message.includes('User not found')) {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
});

// DELETE /api/users/:id (Protected)
// Deletes a user
router.delete('/:id', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    const userIdToDelete = req.params.id;

    // Service handles permission checks (deleteUser, scope, self-delete)
    await deleteUser(userIdToDelete, req.user);
    res.status(204).send(); // No content on successful deletion

  } catch (error) {
    // Handle specific service errors
    if (error instanceof Error && (error.message.startsWith('Permission denied') || error.message.includes('Cannot delete yourself'))) {
      return res.status(403).json({ message: error.message });
    }
    next(error);
  }
});

router.post('/admin', async (req, res) => {
  try {
    const { name, email, password, employeeCreationLimit } = req.body;
    const admin = await createAdmin({ name, email, password, employeeCreationLimit });
    res.json(admin);
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

export default router; 