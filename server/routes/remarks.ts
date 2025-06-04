import express, { Response } from 'express';
import { pool } from '../db';
import { authenticateToken } from '../middleware/auth';

type Role = 'developer' | 'admin' | 'employee';
interface UserPermissions { 
  [key: string]: unknown;
}

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: UserPermissions;
}

interface AuthRequest extends express.Request {
  user?: AuthenticatedUser;
}

const router = express.Router();

// Get all remarks with entity details
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      WITH lead_remarks AS (
        SELECT 
          cr.id,
          COALESCE(cr.remark_text, cr.notes) as content,
          'lead' as entity_type,
          l.id as entity_id,
          l.name as entity_name,
          cr.created_at,
          json_build_object(
            'id', u.id,
            'name', u.name
          ) as created_by
        FROM communication_records cr
        JOIN leads l ON cr.lead_id = l.id
        JOIN users u ON cr.created_by = u.id
        WHERE cr.type = 'remark' AND cr.lead_id IS NOT NULL
      ),
      customer_remarks AS (
        SELECT 
          cr.id,
          COALESCE(cr.remark_text, cr.notes) as content,
          'customer' as entity_type,
          c.id as entity_id,
          c.name as entity_name,
          cr.created_at,
          json_build_object(
            'id', u.id,
            'name', u.name
          ) as created_by
        FROM communication_records cr
        JOIN customers c ON cr.customer_id = c.id
        JOIN users u ON cr.created_by = u.id
        WHERE cr.type = 'remark' AND cr.customer_id IS NOT NULL
      )
      SELECT * FROM lead_remarks
      UNION ALL
      SELECT * FROM customer_remarks
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching remarks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 