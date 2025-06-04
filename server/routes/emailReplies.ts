import { Router } from 'express';
import { query } from '../db';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get replies for a specific email
router.get('/:emailId', authenticateToken, async (req, res) => {
  try {
    const { emailId } = req.params;
    
    const result = await query(
      `SELECT 
        er.*,
        cr.email_subject as original_subject,
        cr.email_body as original_body
      FROM email_replies er
      JOIN communication_records cr ON er.original_email_id = cr.id
      WHERE er.original_email_id = $1
      ORDER BY er.received_at DESC`,
      [emailId]
    );
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching email replies:', error);
    res.status(500).json({ error: 'Failed to fetch email replies' });
  }
});

// Mark a reply as read
router.patch('/:replyId/read', authenticateToken, async (req, res) => {
  try {
    const { replyId } = req.params;
    
    await query(
      'UPDATE email_replies SET is_read = true WHERE id = $1',
      [replyId]
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking reply as read:', error);
    res.status(500).json({ error: 'Failed to mark reply as read' });
  }
});

// Get all unread replies
router.get('/unread', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        er.*,
        cr.email_subject as original_subject,
        cr.email_body as original_body
      FROM email_replies er
      JOIN communication_records cr ON er.original_email_id = cr.id
      WHERE er.is_read = false
      ORDER BY er.received_at DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching unread replies:', error);
    res.status(500).json({ error: 'Failed to fetch unread replies' });
  }
});

export default router; 