import express, { Router, Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { protect } from '../middleware/authMiddleware';
import { 
  getAllUsers, 
  createUser, 
  getUserById, 
  updateUserPermissions, 
  deleteUser, 
  createAdmin // Ensure this service function can accept logoUrl
} from '../services/userService';
import { UserPermissions } from '../@types'; // Assuming this type is correctly defined and used
import { multerMemoryStorage, uploadFileToS3 } from '../services/fileUploadService'; // Crucial import

const router: Router = express.Router();

// ADD JSON PARSER FOR THIS ROUTER
router.use(express.json());

// --- Zod Schemas --- 
// This schema is for the generic POST /api/users route, and remains unchanged.
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
    permissions: z.object({}).passthrough(), 
});

// --- Validation Middleware --- 
const validateRequest = (schema: z.ZodTypeAny) => 
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData; 
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
        return res.status(400).json({ message: 'Input validation failed', errors });
      } 
      console.error("Unexpected validation error:", error);
      res.status(500).json({ message: 'Internal validation error' });
    }
  };

// Apply protect middleware to all user routes
router.use(protect); // Ensures req.user is populated for subsequent routes

// GET /api/users - List users (filtered by role)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authorized' });
      const users = await getAllUsers(req.user);
      res.json(users);
    } catch (error) {
      next(error);
    }
});

// POST /api/users - Create a new user (generic, uses createUserSchema)
// This route remains unchanged and does not handle file uploads directly based on its current schema.
router.post('/', validateRequest(createUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    const validatedUserData = req.body; 
    const newUser = await createUser(validatedUserData, req.user);
    res.status(201).json(newUser);
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Permission denied') || error.message.includes('limit reached') || error.message.includes('Invalid assigned admin') || error.message.includes('Email already exists'))) {
      return res.status(error.message.includes('Email already exists') ? 409 : 403).json({ message: error.message });
    }
    next(error); 
  }
});

// GET /api/users/:id (Protected)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => { // protect already applied
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    
    const userId = req.params.id;
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

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
router.put('/:id/permissions', validateRequest(updateUserPermissionsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    const userIdToUpdate = req.params.id;
    const { permissions: validatedPermissions } = req.body; 
    
    const updatedUser = await updateUserPermissions(userIdToUpdate, validatedPermissions, req.user);
    res.json(updatedUser);
  } catch (error) {
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
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => { // protect already applied
  try {
    
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    const userIdToDelete = req.params.id;
    
    await deleteUser(userIdToDelete, req.user);
    res.status(204).send(); 
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Permission denied') || error.message.includes('Cannot delete yourself'))) {
      return res.status(403).json({ message: error.message });
    }
    next(error);
  }
});

// POST /api/users/admin - Create a new Admin user WITH optional logo upload
// This route is protected by the global `router.use(protect)`.
// Ensure that your `protect` middleware and subsequent logic correctly authorize admin creation.
router.post(
  '/admin',
  multerMemoryStorage.single('logoFile'), // Multer middleware for single file upload named 'logoFile'
  async (req: Request, res: Response, next: NextFunction) => { // Added next for error handling
    try {
      // Authorization check: Example - ensure only developers or authorized roles can create admins.
      // This depends on how `req.user` is populated by your `protect` middleware.
      
      if (!req.user || (req.user.role !== 'developer' /* && other conditions if any */)) {
      //   // If createAdmin service doesn't check permissions, it's crucial to check here.
      //   return res.status(403).json({ message: 'Permission denied to create admin users.' });
      }

      const { name, email, password, employeeCreationLimit } = req.body;
      let logoS3Url: string | undefined = undefined;

      // Check if a file was uploaded by Multer
      if (req.file) {
        console.log('Logo file received for admin creation:', req.file.originalname);
        try {
          // Upload the file to S3 and get its URL
          logoS3Url = await uploadFileToS3(req.file, 'logos/admins/'); // Path prefix in S3
        } catch (uploadError) {
          console.error('S3 Upload Error during admin creation:', uploadError);
          // Pass the upload error to the main error handler
          return next(new Error('Failed to upload logo to S3.')); 
        }
      } else {
        console.log('No logo file provided for admin creation.');
      }

      // Prepare data for the userService.createAdmin function
      const adminCreationPayload = {
        name,
        email,
        password,
        employeeCreationLimit: employeeCreationLimit ? parseInt(employeeCreationLimit, 10) : null,
        logoUrl: logoS3Url, // Pass the S3 URL (or undefined if no file)
      };
      
      // Call the service function from userService.ts
      const newAdmin = await createAdmin(adminCreationPayload);
      res.status(201).json(newAdmin);

    } catch (error) {
      // Log the original error for server-side debugging
      console.error('Error in POST /api/users/admin route:', error);

      // Handle specific known errors from the service or file handling
      if (error instanceof Error) {
        if (error.message.includes('User with this email already exists')) {
          return res.status(409).json({ message: error.message });
        }
        if (error.message.includes('Not an image')) { // From multer fileFilter in fileUploadService
          return res.status(400).json({ message: 'Invalid file type. Only images are allowed for logos.' });
        }
        if (error.message.includes('File too large')) { // From multer limits in fileUploadService
          return res.status(400).json({ message: 'Logo file is too large.' });
        }
        // If it's the S3 upload error we explicitly passed to next()
        if (error.message === 'Failed to upload logo to S3.') {
            return res.status(500).json({ message: error.message });
        }
      }
      // For other errors, pass to the global error handler
      next(error);
    }
  }
);

export default router;