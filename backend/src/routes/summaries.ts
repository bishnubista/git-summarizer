import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { githubService } from '../services/github.js';
import { aiService } from '../services/ai.js';
import type { PRSummary, ApiResponse, FilterType } from '../types/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// In-memory storage for summaries (will be replaced with database)
let summariesStore: PRSummary[] = [];

// GET /api/summaries - Fetch all PR summaries with filtering
router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            repository,
            author,
            impact,
            reviewed,
            important,
            page = '1',
            limit = '20'
        } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);

        logger.info(`Fetching summaries - page: ${pageNum}, limit: ${limitNum}`);

        // If we don't have summaries yet, generate them from recent PRs
        if (summariesStore.length === 0) {
            await generateSummariesFromRecentPRs();
        }

        let filteredSummaries = [...summariesStore];

        // Apply filters
        if (repository && typeof repository === 'string') {
            // Get PRs for the specific repository to match with summaries
            const { pullRequests } = await githubService.getAllPullRequestsFromStarredRepos({ maxRepos: 50, maxPRsPerRepo: 10 });
            const repoPRIds = pullRequests
                .filter(pr => pr.repository.fullName === repository)
                .map(pr => pr.id);
            filteredSummaries = filteredSummaries.filter(summary => repoPRIds.includes(summary.prId));
        }

        if (author && typeof author === 'string') {
            const { pullRequests } = await githubService.getAllPullRequestsFromStarredRepos({ maxRepos: 50, maxPRsPerRepo: 10 });
            const authorPRIds = pullRequests
                .filter(pr => pr.author.login === author)
                .map(pr => pr.id);
            filteredSummaries = filteredSummaries.filter(summary => authorPRIds.includes(summary.prId));
        }

        if (impact && typeof impact === 'string') {
            filteredSummaries = filteredSummaries.filter(summary => summary.impact === impact);
        }

        if (reviewed !== undefined) {
            const isReviewed = reviewed === 'true';
            filteredSummaries = filteredSummaries.filter(summary => summary.isReviewed === isReviewed);
        }

        if (important !== undefined) {
            const isImportant = important === 'true';
            filteredSummaries = filteredSummaries.filter(summary => summary.isImportant === isImportant);
        }

        // Sort by creation date (newest first)
        filteredSummaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Apply pagination
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedSummaries = filteredSummaries.slice(startIndex, endIndex);

        const response: ApiResponse<PRSummary[]> = {
            success: true,
            data: paginatedSummaries,
            meta: {
                total: filteredSummaries.length,
                page: pageNum,
                limit: limitNum,
                hasNext: endIndex < filteredSummaries.length
            }
        };

        res.json(response);
    } catch (error: any) {
        logger.error('Failed to fetch summaries:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch summaries',
            message: error.message
        });
    }
}));

// GET /api/summaries/:id - Fetch specific summary
router.get('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const summary = summariesStore.find(s => s.id === id);

        if (!summary) {
            res.status(404).json({
                success: false,
                error: 'Summary not found'
            });
            return;
        }

        const response: ApiResponse<PRSummary> = {
            success: true,
            data: summary
        };

        res.json(response);
    } catch (error: any) {
        logger.error(`Failed to fetch summary ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch summary',
            message: error.message
        });
    }
}));

// PATCH /api/summaries/:id/reviewed - Toggle review status
router.patch('/:id/reviewed', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const summaryIndex = summariesStore.findIndex(s => s.id === id);

        if (summaryIndex === -1) {
            res.status(404).json({
                success: false,
                error: 'Summary not found'
            });
            return;
        }

        summariesStore[summaryIndex]!.isReviewed = !summariesStore[summaryIndex]!.isReviewed;

        const response: ApiResponse<PRSummary> = {
            success: true,
            data: summariesStore[summaryIndex]!,
            message: `Summary marked as ${summariesStore[summaryIndex]!.isReviewed ? 'reviewed' : 'unreviewed'}`
        };

        res.json(response);
    } catch (error: any) {
        logger.error(`Failed to update review status for summary ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to update review status',
            message: error.message
        });
    }
}));

