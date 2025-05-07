import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod'; // Import zod
import { getAllLeads, createLead, updateLead, deleteLead, assignLead } from '../services/leadService';
import { protect } from '../middleware/authMiddleware'; // Import protect middleware
// Assuming shared validation schemas exist
import { ServiceTypeSchema, LeadStatusSchema } from './validationSchemas'; 
// Import the correct User type instead of AuthUserInfo
import { User } from '../@types';

// --- Zod Schemas ---

// Base schema for common lead fields
const baseLeadSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    mobile: z.string().min(10, 'Mobile number must be at least 10 digits'),
    city: z.string().min(1, 'City is required'),
    serviceTypes: z.array(ServiceTypeSchema).min(1, 'At least one service type is required'),
    status: LeadStatusSchema,
    assignedTo: z.string().uuid('Invalid assignee UUID').optional(),
    aum: z.number().positive('AUM must be positive').nullable().optional(),
    company: z.string().optional(),
    leadSource: z.enum(['walk_in', 'reference']).optional(),
    referredBy: z.string().optional(),
    lastWebinarDate: z.coerce.date().optional(),
});

// Schema for creating leads
const createLeadSchema = baseLeadSchema.superRefine((data, ctx) => {
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

// Schema for updating leads (allows partial data)
const updateLeadSchema = baseLeadSchema.partial().superRefine((data, ctx) => {
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

const assignLeadSchema = z.object({
    userId: z.string().uuid('Invalid user UUID').nullable(), // Allow null for unassignment
});

// Middleware for validation (could be shared)
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
      next(error); // Forward other errors
    }
  };

const router: Router = express.Router();

// ADD JSON PARSER FOR THIS ROUTER
router.use(express.json());

// Middleware to extract AuthUserInfo
// ... rest of the file ...

// GET /api/leads (Protected Route)
// Fetches leads based on the logged-in user's role and service access
router.get('/', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is populated by the 'protect' middleware
    if (!req.user) {
      // This should technically not happen if protect middleware is working,
      // but good for type safety and robustness.
      return res.status(401).json({ message: 'Not authorized' });
    }

    const leads = await getAllLeads(req.user);
    res.json(leads);
  } catch (error) {
    next(error); // Pass errors to the global error handler
  }
});

// POST /api/leads (Protected Route)
// Creates a new lead
router.post('/', protect, validateRequest(createLeadSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // TODO: Add input validation for req.body using a library like zod
    const leadData = req.body; // Assuming body contains necessary lead fields
    
    const newLead = await createLead(leadData, req.user);
    
    res.status(201).json(newLead); // Respond with 201 Created and the new lead object
  } catch (error) {
    if (error instanceof Error) {
       console.error(`[POST /leads] Service Error: ${error.message}`);
        if (error.message.includes('Permission denied') || error.message.includes('required for') || error.message.includes('Missing required')) {
            return res.status(400).json({ message: error.message });
       }
    }
    next(error); // Pass errors to the global error handler
  }
});

// PUT /api/leads/:id (Protected Route)
// Updates an existing lead
router.put('/:id', protect, validateRequest(updateLeadSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    const leadId = req.params.id;
    // TODO: Add input validation for req.body
    const updateData = req.body; 

    // Optional: Add authorization check here - e.g., can this user update this lead?
    // if (updater.role !== 'manager' && leadToUpdate.assignedTo !== updater.id) { ... }

    const updatedLead = await updateLead(leadId, updateData, req.user);
    
    res.json(updatedLead); // Respond with the updated lead object
  } catch (error) {
    if (error instanceof Error) {
        console.error(`[PUT /leads/:id] Service Error: ${error.message}`);
         if (error.message.includes('Permission denied') || error.message.includes('required for') || error.message.includes('Lead not found')) {
             const statusCode = error.message.includes('not found') ? 404 : 403;
             return res.status(statusCode).json({ message: error.message });
        }
     }
    next(error); // Pass other errors to the global handler
  }
});

// --- Add Assign Lead Route --- 
// PUT /api/leads/:id/assign (Protected Route)
router.put('/:id/assign', protect, validateRequest(assignLeadSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
      }
      
      const leadId = req.params.id;
      const { userId: userIdToAssign } = req.body; // Get userId from validated body
  
      const updatedLead = await assignLead(leadId, userIdToAssign, req.user);
      
      res.json(updatedLead); // Respond with the updated lead object
    } catch (error) {
      if (error instanceof Error) {
         console.error(`[PUT /leads/:id/assign] Service Error: ${error.message}`);
          if (error.message.includes('Permission denied') || error.message.includes('not found')) {
              const statusCode = error.message.includes('not found') ? 404 : 403;
              return res.status(statusCode).json({ message: error.message });
         }
      }
      next(error); // Pass other errors to the global handler
    }
});

// DELETE /api/leads/:id (Protected Route)
// Deletes a lead
router.delete('/:id', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    const leadId = req.params.id;

    // Optional: Add authorization check here - e.g., can this user delete this lead?
    // const leadToDelete = await getLeadById(leadId); // Need getLeadById service first
    // if (deleter.role !== 'manager' && leadToDelete.assignedTo !== deleter.id) { ... }

    const deletedCount = await deleteLead(leadId, req.user);
    
    if (deletedCount > 0) {
      res.status(204).send(); // Respond with 204 No Content on successful deletion
    } else {
      // If 0 rows were deleted, it means the lead wasn't found (or user wasn't authorized, if checks added)
      res.status(404).json({ message: 'Lead not found' }); 
    }
  } catch (error) {
    if (error instanceof Error) {
        console.error(`[DELETE /leads/:id] Service Error: ${error.message}`);
         if (error.message.includes('Permission denied')) {
             return res.status(403).json({ message: error.message });
         }
         if (error.message.includes('not found')) {
             return res.status(404).json({ message: error.message });
         }
     }
    next(error); 
  }
});

// TODO: Add other lead routes (GET /:id)

export default router; 