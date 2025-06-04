import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { createCommunicationRecord, getCommunicationHistoryForEntity, getAllCommunicationHistory } from '../services/communicationService';

const router = Router();

// Get all communications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const communications = await getAllCommunicationHistory(req.user);
    res.json(communications);
  } catch (error) {
    console.error('Error fetching communications:', error);
    res.status(500).json({ error: 'Failed to fetch communications' });
  }
});

// Get communications for a specific entity
router.get('/:entityType/:entityId', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    if (entityType !== 'lead' && entityType !== 'customer') {
      return res.status(400).json({ error: 'Invalid entity type' });
    }
    const communications = await getCommunicationHistoryForEntity(entityId, entityType, req.user);
    res.json(communications);
  } catch (error) {
    console.error('Error fetching entity communications:', error);
    res.status(500).json({ error: 'Failed to fetch entity communications' });
  }
});

// Create a new communication record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const record = await createCommunicationRecord(req.body, req.user);
    res.json(record);
  } catch (error) {
    console.error('Error creating communication record:', error);
    res.status(500).json({ error: 'Failed to create communication record' });
  }
});

export default router; 