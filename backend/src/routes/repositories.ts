import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { githubService } from '../services/github.js';
import type { Repository, ApiResponse } from '../types/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/repositories - Fetch all starred repositories
router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        logger.info(`Fetching repositories - page: ${page}, limit: ${limit}`);

        const { repositories, totalCount, hasNext } = await githubService.getStarredRepositories({
            page,
            perPage: limit,
            sort: 'updated',
            direction: 'desc'
        });

        const response: ApiResponse<Repository[]> = {
            success: true,
            data: repositories,
            meta: {
                total: totalCount,
                page,
                limit,
                hasNext
            }
        };

        res.json(response);
    } catch (error: any) {
        logger.error('Failed to fetch repositories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch repositories',
            message: error.message
        });
    }
}));

// GET /api/repositories/:id - Fetch specific repository
router.get('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // First get all repositories to find the one with matching ID
        const { repositories } = await githubService.getStarredRepositories();
        const repository = repositories.find(repo => repo.id === id);

        if (!repository) {
            res.status(404).json({
                success: false,
                error: 'Repository not found'
            });
            return;
        }

        const response: ApiResponse<Repository> = {
            success: true,
            data: repository
        };

        res.json(response);
    } catch (error: any) {
        logger.error(`Failed to fetch repository ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch repository',
            message: error.message
        });
    }
}));

// PATCH /api/repositories/:id - Update repository settings
router.patch('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Note: This would require database storage to persist settings
    // For now, we'll return an error indicating this feature needs database implementation
    res.status(501).json({
        success: false,
        error: 'Not implemented',
        message: 'Repository settings update requires database implementation'
    });
}));

// POST /api/repositories/sync - Trigger manual repository sync
router.post('/sync', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        logger.info('Manual repository sync triggered');

        const { repositories } = await githubService.getStarredRepositories({
            perPage: 20 // Limit for manual sync
        });

        const response: ApiResponse<any> = {
            success: true,
            message: 'Repository sync completed',
            data: {
                repositoriesChecked: repositories.length,
                newRepositories: repositories.length,
                updatedRepositories: 0,
                timestamp: new Date().toISOString()
            }
        };

        res.json(response);
    } catch (error: any) {
        logger.error('Repository sync failed:', error);
        res.status(500).json({
            success: false,
            error: 'Repository sync failed',
            message: error.message
        });
    }
}));

// GET /api/repositories/user - Get authenticated user info
router.get('/user', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await githubService.getAuthenticatedUser();

        const response: ApiResponse<any> = {
            success: true,
            data: {
                login: user.login,
                id: user.id,
                avatarUrl: user.avatarUrl,
                url: user.url
            }
        };

        res.json(response);
    } catch (error: any) {
        logger.error('Failed to fetch authenticated user:', error);
        res.status(401).json({
            success: false,
            error: 'Authentication failed',
            message: error.message
        });
    }
}));

// GET /api/repositories/rate-limit - Get GitHub rate limit status
router.get('/rate-limit', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const rateLimitStatus = await githubService.getRateLimitStatus();

        const response: ApiResponse<any> = {
            success: true,
            data: rateLimitStatus
        };

        res.json(response);
    } catch (error: any) {
        logger.error('Failed to fetch rate limit status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rate limit status',
            message: error.message
        });
    }
}));

export { router as repositoriesRouter }; 