import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { heavyOperationLimiter } from '../middleware/rateLimiter.js';
import type { ApiResponse, SyncResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Mock sync status (will be replaced with real sync service)
let currentSyncStatus: {
    isRunning: boolean;
    startedAt: Date | null;
    progress: {
        repositoriesChecked: number;
        pullRequestsFound: number;
        summariesGenerated: number;
        currentRepository?: string;
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

// Mock sync history
const syncHistory: SyncResult[] = [
    {
        repositoriesChecked: 4,
        newPRsFound: 3,
        summariesGenerated: 3,
        errors: [],
        duration: 45000, // 45 seconds
        startedAt: new Date('2024-01-15T08:00:00Z'),
        completedAt: new Date('2024-01-15T08:00:45Z')
    },
    {
        repositoriesChecked: 4,
        newPRsFound: 1,
        summariesGenerated: 1,
        errors: ['Rate limit exceeded for microsoft/typescript'],
        duration: 32000, // 32 seconds
        startedAt: new Date('2024-01-14T08:00:00Z'),
        completedAt: new Date('2024-01-14T08:00:32Z')
    }
];

// Simulate sync process
async function simulateSync(): Promise<SyncResult> {
    const startedAt = new Date();
    currentSyncStatus.isRunning = true;
    currentSyncStatus.startedAt = startedAt;
    currentSyncStatus.progress = {
        repositoriesChecked: 0,
        pullRequestsFound: 0,
        summariesGenerated: 0
    };

    logger.info('Starting repository sync simulation');

    // Simulate checking repositories
    const repositories = ['facebook/react', 'microsoft/typescript', 'tailwindlabs/tailwindcss', 'vercel/next.js'];

    for (const repo of repositories) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

        currentSyncStatus.progress.repositoriesChecked++;
        currentSyncStatus.progress.currentRepository = repo;

        // Randomly find PRs (0-2 per repo)
        const newPRs = Math.floor(Math.random() * 3);
        currentSyncStatus.progress.pullRequestsFound += newPRs;
        currentSyncStatus.progress.summariesGenerated += newPRs;

        logger.info(`Processed ${repo}: found ${newPRs} new PRs`);
    }

    const completedAt = new Date();
    const result: SyncResult = {
        repositoriesChecked: repositories.length,
        newPRsFound: currentSyncStatus.progress.pullRequestsFound,
        summariesGenerated: currentSyncStatus.progress.summariesGenerated,
        errors: [],
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

    logger.info('Repository sync completed', result);
    return result;
}

// POST /api/sync - Trigger manual synchronization
router.post('/', heavyOperationLimiter, asyncHandler(async (req: Request, res: Response) => {
    if (currentSyncStatus.isRunning) {
        return res.status(409).json({
            success: false,
            error: 'Sync already in progress',
            message: 'A synchronization process is already running. Please wait for it to complete.'
        });
    }

    // Start sync process asynchronously
    simulateSync()
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
            message: 'Sync process has been initiated. Use GET /api/sync/status to monitor progress.'
        }
    };

    res.status(202).json(response); // 202 Accepted
}));

// GET /api/sync/status - Get current sync status
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
    const response: ApiResponse<any> = {
        success: true,
        data: {
            isRunning: currentSyncStatus.isRunning,
            startedAt: currentSyncStatus.startedAt,
            progress: currentSyncStatus.progress,
            lastSync: syncHistory.length > 0 ? syncHistory[0] : null
        }
    };

    res.json(response);
}));

// GET /api/sync/history - Get sync history
router.get('/history', asyncHandler(async (req: Request, res: Response) => {
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
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
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
            isCurrentlyRunning: currentSyncStatus.isRunning
        }
    };

    res.json(response);
}));

// DELETE /api/sync/cancel - Cancel running sync (if supported)
router.delete('/cancel', asyncHandler(async (req: Request, res: Response) => {
    if (!currentSyncStatus.isRunning) {
        return res.status(400).json({
            success: false,
            error: 'No sync in progress',
            message: 'There is no synchronization process currently running.'
        });
    }

    // In a real implementation, this would cancel the running sync process
    // For now, we'll just reset the status
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