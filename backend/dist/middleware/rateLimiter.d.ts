import type { Request, Response, NextFunction } from 'express';
export declare const rateLimiterMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createRateLimiter: (points: number, duration: number, keyspace?: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const heavyOperationLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export default rateLimiter;
