const { Pool } = require('pg');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.initializePool();
  }

  initializePool() {
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      this.pool.on('error', (err) => {
        logger.error('Unexpected error on idle client', err);
      });

      logger.info('Database connection pool initialized');
    } else {
      logger.warn('DATABASE_URL not provided, database features disabled');
    }
  }

  async query(text, params) {
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Database query error', { text, error: error.message });
      throw error;
    }
  }

  async getClient() {
    if (!this.pool) {
      throw new Error('Database not configured');
    }
    return this.pool.connect();
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info('Database connection pool closed');
    }
  }
}

module.exports = new DatabaseService();