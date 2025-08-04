const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./src/utils/logger');
const authMiddleware = require('./src/middleware/auth');
const errorHandler = require('./src/middleware/errorHandler');

// Import route handlers
const agentRoutes = require('./src/routes/agents');
const llmRoutes = require('./src/routes/llm');
const monitoringRoutes = require('./src/routes/monitoring');
const notificationRoutes = require('./src/routes/notifications');
const loggingRoutes = require('./src/routes/logging');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5678'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      llm: 'operational',
      agents: 'operational',
      monitoring: 'operational'
    }
  });
});

// API routes
app.use('/agent', authMiddleware, agentRoutes);
app.use('/llm', authMiddleware, llmRoutes);
app.use('/monitoring', authMiddleware, monitoringRoutes);
app.use('/notifications', notificationRoutes);
app.use('/logging', loggingRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`MCP DevOps Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info('Available endpoints:');
  logger.info('  - /health - Health check');
  logger.info('  - /agent/* - Agent endpoints');
  logger.info('  - /llm/* - LLM processing endpoints');
  logger.info('  - /monitoring/* - Monitoring endpoints');
  logger.info('  - /notifications/* - Notification endpoints');
  logger.info('  - /logging/* - Logging endpoints');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});