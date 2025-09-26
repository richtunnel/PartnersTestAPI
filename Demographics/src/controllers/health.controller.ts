import { Request, Response, NextFunction } from 'express';
import { databaseService } from '@shared/database/database.service';
import { fifoQueueService } from '../../../shared/services/fifoQueue.service';
import { rateLimiter } from '@shared/services/rateLimiter.service';
import { logger } from '@shared/utils/logger';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: any;
  error?: string;
}

export class HealthController {
  /**
   * GET /api/v1/health
   * Comprehensive health check
   */
  async healthCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const checks: HealthCheckResult[] = [];
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    try {
      // Database health check
      const dbCheck = await this.checkDatabase();
      checks.push(dbCheck);

      // Queue service health check
      const queueCheck = await this.checkQueueService();
      checks.push(queueCheck);

      // Rate limiter health check
      const rateLimiterCheck = await this.checkRateLimiter();
      checks.push(rateLimiterCheck);

      // Memory usage check
      const memoryCheck = this.checkMemoryUsage();
      checks.push(memoryCheck);

      // Determine overall status
      const unhealthyCount = checks.filter(check => check.status === 'unhealthy').length;
      const degradedCount = checks.filter(check => check.status === 'degraded').length;

      if (unhealthyCount > 0) {
        overallStatus = 'unhealthy';
      } else if (degradedCount > 0) {
        overallStatus = 'degraded';
      }

      const totalTime = Date.now() - startTime;
      const statusCode = overallStatus === 'healthy' ? 200 : 
                        overallStatus === 'degraded' ? 200 : 503;

      const response = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'unknown',
        uptime: process.uptime(),
        responseTime: totalTime,
        server: {
          node_version: process.version,
          platform: process.platform,
          arch: process.arch
        },
        checks: checks.reduce((acc, check) => {
          acc[check.service] = {
            status: check.status,
            responseTime: check.responseTime,
            details: check.details,
            error: check.error,
          };
          return acc;
        }, {} as any),
        summary: {
          total: checks.length,
          healthy: checks.filter(check => check.status === 'healthy').length,
          degraded: degradedCount,
          unhealthy: unhealthyCount,
        }
      };

      res.status(statusCode).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/health/ready
   * Kubernetes readiness probe
   */
  async readinessCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await databaseService.getPool();
      
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: 'Service dependencies not available'
      });
    }
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const pool = await databaseService.getPool();
      const result = await pool.request().query('SELECT 1 as health_check');
      
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'database',
        status: responseTime > 5000 ? 'degraded' : 'healthy',
        responseTime,
        details: {
          connected: true,
          query_success: result.recordset.length > 0
        }
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database check failed'
      };
    }
  }

  private async checkQueueService(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const demographicsStats = await fifoQueueService.getQueueStats('demographics');
      const webhooksStats = await fifoQueueService.getQueueStats('webhooks');
      
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'queue',
        status: responseTime > 3000 ? 'degraded' : 'healthy',
        responseTime,
        details: {
          demographics_queue: demographicsStats,
          webhooks_queue: webhooksStats
        }
      };
    } catch (error) {
      return {
        service: 'queue',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Queue service error'
      };
    }
  }

  private async checkRateLimiter(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Basic rate limiter check
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'rate_limiter',
        status: responseTime > 2000 ? 'degraded' : 'healthy',
        responseTime,
        details: {
          redis_connected: !!process.env.REDIS_CONNECTION_STRING
        }
      };
    } catch (error) {
      return {
        service: 'rate_limiter',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Rate limiter error'
      };
    }
  }

  private checkMemoryUsage(): HealthCheckResult {
    const startTime = Date.now();
    
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };

    const responseTime = Date.now() - startTime;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (memUsageMB.heapUsed > 800) {
      status = 'unhealthy';
    } else if (memUsageMB.heapUsed > 400) {
      status = 'degraded';
    }

    return {
      service: 'memory',
      status,
      responseTime,
      details: {
        usage_mb: memUsageMB,
        uptime_seconds: Math.round(process.uptime()),
      }
    };
  }
}

export const healthController = new HealthController();