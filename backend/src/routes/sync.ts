import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { heavyOperationLimiter } from '../middleware/rateLimiter.js';
import { githubService } from '../services/github.js';
import type { ApiResponse, SyncResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Real sync status (replaced simulation)
let currentSyncStatus: {
    isRunning: boolean;
    startedAt: Date | null;
    progress: {
        repositoriesChecked: number;
        pullRequestsFound: number;
        summariesGenerated: number;
        currentRepository?: string;
        totalRepositories?: number;
    };
} = {
    isRunning: false,
    startedAt: null,
    progress: {
        repositoriesChecked: 0,
        pullRequestsFound: 0,
        summariesGenerated: 0
    }
};

// Sync history
const syncHistory: SyncResult[] = [];

// Real sync process
async function performRealSync(): Promise<SyncResult> {
    const startedAt = new Date();
    currentSyncStatus.isRunning = true;
    currentSyncStatus.startedAt = startedAt;
    currentSyncStatus.progress = {
        repositoriesChecked: 0,
        pullRequestsFound: 0,
        summariesGenerated: 0
    };

    const errors: string[] = [];

    try {
        logger.info('Starting real GitHub synchronization');

        // First, get starred repositories
        const { repositories } = await githubService.getStarredRepositories({
            perPage: 20 // Limit for sync
        });

        currentSyncStatus.progress.totalRepositories = repositories.length;
        logger.info(`Found ${repositories.length} starred repositories`);

        let totalPullRequests = 0;

        // Process each repository
        for (const repository of repositories) {
            try {
                currentSyncStatus.progress.currentRepository = repository.fullName;
                logger.info(`Processing repository: ${repository.fullName}`);

                // Get pull requests for this repository
                const { pullRequests } = await githubService.getRepositoryPullRequests(
                    repository.owner,
                    repository.name,
                    {
                        state: 'open',
                        perPage: 5 // Limit PRs per repo for sync
                    }
                );

                totalPullRequests += pullRequests.length;
                currentSyncStatus.progress.repositoriesChecked++;
                currentSyncStatus.progress.pullRequestsFound = totalPullRequests;

                logger.info(`Found ${pullRequests.length} PRs in ${repository.fullName}`);

                // Small delay to be respectful to GitHub's API
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (repoError: any) {
                const errorMsg = `Failed to sync ${repository.fullName}: ${repoError.message}`;
                logger.warn(errorMsg);
                errors.push(errorMsg);

                // Continue with other repositories
                currentSyncStatus.progress.repositoriesChecked++;
            }
        }

        const completedAt = new Date();
        const result: SyncResult = {
            repositoriesChecked: currentSyncStatus.progress.repositoriesChecked,
            newPRsFound: totalPullRequests,
            summariesGenerated: 0, // Will be updated when LLM integration is added
            errors,
            duration: completedAt.getTime() - startedAt.getTime(),
            startedAt,
            completedAt
        };

        // Reset sync status
        currentSyncStatus.isRunning = false;
        currentSyncStatus.startedAt = null;

        // Add to history
        syncHistory.unshift(result);

        // Keep only last 10 sync results
        if (syncHistory.length > 10) {
            syncHistory.pop();
        }

        logger.info('GitHub synchronization completed', {
            repositoriesChecked: result.repositoriesChecked,
            newPRsFound: result.newPRsFound,
            errors: result.errors.length,
            duration: result.duration
        });

        return result;

    } catch (error: any) {
        currentSyncStatus.isRunning = false;
        currentSyncStatus.startedAt = null;

        logger.error('GitHub synchronization failed:', error);
        throw error;
    }
}

// POST /api/sync - Trigger manual synchronization
router.post('/', heavyOperationLimiter, asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (currentSyncStatus.isRunning) {
        res.status(409).json({
            success: false,
            error: 'Sync already in progress',
            message: 'A synchronization process is already running. Please wait for it to complete.'
        });
        return;
    }

    try {
        // Validate GitHub token first
        const isTokenValid = await githubService.validateToken();
        if (!isTokenValid) {
            res.status(401).json({
                success: false,
                error: 'GitHub authentication failed',
                message: 'Please check your GitHub token configuration.'
            });
            return;
        }

        // Start sync process asynchronously
        performRealSync()
            .then((result) => {
                logger.info('Sync completed successfully', result);
            })
            .catch((error) => {
                logger.error('Sync failed', error);
                currentSyncStatus.isRunning = false;
                currentSyncStatus.startedAt = null;
            });

        const response: ApiResponse<any> = {
            success: true,
            message: 'Synchronization started',
            data: {
                status: 'started',
                startedAt: currentSyncStatus.startedAt,
                message: 'Real GitHub sync process has been initiated. Use GET /api/sync/status to monitor progress.'
            }
        };

        res.status(202).json(response); // 202 Accepted
    } catch (error: any) {
        logger.error('Failed to start sync:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start sync',
            message: error.message
        });
    }
}));

