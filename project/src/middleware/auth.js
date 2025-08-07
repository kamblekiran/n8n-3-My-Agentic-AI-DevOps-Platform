const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No token provided or invalid format.',
        expected_format: 'Bearer <token>',
        received_header: authHeader ? 'Bearer ***' : 'none'
      });
    }

    const token = authHeader.substring(7);
    
    if (!token || token.trim().length === 0) {
      return res.status(401).json({
        error: 'Access denied. Empty token provided.',
        expected_format: 'Bearer <token>'
      });
    }
    
    // For development, allow a simple token
    if (process.env.NODE_ENV === 'development' && token === process.env.MCP_SERVER_TOKEN) {
      req.user = { id: 'system', role: 'admin' };
      return next();
    }

    // Try to verify as JWT token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (jwtError) {
      // If JWT verification fails, check if it matches the simple token
      if (token === process.env.MCP_SERVER_TOKEN) {
        req.user = { id: 'system', role: 'admin' };
        return next();
      }
      throw jwtError;
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      error: 'Invalid token',
      message: error.message,
      hint: 'Make sure you are using the correct MCP_SERVER_TOKEN or a valid JWT token'
    });
  }
};

module.exports = authMiddleware;