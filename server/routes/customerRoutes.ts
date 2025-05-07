import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod'; // Import Zod
import { getAllCustomers, createCustomer, updateCustomer, deleteCustomer, addRenewalHistoryEntry } from '../services/customerService'; // Import customer service, createCustomer, and updateCustomer
import { protect } from '../middleware/authMiddleware'; // Import protect middleware
import { ServiceTypeSchema, CustomerStatusSchema, PaymentTypeSchema } from './validationSchemas'; // Assume shared schemas exist
import { User } from '../@types';

// Define types directly in the routes file
type Role = 'developer' | 'admin' | 'employee';

interface UserPermissions {
  [key: string]: unknown;
  viewCustomers?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  createCustomers?: boolean;
  editCustomers?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  deleteCustomers?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
}

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: UserPermissions;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// --- Zod Schema Definitions - Reverted State ---
const baseCustomerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    mobile: z.string().min(10, 'Mobile number must be at least 10 digits'),
    city: z.string().min(1, 'City is required'),
    serviceTypes: z.array(ServiceTypeSchema).min(1, 'At least one service type is required'),
    status: CustomerStatusSchema.optional(),
    assignedTo: z.string().uuid('Invalid assignee UUID'),
    startDate: z.coerce.date(),
    leadId: z.string().uuid().optional(),
    dob: z.coerce.date().optional(),
    address: z.string().optional(),
    paymentType: PaymentTypeSchema.optional(),
    paymentStatus: z.enum(['completed', 'not_completed']).optional(),
    aum: z.number().positive('AUM must be positive').nullable().optional(),
    nextRenewal: z.coerce.date().optional(),
    nextReview: z.coerce.date().optional(),
    reviewRemarks: z.string().optional(),
    batchNo: z.string().optional(),
    company: z.string().optional(),
    engagementFlags: z.object({
        welcomeEmail: z.boolean().optional(),
        community: z.boolean().optional(),
        calls: z.boolean().optional(),
    }).optional(),
});

// Add validation for service types based on business rules
const createCustomerSchema = baseCustomerSchema.superRefine((data, ctx) => {
    if (data.serviceTypes.includes('training')) {
        if (!data.company || data.company.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Company is required for Training',
                path: ['company'],
            });
        }
        if (!data.aum) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'AUM is required for Training',
                path: ['aum'],
            });
        }
    }
});

const updateCustomerSchema = baseCustomerSchema.partial().superRefine((data, ctx) => {
    if (data.serviceTypes?.includes('training')) {
        if (data.company !== undefined && (!data.company || data.company.trim() === '')) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Company is required for Training',
                path: ['company'],
            });
        }
        if (data.aum !== undefined && !data.aum) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'AUM is required for Training',
                path: ['aum'],
            });
        }
    }
});

// --- Zod Schema for Renewal History Entry ---
// Define status enum matching backend type
const RenewalStatusSchema = z.enum(["pending", "renewed", "cancelled", "expired"]);

const renewalHistorySchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  status: RenewalStatusSchema,
  notes: z.string().optional(),
  nextRenewalDate: z.coerce.date({ required_error: "Next Renewal Date is required" })
});
// --- End Renewal History Schema ---

// Validation Middleware
const validateRequest = (schema: z.ZodSchema<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation Errors:", error.errors);
        return res.status(400).json({ message: 'Input validation failed', errors: error.errors });
      }
      next(error);
    }
  };

const router: Router = express.Router();

// ADD JSON PARSER FOR THIS ROUTER
router.use(express.json());

// GET /api/customers (Protected Route)
// Fetches customers based on the logged-in user's role and service access
router.get('/', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const adminId = req.query.adminId as string | undefined;
    console.log(`[server/routes/customerRoutes] GET /customers. User: ${req.user.id} (Role: ${req.user.role}), Target Admin ID: ${adminId}`);
    
    const customers = await getAllCustomers(req.user, adminId);
    res.json(customers);
  } catch (error) {
    next(error); 
  }
});

// POST /api/customers (Protected Route)
// Creates a new customer
router.post('/', protect, validateRequest(createCustomerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      console.error('No authenticated user found in request');
      return res.status(401).json({ message: 'Not authorized' });
    }

    console.log('Creating customer with data:', JSON.stringify(req.body, null, 2));
    console.log('Authenticated user:', JSON.stringify(req.user, null, 2));

    // Validate required fields
    if (!req.body.name || !req.body.email || !req.body.mobile || !req.body.city || !req.body.serviceTypes) {
      console.error('Missing required fields:', req.body);
      return res.status(400).json({ 
        message: 'Missing required fields',
        missing: {
          name: !req.body.name,
          email: !req.body.email,
          mobile: !req.body.mobile,
          city: !req.body.city,
          serviceTypes: !req.body.serviceTypes
        }
      });
    }

    const newCustomer = await createCustomer(req.body, req.user.id);
    console.log('Customer created successfully:', JSON.stringify(newCustomer, null, 2));
    
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error('Error creating customer:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Failed to create customer',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      res.status(500).json({ message: 'Failed to create customer' });
    }
  }
});

// PUT /api/customers/:id (Protected Route)
// Updates an existing customer
router.put('/:id', protect, validateRequest(updateCustomerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    const customerId = req.params.id;
    // TODO: Add input validation for req.body
    const updateData = req.body; 

    // Optional: Add authorization checks here

    const updatedCustomer = await updateCustomer(customerId, updateData, req.user);
    
    res.json(updatedCustomer); // Respond with the updated customer object
  } catch (error) {
    // Handle service-level errors (like permission denied, required AUM)
    if (error instanceof Error) {
       console.error(`[PUT /customers/:id] Service Error: ${error.message}`);
        if (error.message.includes('Permission denied') || error.message.includes('required for') || error.message.includes('Customer not found')) {
            const statusCode = error.message.includes('not found') ? 404 : 403;
            return res.status(statusCode).json({ message: error.message });
       }
    }
    next(error); // Pass other errors to the global handler
  }
});

// DELETE /api/customers/:id (Protected)
// Deletes a customer
router.delete('/:id', protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const customerId = req.params.id;

        // Optional: Add authorization check here (e.g., managers or assigned executive)

        const deletedCount = await deleteCustomer(customerId, req.user);

        if (deletedCount > 0) {
            res.status(204).send(); // Success, no content
        } else {
            res.status(404).json({ message: 'Customer not found or user not authorized to delete' });
        }
    } catch (error) {
        next(error); // Pass errors to global handler
    }
});

// POST /api/customers/:customerId/renewal-history (Protected Route)
router.post('/:customerId/renewal-history', 
  protect, 
  validateRequest(renewalHistorySchema), 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
      }
      
      const { customerId } = req.params;
      const renewalData = req.body; // Already validated

      // TODO: Add authorization check - does user have permission to add renewal for this customer?

      const newRenewalEntry = await addRenewalHistoryEntry(customerId, renewalData, req.user);
      
      res.status(201).json(newRenewalEntry);
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific errors from the service if needed
        if (error.message.includes('required fields')) {
          return res.status(400).json({ message: error.message });
        }
        console.error('[POST /renewal-history] Service Error:', error);
        return res.status(500).json({ message: error.message }); 
      }
      next(error); // Pass other errors
    }
});

// TODO: Add other customer routes (GET /:id)

export default router; 