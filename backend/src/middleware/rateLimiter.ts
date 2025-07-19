import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// Create rate limiter instance
const mainRateLimiter = new RateLimiterMemory({
    points: parseInt(process.env.API_RATE_LIMIT_REQUESTS || '100', 10), // Number of requests
    duration: parseInt(process.env.API_RATE_LIMIT_WINDOW || '900', 10), // Per 15 minutes (900 seconds)
});

// Rate limiting middleware
export const rateLimiterMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Use IP address as the key
        const key = req.ip || req.connection.remoteAddress || 'unknown';

        await mainRateLimiter.consume(key);
        next();
    } catch (rejRes: any) {
        // Rate limit exceeded
        const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;

        logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
            ip: req.ip,
            url: req.url,
            method: req.method,
            retryAfter: secs
        });

        res.set('Retry-After', String(secs));
        res.status(429).json({
            success: false,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${secs} seconds.`,
            retryAfter: secs
        });
    }
};

// Export the middleware
export const rateLimiter = rateLimiterMiddleware;

// Create specialized rate limiters for different endpoints
export const createRateLimiter = (points: number, duration: number, keyspace?: string) => {
    const limiter = new RateLimiterMemory({
        points,
        duration,
    });

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const key = req.ip || req.connection.remoteAddress || 'unknown';
            await limiter.consume(key);
            next();
        } catch (rejRes: any) {
            const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;

            logger.warn(`Rate limit exceeded for ${keyspace || 'custom'} endpoint`, {
                ip: req.ip,
                url: req.url,
                method: req.method,
                retryAfter: secs
            });

            res.set('Retry-After', String(secs));
            res.status(429).json({
                success: false,
                error: 'Too Many Requests',
                message: `Rate limit exceeded. Try again in ${secs} seconds.`,
                retryAfter: secs
            });
        }
    };
};

// Heavy operation rate limiter (for sync operations)
export const heavyOperationLimiter = createRateLimiter(5, 300, 'heavy-ops'); // 5 requests per 5 minutes

export default rateLimiter; 