// GET /api/sync/status - Get current sync status
router.get('/status', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        // Also get current rate limit status
        let rateLimitInfo = null;
        try {
            rateLimitInfo = await githubService.getRateLimitStatus();
        } catch (error) {
            logger.warn('Could not fetch rate limit status:', error);
        }

        const response: ApiResponse<any> = {
            success: true,
            data: {
                isRunning: currentSyncStatus.isRunning,
                startedAt: currentSyncStatus.startedAt,
                progress: currentSyncStatus.progress,
                lastSync: syncHistory.length > 0 ? syncHistory[0] : null,
                rateLimit: rateLimitInfo
            }
        };

        res.json(response);
    } catch (error: any) {
        logger.error('Failed to get sync status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get sync status',
            message: error.message
        });
    }
}));

// GET /api/sync/history - Get sync history
router.get('/history', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedHistory = syncHistory.slice(startIndex, endIndex);

    const response: ApiResponse<SyncResult[]> = {
        success: true,
        data: paginatedHistory,
        meta: {
            total: syncHistory.length,
            page: pageNum,
            limit: limitNum,
            hasNext: endIndex < syncHistory.length
        }
    };

    res.json(response);
}));

// GET /api/sync/stats - Get sync statistics
router.get('/stats', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const totalSyncs = syncHistory.length;
        const successfulSyncs = syncHistory.filter(sync => sync.errors.length === 0).length;
        const failedSyncs = totalSyncs - successfulSyncs;

        const totalRepositoriesChecked = syncHistory.reduce((acc, sync) => acc + sync.repositoriesChecked, 0);
        const totalPRsFound = syncHistory.reduce((acc, sync) => acc + sync.newPRsFound, 0);
        const totalSummariesGenerated = syncHistory.reduce((acc, sync) => acc + sync.summariesGenerated, 0);

        const averageDuration = totalSyncs > 0
            ? syncHistory.reduce((acc, sync) => acc + sync.duration, 0) / totalSyncs
            : 0;

        const lastSync = syncHistory.length > 0 ? syncHistory[0] : null;

        // Get current GitHub rate limit status
        let rateLimitInfo = null;
        try {
            rateLimitInfo = await githubService.getRateLimitStatus();
        } catch (error) {
            logger.warn('Could not fetch rate limit status for stats:', error);
        }

        const response: ApiResponse<any> = {
            success: true,
            data: {
                totalSyncs,
                successfulSyncs,
                failedSyncs,
                successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0,
                totalRepositoriesChecked,
                totalPRsFound,
                totalSummariesGenerated,
                averageDuration: Math.round(averageDuration),
                lastSync,
                isCurrentlyRunning: currentSyncStatus.isRunning,
                rateLimit: rateLimitInfo
            }
        };

        res.json(response);
    } catch (error: any) {
        logger.error('Failed to get sync stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get sync stats',
            message: error.message
        });
    }
}));

// DELETE /api/sync/cancel - Cancel running sync (if supported)
router.delete('/cancel', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!currentSyncStatus.isRunning) {
        res.status(400).json({
            success: false,
            error: 'No sync in progress',
            message: 'There is no synchronization process currently running.'
        });
        return;
    }

    // Reset sync status (in a real implementation, this would also cancel ongoing requests)
    currentSyncStatus.isRunning = false;
    currentSyncStatus.startedAt = null;
    currentSyncStatus.progress = {
        repositoriesChecked: 0,
        pullRequestsFound: 0,
        summariesGenerated: 0
    };

    logger.info('Sync process cancelled by user request');

    const response: ApiResponse<any> = {
        success: true,
        message: 'Synchronization cancelled',
        data: {
            status: 'cancelled',
            cancelledAt: new Date()
        }
    };

    res.json(response);
}));

export { router as syncRouter }; 