// PATCH /api/summaries/:id/important - Toggle importance status
router.patch('/:id/important', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const summaryIndex = summariesStore.findIndex(s => s.id === id);

        if (summaryIndex === -1) {
            res.status(404).json({
                success: false,
                error: 'Summary not found'
            });
            return;
        }

        summariesStore[summaryIndex]!.isImportant = !summariesStore[summaryIndex]!.isImportant;

        const response: ApiResponse<PRSummary> = {
            success: true,
            data: summariesStore[summaryIndex]!,
            message: `Summary marked as ${summariesStore[summaryIndex]!.isImportant ? 'important' : 'not important'}`
        };

        res.json(response);
    } catch (error: any) {
        logger.error(`Failed to update importance status for summary ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to update importance status',
            message: error.message
        });
    }
}));

// POST /api/summaries/generate - Generate summaries for recent PRs
router.post('/generate', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const { force = false, maxPRs = 10 } = req.body;

        logger.info(`Generating summaries for up to ${maxPRs} recent PRs (force: ${force})`);

        // Warn if AI service is not available but continue with fallback summaries
        if (!aiService.isAvailable()) {
            logger.warn('No LLM providers configured. Will generate fallback summaries.');
        }

        // Get recent pull requests
        const { pullRequests } = await githubService.getAllPullRequestsFromStarredRepos({
            maxRepos: 10,
            maxPRsPerRepo: Math.ceil(maxPRs / 10)
        });

        // Filter PRs that don't already have summaries (unless force is true)
        const existingSummaryPRIds = new Set(summariesStore.map(s => s.prId));
        const prsToSummarize = force
            ? pullRequests.slice(0, maxPRs)
            : pullRequests.filter(pr => !existingSummaryPRIds.has(pr.id)).slice(0, maxPRs);

        if (prsToSummarize.length === 0) {
            res.json({
                success: true,
                message: 'No new PRs to summarize',
                data: {
                    generated: 0,
                    skipped: pullRequests.length,
                    total: summariesStore.length
                }
            });
            return;
        }

        logger.info(`Generating summaries for ${prsToSummarize.length} PRs`);

        // Generate summaries using AI service
        const newSummaries = await aiService.generateBatchSummaries(prsToSummarize);

        // Remove old summaries for the same PRs if force is true
        if (force) {
            const prIdsToReplace = new Set(prsToSummarize.map(pr => pr.id));
            summariesStore = summariesStore.filter(s => !prIdsToReplace.has(s.prId));
        }

        // Add new summaries to store
        summariesStore.push(...newSummaries);

        // Sort summaries by creation date (newest first)
        summariesStore.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const response: ApiResponse<any> = {
            success: true,
            message: `Generated ${newSummaries.length} new summaries`,
            data: {
                generated: newSummaries.length,
                skipped: pullRequests.length - prsToSummarize.length,
                total: summariesStore.length,
                summaries: newSummaries.slice(0, 5) // Return first 5 summaries
            }
        };

        res.json(response);
    } catch (error: any) {
        logger.error('Failed to generate summaries:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate summaries',
            message: error.message
        });
    }
}));

// GET /api/summaries/stats - Get summary statistics
router.get('/stats', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const totalSummaries = summariesStore.length;
        const reviewedSummaries = summariesStore.filter(s => s.isReviewed).length;
        const importantSummaries = summariesStore.filter(s => s.isImportant).length;

        const impactDistribution = {
            high: summariesStore.filter(s => s.impact === 'high').length,
            medium: summariesStore.filter(s => s.impact === 'medium').length,
            low: summariesStore.filter(s => s.impact === 'low').length
        };

        const providerDistribution = summariesStore.reduce((acc, summary) => {
            const provider = summary.aiProvider || 'unknown';
            acc[provider] = (acc[provider] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const avgConfidence = summariesStore.length > 0
            ? summariesStore.reduce((sum, s) => sum + (s.confidence || 0), 0) / summariesStore.length
            : 0;

        const response: ApiResponse<any> = {
            success: true,
            data: {
                totalSummaries,
                reviewedSummaries,
                importantSummaries,
                reviewedPercentage: totalSummaries > 0 ? (reviewedSummaries / totalSummaries) * 100 : 0,
                impactDistribution,
                providerDistribution,
                averageConfidence: Math.round(avgConfidence * 100) / 100,
                availableProviders: aiService.getAvailableProviders(),
                aiServiceAvailable: aiService.isAvailable()
            }
        };

        res.json(response);
    } catch (error: any) {
        logger.error('Failed to get summary stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get summary stats',
            message: error.message
        });
    }
}));

/**
 * Helper function to generate summaries from recent PRs on startup
 */
async function generateSummariesFromRecentPRs(): Promise<void> {
    try {
        if (!aiService.isAvailable()) {
            logger.warn('AI service not available. Will generate fallback summaries.');
        }

        logger.info('Generating initial summaries from recent PRs');

        const { pullRequests } = await githubService.getAllPullRequestsFromStarredRepos({
            maxRepos: 5,
            maxPRsPerRepo: 2
        });

        if (pullRequests.length === 0) {
            logger.info('No pull requests found for summary generation');
            return;
        }

        // Generate summaries for up to 5 recent PRs
        const recentPRs = pullRequests.slice(0, 5);
        const summaries = await aiService.generateBatchSummaries(recentPRs);

        summariesStore.push(...summaries);
        logger.info(`Generated ${summaries.length} initial summaries`);
    } catch (error) {
        logger.error('Failed to generate initial summaries:', error);
    }
}

export { router as summariesRouter }; 