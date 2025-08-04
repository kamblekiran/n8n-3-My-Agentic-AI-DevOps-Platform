const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Conversation logging
router.post('/conversation', async (req, res) => {
  try {
    const { user_id, user_message, intent, agent_response, timestamp } = req.body;

    // Log conversation for analytics and improvement
    logger.info('Conversation logged', {
      user_id,
      user_message,
      intent,
      response_length: agent_response?.length || 0,
      timestamp
    });

    // In a real implementation, this would store in a database
    res.json({
      status: 'logged',
      log_id: `conv-${Date.now()}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Conversation logging error:', error);
    res.status(500).json({
      error: 'Conversation logging failed',
      message: error.message
    });
  }
});

// Audit logging
router.post('/audit', async (req, res) => {
  try {
    const { event_type, deployment_id, rollback_result, timestamp } = req.body;

    // Log audit event
    logger.info('Audit event logged', {
      event_type,
      deployment_id,
      rollback_success: rollback_result?.status === 'success',
      timestamp
    });

    res.json({
      status: 'logged',
      audit_id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Audit logging error:', error);
    res.status(500).json({
      error: 'Audit logging failed',
      message: error.message
    });
  }
});

module.exports = router;