// src/shared/database/connection.ts - Centralized database connection
import sql from 'mssql';
import { logger } from '../utils/logger';

interface DatabaseConfig {
  server: string;
  database: string;
  user: string;
  password: string;
  port: number;
  options: sql.config['options'];
  pool: sql.config['pool'];
}

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: sql.ConnectionPool | null = null;
  private config: sql.config;

  private constructor() {
    // Validate required environment variables
    const requiredVars = ['DB_SERVER', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD'];
    const missing = requiredVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required database environment variables: ${missing.join(', ')}`);
    }

    this.config = {
      server: process.env.DB_SERVER!,
      database: process.env.DB_DATABASE!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD!,
      port: parseInt(process.env.DB_PORT || '1433'),
      options: {
        encrypt: true,
        trustServerCertificate: process.env.NODE_ENV === 'development',
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
      },
      pool: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 300000,
        acquireTimeoutMillis: 60000,
      },
    };
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async getPool(): Promise<sql.ConnectionPool> {
    if (!this.pool || !this.pool.connected) {
      try {
        this.pool = new sql.ConnectionPool(this.config);
        await this.pool.connect();
        
        // Test connection
        const testResult = await this.pool.request().query('SELECT 1 as test');
        if (testResult.recordset[0].test === 1) {
          logger.info('Database connection established successfully', {
            server: this.config.server,
            database: this.config.database
          });
        }
      } catch (error) {
        logger.error('Database connection failed', {
          error: error instanceof Error ? error.message : String(error),
          server: this.config.server,
          database: this.config.database
        });
        throw error;
      }
    }
    return this.pool;
  }

  public async closeConnection(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      logger.info('Database connection closed');
    }
  }
}

// Export singleton instance methods
const dbConnection = DatabaseConnection.getInstance();
export const getPool = () => dbConnection.getPool();
export const closeDatabase = () => dbConnection.closeConnection();

