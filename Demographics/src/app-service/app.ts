import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { loggingMiddleware } from '../middleware/logger.middleware';
import { errorMiddleware } from '../middleware/error.middleware';
import { securityMiddleware } from '../middleware/security.middleware';
import client from 'prom-client';
import logger from '@shared/utils/logger';

// Routes
import demographicsRoutes from '../routes/demographics.routes';
import documentsRoutes from '../routes/documents.routes';
import adminRoutes from '../routes/admin.route';
import healthRoutes from '../routes/health.route';
import monitoringRoutes from '../routes/monitor.routes';

const app = express();

// Metrics for development
if (process.env.NODE_ENV === 'development') {
  const register = new client.Registry();
  client.collectDefaultMetrics({ register });
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
}

// Trust proxy for proper IP detection
app.set('trust proxy', 1);

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes to resist short window sparatic request 
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware stack
app.use(helmet());
app.use(globalLimiter);
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(securityMiddleware);
app.use(loggingMiddleware);
// Global error handler (must be last)
app.use(errorMiddleware);
// app._router.stack.forEach((route: any) => {
//   if (route.route) {
//     logger.info("Registered route", {
//       path: route.route.path,
//       method: route.route.stack[0].method,
//     });
//   }

// })

// API Routes (v1)
app.use('/external/v1/demographics', demographicsRoutes);
app.use('/external/v1/documents', documentsRoutes);
app.use('/external/v1/admin', adminRoutes);
app.use('/external/v1/health', healthRoutes);
app.use('/external/v1/monitoring', monitoringRoutes);

// Legacy routes (redirect to v1)
app.use('/external/demographics', (req, res) => res.redirect(301, '/external/v1' + req.originalUrl));
app.use('/external/documents', (req, res) => res.redirect(301, '/external/v1' + req.originalUrl));
app.use('/external/admin', (req, res) => res.redirect(301, '/external/v1' + req.originalUrl));
app.use('/external/health', (req, res) => res.redirect(301, '/external/v1' + req.originalUrl));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Demographics API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/external/v1/health',
      demographics: '/external/v1/demographics',
      documents: '/external/v1/documents',
      admin: '/external/v1/admin',
      monitoring: '/external/v1/monitoring',
    },
  });
});

// API version info
app.get('/external', (req, res) => {
  res.json({
    service: 'Demographics API',
    version: '1.0.0',
    availableVersions: ['v1'],
    currentVersion: 'v1',
    endpoints: {
      v1: {
        base: '/external/v1',
        demographics: '/external/v1/demographics',
        documents: '/external/v1/documents',
        admin: '/external/v1/admin',
        health: '/external/v1/health',
        monitoring: '/external/v1/monitoring',
      },
    },
  });
});

// 404 handler
app.use('/{*catchAll}', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/external/v1/health',
      '/external/v1/demographics',
      '/external/v1/documents',
      '/external/v1/admin',
      '/external/v1/monitoring',
    ],
  });
});




export default app;