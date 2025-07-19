import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import type { Request, Response, NextFunction } from 'express';

// Import routes
import { repositoriesRouter } from './routes/repositories.js';
import { pullRequestsRouter } from './routes/pullRequests.js';
import { summariesRouter } from './routes/summaries.js';
import { syncRouter } from './routes/sync.js';
import { aiRouter } from './routes/ai.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { logger } from './utils/logger.js';

// Import configuration (simplified for now)
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'];

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// General middleware
app.use(compression());
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', rateLimiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: NODE_ENV,
        version: '1.0.0'
    });
});

// API routes
app.use('/api/repositories', repositoriesRouter);
app.use('/api/pull-requests', pullRequestsRouter);
app.use('/api/summaries', summariesRouter);
app.use('/api/sync', syncRouter);
app.use('/api/ai', aiRouter);

// 404 handler
app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
    logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
    logger.info(`🔗 API base URL: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

export default app; 