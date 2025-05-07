import express, { Router, Request, Response, NextFunction } from 'express';
import { protect } from '../middleware/authMiddleware';
import { deleteAllLeads } from '../services/leadService'; // Assuming these will exist
import { deleteAllCustomers } from '../services/customerService'; // Assuming these will exist
import { uploadLogo } from '../middleware/uploadMiddleware'; // Import upload middleware
import { createAdmin } from '../services/userService'; // Import createAdmin service

const router: Router = express.Router();

// Middleware to check for clearSystemData permission
const checkClearDataPermission = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.permissions?.clearSystemData) {
        return res.status(403).json({ message: 'Permission denied: You do not have permission to clear system data.' });
    }
    next();
};

// DELETE /api/admin/clear-data/:type (Protected & Permission Check)
// type should be 'leads' or 'customers'
router.delete('/clear-data/:type', protect, checkClearDataPermission, async (req: Request, res: Response, next: NextFunction) => {
    const { type } = req.params;

    try {
        let deletedCount = 0;
        if (type === 'leads') {
            deletedCount = await deleteAllLeads(); // Call service function
            res.json({ message: `Successfully deleted ${deletedCount} leads.` });
        } else if (type === 'customers') {
            deletedCount = await deleteAllCustomers(); // Call service function
            res.json({ message: `Successfully deleted ${deletedCount} customers.` });
        } else {
            return res.status(400).json({ message: 'Invalid data type specified. Use \'leads\' or \'customers\'.' });
        }
    } catch (error) {
        console.error(`Error clearing data for type ${type}:`, error);
        next(error); // Pass to global error handler
    }
});

// --- Developer Role Check Middleware ---
const checkDeveloperRole = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'developer') {
        return res.status(403).json({ message: 'Permission denied: Only developers can create admins.' });
    }
    next();
};

// --- ADD ADMIN ROUTE ---
// POST /api/admin/create-admin (Protected, Role Check, File Upload)
router.post(
    '/create-admin',
    protect, // Ensure user is logged in
    checkDeveloperRole, // Ensure user is a developer
    uploadLogo.single('logo'), // Handle single file upload with field name 'logo'
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { name, email, password, employeeCreationLimit } = req.body;

            // Add logging for req.file
            console.log("[AdminRoutes - createAdmin] req.file:", req.file);

            // Construct the path for the uploaded logo, if it exists
            const logoUrl = req.file 
                ? `/uploads/logos/${req.file.filename}` 
                : undefined;

            // Basic validation (more robust validation could be added)
            if (!name || !email || !password) {
                return res.status(400).json({ message: 'Missing required fields: name, email, password.' });
            }

            const adminData = {
                name,
                email,
                password,
                employeeCreationLimit: employeeCreationLimit ? parseInt(employeeCreationLimit, 10) : undefined,
                logoUrl // Add the logo URL
            };

            // Add logging for adminData
            console.log("[AdminRoutes - createAdmin] adminData being passed to service:", adminData);

            const newAdmin = await createAdmin(adminData);
            res.status(201).json(newAdmin);
        } catch (error) {
            console.error('Error creating admin:', error);
            // Handle specific errors (like duplicate email) if needed
            if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint "users_email_key"')) {
                return res.status(409).json({ message: 'Email already exists.' });
            }
            next(error); // Pass to global error handler
        }
    }
);
// --- END ADD ADMIN ROUTE ---

export default router; 