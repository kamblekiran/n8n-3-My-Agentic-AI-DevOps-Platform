const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No token provided or invalid format.',
        expected_format: 'Bearer <token>'
      });
    }

    const token = authHeader.substring(7);
    
    // For development, allow a simple token
    if (process.env.NODE_ENV === 'development' && token === process.env.MCP_SERVER_TOKEN) {
      req.user = { id: 'system', role: 'admin' };
      return next();
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      error: 'Invalid token',
      message: error.message
    });
  }
};

module.exports = authMiddleware;