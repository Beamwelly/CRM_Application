import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { addFollowUp, deleteFollowUp } from '../services/followUpService';
import { protect } from '../middleware/authMiddleware';

const router: Router = express.Router();

// ADD JSON PARSER FOR THIS ROUTER
router.use(express.json());

// --- Zod Schema for Follow-up Creation ---
const followUpSchema = z.object({
  notes: z.string().min(1, { message: 'Notes cannot be empty' }),
  nextCallDate: z.string().datetime({ message: 'Invalid date format for next call date' }), // Expect ISO string
  leadId: z.string().uuid({ message: 'Invalid Lead ID' }).optional(),
  customerId: z.string().uuid({ message: 'Invalid Customer ID' }).optional(),
}).refine(data => data.leadId || data.customerId, {
  message: "Must provide either leadId or customerId",
  path: ["leadId", "customerId"], // Indicate which fields this refinement relates to
}).refine(data => !(data.leadId && data.customerId), {
    message: "Cannot provide both leadId and customerId",
    path: ["leadId", "customerId"],
});

// Middleware for validation (can be shared)
const validateRequest = (schema: z.ZodSchema<unknown>) => 
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Input validation failed', errors: error.errors });
      }
      next(error); // Forward other errors
    }
  };

// POST /api/follow-ups (Protected Route)
router.post('/', protect, validateRequest(followUpSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const followUpData = req.body; // Already validated
    
    // The addFollowUp service expects createdBy which isn't in the request body
    // It uses the creator info passed as the second argument
    const newFollowUp = await addFollowUp(followUpData, req.user);
    
    res.status(201).json(newFollowUp);
  } catch (error) {
    // Handle potential errors from the service (like validation logic or DB errors)
    if (error instanceof Error) {
        if (error.message.includes('required') || error.message.includes('linked to') || error.message.includes('cannot be linked')) {
            // Service-level validation errors
            return res.status(400).json({ message: error.message });
        }
    }
    // Pass other errors (like DB connection issues) to the global handler
    next(error); 
  }
});

// DELETE /api/follow-ups/:followUpId (Protected Route)
router.delete('/:followUpId', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { followUpId } = req.params;
    if (!followUpId || typeof followUpId !== 'string') { // Basic validation for followUpId format
      return res.status(400).json({ message: 'Invalid FollowUp ID format' });
    }

    const affectedRows = await deleteFollowUp(followUpId, req.user);

    if (affectedRows > 0) {
      res.status(200).json({ message: 'Follow-up deleted successfully' });
    } else {
      // This case is handled inside deleteFollowUp if not found, 
      // but as a fallback or if service changes to throw error for not found:
      res.status(404).json({ message: 'Follow-up not found or no changes made' });
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('Permission denied')) {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Follow-up not found') { // If service throws this
        return res.status(404).json({ message: error.message });
      }
      // Other errors from the service
      return res.status(500).json({ message: error.message }); 
    }
    next(error); // Pass non-Error objects to the global handler
  }
});

// TODO: Add routes for getting follow-ups (e.g., GET /lead/:leadId, GET /customer/:customerId, GET /pending)

export default router; 