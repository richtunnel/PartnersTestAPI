import sql from 'mssql';
import { logger } from '@shared/utils/logger';
require('dotenv').config();

// Validate required environment variables
function validateDatabaseConfig() {
  const required = ['DB_SERVER', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    const error = `Validation Check!! : Missing required database environment variables: ${missing.join(', ')}`;
    logger.error('Database configuration error', { 
      missing,
      availableVars: Object.keys(process.env).filter(key => key.startsWith('DB_'))
    });
    throw new Error(error);
  }

  // Log configuration (mask password)
  logger.info('Database configuration validated', {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    port: process.env.DB_PORT || '1433',
    passwordSet: !!process.env.DB_PASSWORD
  });
}

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'PartnersDB',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: true, // Required for Azure SQL
    trustServerCertificate: process.env.NODE_ENV === 'development',
    connectTimeout: 30000,
    requestTimeout: 30000,
    enableArithAbort: true,
  },
  pool: {
    max: 20,
    min: 5,
    idleTimeoutMillis: 300000, // 5 minutes
    acquireTimeoutMillis: 60000, // 1 minute
  },
};

let pool: sql.ConnectionPool;

export async function initializeDatabase(): Promise<sql.ConnectionPool> {
  try {
    // Validate configuration first
    validateDatabaseConfig();
    
    if (!pool) {
      logger.info('Creating database connection pool...');
      pool = new sql.ConnectionPool(config);
      
      logger.info('Attempting database connection...', {
        server: config.server,
        database: config.database,
        user: config.user,
        port: config.port
      });
      
      await pool.connect();
      
      // Test the connection
      const testResult = await pool.request().query('SELECT 1 as ConnectionTest, @@VERSION as SqlVersion, DB_NAME() as CurrentDatabase');
      
      logger.info('Database connection successful', {
        currentDatabase: testResult.recordset[0].CurrentDatabase,
        sqlVersion: testResult.recordset[0].SqlVersion.split('\n')[0]
      });
      
      // Check if required tables exist
      await checkDatabaseSchema(pool);
    }
    return pool;
  } catch (error) {
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      config: {
        server: config.server,
        database: config.database,
        user: config.user,
        port: config.port
      }
    });
    
    // helpful error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes('Login failed')) {
        throw new Error(`Database authentication failed. Please check your DB_USER and DB_PASSWORD in the .env file. Current user: "${config.user}"`);
      } else if (error.message.includes('server was not found') || error.message.includes('ENOTFOUND')) {
        throw new Error(`Database server not found at ${config.server}:${config.port}. Is the SQL Server container running? Try: docker-compose ps`);
      } else if (error.message.includes('Cannot open database')) {
        throw new Error(`Database "${config.database}" does not exist. Please create it or run your database initialization script.`);
      }
    }
    
    throw error;
  }
}

async function checkDatabaseSchema(pool: sql.ConnectionPool): Promise<void> {
  try {
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      AND TABLE_NAME IN ('Demographics', 'ApiKeys', 'idempotency_records')
    `);

    const tables = tablesResult.recordset.map(row => row.TABLE_NAME);
    logger.info('Database schema check', { tablesFound: tables });

    const expectedTables = ['Demographics', 'ApiKeys', 'idempotency_records'];
    const missingTables = expectedTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      logger.warn('Missing database tables', { missingTables });
      logger.info('To create missing tables, run your database initialization script');
    } else {
      logger.info('All required database tables exist');
    }
  } catch (error) {
    logger.warn('Could not check database schema', { error });
  }
}

export function getPool(): sql.ConnectionPool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.close();
    logger.info('Database connection closed');
  }
}