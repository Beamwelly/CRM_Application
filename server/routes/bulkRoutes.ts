import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { protect } from '../middleware/authMiddleware';
import { bulkInsertLeads, bulkInsertCustomers } from '../services/bulkService'; // Assuming bulkService exists
import multer from 'multer';

const router: Router = express.Router();
const upload = multer({ dest: 'uploads/temp/' }); // Configure temp storage for uploads

// ADD JSON PARSER FOR THIS ROUTER (May not be strictly needed if only using multipart)
router.use(express.json());

// TODO: Define more precise Zod schemas matching the expected validated data structure
// These schemas should align with what validateLeadData/validateCustomerData check
const leadDataSchema = z.object({ /* ... fields ... */ }); 
const customerDataSchema = z.object({ /* ... fields ... */ });

const bulkLeadsSchema = z.array(leadDataSchema);
const bulkCustomersSchema = z.array(customerDataSchema);

// Basic validation middleware (replace with more specific schema validation later)
const validateBulkData = (req: Request, res: Response, next: NextFunction) => {
    if (!Array.isArray(req.body) || req.body.length === 0) {
        return res.status(400).json({ message: 'Request body must be a non-empty array.' });
    }
    // TODO: Add actual schema validation here using bulkLeadsSchema or bulkCustomersSchema
    next();
};

// POST /api/bulk/leads (Protected)
router.post('/leads', protect, validateBulkData, async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const leadsData = req.body; // Assuming validated array of lead objects
        
        // TODO: Check permission for bulk upload (e.g., createLeads permission?)
        // if (!req.user.permissions?.createLeads) { return res.status(403)... }

        const result = await bulkInsertLeads(leadsData, req.user);
        
        res.status(201).json({ 
            message: `Successfully inserted ${result.insertedCount} leads.`,
            insertedCount: result.insertedCount,
            // Optionally return errors if the service handles partial inserts
            errors: result.errors 
        });

    } catch (error) {
        console.error("Error in bulk lead insert route:", error);
        next(error);
    }
});

// POST /api/bulk/customers (Protected)
router.post('/customers', protect, validateBulkData, async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const customersData = req.body; // Assuming validated array of customer objects

        // TODO: Check permission for bulk upload (e.g., createCustomers permission?)
        // if (!req.user.permissions?.createCustomers) { return res.status(403)... }
        
        const result = await bulkInsertCustomers(customersData, req.user);

        res.status(201).json({ 
            message: `Successfully inserted ${result.insertedCount} customers.`,
            insertedCount: result.insertedCount,
            errors: result.errors 
        });

    } catch (error) {
        console.error("Error in bulk customer insert route:", error);
        next(error);
    }
});

export default router; 