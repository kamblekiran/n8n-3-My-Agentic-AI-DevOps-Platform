const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../utils/logger');

// Slack notification
router.post('/slack', async (req, res) => {
  try {
    const { channel, message, deployment_url } = req.body;

    if (!process.env.SLACK_WEBHOOK_URL) {
      logger.warn('Slack webhook URL not configured');
      return res.json({ status: 'skipped', reason: 'Slack not configured' });
    }

    const slackMessage = {
      channel: channel || '#devops-alerts',
      text: message,
      attachments: deployment_url ? [{
        color: 'good',
        fields: [{
          title: 'Deployment URL',
          value: deployment_url,
          short: false
        }]
      }] : []
    };

    await axios.post(process.env.SLACK_WEBHOOK_URL, slackMessage);

    logger.info('Slack notification sent', { channel, message });
    res.json({ status: 'sent', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Slack notification error:', error);
    res.status(500).json({
      error: 'Slack notification failed',
      message: error.message
    });
  }
});

// PagerDuty notification
router.post('/pagerduty', async (req, res) => {
  try {
    const { routing_key, event_action, dedup_key, payload } = req.body;

    if (!routing_key) {
      return res.status(400).json({
        error: 'routing_key is required'
      });
    }

    const pagerDutyPayload = {
      routing_key,
      event_action: event_action || 'trigger',
      dedup_key: dedup_key || `incident-${Date.now()}`,
      payload: {
        summary: payload?.summary || 'DevOps Alert',
        severity: payload?.severity || 'error',
        source: payload?.source || 'mcp-devops-server',
        component: payload?.component || 'unknown',
        ...payload
      }
    };

    await axios.post('https://events.pagerduty.com/v2/enqueue', pagerDutyPayload);

    logger.info('PagerDuty alert sent', { dedup_key });
    res.json({ 
      status: 'sent', 
      dedup_key,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    logger.error('PagerDuty notification error:', error);
    res.status(500).json({
      error: 'PagerDuty notification failed',
      message: error.message
    });
  }
});

module.exports = router;