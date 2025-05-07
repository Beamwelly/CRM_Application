import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod'; // Import Zod
import { createCommunicationRecord, getCommunicationHistory, getSentEmails, getRecordingFilePath } from '../services/communicationService';
import { protect } from '../middleware/authMiddleware'; // Import protect middleware
import { User } from '../@types'; 

// --- Zod Schema for Communication Record Creation ---
const communicationSchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'other', 'remark'], { required_error: 'Type is required' }),
  notes: z.string().optional(),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  // Call specific
  duration: z.number().int().positive().optional(),
  callStatus: z.enum(['completed', 'missed', 'cancelled']).optional(),
  recordingData: z.string().optional(), // Optional Base64 string for recording
  // Email specific
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
}).refine(data => data.leadId || data.customerId, {
  message: "Must provide either leadId or customerId",
  path: ["leadId", "customerId"], 
}).refine(data => !(data.leadId && data.customerId), {
    message: "Cannot provide both leadId and customerId",
    path: ["leadId", "customerId"],
});

// Validation Middleware (reuse or define locally)
const validateRequest = (schema: z.ZodSchema<unknown>) => 
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Input validation failed', errors: error.errors });
      }
      next(error); 
    }
  };

const router: Router = express.Router();

// ADD JSON PARSER FOR THIS ROUTER
router.use(express.json());

// POST /api/communications (Protected Route)
// Creates a new communication record
router.post('/', protect, validateRequest(communicationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const recordData = req.body; // Data is validated by middleware
    
    // createdBy is added by the service function using req.user
    const newRecord = await createCommunicationRecord(recordData, req.user);
    
    res.status(201).json(newRecord); // Respond with 201 Created and the new record object
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    next(error); // Pass errors to the global error handler
  }
});

// GET /api/communications (Protected Route)
// Fetches all communication history accessible by the logged-in user
router.get('/', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    // Fetch all history accessible to req.user (no entityId specified)
    const history = await getCommunicationHistory(req.user); 
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// GET /api/communications/entity/:entityId - Get history for a specific entity (lead/customer)
router.get('/entity/:entityId', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const { entityId } = req.params;
    // Pass user object and entityId for filtering/permission checks
    const history = await getCommunicationHistory(req.user, entityId);
    res.json(history);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
});

// --- NEW ROUTE: GET /api/communications/recordings/:recordingId ---
router.get('/recordings/:recordingId', protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        
        const { recordingId } = req.params;
        if (!recordingId) {
            return res.status(400).json({ message: 'Recording ID is required' });
        }

        // Use service function to get path and check basic permission
        const filePath = await getRecordingFilePath(recordingId, req.user);

        if (!filePath) {
            // Could be 404 (not found) or 403 (permission denied by service)
            // Check error message or just return 404 for simplicity/security
            return res.status(404).json({ message: 'Recording not found or access denied.' });
        }

        // Send the file
        // Consider adding Content-Type headers if needed (e.g., 'audio/wav')
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error(`Error sending recording file ${filePath}:`, err);
                // Avoid sending detailed error back to client
                // Check if headers already sent before trying to send another response
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Error serving recording file.' });
                } else {
                    // If headers sent, we can't send JSON, just end the response
                    res.end();
                }
            }
        });

    } catch (error) {
        // Catch errors from getRecordingFilePath or other unexpected issues
        console.error("Error in GET /recordings/:recordingId route:", error);
        next(error); // Pass to global error handler
    }
});

// --- NEW: GET /api/communications/emails --- 
// Fetches only sent email history accessible by the logged-in user
router.get('/emails', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    // Fetch sent emails accessible to req.user
    const emails = await getSentEmails(req.user); 
    res.json(emails);
  } catch (error) {
    next(error);
  }
});
// --- END NEW --- 

export default router; 