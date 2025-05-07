import express, { Router, Request, Response, NextFunction } from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware';
import { getAdminDashboardSummary, getServiceTypeDistribution } from '../services/dashboardService';
import { User } from '../@types';

const router: Router = express.Router();

// ADD JSON PARSER FOR THIS ROUTER (Likely not needed as these are GET requests)
router.use(express.json());

// Route: GET /api/dashboard/admin-summary
// Description: Get dashboard metrics summarized by admin (for Developer view)
// Access: Developer only
router.get(
    '/admin-summary',
    protect, // Ensures user is logged in
    restrictTo('developer'), // Ensures user is a developer
    async (req: Request, res: Response) => {
        try {
            // --- Extract adminId from query parameters ---
            const adminId = req.query.adminId as string | undefined;
            
            // --- Pass adminId to the service function ---
            const summary = await getAdminDashboardSummary(adminId);
            res.json(summary);
        } catch (error) {
            console.error("Error in /admin-summary route:", error);
            const message = error instanceof Error ? error.message : "An unknown error occurred";
            res.status(500).json({ message: `Failed to get admin dashboard summary: ${message}` });
        }
    }
);

// Route: GET /api/dashboard/service-distribution
// Description: Get counts of leads/customers per service type
// Access: Logged-in users (adjust restrictTo if needed, e.g., restrictTo('admin', 'developer'))
router.get(
    '/service-distribution',
    protect, // Ensures user is logged in
    async (req: Request, res: Response) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User information not found after authentication.' });
            }
            // --- Extract adminId from query parameters ---
            const targetAdminId = req.query.adminId as string | undefined;
            
            // --- Pass targetAdminId to the service function ---
            const distribution = await getServiceTypeDistribution(req.user, targetAdminId);
            res.json(distribution);
        } catch (error) {
            console.error("Error in /service-distribution route:", error);
            const message = error instanceof Error ? error.message : "An unknown error occurred";
            res.status(500).json({ message: `Failed to get service type distribution: ${message}` });
        }
    }
);

export default router; 